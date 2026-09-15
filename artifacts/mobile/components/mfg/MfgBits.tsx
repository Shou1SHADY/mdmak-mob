import type { Tone } from "@/lib/design";
import type { Candidate, Severity } from "@/lib/manufacturing-engine";
import type { OrderView } from "@/lib/manufacturing-view";
import type { MfgActionTarget } from "./MfgActionSheet";

/** The engine's three severities, in this app's tones. */
export function severityTone(s: Severity): Tone {
  return s === "r" ? "destructive" : s === "a" ? "warning" : "cta";
}

/**
 * Which of this release's five sheets performs a candidate — or none.
 *
 * The field acts are here; the desk acts (releasing, closing, issuing a note,
 * approving scrap, applying a change) are deliberately not. A candidate with no
 * sheet still shows on Today, because knowing an order is waiting on a decision
 * is worth a phone even when making it is not.
 */
export function actionForCandidate(c: Candidate, view: OrderView): MfgActionTarget | null {
  const at = { view, index: c.index ?? 0, departmentId: c.departmentId };
  switch (c.key) {
    case "output":
    case "qc_release":
      return { kind: "output", ...at };
    case "qc_decision":
      return { kind: "qc_decision", ...at };
    case "request_materials":
      return { kind: "request_materials", ...at };
    case "confirm_receipt":
      return { kind: "confirm_receipt", ...at, requestNumber: c.requestNumber };
    default:
      return null;
  }
}
