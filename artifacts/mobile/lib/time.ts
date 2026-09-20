/**
 * Reading the timestamps the two apps write.
 *
 * `createdAt` is an ISO string on offers, chats and notifications — both apps
 * write `new Date().toISOString()` — while a few older mobile rows still hold a
 * Firestore Timestamp, and some collections use `serverTimestamp()`. A
 * comparator that understands only one shape silently returns 0 for the other,
 * which is how "newest first" became "document-id order" on the offer lists.
 */
export function createdAtMs(value: any): number {
  if (!value) return 0;
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().getTime();
    } catch {
      return 0;
    }
  }
  if (typeof value === "number") return value;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** Newest first, for a list sorted in memory. */
export function byNewest(a: any, b: any): number {
  return createdAtMs(b?.createdAt) - createdAtMs(a?.createdAt);
}

/**
 * A stored day (`YYYY-MM-DD`, or anything Date understands) in the reader's
 * language. Falls back to the raw value rather than printing "Invalid Date".
 */
export function formatDay(value: string | null | undefined, isRTL: boolean): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { day: "numeric", month: "short", year: "numeric" });
}
