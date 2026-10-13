import { TodayHome } from "@/components/home/TodayHome";

/**
 * The supplier's home tab: the shared Today screen (components/home/TodayHome) — the orders waiting for
 * acceptance and the open RFQs he has not answered, three numbers, one primary action and the modules his
 * company has switched on (a sales-only supplier sees no CRM, Inventory or Finance). The RFQ and offer
 * lists live in their own tabs.
 */
export default function SupplierDashboard() {
  return <TodayHome />;
}
