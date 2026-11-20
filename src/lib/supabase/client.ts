"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/public-env";

/** Browser client using only the public URL and publishable (or legacy anon) key. */
export function createSupabaseBrowserClient() {
  const key =
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error("Supabase public configuration is missing");
  }
  return createBrowserClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key);
}
