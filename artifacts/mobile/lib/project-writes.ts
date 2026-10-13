import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProjectStatus } from "@/lib/project-status";

// The project writes this app performs.
//
// Only one: moving a LEGACY project's status. Starting a project is website
// work — since Project Management 1.0 a project is born with a `pm` block
// (contract terms, lifecycle; src/lib/pm/manual-project-writes.ts on the web)
// and the rules let only the owner or `pm.manage` create one. A PM project's
// stage moves through its lifecycle on the website too, so screens call this
// only when `isPmProject(project)` is false (lib/pm-guard.ts).
//
// The website keeps everything else that needs a desk — the BOQ (Excel
// upload, division mapping, per-line rates), section toggles, team seating,
// blueprints, IPC claims and the finance tabs.
//
// A BOQ line is not writable from here at all. Once drawn into a tender it is
// hard-locked (`isEditable === false`) and firestore.rules accepts only the draw
// bookkeeping on it; a phone has no business in that transition.

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
