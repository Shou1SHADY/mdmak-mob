import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { ProjectStatus } from "@/lib/project-status";

/** The project fields this app reads. The website writes more; nothing here
 * assumes a field exists, so a project created either side renders. */
export interface Project {
  id: string;
  organizationId: string;
  contractorId?: string;
  name: string;
  description?: string | null;
  location?: string | null;
  region?: string | null;
  budget?: number | null;
  status?: ProjectStatus | string;
  projectType?: string | null;
  clientName?: string | null;
  clientType?: string | null;
  blueprintUrl?: string | null;
  enabledSections?: string[];
  rfqIds?: string[];
  /** Present only on projects handed over from a CRM deal. */
  sourceOpportunityId?: string | null;
  handover?: { status?: string; pmId?: string; pmName?: string } | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BoqItem {
  id: string;
  itemNo?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  unit?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  drawnQuantity?: number | null;
  isEditable?: boolean;
  tenderId?: string | null;
  divisionNameAr?: string | null;
  divisionNameEn?: string | null;
}

/** Every project in the signed-in member's organization, live. */
export function useProjects() {
  const { user } = useAuth();
  const orgId = user?.organizationId || "";
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "projects"), where("organizationId", "==", orgId)),
      (snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project));
        setIsLoading(false);
      },
      (e) => {
        console.warn("[useProjects]", e.message);
        setError(e.message);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  return { projects, orgId, isLoading, error };
}

/**
 * One project and its BOQ.
 *
 * The BOQ is read-only here. Its lines lock once drawn into a tender
 * (`isEditable === false`) and the rules only accept the specific draw
 * bookkeeping on a locked row — editing quantities is desktop work, so this app
 * displays them and writes none.
 */
export function useProject(projectId: string | undefined | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsub = onSnapshot(
      doc(db, "projects", projectId),
      (snap) => {
        setProject(snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null);
        setIsLoading(false);
      },
      (e) => {
        console.warn("[useProject]", e.message);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(
      collection(db, "projects", projectId, "boqItems"),
      (snap) => setBoqItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BoqItem)),
      (e) => console.warn("[useProject] boq:", e.message)
    );
    return unsub;
  }, [projectId]);

  return { project, boqItems, isLoading };
}

/**
 * The RFQs (tenders) linked to a project.
 *
 * Queried by `projectId` rather than walking the project's `rfqIds` array: the
 * array is kept in sync by the publishing flows and can lag, whereas the RFQ's
 * own `projectId` is what the website's tender views filter on.
 */
export function useProjectTenders(projectId: string | undefined | null) {
  const [tenders, setTenders] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "rfqs"), where("projectId", "==", projectId)),
      (snap) => {
        setTenders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      },
      (e) => {
        console.warn("[useProjectTenders]", e.message);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  return { tenders, isLoading };
}
