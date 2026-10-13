import { TodayHome } from "@/components/home/TodayHome";

/**
 * The contractor's home tab: the shared Today screen (components/home/TodayHome) — what needs this
 * person, three numbers, one primary action and the company's modules. The full RFQ list lives in the
 * RFQs tab; the home no longer repeats it, nor the status chart that told the same numbers twice.
 */
export default function ContractorDashboard() {
  return <TodayHome />;
}
