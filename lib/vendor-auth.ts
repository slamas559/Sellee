// lib/vendor-auth.ts
//
// Shared guard for vendor-workspace API routes (products, orders,
// broadcasts, store settings, etc). Mirrors the inline
// `getServerSession` + role check every one of those routes already does,
// but resolves the effective vendor id (so staff sessions see the vendor's
// data, not their own empty id) and optionally checks a staff permission.
//
// Existing routes were all written before staff accounts existed, so they
// inline `getServerSession(authOptions)` and use `session.user.id` directly
// as the vendor id. Migrating a route to staff-awareness means swapping
// that pattern for this helper - see app/api/vendor/broadcasts/route.ts
// and send-now/route.ts for the applied example.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveVendorId, getStaffPermissions, hasStaffPermission, type StaffPermissionKey } from "@/lib/staff";

export interface VendorWorkspaceContext {
  session: Awaited<ReturnType<typeof getServerSession>> & { user: { id: string; role: string } };
  vendorId: string; // the store/data owner id - use this, never session.user.id directly
  isStaff: boolean;
}

// permission: pass a StaffPermissionKey to also block staff who don't have
// that box checked. Omit it for routes any staff member should reach
// (rare - most routes should pass one).
export async function requireVendorWorkspaceApi(
  permission?: StaffPermissionKey
): Promise<VendorWorkspaceContext | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "vendor" && session.user.role !== "staff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendorId = getEffectiveVendorId(session);
  if (!vendorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isStaff = session.user.role === "staff";

  if (isStaff && permission) {
    const permissions = await getStaffPermissions(session.user.id);
    if (!hasStaffPermission(session, permission, permissions)) {
      return NextResponse.json(
        { error: "Your staff account doesn't have access to this." },
        { status: 403 },
      );
    }
  }

  return { session, vendorId, isStaff } as VendorWorkspaceContext;
}
