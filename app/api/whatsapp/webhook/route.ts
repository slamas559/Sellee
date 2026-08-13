import { NextResponse } from "next/server";
import { logDevError, logServerInfo } from "@/lib/logger";
import { logInboundMessage } from "@/lib/whatsapp-bot/logs";
import { waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";
import { inferCommand } from "@/lib/whatsapp-bot/parse";
import { routeIncomingText } from "@/lib/whatsapp-bot/router";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";
import type {
  WebhookDebugResult,
  WebhookPayload,
  WhatsAppStatusEvent,
} from "@/lib/whatsapp-bot/types";

const GENERIC_ERROR_REPLY = waMessage(
  waTitle("Something Went Wrong"),
  "I couldn't process that message. Please try again, or rephrase it.",
  "Send HELP to see what I can do.",
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return new Response("Missing WHATSAPP_WEBHOOK_VERIFY_TOKEN", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    logServerInfo("whatsapp.webhook.verify.ok");
    return new Response(challenge, { status: 200 });
  }

  logServerInfo("whatsapp.webhook.verify.forbidden", {
    mode,
    hasToken: Boolean(token),
  });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const query = new URL(request.url).searchParams;
  const debugRequested = query.get("debug") === "1";
  const debugAllowed =
    process.env.NODE_ENV === "development" ||
    process.env.WHATSAPP_WEBHOOK_DEBUG === "true";
  const debugEnabled = debugRequested && debugAllowed;

  try {
    const payload = (await request.json()) as WebhookPayload;
    const debugResults: WebhookDebugResult[] = [];
    const rawChanges = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];

    const messages = rawChanges
      .flatMap((change) => change.value?.messages ?? [])
      .filter((message) => message.type === "text" && message.from && message.text?.body);
    const statusEvents = rawChanges.flatMap(
      (change) => (change.value?.statuses ?? []) as WhatsAppStatusEvent[],
    );

    logServerInfo("whatsapp.webhook.received", {
      message_count: messages.length,
      status_count: statusEvents.length,
    });

    if (statusEvents.length > 0) {
      logServerInfo("whatsapp.webhook.status_events", {
        events: statusEvents.map((event) => ({
          id: event.id ?? null,
          status: event.status ?? null,
          recipient_id: event.recipient_id ?? null,
          errors: event.errors ?? null,
        })),
      });
    }

    for (const message of messages) {
      const from = String(message.from);
      const body = String(message.text?.body);
      const inferredCommand = inferCommand(body);

      try {
        const result = await routeIncomingText(from, body);
        logServerInfo("whatsapp.webhook.message.ok", {
          from,
          command: inferredCommand,
        });

        if (debugEnabled) {
          debugResults.push(result);
        }

        await logInboundMessage({
          senderPhone: from,
          messageText: body,
          command: inferredCommand,
          role: result.role,
          status: "ok",
          providerPayload: {
            raw: message,
            scope_store_id: result.scope_store_id ?? null,
          },
        });
      } catch (error) {
        logDevError("whatsapp.webhook.message", error, {
          from,
          body,
        });
        logServerInfo("whatsapp.webhook.message.error", {
          from,
          command: inferredCommand,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // The user should never be left without a reply just because a
        // handler threw. This is best-effort: if the outbound send also
        // fails, we still log it (below) but don't let it crash the loop.
        try {
          await sendWhatsAppTextMessage({ to: from, message: GENERIC_ERROR_REPLY });
        } catch (sendError) {
          logDevError("whatsapp.webhook.message.error_reply_failed", sendError, { from });
        }

        if (debugEnabled) {
          debugResults.push({
            from,
            body,
            inferred_command: inferredCommand,
            role: "system",
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Unknown command execution error",
          });
        }

        await logInboundMessage({
          senderPhone: from,
          messageText: body,
          command: inferredCommand,
          role: "system",
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : "Unknown command execution error",
          providerPayload: message,
        });
      }
    }

    if (debugEnabled) {
      const debugInfo = {
        message_count: messages.length,
        status_count: statusEvents.length,
        reasons:
          messages.length === 0
            ? [
                statusEvents.length > 0
                  ? "Payload contains WhatsApp status events but no inbound text messages."
                  : "No supported text messages found in payload.",
              ]
            : [],
        results: debugResults,
        status_events: statusEvents.map((event) => ({
          status: event.status ?? null,
          recipient_id: event.recipient_id ?? null,
          id: event.id ?? null,
        })),
      };

      return NextResponse.json({
        received: true,
        debug: debugInfo,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logDevError("whatsapp.webhook.unhandled", error);
    logServerInfo("whatsapp.webhook.unhandled", {
      error: error instanceof Error ? error.message : "Unknown parse error",
    });

    if (debugEnabled) {
      return NextResponse.json(
        {
          received: false,
          error:
            error instanceof Error ? error.message : "Unknown webhook parse error",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ received: false }, { status: 200 });
  }
}