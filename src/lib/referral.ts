import { createClient as createSb } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/server";

export type Referral = { state: string; destination: string | null; event_slug: string | null; event_title: string | null };

const DEST_RE = /^https:\/\/([a-z0-9-]+\.)*xceed\.me(\/[^#\s]*)?$/i;

/** Resuelve un código público como visitante anónimo (sin sesión). */
export async function resolveReferral(code: string): Promise<Referral> {
  const clean = code.toLowerCase();
  if (!/^[a-z0-9]{6,32}$/.test(clean)) return { state: "not_found", destination: null, event_slug: null, event_title: null };
  const { url, key } = supabaseEnv();
  const sb = createSb(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.rpc("resolve_referral", { p_code: clean });
  const row = (Array.isArray(data) ? data[0] : data) as Referral | undefined;
  if (error || !row) return { state: error ? "error" : "not_found", destination: null, event_slug: null, event_title: null };
  if (row.state === "active" && !(row.destination && DEST_RE.test(row.destination))) {
    return { ...row, state: "inactive", destination: null };
  }
  return row;
}
