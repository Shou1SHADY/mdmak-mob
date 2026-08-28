import { collection, type Firestore } from "firebase/firestore";

// Lifted UNCHANGED from the website's src/hooks/useProjectWasteStats.ts, which
// is otherwise a React file bound to the web Firebase provider and so cannot be
// mirrored whole. These two are pure and are what lib/waste-writes.ts needs.
//
// The scope decides where a waste record lands, and getting it wrong would file
// site waste under a warehouse (or vice versa) where no one looks for it:
// project waste goes to projects/{id}/wasteRecords, warehouse waste to
// warehouses/{id}/wasteRecords. Both carry the same document shape and both are
// append-only — a mistake is corrected with a reversal entry, never an edit.

export type WasteScope =
  | { projectId: string; warehouseId?: undefined }
  | { warehouseId: string; projectId?: undefined };

export function wasteRecordsCollection(firestore: Firestore, scope: WasteScope) {
  return scope.projectId
    ? collection(firestore, "projects", scope.projectId, "wasteRecords")
    : collection(firestore, "warehouses", scope.warehouseId as string, "wasteRecords");
}
