import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where, type Query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { DEFAULT_POLICIES, PROCUREMENT_SETTINGS, PURCHASE_ORDERS, type ProcActor, type ProcurementPolicies, type PurchaseOrder } from "@/lib/procurement/types";
import { contractorDecisions, contractorTodayCounts, type ContractorDecision, type TodayDelivery, type TodayOffer, type TodayRfq } from "@/lib/contractor-today";
import { supplierFieldOf } from "@/lib/supplier-reach";
import { fetchReachingRfqs } from "@/lib/supplier-reach-reads";
import { supplierDecisions, supplierHomeCounts, type HomeOffer, type HomeRfq, type SupplierDecision } from "@/lib/supplier-home";

export type HomeDecision = ContractorDecision | SupplierDecision;
export interface HomeKpi { key: string; value: number; href: string }

interface TodayState {
  decisions: HomeDecision[];
  kpis: HomeKpi[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const rows = async <T,>(q: Query): Promise<T[]> => (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }) as T);

/**
 * What the phone's home shows: the decisions waiting on this person and three numbers. The queries
 * are the website home's own (supplier/page.tsx, useWorkQueue), and each one is only made when the
 * person's permissions would show its result — a member without offers.view never reads offers.
 * One read per refresh rather than live listeners: the home is glanced at, and pull-to-refresh is
 * what a phone user expects.
 */
export function useTodayHome(): TodayState {
  const { user, organization } = useAuth();
  const { can, isOwner, isLoading: permsLoading } = usePermissions();
  const [decisions, setDecisions] = useState<HomeDecision[]>([]);
  const [kpis, setKpis] = useState<HomeKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const orgId = user?.organizationId ?? null;
  // The supplier's field (tree specialties, category names, cities), keyed by value so a re-rendered profile
  // object does not refetch.
  const fieldKey = JSON.stringify(supplierFieldOf(organization as Record<string, unknown> | null));
  const field = useMemo(() => JSON.parse(fieldKey) as ReturnType<typeof supplierFieldOf>, [fieldKey]);
  const role = user?.role;

  const load = useCallback(async () => {
    if (permsLoading) return;
    if (!orgId) {
      // No company yet (a fresh account, or the design preview): nothing to ask for.
      setDecisions([]);
      setKpis([]);
      setLoading(false);
      return;
    }
    setError(false);
    const now = Date.now();
    try {
      if (role === "Supplier") {
        const seesRfqs = can("offers.view");
        // The open RFQs that reach him — his field AND his cities, or invited by name (website ED-21, lib/supplier-reach.ts).
        const [rfqs, offers, orders] = await Promise.all([
          seesRfqs ? fetchReachingRfqs<HomeRfq>(db, orgId, field) : Promise.resolve([]),
          seesRfqs ? rows<HomeOffer>(query(collection(db, "offers"), where("organizationId", "==", orgId))) : Promise.resolve([]),
          rows<PurchaseOrder>(query(collection(db, PURCHASE_ORDERS), where("supplierOrgId", "==", orgId))).catch(() => []),
        ]);
        const counts = supplierHomeCounts({ rfqs, offers, orders, now });
        setDecisions(supplierDecisions({ rfqs, offers, orders, now, seesRfqs }));
        setKpis([
          { key: "kpiOrdersToAccept", value: counts.ordersToAccept, href: "/(supplier)/orders" },
          ...(seesRfqs
            ? [
                { key: "kpiUnanswered", value: counts.unanswered, href: "/(supplier)/rfqs" },
                { key: "kpiPendingOffers", value: counts.pendingOffers, href: "/(supplier)/offers" },
              ]
            : []),
        ]);
      } else {
        const seesOffers = can("offers.view");
        const receives = can("deliveries.confirm");
        const approves = isOwner || can("po.approve");
        const [rfqs, offers, deliveries, orders, settings] = await Promise.all([
          rows<TodayRfq>(query(collection(db, "rfqs"), where("organizationId", "==", orgId))),
          seesOffers ? rows<TodayOffer>(query(collection(db, "offers"), where("contractorOrgId", "==", orgId))) : Promise.resolve([]),
          receives
            ? rows<TodayDelivery>(query(collection(db, "deliveries"), where("contractorOrgId", "==", orgId), where("status", "==", "pending_confirmation")))
            : Promise.resolve([]),
          approves ? rows<PurchaseOrder>(query(collection(db, PURCHASE_ORDERS), where("organizationId", "==", orgId))).catch(() => []) : Promise.resolve([]),
          approves ? getDoc(doc(db, PROCUREMENT_SETTINGS, orgId)).catch(() => null) : Promise.resolve(null),
        ]);
        const policies: ProcurementPolicies = { ...DEFAULT_POLICIES, ...((settings?.exists() ? settings.data() : {}) as Partial<ProcurementPolicies>) };
        const actor: ProcActor | null = approves && user
          ? {
              uid: user.uid,
              name: user.displayName || "",
              isOwner,
              canApprove: isOwner || can("po.approve"),
              canPrepare: isOwner || can("offers.accept"),
              canExpedite: isOwner || can("po.expedite") || can("offers.accept") || can("po.approve"),
              canReceive: isOwner || receives,
              seesPrices: isOwner || seesOffers || can("offers.accept") || can("po.approve"),
            }
          : null;
        const counts = contractorTodayCounts({ rfqs, offers, deliveries });
        setDecisions(contractorDecisions({ rfqs, offers, deliveries, orders, now, seesOffers, receives, actor, policies }));
        setKpis([
          { key: "kpiOpenRfqs", value: counts.openRfqs, href: "/(contractor)/rfqs" },
          ...(seesOffers ? [{ key: "kpiOffersToReview", value: counts.offersToReview, href: "/(contractor)/rfqs" }] : []),
          ...(receives ? [{ key: "kpiDeliveries", value: counts.deliveriesToConfirm, href: "/(goods)" }] : []),
        ]);
      }
    } catch (e: unknown) {
      if (__DEV__) console.warn("[useTodayHome]", e instanceof Error ? e.message : e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [orgId, role, permsLoading, can, isOwner, user, field]);

  useEffect(() => {
    void load();
  }, [load]);

  return { decisions, kpis, loading: loading || permsLoading, error, refresh: load };
}
