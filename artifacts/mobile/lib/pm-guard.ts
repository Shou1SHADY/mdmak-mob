// Project Management 1.0 on the phone.
//
// A project born from a handover (or adopted, or created on the website since
// PM 1.0) carries a `pm` block. Its quantities move through measurement sheets
// the manager approves, its money through certificates, its stage through the
// PM lifecycle — and firestore.rules refuse the legacy direct writes on it
// (an `executedQuantity` increment, a `pm: true` purchase request answered in
// place, a project created without `pmCeilingHas('create')`).
//
// The phone does not re-implement those workflows. On a PM project it shows
// what is there and hands the desk work to the website. Every screen asks this
// one helper, the same way the website asks `Boolean(project.pm)`
// (src/app/[locale]/(contractor)/contractor/projects/[id]/page.tsx).
//
// A project without `pm` is a legacy project and keeps the phone's behaviour.

/** True when the project is run under Project Management 1.0. */
export function isPmProject(project: { pm?: unknown } | null | undefined): boolean {
  const pm = project?.pm;
  return typeof pm === "object" && pm !== null;
}

/** The website's projects list — where a new project is started. */
export const PROJECTS_WEB_PATH = "/contractor/projects";

/** The website's page for one project — where PM desk work is done. */
export function projectWebPath(projectId: string): string {
  return `${PROJECTS_WEB_PATH}/${encodeURIComponent(projectId)}`;
}
