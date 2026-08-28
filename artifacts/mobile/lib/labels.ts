/**
 * Looks up a translated label for a value that came out of Firestore.
 *
 * Status and stage fields are plain strings in the database — TypeScript's union
 * types describe what SHOULD be there, not what is. A document written by an
 * older build, or by a newer website that added a status this app has not
 * learned yet, indexes the translation map to `undefined` and the badge renders
 * blank. A blank badge is worse than an untranslated one: it looks like missing
 * data rather than an unrecognised value.
 *
 * So: translate when the value is known, otherwise show the raw value. The user
 * sees "partially_paid" instead of nothing, which is legible, obviously
 * un-localised, and reports itself as a value we should add.
 *
 * Use this for anything whose key comes from a document. Iterating a constant
 * (LEAD_STATUSES, PROJECT_STATUSES) needs no guard — the key is known good — and
 * neither does a value already normalised by a resolver such as
 * `resolveProjectStatus` or `opportunityTrack`.
 */
export function labelFor(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = "—"
): string {
  if (!value) return fallback;
  return map[value] ?? value;
}
