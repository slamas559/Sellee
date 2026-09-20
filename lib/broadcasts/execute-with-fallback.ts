// lib/broadcasts/execute-with-fallback.ts
//
// Ties together the two channels built separately: WhatsApp (existing,
// synchronous, lib/whatsapp-bot/broadcasts.ts) and email (queue-based,
// lib/broadcasts/send-email-broadcast.ts). This is the only place that
// decides WHO gets email when both channels are selected - everywhere else
// treats the two channels as independent.

import {
  executeBroadcastNow,
  getBroadcastRecipientResults,
  type BroadcastExecutionResult,
} from "@/lib/whatsapp-bot/broadcasts";
import { resolveEmailBroadcastTargets } from "@/lib/broadcasts/email-audience";
import { createVendorEmailBroadcast, processVendorEmailBroadcastBatch } from "@/lib/broadcasts/send-email-broadcast";

type TargetScope = "followers" | "customers" | "all";
type Channel = "whatsapp" | "email";

const FIRST_BATCH_SIZE = 25;

export interface BroadcastWithFallbackParams {
  vendorId: string;
  storeId: string;
  targetScope: TargetScope;
  channels: Channel[];
  whatsappMessage: string;
  // Only used when "email" is in channels. The composer UI should always
  // supply a real one; this fallback exists so the function doesn't throw
  // over a missing subject line for what's otherwise a valid send.
  emailSubject?: string;
  emailBody?: string;
}

export interface BroadcastWithFallbackResult {
  whatsapp?: BroadcastExecutionResult;
  email?: {
    broadcastId: string;
    recipientCount: number;
    firstBatchSent: number;
    firstBatchFailed: number;
    isFallback: boolean;
  };
}

export async function executeBroadcastWithFallback(
  params: BroadcastWithFallbackParams,
): Promise<BroadcastWithFallbackResult> {
  const { vendorId, storeId, targetScope, channels, whatsappMessage, emailSubject, emailBody } = params;
  const result: BroadcastWithFallbackResult = {};

  const sendsWhatsApp = channels.includes("whatsapp");
  const sendsEmail = channels.includes("email");

  if (sendsWhatsApp) {
    result.whatsapp = await executeBroadcastNow({
      vendorId,
      storeId,
      message: whatsappMessage,
      targetScope,
    });
  }

  if (sendsEmail) {
    const subject = emailSubject?.trim() || "An update from your store";
    const body = emailBody?.trim() || whatsappMessage;

    let explicitRecipients: Awaited<ReturnType<typeof resolveEmailBroadcastTargets>> | undefined;
    let isFallback = false;

    if (sendsWhatsApp && result.whatsapp) {
      // Both channels: email is a gap-filler, not a second copy of the same
      // broadcast to everyone. Only the recipients WhatsApp didn't confirm
      // sending to get an email - anyone it successfully reached does not.
      const whatsappOutcomes = await getBroadcastRecipientResults(result.whatsapp.broadcastId);
      const unreachedPhones = new Set(
        whatsappOutcomes.filter((r) => r.status === "failed").map((r) => r.phone),
      );

      const fullAudience = await resolveEmailBroadcastTargets(storeId, targetScope);
      explicitRecipients = fullAudience.filter((r) => r.phone && unreachedPhones.has(r.phone));
      isFallback = true;
    }
    // else: email-only mode - createVendorEmailBroadcast resolves the full
    // audience itself when explicitRecipients is omitted.

    const created = await createVendorEmailBroadcast({
      vendorId,
      storeId,
      subject,
      body,
      targetScope,
      sourceWhatsAppBroadcastId: isFallback ? result.whatsapp?.broadcastId : undefined,
      explicitRecipients,
    });

    if ("error" in created) {
      throw new Error(created.error);
    }

    // Send the first batch immediately rather than making a small list wait
    // for the next cron tick - same reasoning as the admin broadcast route.
    const firstBatch =
      created.recipientCount > 0
        ? await processVendorEmailBroadcastBatch(created.broadcastId, FIRST_BATCH_SIZE)
        : { sent: 0, failed: 0 };

    result.email = {
      broadcastId: created.broadcastId,
      recipientCount: created.recipientCount,
      firstBatchSent: firstBatch.sent,
      firstBatchFailed: firstBatch.failed,
      isFallback,
    };
  }

  return result;
}