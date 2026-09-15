import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import {
  MFG_BLOCK_NOTICES,
  MFG_COST_ESTIMATES,
  MFG_PRODUCTS,
  MFG_SETTINGS,
  MFG_STOPS,
  normalizeMfgSettings,
  type Actor,
  type MfgCostEstimate,
  type MfgProduct,
  type MfgSettings,
  type Persona,
} from "@/lib/manufacturing-engine";
import { MFG_DEPARTMENTS, WORK_ORDERS, type MfgDepartment } from "@/lib/manufacturing";
import { DELIVERY_NOTES, type DeliveryNote } from "@/lib/delivery-notes";
import { MANUFACTURING_REQUESTS, SALES_ORDERS, type ManufacturingRequest, type SalesOrder } from "@/lib/sales-orders";
import { isV2Order, type MfgBlockNotice, type MfgStop, type WorkOrderV2 } from "@/lib/manufacturing-writes";
import {
  buildDecisions,
  buildWorld,
  myStations,
  personasOf,
  seesMoney as personaSeesMoney,
  type DecisionItem,
  type MfgWorld,
} from "@/lib/manufacturing-view";

/**
 * The workshop as this phone sees it.
 *
 * Every number comes from the mirrored engine: the screens subscribe, hand the
 * raw documents to `buildWorld`, and render what comes back. Nothing about a
 * work order's state is computed here — that is the whole point of mirroring
 * the engine rather than rewriting it.
 *
 * Two deliberate narrowings for a phone:
 *  - Only PRODUCT-BORN orders are built (`isV2Order` with a known card). Legacy
 *    stage-flow orders have no route to record against and stay on the web.
 *  - Stock is not read, so `world.alloc` is null and shortage lines are empty.
 *    Allocation needs every warehouse's rows on every recompute; the field acts
 *    (record output, materials, stops, QC) do not depend on it, and the website
 *    remains the place to see what a shortage is waiting on.
 */
export interface MfgWorldState {
  isLoading: boolean;
  orgId: string;
  today: string;
  world: MfgWorld;
  settings: MfgSettings;
  departments: MfgDepartment[];
  products: Map<string, MfgProduct>;
  requests: ManufacturingRequest[];
  estimates: MfgCostEstimate[];
  stops: MfgStop[];
  /** Who the viewer is, in the engine's terms — the five manufacturing roles. */
  actor: Actor;
  actorName: string;
  /** Every hat this person wears, and the one their Today is shown as. */
  personas: Persona[];
  persona: Persona | null;
  setPersona: (p: Persona) => void;
  /** The stations this person records under the current persona. */
  stations: string[];
  decisions: DecisionItem[];
  seesMoney: boolean;
  /** True when the person holds no manufacturing role at all. */
  outsider: boolean;
}

export function useMfgWorld(): MfgWorldState {
  const { user } = useAuth();
  const { can } = usePermissions();

  const { items: departmentsRaw, orgId, isLoading: deptLoading } = useOrgCollection<MfgDepartment>(MFG_DEPARTMENTS);
  const { items: productsRaw } = useOrgCollection<MfgProduct>(MFG_PRODUCTS);
  const { items: ordersRaw, isLoading: ordersLoading } = useOrgCollection<WorkOrderV2>(WORK_ORDERS);
  const { items: notesRaw } = useOrgCollection<DeliveryNote>(DELIVERY_NOTES);
  const { items: requestsRaw } = useOrgCollection<ManufacturingRequest>(MANUFACTURING_REQUESTS);
  const { items: estimatesRaw } = useOrgCollection<MfgCostEstimate>(MFG_COST_ESTIMATES);
  const { items: salesOrdersRaw } = useOrgCollection<SalesOrder>(SALES_ORDERS);
  const { items: stopsRaw } = useOrgCollection<MfgStop>(MFG_STOPS);
  const { items: noticesRaw } = useOrgCollection<MfgBlockNotice>(MFG_BLOCK_NOTICES);

  const [settingsRaw, setSettingsRaw] = useState<Partial<MfgSettings> | null>(null);
  useEffect(() => {
    if (!orgId) return;
    return onSnapshot(
      doc(db, MFG_SETTINGS, orgId),
      (snap) => setSettingsRaw(snap.exists() ? (snap.data() as Partial<MfgSettings>) : null),
      (e) => {
        if (__DEV__) console.warn("[useMfgWorld] settings:", e.message);
      }
    );
  }, [orgId]);

  const settings = useMemo(() => normalizeMfgSettings(settingsRaw), [settingsRaw]);

  const departments = useMemo(
    () => departmentsRaw.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [departmentsRaw]
  );
  const products = useMemo(() => new Map(productsRaw.map((p) => [p.id, p])), [productsRaw]);

  const orders = useMemo(
    () => ordersRaw.filter((o) => isV2Order(o) && products.has(o.productId || "")),
    [ordersRaw, products]
  );

  const notesByOrder = useMemo(() => {
    const map = new Map<string, DeliveryNote[]>();
    for (const n of notesRaw) {
      const key = n.source?.workOrderId;
      if (key) map.set(key, [...(map.get(key) || []), n]);
    }
    return map;
  }, [notesRaw]);

  const salesOrders = useMemo(() => new Map(salesOrdersRaw.map((s) => [s.id, s])), [salesOrdersRaw]);

  // The day boundary is the user's, not UTC's — a stop reported at 1am in
  // Riyadh belongs to that day.
  const today = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  const world = useMemo(
    () =>
      buildWorld({
        today,
        nowMs: Date.now(),
        settings,
        departments,
        products,
        orders,
        notesByOrder,
        salesOrders,
        stops: stopsRaw,
        notices: noticesRaw,
        stock: null,
      }),
    [today, settings, departments, products, orders, notesByOrder, salesOrders, stopsRaw, noticesRaw]
  );

  const actor = useMemo<Actor>(
    () => ({
      uid: user?.uid || "",
      manage: can("manufacturing.manage"),
      work: can("manufacturing.work"),
      qc: can("manufacturing.qc"),
      cost: can("manufacturing.cost"),
      view: can("manufacturing.view"),
    }),
    [user?.uid, can]
  );

  const personas = useMemo(() => personasOf(actor, departments), [actor, departments]);
  const [chosen, setChosen] = useState<Persona | null>(null);
  const persona = chosen && personas.includes(chosen) ? chosen : personas[0] ?? null;

  const stations = useMemo(
    () => (persona ? myStations(actor, departments, persona) : []),
    [actor, departments, persona]
  );

  const decisions = useMemo(
    () =>
      persona
        ? buildDecisions({
            world,
            requests: requestsRaw,
            estimates: estimatesRaw,
            departments,
            settings,
            actor,
            persona,
            today,
            nowMs: Date.now(),
          })
        : [],
    [world, requestsRaw, estimatesRaw, departments, settings, actor, persona, today]
  );

  return {
    isLoading: deptLoading || ordersLoading,
    orgId,
    today,
    world,
    settings,
    departments,
    products,
    requests: requestsRaw,
    estimates: estimatesRaw,
    stops: stopsRaw,
    actor,
    actorName: user?.displayName || user?.email || "",
    personas,
    persona,
    setPersona: setChosen,
    stations,
    decisions,
    seesMoney: persona ? personaSeesMoney(persona) : false,
    outsider: personas.length === 0,
  };
}
