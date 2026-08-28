import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  CRM_ACTIVITIES,
  CRM_CONTACTS,
  CRM_OPPORTUNITIES,
  type CrmActivity,
  type CrmContact,
  type CrmOpportunity,
} from "@/lib/crm";

export interface TeamMember {
  id: string;
  name: string;
  defaultGroupId?: string | null;
}

/**
 * Mobile counterpart of the website's hooks/useCrmData.ts — the same three
 * org-scoped queries, so both apps see exactly the same records.
 *
 * The single thing separating a contractor's CRM from a supplier's is this
 * `organizationId`; the collections are shared and every document carries it.
 *
 * Opportunities and activities are opt-in: the leads list does not need them and
 * should not pay for the listener. Quotations are not loaded at all — offer
 * versioning is desktop work and no mobile screen shows it.
 *
 * Uses onSnapshot rather than a one-shot read: a deal advanced on the website
 * should move on the phone without a manual refresh, which is most of the point
 * of having it on the phone.
 */
export function useCrmData(options?: { opportunities?: boolean; activities?: boolean }) {
  const { user } = useAuth();
  const orgId = user?.organizationId || "";
  const wantOpportunities = !!options?.opportunities;
  const wantActivities = !!options?.activities;

  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  const [contactsLoading, setContactsLoading] = useState(true);
  const [oppsLoading, setOppsLoading] = useState(wantOpportunities);
  const [activitiesLoading, setActivitiesLoading] = useState(wantActivities);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setContactsLoading(false);
      return;
    }
    setContactsLoading(true);
    const unsub = onSnapshot(
      query(collection(db, CRM_CONTACTS), where("organizationId", "==", orgId)),
      (snap) => {
        setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CrmContact));
        setContactsLoading(false);
      },
      (e) => {
        console.warn("[useCrmData] contacts:", e.message);
        setError(e.message);
        setContactsLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !wantOpportunities) {
      setOppsLoading(false);
      return;
    }
    setOppsLoading(true);
    const unsub = onSnapshot(
      query(collection(db, CRM_OPPORTUNITIES), where("organizationId", "==", orgId)),
      (snap) => {
        setOpportunities(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CrmOpportunity));
        setOppsLoading(false);
      },
      (e) => {
        console.warn("[useCrmData] opportunities:", e.message);
        setError(e.message);
        setOppsLoading(false);
      }
    );
    return unsub;
  }, [orgId, wantOpportunities]);

  useEffect(() => {
    if (!orgId || !wantActivities) {
      setActivitiesLoading(false);
      return;
    }
    setActivitiesLoading(true);
    const unsub = onSnapshot(
      query(collection(db, CRM_ACTIVITIES), where("organizationId", "==", orgId)),
      (snap) => {
        setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CrmActivity));
        setActivitiesLoading(false);
      },
      (e) => {
        console.warn("[useCrmData] activities:", e.message);
        setError(e.message);
        setActivitiesLoading(false);
      }
    );
    return unsub;
  }, [orgId, wantActivities]);

  // The owner picker. A one-shot listener is fine — team membership changes far
  // less often than the pipeline does.
  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(
      query(collection(db, "users"), where("organizationId", "==", orgId)),
      (snap) => {
        setTeam(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name ?? data.displayName ?? data.email ?? d.id,
              defaultGroupId: data.defaultGroupId ?? null,
            };
          })
        );
      },
      (e) => console.warn("[useCrmData] team:", e.message)
    );
    return unsub;
  }, [orgId]);

  const contactsById = useMemo(() => {
    const map = new Map<string, CrmContact>();
    contacts.forEach((c) => map.set(c.id, c));
    return map;
  }, [contacts]);

  return {
    orgId,
    contacts,
    contactsById,
    opportunities,
    activities,
    team,
    error,
    isLoading: contactsLoading || oppsLoading || activitiesLoading,
  };
}
