import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

let browserClient: SupabaseClient | null = null;

export function getSupabase() {
  if (!url || !publishableKey) {
    throw new Error("Supabase ainda não foi configurado.");
  }
  if (!browserClient) {
    browserClient = createClient(url, publishableKey);
  }
  return browserClient;
}

export function getPublicSupabase(publicToken: string) {
  if (!url || !publishableKey) {
    throw new Error("Supabase ainda não foi configurado.");
  }
  return createClient(url, publishableKey, {
    global: {
      headers: {
        "x-public-token": publicToken,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
