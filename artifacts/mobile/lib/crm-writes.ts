import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CRM_ACTIVITIES,
  CRM_CONTACTS,
  CRM_OPPORTUNITIES,
  historyEntry,
  type ActivityType,
  type ContactTier,
  type CrmContact,
  type CrmOpportunity,
  type LeadSource,
  type LeadStatus,
  type OpportunityStage,
  type OpportunityTrack,
  type PartyType,
} from "@/lib/crm";

// The CRM writes this app performs. Each payload mirrors the website's dialog
// for the same record, field for field, so a document written here is
// indistinguishable from one written there:
//
//   contact      -> src/components/crm/CrmContactDialog.tsx
//   opportunity  -> src/components/crm/CrmOpportunityDialog.tsx
//   activity     -> src/components/crm/CrmActivityDialog.tsx
//   stage move   -> src/components/crm/CrmOpportunitiesView.tsx
//
// This app writes the SUBSET a phone should own — create a lead, log an
// activity, open a deal, nudge it one stage. The heavy desktop paths (the value
// ladder, price approval, close/won-lost reasons, handover to Projects,
// addenda, quotations) are deliberately absent: they need fields and judgement
// that do not belong on a 375px screen, and firestore.rules gates the closing
// ones behind `crm.close` anyway.
//
// Fields this app does not collect are written as null rather than omitted,
// matching the website — a missing key and an explicit null read differently
// when the website merges a form's state.

export interface SaveContactInput {
  orgId: string;
  name: string;
  /** How we relate to them. The website defaults new leads to "client". */
  type?: CrmContact["type"];
  partyType?: PartyType | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  status: LeadStatus;
  source?: LeadSource | null;
  tier?: ContactTier;
  notes?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
}

/**
 * Creates a lead. Editing an existing contact's full record stays on the
 * website — this app only adds one, and only the fields worth typing on a phone.
 */
export async function createContact(input: SaveContactInput): Promise<string> {
  const created = await addDoc(collection(db, CRM_CONTACTS), {
    name: input.name.trim(),
    type: input.type ?? "client",
    entityType: "company",
    company: input.company?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    status: input.status,
    source: input.source ?? null,
    ownerId: input.ownerId || null,
    ownerName: input.ownerName || null,
    notes: input.notes?.trim() || null,
    city: input.city?.trim() || null,
    crNumber: null,
    tier: input.tier ?? "C",
    satisfaction: null,
    paymentDays: null,
    overdueAmount: null,
    partyType: input.partyType ?? null,
    roles: ["client"],
    people: [],
    organizationId: input.orgId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

/** Moves a lead along the pipeline. Status is the only field this touches. */
export async function setLeadStatus(contactId: string, status: LeadStatus): Promise<void> {
  await updateDoc(doc(db, CRM_CONTACTS, contactId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export interface CreateOpportunityInput {
  orgId: string;
  contactId: string;
  contactName: string | null;
  title: string;
  track: OpportunityTrack;
  value: number;
  expectedCloseDate?: string | null;
  notes?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
}

/**
 * Opens a deal at stage "new".
 *
 * The seed fields (`stage`, `state`, `completedGates`, `approvalStatus`,
 * `stageHistory`, `addenda`) are exactly the website's, and they matter: the
 * security rules reject a create that starts already-closed, and the gate and
 * history helpers in lib/crm.ts assume these arrays exist.
 */
export async function createOpportunity(input: CreateOpportunityInput): Promise<string> {
  const created = await addDoc(collection(db, CRM_OPPORTUNITIES), {
    contactId: input.contactId,
    contactName: input.contactName,
    title: input.title.trim(),
    track: input.track,
    value: input.value,
    probability: null,
    expectedCloseDate: input.expectedCloseDate || null,
    ownerId: input.ownerId || null,
    ownerName: input.ownerName || null,
    notes: input.notes?.trim() || null,
    scopeTypes: [],
    customScopeType: null,
    customScopeActivity: null,
    route: null,
    contractKind: null,
    source: null,
    consultantContactId: null,
    consultantName: null,
    stage: "new",
    state: "open",
    completedGates: [],
    approvalStatus: "none",
    stageHistory: [historyEntry("new", input.ownerName ?? null)],
    addenda: [],
    organizationId: input.orgId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

/**
 * Advances a deal one open stage, appending to its audit trail.
 *
 * Callers must check `stageMoveBlock()` from lib/crm.ts first — this does not
 * re-validate gates. It deliberately cannot reach "won" or "lost": closing a
 * deal needs a reason, a value and the `crm.close` permission, and that whole
 * flow lives on the website.
 */
export async function advanceOpportunityStage(
  opp: Pick<CrmOpportunity, "id" | "stageHistory" | "ownerName">,
  stage: Exclude<OpportunityStage, "won" | "lost">
): Promise<void> {
  await updateDoc(doc(db, CRM_OPPORTUNITIES, opp.id), {
    stage,
    state: "open",
    stageHistory: [...(opp.stageHistory ?? []), historyEntry(stage, opp.ownerName)],
    updatedAt: serverTimestamp(),
  });
}

export interface LogActivityInput {
  orgId: string;
  type: ActivityType;
  title: string;
  contactId: string;
  contactName: string | null;
  opportunityId?: string | null;
  opportunityTitle?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
}

/** Logs a call, meeting, site visit, task or email against a contact. */
export async function logActivity(input: LogActivityInput): Promise<string> {
  const created = await addDoc(collection(db, CRM_ACTIVITIES), {
    type: input.type,
    title: input.title.trim(),
    contactId: input.contactId,
    contactName: input.contactName,
    opportunityId: input.opportunityId || null,
    opportunityTitle: input.opportunityTitle || null,
    dueDate: input.dueDate || null,
    ownerId: input.ownerId || null,
    ownerName: input.ownerName || null,
    notes: input.notes?.trim() || null,
    organizationId: input.orgId,
    done: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

/** Ticks a task off, or puts it back. */
export async function setActivityDone(activityId: string, done: boolean): Promise<void> {
  await updateDoc(doc(db, CRM_ACTIVITIES, activityId), {
    done,
    updatedAt: serverTimestamp(),
  });
}
