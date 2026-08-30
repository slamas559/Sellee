import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "vendor" | "customer" | "admin";
    };
    error?: "UserDeleted" | "UserSuspended";
  }

  interface User {
    role?: "vendor" | "customer" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "vendor" | "customer" | "admin";
    isDeleted?: boolean;
    isSuspended?: boolean;
  }
}
