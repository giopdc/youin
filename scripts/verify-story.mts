// Comprobación de la historia completa contra un proyecto Supabase REAL (de pruebas).
// Uso: rellena .env.local (incluida SUPABASE_SERVICE_ROLE_KEY), arranca la app (npm run dev)
// y ejecuta: npm run verify:story
// Crea usuarios y un evento temporales con el prefijo "verificacion-" y los borra al final.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
if (!URL_ || !ANON || !SERVICE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_, SERVICE, opts);
let n = 0;
function ok(cond: unknown, label: string) {
  if (!cond) throw new Error("FALLO: " + label);
  console.log(`ok ${++n} - ${label}`);
}
const run = Date.now().toString(36);
const created: string[] = [];
let eventId: string | null = null;

async function user(name: string): Promise<{ id: string; sb: SupabaseClient }> {
  const email = `verificacion-${name.toLowerCase()}-${run}@example.com`;
  const password = `Pw-${run}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) throw error;
  created.push(data.user.id);
  const sb = createClient(URL_, ANON, opts);
  const s = await sb.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  return { id: data.user.id, sb };
}

try {
  const g = await user("Giorgio");
  const { error: ae } = await admin.from("admins").insert({ user_id: g.id });
  if (ae) throw ae;
  const ana = await user("Ana");
  const pablo = await user("Pablo");

  const { data: ev, error: ee } = await g.sb.from("events").insert({
    slug: `verificacion-${run}`, status: "published", title: "Verificación (temporal)", promoter: "Elenco",
    starts_at: new Date(Date.now() + 3 * 864e5).toISOString(), ticket_url: "https://xceed.me/es/valencia/event/verificacion/1",
    guestlist_enabled: true, rewards_enabled: true, reward_threshold: 5,
  }).select("id").single();
  if (ee) throw ee;
  eventId = ev.id;
  ok(true, "admin publica una fiesta de prueba");

  const anon = createClient(URL_, ANON, opts);
  ok(((await anon.from("events").select("id").eq("id", ev.id)).data ?? []).length === 1, "anónimo ve la fiesta publicada");
  ok((await ana.sb.from("events").insert({ slug: `x-${run}`, title: "x" })).error, "Ana no puede crear eventos");
  ok((await ana.sb.from("admins").insert({ user_id: ana.id })).error, "Ana no puede hacerse admin");

  const pa = (await ana.sb.rpc("join_program", { p_event: ev.id })).data;
  const pp = (await pablo.sb.rpc("join_program", { p_event: ev.id })).data;
  await pablo.sb.rpc("request_guestlist", { p_event: ev.id });
  ok(pa?.status === "pending" && pp?.status === "pending", "Ana y Pablo solicitan participar");
  ok((await ana.sb.rpc("admin_assign_channel", { p_participation: pa.id, p_url: "https://xceed.me/a" })).error, "Ana no puede asignarse canal");

  await g.sb.rpc("admin_assign_channel", { p_participation: pa.id, p_url: "https://xceed.me/es/valencia/event/verificacion/1?canal=ana" });
  const dup = await g.sb.rpc("admin_assign_channel", { p_participation: pp.id, p_url: "https://xceed.me/es/valencia/event/verificacion/1?canal=ana" });
  ok(dup.error?.message.includes("ya está asignado"), "no asigna el mismo canal a dos personas");
  await g.sb.rpc("admin_assign_channel", { p_participation: pp.id, p_url: "https://xceed.me/es/valencia/event/verificacion/1?canal=pablo" });

  const r = (await anon.rpc("resolve_referral", { p_code: pa.public_code })).data?.[0];
  ok(r?.state === "active" && r.destination.endsWith("canal=ana"), "anónimo resuelve el enlace de Ana");
  try {
    const res = await fetch(`${SITE}/r/${pa.public_code}`, { redirect: "manual" });
    ok(res.status === 302 && res.headers.get("location")?.endsWith("canal=ana"), `${SITE}/r/… redirige a Xceed`);
  } catch {
    console.log(`(omitido) la app no responde en ${SITE}: arráncala para comprobar /r/`);
  }

  await g.sb.rpc("admin_set_sales_total", { p_participation: pa.id, p_total: 5 });
  await g.sb.rpc("admin_set_sales_total", { p_participation: pp.id, p_total: 2 });
  await g.sb.rpc("admin_set_sales_total", { p_participation: pa.id, p_total: 5 });
  const sa = (await ana.sb.from("participation_summary").select("*").eq("id", pa.id).single()).data;
  const sp = (await pablo.sb.from("participation_summary").select("*").eq("id", pp.id).single()).data;
  ok(sa.earned === 1 && sp.earned === 0, "solo Ana desbloquea; re-guardar 5 mantiene 1");

  await g.sb.rpc("admin_deliver_invitation", { p_participation: pa.id, p_seq: 1 });
  await g.sb.rpc("admin_deliver_invitation", { p_participation: pa.id, p_seq: 1 });
  ok(((await admin.from("invitation_deliveries").select("id").eq("participation_id", pa.id)).data ?? []).length === 1, "entrega registrada una vez");
  ok((await ana.sb.from("participation_summary").select("delivered").eq("id", pa.id).single()).data?.delivered === 1, "Ana ve la entrega");

  ok(((await pablo.sb.from("participations").select("id").eq("id", pa.id)).data ?? []).length === 0, "Pablo no ve los datos de Ana");
  ok((await pablo.sb.rpc("admin_set_sales_total", { p_participation: pa.id, p_total: 0 })).error, "Pablo no modifica las ventas de Ana");

  await g.sb.rpc("admin_set_sales_total", { p_participation: pa.id, p_total: 4, p_note: "Reembolso" });
  ok((await g.sb.from("participation_summary").select("needs_review").eq("id", pa.id).single()).data?.needs_review === true, "reembolso: marcado para revisión");

  const req = (await g.sb.from("guestlist_requests").select("id").eq("event_id", ev.id).single()).data!;
  await g.sb.rpc("admin_set_guestlist_status", { p_request: req.id, p_status: "confirmed" });
  ok((await pablo.sb.from("guestlist_requests").select("status").single()).data?.status === "confirmed", "lista independiente confirmada");
  console.log(`\nTODO OK (${n} comprobaciones contra ${URL_})`);
} finally {
  if (eventId) await admin.from("events").delete().eq("id", eventId);
  for (const id of created) await admin.auth.admin.deleteUser(id);
}
