// A registered supplier opened this RFQ on the phone: tell the website once per screen visit — the website's
// src/hooks/useCountRfqView.ts. The server counts once per supplier company; a failure is silent.

import { useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { countRfqView } from "@/lib/site-api";

export function useCountRfqView(rfqId: string | null | undefined): void {
  const sent = useRef<Set<string>>(new Set());
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !rfqId || sent.current.has(rfqId)) return;
    sent.current.add(rfqId);
    void (async () => {
      try {
        await countRfqView(await user.getIdToken(), rfqId);
      } catch {
        // Not counted this time; the screen works without it.
      }
    })();
  }, [rfqId]);
}
