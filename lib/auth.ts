import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const supabase = createAdminSupabaseClient();

        const { data: user, error } = await supabase
          .from("users")
          .select("id, email, password_hash, role")
          .eq("email", parsed.data.email)
          .single();

        if (error || !user) {
          if (error) {
            logDevError("auth.credentials.user-lookup", error, {
              email: parsed.data.email,
            });
          }
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          parsed.data.password,
          user.password_hash,
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? "vendor";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "vendor" | "customer") ?? "vendor";
      }

      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return true;
      }

      const supabase = createAdminSupabaseClient();
      const { error } = await supabase.from("users").upsert(
        {
          email: user.email,
          role: "vendor",
          password_hash: "oauth-google",
        },
        {
          onConflict: "email",
          ignoreDuplicates: false,
        },
      );

      if (error) {
        logDevError("auth.google.upsert-user", error, { email: user.email });
        return false;
      }

      return true;
    },
  },
};
