import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "vendor" | "customer" | "admin" | "staff";
      // Only set when role === "staff" - the vendor this staff account acts
      // on behalf of. Every dashboard data call should resolve against this,
      // not session.user.id, when the session is a staff session.
      parentVendorId?: string | null;
    };
    error?: "UserDeleted" | "UserSuspended" | "StaffPlanRestricted";
  }

  interface User {
    role?: "vendor" | "customer" | "admin" | "staff";
    parentVendorId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "vendor" | "customer" | "admin" | "staff";
    parentVendorId?: string | null;
    isDeleted?: boolean;
    isSuspended?: boolean;
    isStaffPlanRestricted?: boolean;
  }
}
