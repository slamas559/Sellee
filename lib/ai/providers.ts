import { logDevError, logServerInfo } from "@/lib/logger";

/**
 * Shared multi-provider LLM calling layer.
 *
 * Used by every AI feature in the app (the marketplace shopping assistant,
 * the vendor dashboard assistant, and the text refiner) so the failover
 * logic, malformed-tool-call detection, and network retry behavior live in
 * exactly one place instead of being copy-pasted per feature.
 *
 * Provider order: Groq -> Gemini -> OpenRouter (fastest/most reliable free
 * tier first). Every individual call tries each configured provider in
 * order and moves to the next on ANY failure - a bad response from one
 * provider never takes a whole conversation down.
 */

export type ProviderConfig = {
  name: string;
  url: string;
  apiKey: string;
  model: string;
};

export type ToolCall = {
  id: string;
  function: { name: string; arguments: string | Record<string, unknown> };
};

export type ProviderMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export type ToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

const AI_TIMEOUT_MS = 12_000;

export function parseToolArgs(raw: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// Some free/open models don't reliably populate the standard OpenAI
// `tool_calls` field - instead they emit their OWN pseudo-tool-call syntax
// as plain text content (e.g. Hermes/Qwen-style
// "<tool_call>name<arg_key>...</arg_key>..." or Groq's "<function=...>").
// If that leaks through, treat it as a failed call rather than showing raw
// syntax to the user - the caller will move on to the next provider.
export function looksLikeMalformedToolCallText(content: string | null | undefined): boolean {
  if (!content) return false;
  return /<tool_call>|<\/tool_call>|<function=|<arg_key>|<arg_value>/i.test(content);
}

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const attempt = async (perAttemptTimeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), perAttemptTimeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await attempt(timeoutMs);
  } catch (error) {
    // One short retry for transient network-level failures (DNS hiccup, TLS
    // reset, brief connectivity blip) - not for HTTP error responses, which
    // land here as a normal `response` object, not a thrown error.
    if (error instanceof Error && error.name === "AbortError") {
      throw error; // already used the full time budget, don't retry
    }
    logServerInfo("ai.providers.network_retry", { url });
    return attempt(Math.min(timeoutMs, 4_000));
  }
}

async function callChatCompletions(params: {
  provider: ProviderConfig;
  messages: ProviderMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  logScope: string;
}): Promise<{ message: ProviderMessage } | null> {
  const useTools = Boolean(params.tools?.length);

  try {
    const response = await fetchWithRetry(
      params.provider.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.provider.apiKey}`,
        },
        body: JSON.stringify({
          model: params.provider.model,
          temperature: params.temperature ?? 0.4,
          max_tokens: params.maxTokens ?? 400,
          messages: params.messages,
          ...(useTools ? { tools: params.tools, tool_choice: "auto" } : {}),
        }),
      },
      AI_TIMEOUT_MS,
    );

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      logServerInfo(`${params.logScope}.provider_error`, {
        provider: params.provider.name,
        status: response.status,
        body: bodyText.slice(0, 300),
      });
      return null;
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    if (!message) return null;

    // Checked unconditionally, not just when tools were attached to this
    // call: a model that's been "primed" by tool-calling context earlier in
    // the conversation can still emit this syntax on a later text-only
    // call (e.g. the final no-tools call made after exhausting tool
    // rounds) - the leak isn't limited to calls where tools were offered.
    if ((message.tool_calls?.length ?? 0) === 0 && looksLikeMalformedToolCallText(message.content)) {
      logServerInfo(`${params.logScope}.malformed_tool_call_text`, {
        provider: params.provider.name,
        snippet: String(message.content).slice(0, 200),
      });
      return null;
    }

    return { message };
  } catch (error) {
    logDevError(`${params.logScope}.provider_exception`, error, { provider: params.provider.name });
    return null;
  }
}

/**
 * Tries each configured provider in order for THIS SPECIFIC call, returning
 * the first success. Call this once per round of a tool loop (or once for a
 * simple non-tool completion) - a provider that fails partway through
 * doesn't take the whole request down, the next call just tries the next
 * provider.
 */
export async function callWithFailover(
  providers: ProviderConfig[],
  messages: ProviderMessage[],
  options: { tools?: ToolDefinition[]; temperature?: number; maxTokens?: number; logScope: string },
): Promise<{ message: ProviderMessage; providerName: string } | null> {
  for (const provider of providers) {
    const result = await callChatCompletions({ provider, messages, ...options });
    if (result) {
      return { message: result.message, providerName: provider.name };
    }
    logServerInfo(`${options.logScope}.provider_failed_trying_next`, { failedProvider: provider.name });
  }
  return null;
}

export function buildProviderList(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    });
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GEMINI_API_KEY,
      // Google's free-tier model naming has moved fast - if this default
      // ever 404s/400s, check the current model list in Google AI Studio
      // and override with GEMINI_MODEL.
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: process.env.OPENROUTER_API_KEY,
      // Auto-router to whatever :free model is currently available. Its
      // tool-calling support is the least reliable of the three, which is
      // fine here since it's only reached if both providers above failed.
      model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
    });
  }

  return providers;
}