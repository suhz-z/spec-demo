import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerEnv } from "@/lib/env";
import { supabasePublicKey } from "@/lib/env-schema";

/** Server-only client for staff auth and private storage access. */
export async function createSupabaseServerClient() {
  const environment = getServerEnv();
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const key = supabasePublicKey(environment);
  if (!url || !key) throw new Error("Supabase public configuration is missing");

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; session refresh belongs in middleware.
        }
      },
    },
  });
}
