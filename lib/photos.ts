import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Photo storage (migration 0023).
 *
 * - Fuel receipts and vehicle-check photos go in the PRIVATE bucket
 *   "private-photos", under "<organisation id>/<uploader id>/...". The
 *   database stores a reference like "private:<path>", never a public
 *   link. Pages turn references into short-lived signed links for the
 *   viewer, and Storage's own rules decide who may sign them: admins of
 *   that organisation, or the driver who uploaded it.
 * - Vehicle photos stay in the public "vehicle-photos" bucket (they're
 *   shown on every driver screen and aren't sensitive), now under
 *   "vehicles/<organisation id>/...".
 * - Older rows may still hold full public URLs from before 0023. Those keep
 *   working as-is; every helper here accepts both.
 */

export const PRIVATE_BUCKET = "private-photos";
export const PUBLIC_BUCKET = "vehicle-photos";
const PRIVATE_PREFIX = "private:";
const SIGNED_URL_SECONDS = 60 * 60;

export function privateRef(path: string): string {
  return `${PRIVATE_PREFIX}${path}`;
}

export function isPrivateRef(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PRIVATE_PREFIX);
}

/** Bucket + path for any stored photo value (private ref or legacy public URL). */
export function storageLocation(value: string | null | undefined): { bucket: string; path: string } | null {
  if (!value) return null;
  if (isPrivateRef(value)) return { bucket: PRIVATE_BUCKET, path: value.slice(PRIVATE_PREFIX.length) };
  const marker = `/object/public/${PUBLIC_BUCKET}/`;
  const i = value.indexOf(marker);
  if (i === -1) return null;
  return { bucket: PUBLIC_BUCKET, path: decodeURIComponent(value.slice(i + marker.length).split("?")[0]) };
}

export function fileExtension(file: File): string {
  return file.type.split("/")[1]?.replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
}

/**
 * Turns stored photo values into links the current viewer can open:
 * private refs become signed links (1 hour) using the viewer's own
 * client, so Storage rules apply; legacy public URLs pass through.
 * Anything the viewer isn't allowed to see maps to null.
 */
export async function resolvePhotoUrls(
  client: SupabaseClient,
  values: (string | null | undefined)[]
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const privatePaths: string[] = [];
  for (const v of values) {
    if (!v || out.has(v)) continue;
    if (isPrivateRef(v)) {
      out.set(v, null);
      privatePaths.push(v.slice(PRIVATE_PREFIX.length));
    } else {
      out.set(v, v);
    }
  }
  if (privatePaths.length > 0) {
    const { data } = await client.storage.from(PRIVATE_BUCKET).createSignedUrls(privatePaths, SIGNED_URL_SECONDS);
    for (const row of data ?? []) {
      if (row.path && row.signedUrl && !row.error) out.set(privateRef(row.path), row.signedUrl);
    }
  }
  return out;
}

/** Same as resolvePhotoUrls, applied to one field on a list of rows. */
export async function withPhotoUrls<T extends Record<string, any>>(
  client: SupabaseClient,
  rows: T[],
  field: keyof T & string
): Promise<T[]> {
  const urls = await resolvePhotoUrls(client, rows.map((r) => r[field] as string | null));
  return rows.map((r) => (r[field] ? { ...r, [field]: urls.get(r[field] as string) ?? null } : r));
}

/**
 * Deletes the files behind stored photo values (best-effort; never
 * throws). Use the service-role client: it runs after the rows that
 * pointed at the files are already gone.
 */
export async function removePhotos(admin: SupabaseClient, values: (string | null | undefined)[]): Promise<void> {
  const byBucket = new Map<string, string[]>();
  for (const v of values) {
    const loc = storageLocation(v);
    if (!loc) continue;
    byBucket.set(loc.bucket, [...(byBucket.get(loc.bucket) ?? []), loc.path]);
  }
  for (const [bucket, paths] of Array.from(byBucket.entries())) {
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) console.error("removePhotos failed", bucket, error.message);
    }
  }
}
