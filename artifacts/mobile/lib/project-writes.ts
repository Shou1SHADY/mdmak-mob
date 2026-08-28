import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { defaultEnabledSections } from "@/lib/project-sections";
import type { ProjectStatus } from "@/lib/project-status";

// The project writes this app performs, mirroring the website's
// src/app/[locale]/(contractor)/contractor/projects/new/page.tsx.
//
// This app writes the subset a phone should own: start a project, and move its
// status. The website keeps everything that needs a desk — the BOQ (Excel
// upload, division mapping, per-line rates), section toggles, team seating,
// blueprints, IPC claims and the finance tabs.
//
// A BOQ line is not writable from here at all. Once drawn into a tender it is
// hard-locked (`isEditable === false`) and firestore.rules accepts only the draw
// bookkeeping on it; a phone has no business in that transition.

export interface CreateProjectInput {
  orgId: string;
  uid: string;
  name: string;
  clientName?: string | null;
  location?: string | null;
  region?: string | null;
  budget?: number | null;
  status: ProjectStatus;
  projectType?: string | null;
  description?: string | null;
}

/**
 * Starts a project.
 *
 * `enabledSections` is seeded from `defaultEnabledSections()` — the same helper
 * the website's form initialises its checkboxes from. Writing an empty array
 * instead would open the project on the website with all its tabs switched off,
 * which reads as a broken project rather than a new one.
 *
 * `rfqIds` starts empty and is appended to by the publishing flow, which lives
 * on the website.
 */
export async function createProject(input: CreateProjectInput): Promise<string> {
  const created = await addDoc(collection(db, "projects"), {
    organizationId: input.orgId,
    contractorId: input.uid,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    region: input.region || null,
    budget: input.budget ?? null,
    status: input.status,
    projectType: input.projectType || null,
    clientName: input.clientName?.trim() || null,
    clientType: null,
    blueprintUrl: null,
    enabledSections: Array.from(defaultEnabledSections()),
    rfqIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

/**
 * Moves a project's status.
 *
 * Status is stored as one of PROJECT_STATUSES. Legacy values ("active",
 * "paused", "completed") are resolved for DISPLAY by `resolveProjectStatus` and
 * never rewritten in place — so a project still holding one keeps it until an
 * explicit save like this one picks a value from the current set.
 */
export async function setProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
  await updateDoc(doc(db, "projects", projectId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
