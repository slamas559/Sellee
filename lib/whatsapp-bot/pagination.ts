import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { waList, waMessage, waTitle } from "@/lib/whatsapp-bot/message-format";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-cloud";

type ConversationRole = "vendor" | "customer" | "unknown";

type ListPaginationPayload = {
  kind: "list";
  title: string;
  lines: string[];
  index: number;
  pageSize: number;
  hint?: string;
};

function buildListPageMessage(
  payload: ListPaginationPayload,
  startIndex: number,
): { message: string; nextIndex: number; hasMore: boolean } {
  const safePageSize = Math.max(1, payload.pageSize || 5);
  const nextIndex = Math.min(startIndex + safePageSize, payload.lines.length);
  const currentPage = payload.lines.slice(startIndex, nextIndex);
  const remaining = payload.lines.length - nextIndex;
  const hasMore = remaining > 0;

  const tail = hasMore
    ? `Reply *MORE* to see ${Math.min(safePageSize, remaining)} more item(s).`
    : payload.hint;

  return {
    message: waMessage(
      waTitle(payload.title),
      waList(currentPage),
      tail,
    ),
    nextIndex,
    hasMore,
  };
}

async function savePaginationSession(
  phone: string,
  role: ConversationRole,
  payload: ListPaginationPayload,
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("bot_conversations")
    .upsert(
      {
        phone,
        role,
        state: "awaiting_more",
        payload,
        last_message_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "phone" },
    );
  if (error) {
    throw new Error(error.message);
  }
}

async function clearPaginationSession(phone: string, role: ConversationRole): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("bot_conversations")
    .upsert(
      {
        phone,
        role,
        state: "idle",
        payload: {},
        last_message_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "phone" },
    );
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPaginatedList(params: {
  to: string;
  role: ConversationRole;
  title: string;
  lines: string[];
  pageSize?: number;
  emptyMessage: string;
  hint?: string;
}): Promise<void> {
  const phone = normalizeWhatsAppNumber(params.to);
  const pageSize = Math.max(1, params.pageSize ?? 5);

  if (params.lines.length === 0) {
    await clearPaginationSession(phone, params.role);
    await sendWhatsAppTextMessage({
      to: params.to,
      message: params.emptyMessage,
    });
    return;
  }

  const payload: ListPaginationPayload = {
    kind: "list",
    title: params.title,
    lines: params.lines,
    index: 0,
    pageSize,
    hint: params.hint,
  };

  const page = buildListPageMessage(payload, 0);
  await sendWhatsAppTextMessage({
    to: params.to,
    message: page.message,
  });

  if (page.hasMore) {
    await savePaginationSession(phone, params.role, {
      ...payload,
      index: page.nextIndex,
    });
  } else {
    await clearPaginationSession(phone, params.role);
  }
}

export async function handleMorePagination(from: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const phone = normalizeWhatsAppNumber(from);

  const { data, error } = await supabase
    .from("bot_conversations")
    .select("role, state, payload")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const state = String(data?.state ?? "");
  const rawPayload = (data?.payload ?? {}) as Partial<ListPaginationPayload>;

  if (
    state !== "awaiting_more" ||
    rawPayload.kind !== "list" ||
    !rawPayload.title ||
    !Array.isArray(rawPayload.lines)
  ) {
    return false;
  }

  const payload: ListPaginationPayload = {
    kind: "list",
    title: rawPayload.title,
    lines: rawPayload.lines,
    index: Number(rawPayload.index ?? 0),
    pageSize: Number(rawPayload.pageSize ?? 5),
    hint: rawPayload.hint,
  };

  const page = buildListPageMessage(payload, payload.index);
  await sendWhatsAppTextMessage({
    to: from,
    message: page.message,
  });

  const role = (data?.role as ConversationRole | null) ?? "unknown";
  if (page.hasMore) {
    await savePaginationSession(phone, role, {
      ...payload,
      index: page.nextIndex,
    });
  } else {
    await clearPaginationSession(phone, role);
  }

  return true;
}
