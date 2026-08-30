import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

/**
 * Turns a Supabase public storage URL back into its storage path within
 * the given bucket (e.g. "<vendorId>/<uuid>.jpg"), so it can be passed to
 * `storage.remove()`. Returns null for anything that isn't a URL from that
 * bucket (defensive, in case a legacy/external URL ever ends up stored).
 */
export function storagePathFromPublicUrl(bucket: string, url: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/**
 * Batch-deletes files from a Supabase storage bucket given their public
 * URLs. Never throws - a storage cleanup miss is logged, not fatal to
 * whatever DB operation triggered it (the row is already gone either way).
 */
export async function deleteFromStorageBucket(bucket: string, urls: string[]): Promise<void> {
  const paths = [
    ...new Set(urls.map((url) => storagePathFromPublicUrl(bucket, url)).filter((p): p is string => !!p)),
  ];
  if (paths.length === 0) return;

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    logDevError("storage.cleanup", error, { bucket, paths });
  }
}
