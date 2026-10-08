// lib/vendor-verification-cleanup.ts  (server only)
//
// Daily housekeeping for the private ID-photo bucket. Three jobs:
//
//  1. Start the clock on records whose account was deleted. Those records
//     survive (see verification-retention.sql); their photos are kept for
//     DELETED_ACCOUNT_PHOTO_RETENTION_DAYS and then deleted.
//  2. Delete photos whose scheduled purge date has passed (rejected
//     submissions, deleted accounts). Records under an admin hold are skipped.
//  3. Delete uploads nobody ever submitted (a vendor uploads, then walks away).
//     A file is only "abandoned" if NO record points at it, so the photos of
//     deleted accounts are never swept up here.

import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { DELETED_ACCOUNT_PHOTO_RETENTION_DAYS, VERIFICATION_BUCKET } from "@/lib/verification-constants";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FOLDERS_PER_RUN = 200;
const MAX_PURGES_PER_RUN = 100;

export type RetentionRunResult = {
  deletedAccountsMarked: number;
  photosPurged: number;
  abandonedUploadsRemoved: number;
};

async function markDeletedAccounts(): Promise<number> {
  const supabase = createAdminSupabaseClient();

  const { data: rows, error } = await supabase
    .from("vendor_verifications")
    .select("id, photos_purge_at, photos_purged_at")
    .is("account_deleted_at", null)
    .or("store_id.is.null,vendor_id.is.null")
    .limit(200);

  if (error) {
    logDevError("verification-retention.mark-deleted", error);
    return 0;
  }

  const now = new Date();
  let marked = 0;

  for (const row of rows ?? []) {
    const needsPurgeDate = !row.photos_purge_at && !row.photos_purged_at;
    const { error: updateError } = await supabase
      .from("vendor_verifications")
      .update({
        account_deleted_at: now.toISOString(),
        ...(needsPurgeDate
          ? { photos_purge_at: new Date(now.getTime() + DELETED_ACCOUNT_PHOTO_RETENTION_DAYS * DAY_MS).toISOString() }
          : {}),
      })
      .eq("id", row.id as string);

    if (updateError) {
      logDevError("verification-retention.mark-deleted.update", updateError, { id: row.id });
      continue;
    }
    marked += 1;
  }

  return marked;
}

async function purgeDuePhotos(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const bucket = supabase.storage.from(VERIFICATION_BUCKET);

  const { data: due, error } = await supabase
    .from("vendor_verifications")
    .select("id, document_path, selfie_path")
    .lte("photos_purge_at", new Date().toISOString())
    .is("photos_purged_at", null)
    .eq("retention_hold", false)
    .limit(MAX_PURGES_PER_RUN);

  if (error) {
    logDevError("verification-retention.purge-list", error);
    return 0;
  }

  let purged = 0;

  for (const row of due ?? []) {
    const paths = [row.document_path, row.selfie_path].filter((path): path is string => Boolean(path));

    if (paths.length > 0) {
      const { error: removeError } = await bucket.remove(paths);
      if (removeError) {
        logDevError("verification-retention.purge-remove", removeError, { id: row.id });
        continue;
      }
    }

    // Keep the row (the audit record) but drop its pointers to the files.
    const { error: updateError } = await supabase
      .from("vendor_verifications")
      .update({ photos_purged_at: new Date().toISOString(), document_path: null, selfie_path: null })
      .eq("id", row.id as string);

    if (updateError) {
      logDevError("verification-retention.purge-update", updateError, { id: row.id });
      continue;
    }
    purged += 1;
  }

  return purged;
}

async function removeAbandonedUploads(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const bucket = supabase.storage.from(VERIFICATION_BUCKET);

  // The top level holds one folder per store id.
  const { data: folders, error: foldersError } = await bucket.list("", { limit: MAX_FOLDERS_PER_RUN });
  if (foldersError || !folders) {
    logDevError("verification-retention.list-root", foldersError);
    return 0;
  }

  let removed = 0;

  for (const folder of folders) {
    const { data: files } = await bucket.list(folder.name, { limit: 200 });
    const oldPaths = (files ?? [])
      .filter((file) => file.created_at && Date.now() - new Date(file.created_at).getTime() > DAY_MS)
      .map((file) => `${folder.name}/${file.name}`);
    if (oldPaths.length === 0) continue;

    // Referenced by ANY record, whatever happened to its store or vendor.
    const [byDocument, bySelfie] = await Promise.all([
      supabase.from("vendor_verifications").select("document_path").in("document_path", oldPaths),
      supabase.from("vendor_verifications").select("selfie_path").in("selfie_path", oldPaths),
    ]);

    const referenced = new Set<string>();
    for (const row of byDocument.data ?? []) if (row.document_path) referenced.add(row.document_path as string);
    for (const row of bySelfie.data ?? []) if (row.selfie_path) referenced.add(row.selfie_path as string);

    const orphaned = oldPaths.filter((path) => !referenced.has(path));
    if (orphaned.length === 0) continue;

    const { error: removeError } = await bucket.remove(orphaned);
    if (removeError) {
      logDevError("verification-retention.remove-abandoned", removeError, { folder: folder.name });
      continue;
    }
    removed += orphaned.length;
  }

  return removed;
}

export async function runVerificationRetention(): Promise<RetentionRunResult> {
  // Order matters: start deleted-account clocks first so a freshly orphaned
  // record is never purged in the same run.
  const deletedAccountsMarked = await markDeletedAccounts();
  const photosPurged = await purgeDuePhotos();
  const abandonedUploadsRemoved = await removeAbandonedUploads();

  return { deletedAccountsMarked, photosPurged, abandonedUploadsRemoved };
}
