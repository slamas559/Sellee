import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getRequiredEnvAny } from "@/lib/env";

export function createBrowserSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnvAny([
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]),
  );
}
