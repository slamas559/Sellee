import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { sendWelcomeEmail } from "@/app/actions/emails";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function deriveGoogleDisplayName(name: string | null | undefined, email: string): string {
  const googleName = name?.trim() || null;
  const emailLocal = email.split("@")[0] ?? "";

  return (
    googleName ||
    emailLocal
      .replace(/[._-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") ||
    "Sellee User"
  );
}

async function isDeletedAccountEmail(email: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase
    .from("deleted_users")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    logDevError("auth.deleted-users.lookup", error, { email: normalizedEmail });
    return false;
  }

  return Boolean(data?.email);
}

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
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
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

        const email = normalizeEmail(parsed.data.email);
        const supabase = createAdminSupabaseClient();

        const { data: user, error } = await supabase
          .from("users")
          .select("id, email, full_name, password_hash, role")
          .eq("email", email)
          .single();

        if (error || !user) {
          if (error) {
            logDevError("auth.credentials.user-lookup", error, {
              email,
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
          name: user.full_name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role ?? "customer";
        token.name = user.name ?? token.name;
        token.isDeleted = false;
      }

      if (token.sub) {
        const supabase = createAdminSupabaseClient();
        const { data: profile } = await supabase
          .from("users")
          .select("email, role, full_name")
          .eq("id", token.sub)
          .maybeSingle();

        if (!profile) {
          token.isDeleted = true;
          token.role = undefined;
          token.name = undefined;
          return token;
        }

        token.isDeleted = false;
        token.email = profile.email ?? token.email;
        if (profile?.role === "vendor" || profile?.role === "customer") {
          token.role = profile.role;
        }
        if (profile?.full_name) {
          token.name = profile.full_name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.isDeleted) {
          session.user.id = "";
          session.user.role = "customer";
          session.user.name = null;
          session.error = "UserDeleted";
          return session;
        }

        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "vendor" | "customer") ?? "customer";
        session.user.name = token.name ?? session.user.name;
      }

      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return true;
      }

      const email = normalizeEmail(user.email);
      if (await isDeletedAccountEmail(email)) {
        logDevError("auth.google.deleted-account", "Deleted account attempted Google sign-in", {
          email,
        });
        return false;
      }

      const supabase = createAdminSupabaseClient();
      const derivedName = deriveGoogleDisplayName(user.name, email);

      const { data: existingUser, error: existingError } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .eq("email", email)
        .maybeSingle();

      if (existingError) {
        logDevError("auth.google.lookup-user", existingError, { email });
        return false;
      }

      if (existingUser) {
        user.id = String(existingUser.id);
        user.email = existingUser.email;
        user.name = existingUser.full_name?.trim() || derivedName;
        user.role = existingUser.role as "vendor" | "customer";

        // Update name from Google if the stored name is null/empty
        if (!existingUser.full_name?.trim() && derivedName) {
          await supabase
            .from("users")
            .update({ full_name: derivedName })
            .eq("id", existingUser.id);
        }
        return true;
      }

      // New user via Google — create the account and send welcome email
      const { data: created, error: createError } = await supabase
        .from("users")
        .insert({
          full_name: derivedName,
          email,
          role: "customer",
          // Google OAuth users don't have a password; use a sentinel value
          password_hash: "oauth-google",
        })
        .select("id, full_name, email, role")
        .single();

      if (createError || !created) {
        logDevError("auth.google.create-user", createError, { email });
        return false;
      }

      user.id = String(created.id);
      user.email = created.email;
      user.name = created.full_name ?? derivedName;
      user.role = created.role as "vendor" | "customer";

      // Send welcome email to newly registered Google OAuth user
      try {
        const welcomeResult = await sendWelcomeEmail({
          to: created.email,
          name: created.full_name ?? derivedName,
          role: created.role as "vendor" | "customer",
        });

        if (!welcomeResult.success) {
          logDevError("auth.google.welcome-email", welcomeResult.error, {
            userId: created.id,
            email: created.email,
          });
        }
      } catch (emailError) {
        // Non-blocking — log but don't fail sign-in
        logDevError("auth.google.welcome-email.exception", emailError, {
          email,
        });
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) {
          return url;
        }
      } catch {
        // Not a parseable absolute URL - fall through to the safe default.
      }

      return baseUrl;
    },
  },
};