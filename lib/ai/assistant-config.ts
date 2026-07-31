// Shared, dependency-free constants for the shopping assistant. Kept in its
// own file (rather than lib/ai/product-assistant.ts) so the client-side
// chat widget can import the name without pulling in server-only code
// (Supabase admin client, provider API calls, etc.) into the browser bundle.
export const ASSISTANT_NAME = "Ellie";