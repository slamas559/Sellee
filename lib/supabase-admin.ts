import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getRequiredEnvAny } from "@/lib/env";

export function createAdminSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnvAny(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
