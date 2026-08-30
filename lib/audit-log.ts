import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";

export interface AuditLogEntry {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records an admin action. Failures are logged but never thrown - losing an
 * audit row is a problem to notice and fix, not a reason to fail the admin
 * action that was actually requested.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("audit_log").insert({
    admin_id: entry.adminId,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    logDevError("audit-log.write", error, entry);
  }
}

export interface AuditLogRow {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function listAuditLog(limit = 100): Promise<AuditLogRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, admin_id, action, target_type, target_id, metadata, created_at, users(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logDevError("audit-log.list", error);
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const admin = row.users as { full_name?: string | null; email?: string | null } | null;
    return {
      id: row.id as string,
      admin_id: row.admin_id as string | null,
      admin_name: admin?.full_name ?? null,
      admin_email: admin?.email ?? null,
      action: row.action as string,
      target_type: row.target_type as string | null,
      target_id: row.target_id as string | null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at as string,
    };
  });
}
