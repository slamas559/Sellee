import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { slugify } from "@/lib/format";
import { logDevError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(10).max(20),
  role: z.enum(["vendor", "customer"]).default("vendor"),
});

function toTitleCase(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveDefaultStoreName(email: string): string {
  const local = email.split("@")[0] ?? "vendor";
  const cleaned = local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  const name = toTitleCase(cleaned || "Vendor");
  return `${name} Store`;
}

async function createOrUpdateVendorStore(params: {
  userId: string;
  email: string;
  phone: string;
}) {
  const supabase = createAdminSupabaseClient();

  const { data: existingStore, error: existingStoreError } = await supabase
    .from("stores")
    .select("id, name")
    .eq("vendor_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingStoreError) {
    throw new Error(existingStoreError.message);
  }

  if (existingStore) {
    const { error: updateError } = await supabase
      .from("stores")
      .update({
        whatsapp_number: params.phone,
        is_active: true,
      })
      .eq("id", existingStore.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const storeName = deriveDefaultStoreName(params.email);
  const baseSlug = slugify(storeName) || `vendor-${params.userId.slice(0, 8)}`;
  let slug = baseSlug;

  for (let index = 0; index < 30; index += 1) {
    const { data: takenSlug } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (!takenSlug || takenSlug.length === 0) {
      break;
    }

    slug = `${baseSlug}-${index + 1}`;
  }

  const { error: insertError } = await supabase.from("stores").insert({
    vendor_id: params.userId,
    name: storeName,
    slug,
    whatsapp_number: params.phone,
    store_template: "classic",
    theme_color: "#0ea5e9",
    is_active: true,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return realIp ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`register:${ip}`, 8, 15 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many registration attempts. Please wait a few minutes and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
          },
        },
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Please check your details. Email must be valid and password at least 8 characters.",
        },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizeWhatsAppNumber(parsed.data.phone);

    if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 20) {
      return NextResponse.json(
        {
          error: "Phone number must be 10-20 digits.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", parsed.data.email)
      .maybeSingle();

    if (existingUserError) {
      logDevError("register.check-existing", existingUserError, {
        email: parsed.data.email,
      });

      return NextResponse.json(
        {
          error: "Could not check existing account.",
          details:
            process.env.NODE_ENV === "development"
              ? existingUserError.message
              : undefined,
          code:
            process.env.NODE_ENV === "development"
              ? existingUserError.code
              : undefined,
        },
        { status: 500 },
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const { data, error } = await supabase
      .from("users")
      .insert({
        email: parsed.data.email,
        phone: normalizedPhone,
        role: parsed.data.role,
        password_hash: passwordHash,
      })
      .select("id, email, role, phone")
      .single();

    if (error || !data) {
      logDevError("register.create-user", error, { email: parsed.data.email });

      return NextResponse.json(
        {
          error: "Could not create account. Please try again.",
          details:
            process.env.NODE_ENV === "development" ? error?.message : undefined,
          code: process.env.NODE_ENV === "development" ? error?.code : undefined,
        },
        { status: 500 },
      );
    }

    if (data.role === "vendor") {
      try {
        await createOrUpdateVendorStore({
          userId: data.id,
          email: data.email,
          phone: String(data.phone ?? normalizedPhone),
        });
      } catch (storeSyncError) {
        logDevError("register.store-sync", storeSyncError, { userId: data.id });
        await supabase.from("users").delete().eq("id", data.id);

        return NextResponse.json(
          {
            error: "Account setup failed while linking store. Please try again.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      message: "Account created successfully.",
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
      },
    });
  } catch (error) {
    logDevError("register.unhandled", error);

    return NextResponse.json(
      {
        error: "Unexpected server error during registration.",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      { status: 500 },
    );
  }
}
