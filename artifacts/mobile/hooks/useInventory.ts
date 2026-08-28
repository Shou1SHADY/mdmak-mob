import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { isPreview, PREVIEW_INVENTORY, PREVIEW_REQUESTS, PREVIEW_WAREHOUSES } from "@/lib/preview";
import type { WarehouseRequestStatus } from "@/lib/warehouse-requests";

export interface Warehouse {
  id: string;
  name: string;
  location?: string | null;
  description?: string | null;
  organizationId: string;
  /** The company's central warehouse. Requests and transfers are always stored
   * on it, whichever direction stock is moving. */
  isCentral?: boolean;
  centralWarehouseId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  organizationId?: string;
  /** "unit" means barcode-tracked individual pieces, which this app does not
   * move — validateTransfer rejects them with `unit_tracked`. */
  trackingMode?: "unit" | null;
  minQuantity?: number | null;
  category?: string | null;
}

export interface WarehouseRequest {
  id: string;
  requestNumber: string;
  organizationId: string;
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  releasedQuantity?: number | null;
  fromWarehouseId: string;
  toWarehouseId: string;
  toProjectId?: string | null;
  toProjectName?: string | null;
  status: WarehouseRequestStatus;
  requestedByUserId: string;
  requestedByName: string;
  expectedReceiverName?: string;
  releasedByName?: string | null;
  receivedByName?: string | null;
}

/** Every warehouse in the member's organization, live. */
export function useWarehouses() {
  if (isPreview()) return { warehouses: PREVIEW_WAREHOUSES as Warehouse[], central: PREVIEW_WAREHOUSES[0] as Warehouse, orgId: "preview-user", isLoading: false };
  const { user } = useAuth();
  const orgId = user?.organizationId || "";
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "warehouses"), where("organizationId", "==", orgId)),
      (snap) => {
        setWarehouses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Warehouse));
        setIsLoading(false);
      },
      (e) => {
        console.warn("[useWarehouses]", e.message);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  // The central warehouse is where requests live. Falling back to the first
  // warehouse would put requests somewhere the website does not look for them,
  // so callers must handle "no central yet" rather than get a wrong answer.
  const central = useMemo(
    () => warehouses.find((w) => w.isCentral) ?? null,
    [warehouses]
  );

  return { warehouses, central, orgId, isLoading };
}

/** One warehouse's stock, live. */
export function useInventoryItems(warehouseId: string | undefined | null) {
  if (isPreview()) return { items: PREVIEW_INVENTORY as InventoryItem[], isLoading: false };
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!warehouseId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsub = onSnapshot(
      collection(db, "warehouses", warehouseId, "inventoryItems"),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem));
        setIsLoading(false);
      },
      (e) => {
        console.warn("[useInventoryItems]", e.message);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [warehouseId]);

  return { items, isLoading };
}

/**
 * The org's withdrawal requests.
 *
 * Always read from the CENTRAL warehouse's subcollection — that is where the
 * website writes every request regardless of which way the stock is moving, so
 * reading anywhere else would show an empty inbox on a busy site.
 */
export function useWarehouseRequests(centralWarehouseId: string | undefined | null) {
  if (isPreview()) return { requests: PREVIEW_REQUESTS as WarehouseRequest[], isLoading: false };
  const [requests, setRequests] = useState<WarehouseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!centralWarehouseId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsub = onSnapshot(
      collection(db, "warehouses", centralWarehouseId, "requests"),
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WarehouseRequest));
        setIsLoading(false);
      },
      (e) => {
        console.warn("[useWarehouseRequests]", e.message);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [centralWarehouseId]);

  return { requests, isLoading };
}
