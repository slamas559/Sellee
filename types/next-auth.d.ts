import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "vendor" | "customer";
    };
  }

  interface User {
    role?: "vendor" | "customer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "vendor" | "customer";
  }
}
