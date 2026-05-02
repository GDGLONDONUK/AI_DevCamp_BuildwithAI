/** Written onto `disabledUsers/{uid}` when archiving from `users/{uid}`. */
export const PROFILE_ARCHIVE_META_FIELDS = [
  "profileArchivedAt",
  "profileArchivedByUid",
  "profileArchivedReason",
] as const;

export type ProfileArchiveMetaField = (typeof PROFILE_ARCHIVE_META_FIELDS)[number];

export function stripProfileArchiveMeta<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const out = { ...data };
  for (const k of PROFILE_ARCHIVE_META_FIELDS) {
    delete out[k];
  }
  return out;
}
