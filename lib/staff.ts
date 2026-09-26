// lib/staff.ts
//
// A staff session (role === "staff") acts on behalf of a vendor
// (session.user.parentVendorId), but a staff member's OWN id is what's
// stored on staff_permissions and staff_accounts records. Every dashboard
// data call that currently does `.eq("vendor_id", session.user.id)` needs
// to use getEffectiveVendorId(session) instead, or a staff login would see
// an empty dashboard (nothing in the DB is owned by the staff row's own id).

import type { Session } from "next-auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const STAFF_PERMISSION_KEYS = [
  "products",
  "orders",
  "broadcasts",
  "analytics",
  "store_settings",
] as const;

export type StaffPermissionKey = (typeof STAFF_PERMISSION_KEYS)[number];

export const STAFF_PERMISSION_LABELS: Record<StaffPermissionKey, string> = {
  products: "Products",
  orders: "Orders",
  broadcasts: "Broadcasts",
  analytics: "Analytics (view only)",
  store_settings: "Store settings",
};

export type StaffPermissionMap = Record<StaffPermissionKey, boolean>;

function emptyPermissionMap(): StaffPermissionMap {
  return {
    products: false,
    orders: false,
    broadcasts: false,
    analytics: false,
    store_settings: false,
  };
}

// The id whose data this session should see - the vendor's own id for a
// vendor session, or the parent vendor's id for a staff session. Returns
// null for any other role (nothing to resolve).
export function getEffectiveVendorId(session: Pick<Session, "user"> | null | undefined): string | null {
  if (!session?.user) return null;
  if (session.user.role === "vendor") return session.user.id;
  if (session.user.role === "staff") return session.user.parentVendorId ?? null;
  return null;
}

export async function getStaffPermissions(staffUserId: string): Promise<StaffPermissionMap> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("staff_permissions")
    .select("permission_key, enabled")
    .eq("staff_user_id", staffUserId);

  const map = emptyPermissionMap();
  for (const row of data ?? []) {
    if (row.permission_key in map) {
      map[row.permission_key as StaffPermissionKey] = row.enabled === true;
    }
  }
  return map;
}

// Vendors always pass every check (it's their own store). Staff pass only
// the checked boxes. Everyone else (admin/customer) never does - this is a
// vendor-workspace check, not a general auth check.
export function hasStaffPermission(
  session: Pick<Session, "user"> | null | undefined,
  key: StaffPermissionKey,
  permissions?: StaffPermissionMap
): boolean {
  if (!session?.user) return false;
  if (session.user.role === "vendor") return true;
  if (session.user.role === "staff") return permissions?.[key] === true;
  return false;
}

export interface StaffAccountRow {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  permissions: StaffPermissionMap;
}

export async function listStaffAccounts(vendorId: string): Promise<StaffAccountRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data: staffUsers } = await supabase
    .from("users")
    .select("id, full_name, email, created_at")
    .eq("parent_vendor_id", vendorId)
    .eq("role", "staff")
    .order("created_at", { ascending: true });

  if (!staffUsers || staffUsers.length === 0) return [];

  const { data: permRows } = await supabase
    .from("staff_permissions")
    .select("staff_user_id, permission_key, enabled")
    .in("staff_user_id", staffUsers.map((u) => u.id));

  return staffUsers.map((u) => {
    const map = emptyPermissionMap();
    for (const row of permRows ?? []) {
      if (row.staff_user_id === u.id && row.permission_key in map) {
        map[row.permission_key as StaffPermissionKey] = row.enabled === true;
      }
    }
    return { ...u, permissions: map };
  });
}
