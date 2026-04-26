import { logDevError } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

type InboundLogParams = {
  senderPhone: string;
  messageText: string;
  command: string;
  role: "vendor" | "customer" | "system";
  status: "ok" | "error";
  errorMessage?: string;
  providerPayload?: unknown;
};

export async function logInboundMessage(params: InboundLogParams) {
  try {
    const supabase = createAdminSupabaseClient();
    await supabase.from("whatsapp_message_logs").insert({
      direction: "inbound",
      sender_phone: params.senderPhone,
      message_text: params.messageText,
      command: params.command,
      role: params.role,
      status: params.status,
      error_message: params.errorMessage ?? null,
      provider_payload: params.providerPayload ?? null,
    });
  } catch (error) {
    logDevError("whatsapp.logs.inbound", error, {
      senderPhone: params.senderPhone,
      command: params.command,
    });
  }
}
