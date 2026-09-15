import { useCallback } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { emitMfgEvent, type MfgEvent, type Translator } from "@/lib/mfg-events";

/**
 * Announcing a manufacturing act to the people it concerns.
 *
 * No write function notifies anyone — the website's forms emit after the write
 * resolves, and so do these screens. The mirrored pipeline resolves recipients
 * from the station, the role or the permission, and writes one notification
 * each.
 *
 * A notification stores the sender's rendered text (which push and this app
 * show) AND the i18n keys (which the website re-renders in the reader's own
 * language). This app's dictionaries are plain objects rather than a key table,
 * so the translator reports `has: false`: the keys ride along untouched and the
 * caller's already-localised `fallback` is what gets stored as the text.
 *
 * Best-effort by design: a notification that fails must never undo work that is
 * already recorded.
 */
const KEYS_ONLY: Translator = Object.assign((key: string) => key, { has: () => false });

export type MfgNotifyInput = Omit<MfgEvent, "copy" | "organizationId" | "actor"> & {
  /** Rendered in the sender's language — what push and this app display. */
  fallback: { title: string; message: string };
};

export function useMfgNotify() {
  const { user } = useAuth();

  return useCallback(
    async (input: MfgNotifyInput): Promise<void> => {
      if (!user) return;
      try {
        await emitMfgEvent(db, {
          ...input,
          copy: KEYS_ONLY,
          organizationId: user.organizationId,
          actor: { id: user.uid, name: user.displayName || user.email || "" },
        });
      } catch (e: any) {
        if (__DEV__) console.warn("[useMfgNotify]", e?.message);
      }
    },
    [user]
  );
}
