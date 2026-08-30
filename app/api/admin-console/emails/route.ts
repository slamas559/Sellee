import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { logDevError } from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit-log";
import { resolveAudience, processBroadcastBatch } from "@/lib/email-broadcasts";

// Without this, Vercel's default function timeout (10s on Hobby) can kill
// the request mid-batch: 25 recipients * 250ms pacing alone is already
// 6.25s, before any real network time to Resend. 60s gives real headroom.
export const maxDuration = 60;

const FIRST_BATCH_SIZE = 25;
// A sanity ceiling, not an architectural limit - the queue+cron design
// underneath this can handle far more, but a send this large is almost
// certainly a mistake (wrong segment picked) worth a second confirmation
// rather than firing off silently.
const MAX_AUDIENCE_SIZE = 5000;

const sendSchema = z.object({
  segment: z.enum(["all_customers", "all_vendors", "verified_vendors", "niche"]),
  nicheId: z.string().uuid().optional(),
  subject: z.string().min(3).max(200),
  body: z.string().min(1).max(20000),
});

export async function GET() {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("email_broadcasts")
    .select("id, segment, niche_id, subject, recipient_count, sent_count, failed_count, status, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logDevError("admin-console.emails.list", error);
    return NextResponse.json({ error: "Could not load broadcasts." }, { status: 500 });
  }

  return NextResponse.json({ broadcasts: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the subject and message body." }, { status: 400 });
  }

  const { segment, nicheId, subject, body: message } = parsed.data;
  if (segment === "niche" && !nicheId) {
    return NextResponse.json({ error: "Pick a niche for this segment." }, { status: 400 });
  }

  const audience = await resolveAudience(segment, nicheId);
  if (audience.length === 0) {
    return NextResponse.json({ error: "No active accounts match this segment." }, { status: 400 });
  }
  if (audience.length > MAX_AUDIENCE_SIZE) {
    return NextResponse.json(
      { error: `This segment has ${audience.length} recipients, above the ${MAX_AUDIENCE_SIZE} safety cap. Narrow it down.` },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();

  const { data: broadcast, error: createError } = await supabase
    .from("email_broadcasts")
    .insert({
      admin_id: session.user.id,
      segment,
      niche_id: nicheId ?? null,
      subject,
      body: message,
      recipient_count: audience.length,
    })
    .select("id")
    .single();

  if (createError || !broadcast) {
    logDevError("admin-console.emails.create", createError, { segment });
    return NextResponse.json({ error: "Could not create broadcast." }, { status: 500 });
  }

  const { error: recipientsError } = await supabase.from("email_broadcast_recipients").insert(
    audience.map((recipient) => ({
      broadcast_id: broadcast.id,
      user_id: recipient.user_id,
      email: recipient.email,
      full_name: recipient.full_name,
    })),
  );

  if (recipientsError) {
    logDevError("admin-console.emails.recipients", recipientsError, { broadcastId: broadcast.id });
    return NextResponse.json({ error: "Could not queue recipients." }, { status: 500 });
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "email.broadcast_created",
    targetType: "email_broadcast",
    targetId: broadcast.id,
    metadata: { segment, nicheId, subject, recipientCount: audience.length },
  });

  // Send the first batch synchronously so a small audience finishes
  // immediately and the admin sees real results, not just "queued".
  // Anything left over is picked up by the cron runner.
  const firstBatch = await processBroadcastBatch(broadcast.id, FIRST_BATCH_SIZE);

  return NextResponse.json({
    ok: true,
    broadcastId: broadcast.id,
    recipientCount: audience.length,
    sentSoFar: firstBatch.sent,
    failedSoFar: firstBatch.failed,
    remaining: firstBatch.remaining,
  });
}