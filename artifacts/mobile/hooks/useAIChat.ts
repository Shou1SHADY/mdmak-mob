import { useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  updateDoc,
  getDoc,
  doc as fsDoc,
  serverTimestamp,
  arrayUnion,
  documentId,
} from 'firebase/firestore';
import { router } from 'expo-router';
import { auth, db } from '@/lib/firebase';
import { SITE_URL, supplierAct } from '@/lib/site-api';
import { supplierFieldOf } from '@/lib/supplier-reach';
import { fetchReachingRfqs } from '@/lib/supplier-reach-reads';
import { useAuth, type AppUser, type UserRole } from '@/context/AuthContext';
import type { Language } from '@/context/LanguageContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant';
export type PendingActionType =
  | 'submitOffer'
  | 'createInquiry'
  | 'favoriteSupplier'
  | 'createRFQ';

export interface ActionParams {
  rfqId?: string;
  rfqTitle?: string;
  price?: number;
  notes?: string;
  question?: string;
  supplierId?: string;
  supplierName?: string;
  title?: string;
  category?: string;
  description?: string;
}

export interface PendingAction {
  type: PendingActionType;
  params: ActionParams;
  label: string;
  description: string;
}

export interface NavLink {
  label: string;
  path: string;
}

export interface AIChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  pendingAction?: PendingAction;
  navLinks?: NavLink[];
  isLoading?: boolean;
  actionExecuted?: boolean;
}

type RagContext = {
  profile?: Record<string, unknown>;
  rfqs?: Record<string, unknown>[];
  offers?: Record<string, unknown>[];
  suppliers?: Record<string, unknown>[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// The website hosts the RAG endpoint; one source of truth for its URL.
const API_BASE = SITE_URL;

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function buildContext(
  userId: string,
  profile: Record<string, unknown>,
  role: UserRole,
): Promise<RagContext> {
  const ctx: RagContext = { profile };

  try {
    if (role === 'Contractor') {
      const orgId = profile.organizationId as string | undefined;
      const rfqQ = orgId
        ? query(collection(db, 'rfqs'), where('organizationId', '==', orgId), limit(25))
        : query(collection(db, 'rfqs'), where('contractorId', '==', userId), limit(25));
      const rfqSnap = await getDocs(rfqQ);
      ctx.rfqs = rfqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (ctx.rfqs.length > 0 && orgId) {
        const rfqIds = ctx.rfqs.slice(0, 10).map(r => r.id as string);
        // Named by the buying side (`contractorOrgId`): the rules refuse an offer list filtered by rfqId alone (website G-06).
        const offersSnap = await getDocs(
          query(collection(db, 'offers'), where('rfqId', 'in', rfqIds), where('contractorOrgId', '==', orgId), limit(30))
        );
        ctx.offers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      // Only expose suppliers the contractor already has a relationship with
      const offerSupplierIds = [...new Set(
        (ctx.offers ?? []).map(o => o.supplierId as string).filter(Boolean)
      )];
      const favoriteIds = (profile.favoriteSuppliers as string[] | undefined) ?? [];
      const knownIds = [...new Set([...offerSupplierIds, ...favoriteIds])].slice(0, 30);
      if (knownIds.length > 0) {
        const suppSnap = await getDocs(
          query(collection(db, 'users'), where(documentId(), 'in', knownIds))
        );
        ctx.suppliers = suppSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

    } else if (role === 'Supplier') {
      // The open RFQs that reach him: his field AND his delivery cities, or invited by name (website ED-21).
      const orgId = (profile.organizationId as string | undefined) || userId;
      ctx.rfqs = await fetchReachingRfqs<{ id: string } & Record<string, unknown>>(db, orgId, supplierFieldOf(profile), { max: 25 });

      const offersSnap = await getDocs(
        query(collection(db, 'offers'), where('supplierId', '==', userId), limit(25))
      );
      ctx.offers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    } else {
      const rfqSnap = await getDocs(query(collection(db, 'rfqs'), limit(20)));
      ctx.rfqs = rfqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const suppSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'Supplier'), limit(20))
      );
      ctx.suppliers = suppSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    if (__DEV__) console.warn('[AIChat] Context build warning:', err);
  }

  return ctx;
}

async function executeAction(action: PendingAction, user: AppUser): Promise<void> {
  const p = action.params;
  switch (action.type) {
    case 'submitOffer':
      // An offer is a full document the website queries on a dozen fields
      // (contractorOrgId, deliveryBatches, the Arabic status vocabulary…). The
      // submit-offer screen builds it through lib/contracts.ts; a thin record
      // written from here reached nobody's inbox and could not be withdrawn.
      if (!p.rfqId) throw new Error('Missing rfqId');
      router.push(`/(supplier)/submit-offer/${p.rfqId}` as never);
      break;
    case 'createInquiry': {
      // A question is a server act since Supplier 1.0 (website `quote.ask`, as
      // the supplier RFQ page asks it): the server checks the RFQ is open and
      // reaches this supplier, writes the question in the active company's
      // name and tells the RFQ's creator and its rfq.manage holders — the
      // direct write this replaced told nobody.
      if (!p.rfqId || !p.question?.trim()) throw new Error('Missing rfqId or question');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('UNAUTHENTICATED');
      const result = await supplierAct(idToken, { action: 'quote.ask', rfqId: p.rfqId, question: p.question.trim().slice(0, 1000) });
      if (!result.ok) throw new Error(result.code);
      break;
    }
    case 'favoriteSupplier':
      await updateDoc(fsDoc(db, 'users', user.uid), {
        favoriteSuppliers: arrayUnion(p.supplierId),
      });
      break;
    default:
      throw new Error(`Unknown action: ${(action as { type: string }).type}`);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const contextRef = useRef<RagContext | null>(null);

  const ensureContext = useCallback(async (): Promise<RagContext> => {
    if (contextRef.current) return contextRef.current;
    if (!user) return {};
    const snap = await getDoc(fsDoc(db, 'users', user.uid));
    const profile = (snap.data() ?? {}) as Record<string, unknown>;
    const ctx = await buildContext(user.uid, profile, user.role);
    contextRef.current = ctx;
    return ctx;
  }, [user]);

  const sendMessage = useCallback(async (
    question: string,
    language: Language,
  ) => {
    if (!question.trim() || isLoading || !user) return;

    const userMsg: AIChatMessage = {
      id: genId(),
      role: 'user',
      content: question.trim(),
    };
    const loadingMsg: AIChatMessage = {
      id: genId(),
      role: 'assistant',
      content: '',
      isLoading: true,
    };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      const context = await ensureContext();

      // The website's route verifies the caller before spending AI tokens.
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/api/rag/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          question: question.trim(),
          locale: language,
          userRole: user.role,
          context,
        }),
      });

      const json = await res.json() as {
        error?: boolean;
        message?: string;
        data?: {
          answer: string;
          pendingAction?: PendingAction | null;
          navLinks?: NavLink[] | null;
        };
      };

      if (!res.ok || json.error) throw new Error(json.message ?? 'Request failed');

      const aiMsg: AIChatMessage = {
        id: genId(),
        role: 'assistant',
        content: json.data!.answer,
        pendingAction: json.data!.pendingAction ?? undefined,
        navLinks: json.data!.navLinks ?? undefined,
      };

      setMessages(prev => [...prev.slice(0, -1), aiMsg]);
    } catch (err) {
      if (__DEV__) console.error('[AIChat] Error:', err);
      setMessages(prev => [...prev.slice(0, -1), {
        id: genId(),
        role: 'assistant',
        content: language === 'ar'
          ? 'حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى.'
          : 'An error occurred. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, ensureContext]);

  const confirmAction = useCallback(async (messageId: string): Promise<void> => {
    if (!user) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg?.pendingAction) return;
    await executeAction(msg.pendingAction, user);
    contextRef.current = null;
    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, actionExecuted: true } : m)
    );
  }, [messages, user]);

  const dismissAction = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, pendingAction: undefined } : m)
    );
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    contextRef.current = null;
  }, []);

  return { messages, isLoading, sendMessage, confirmAction, dismissAction, clear };
}
