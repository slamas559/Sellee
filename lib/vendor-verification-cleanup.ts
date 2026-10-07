// lib/vendor-verification-cleanup.ts  (server only)
//
// Vendors upload their ID photos first and submit second, so a vendor who
// uploads and then walks away leaves orphaned files in the private bucket.
// This removes files older than a day that no submission points at.

import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { VERIFICATION_BUCKET } from "@/lib/verification-constants";

const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FOLDERS_PER_RUN = 200;

export async function cleanupAbandonedVerificationUploads(): Promise<{ foldersScanned: number; filesRemoved: number }> {
  const supabase = createAdminSupabaseClient();
  const bucket = supabase.storage.from(VERIFICATION_BUCKET);

  // Top level holds one folder per store id.
  const { data: folders, error: foldersError } = await bucket.list("", { limit: MAX_FOLDERS_PER_RUN });
  if (foldersError || !folders) {
    logDevError("verification-cleanup.list-root", foldersError);
    return { foldersScanned: 0, filesRemoved: 0 };
  }

  let foldersScanned = 0;
  let filesRemoved = 0;

  for (const folder of folders) {
    const storeId = folder.name;
    foldersScanned += 1;

    const { data: files } = await bucket.list(storeId, { limit: 200 });
    const oldFiles = (files ?? []).filter(
      (file) => file.created_at && Date.now() - new Date(file.created_at).getTime() > MIN_AGE_MS,
    );
    if (oldFiles.length === 0) continue;

    const { data: submissions } = await supabase
      .from("vendor_verifications")
      .select("document_path, selfie_path")
      .eq("store_id", storeId);

    const referenced = new Set<string>();
    for (const row of submissions ?? []) {
      if (row.document_path) referenced.add(row.document_path as string);
      if (row.selfie_path) referenced.add(row.selfie_path as string);
    }

    const orphaned = oldFiles.map((file) => `${storeId}/${file.name}`).filter((path) => !referenced.has(path));
    if (orphaned.length === 0) continue;

    const { error: removeError } = await bucket.remove(orphaned);
    if (removeError) {
      logDevError("verification-cleanup.remove", removeError, { storeId });
      continue;
    }
    filesRemoved += orphaned.length;
  }

  return { foldersScanned, filesRemoved };
}
