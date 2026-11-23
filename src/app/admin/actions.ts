"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, friendlyDbError } from "@/lib/auth";
import { checkXceedUrl } from "@/lib/xceed";
import { eventRange } from "@/lib/time";
import { safeNext, withParams } from "@/lib/nav";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;
const on = (fd: FormData, k: string) => fd.get(k) === "on";

function back(fd: FormData, fallback: string, params: Record<string, string>, anchor?: string): never {
  let url = withParams(safeNext(fd.get("back"), fallback).split("#")[0], { msg: undefined, err: undefined, ...params });
  if (anchor) url += `#${anchor}`;
  redirect(url);
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "evento";
}

type Parsed = { error: string } | { values: Record<string, unknown> };

function parseEvent(fd: FormData): Parsed {
  const title = str(fd, "title");
  if (!title) return { error: "El título es obligatorio." };
  const date = str(fd, "date");
  const start = str(fd, "start_time");
  const end = str(fd, "end_time");
  if ((start || end) && !date) return { error: "Indica la fecha del evento." };
  if (date && !start) return { error: "Indica la hora de inicio." };
  const { starts_at, ends_at } = eventRange(date, start, end);
  if (date && !starts_at) return { error: "La fecha o la hora no son válidas." };

  const ticketRaw = str(fd, "ticket_url");
  let ticket_url: string | null = null;
  if (ticketRaw) {
    const c = checkXceedUrl(ticketRaw);
    if (!c.ok) return { error: `Enlace de compra: ${c.error}` };
    ticket_url = c.url;
  }
  const posterRaw = str(fd, "poster_url");
  if (posterRaw && !/^https:\/\//i.test(posterRaw)) return { error: "El cartel debe ser una dirección https." };

  const minAgeRaw = str(fd, "min_age");
  const min_age = minAgeRaw ? Number(minAgeRaw) : null;
  if (min_age != null && (!Number.isInteger(min_age) || min_age < 0 || min_age > 99)) return { error: "Edad mínima no válida." };
  const threshold = Number(str(fd, "reward_threshold") || "5");
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 1000) return { error: "El umbral debe ser un número entero mayor que 0." };
  const capRaw = str(fd, "reward_cap");
  const reward_cap = capRaw ? Number(capRaw) : null;
  if (reward_cap != null && (!Number.isInteger(reward_cap) || reward_cap < 1)) return { error: "El límite de invitaciones debe ser un número entero mayor que 0 o quedar vacío." };

  return {
    values: {
      title,
      promoter: opt(fd, "promoter"),
      starts_at,
      ends_at,
      venue: opt(fd, "venue"),
      address: opt(fd, "address"),
      city: opt(fd, "city"),
      poster_url: on(fd, "remove_poster") ? null : posterRaw || null,
      description: opt(fd, "description"),
      artists: opt(fd, "artists"),
      recommendation: opt(fd, "recommendation"),
      price_text: opt(fd, "price_text"),
      min_age,
      access_conditions: opt(fd, "access_conditions"),
      ticket_url,
      guestlist_enabled: on(fd, "guestlist_enabled"),
      guestlist_open: on(fd, "guestlist_open"),
      guestlist_conditions: opt(fd, "guestlist_conditions"),
      guestlist_perk: opt(fd, "guestlist_perk"),
      guestlist_auto_confirm: on(fd, "guestlist_auto_confirm"),
      rewards_enabled: on(fd, "rewards_enabled"),
      rewards_open: on(fd, "rewards_open"),
      rewards_conditions: opt(fd, "rewards_conditions"),
      reward_threshold: threshold,
      reward_cap,
    },
  };
}

async function uploadPoster(fd: FormData, slug: string): Promise<{ url?: string; error?: string }> {
  const file = fd.get("poster_file");
  if (!(file instanceof File) || file.size === 0) return {};
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return { error: "El cartel debe ser una imagen JPG, PNG, WebP o GIF." };
  if (file.size > 5 * 1024 * 1024) return { error: "El cartel no puede pesar más de 5 MB." };
  const { supabase } = await requireAdmin();
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${slug}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("posters").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: `No se ha podido subir el cartel: ${error.message}` };
  return { url: supabase.storage.from("posters").getPublicUrl(path).data.publicUrl };
}

export async function createEvent(fd: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = parseEvent(fd);
  if ("error" in parsed) back(fd, "/admin/eventos/nuevo", { err: parsed.error });
  const slug = `${slugify(String(parsed.values.title))}-${crypto.randomUUID().slice(0, 4)}`;
  const poster = await uploadPoster(fd, slug);
  if (poster.error) back(fd, "/admin/eventos/nuevo", { err: poster.error });
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.values, ...(poster.url ? { poster_url: poster.url } : {}), slug, status: "draft" })
    .select("id")
    .single();
  if (error) back(fd, "/admin/eventos/nuevo", { err: friendlyDbError(error.message) });
  redirect(`/admin/eventos/${data.id}?msg=${encodeURIComponent("Borrador creado.")}`);
}

export async function updateEvent(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const here = `/admin/eventos/${id}`;
  const parsed = parseEvent(fd);
  if ("error" in parsed) back(fd, here, { err: parsed.error });
  const { data: ev } = await supabase.from("events").select("slug, status").eq("id", id).single();
  if (!ev) back(fd, "/admin", { err: "Evento no encontrado." });
  const poster = await uploadPoster(fd, ev.slug);
  if (poster.error) back(fd, here, { err: poster.error });
  const { error } = await supabase
    .from("events")
    .update({ ...parsed.values, ...(poster.url ? { poster_url: poster.url } : {}) })
    .eq("id", id);
  if (error) back(fd, here, { err: friendlyDbError(error.message) });
  revalidatePath(`/eventos/${ev.slug}`);
  back(fd, here, { msg: ev.status === "published" ? "Cambios guardados y publicados." : "Borrador guardado." });
}

export async function setEventStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status") === "published" ? "published" : "draft";
  const { error } = await supabase.from("events").update({ status }).eq("id", id);
  if (error) back(fd, `/admin/eventos/${id}`, { err: friendlyDbError(error.message) });
  back(fd, `/admin/eventos/${id}`, { msg: status === "published" ? "Evento publicado." : "Evento retirado: vuelve a ser borrador." });
}

export async function toggleEventFlag(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const flag = str(fd, "flag");
  if (flag !== "guestlist_open" && flag !== "rewards_open") back(fd, `/admin/eventos/${id}`, { err: "Opción no válida." });
  const value = str(fd, "value") === "true";
  const { error } = await supabase.from("events").update({ [flag]: value }).eq("id", id);
  if (error) back(fd, `/admin/eventos/${id}`, { err: friendlyDbError(error.message) });
  const label = flag === "guestlist_open" ? "Lista" : "Programa de recompensas";
  back(fd, `/admin/eventos/${id}`, { msg: `${label} ${value ? "abierto" : "cerrado"}.`.replace("Lista abierto", "Lista abierta").replace("Lista cerrado", "Lista cerrada") });
}

export async function deleteDraft(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const [{ count: a }, { count: b }] = await Promise.all([
    supabase.from("guestlist_requests").select("id", { count: "exact", head: true }).eq("event_id", id),
    supabase.from("participations").select("id", { count: "exact", head: true }).eq("event_id", id),
  ]);
  if ((a ?? 0) + (b ?? 0) > 0) back(fd, `/admin/eventos/${id}`, { err: "No se puede borrar: ya tiene solicitudes. Retíralo como borrador." });
  const { error } = await supabase.from("events").delete().eq("id", id).eq("status", "draft");
  if (error) back(fd, `/admin/eventos/${id}`, { err: friendlyDbError(error.message) });
  redirect("/admin?msg=" + encodeURIComponent("Borrador eliminado."));
}

// ---------------------------------------------------------------- Lista

export async function setGuestStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_guestlist_status", { p_request: str(fd, "rid"), p_status: str(fd, "status") });
  back(fd, "/admin", error ? { err: friendlyDbError(error.message) } : { msg: "Lista actualizada." }, `g-${str(fd, "rid")}`);
}

// ---------------------------------------------------------------- Programa

export async function assignChannel(fd: FormData) {
  const { supabase } = await requireAdmin();
  const pid = str(fd, "pid");
  const c = checkXceedUrl(str(fd, "channel_url"));
  if (!c.ok) back(fd, "/admin", { err: c.error }, `p-${pid}`);
  const { error } = await supabase.rpc("admin_assign_channel", { p_participation: pid, p_url: c.url });
  back(fd, "/admin", error ? { err: friendlyDbError(error.message) } : { msg: "Enlace guardado y participación activada." }, `p-${pid}`);
}

export async function setParticipationActive(fd: FormData) {
  const { supabase } = await requireAdmin();
  const pid = str(fd, "pid");
  const active = str(fd, "active") === "true";
  const { error } = await supabase.rpc("admin_set_participation_active", { p_participation: pid, p_active: active });
  back(fd, "/admin", error ? { err: friendlyDbError(error.message) } : { msg: active ? "Enlace reactivado." : "Enlace desactivado." }, `p-${pid}`);
}

export async function setSalesTotal(fd: FormData) {
  const { supabase } = await requireAdmin();
  const pid = str(fd, "pid");
  const raw = str(fd, "total");
  const total = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(total)) back(fd, "/admin", { err: "Escribe el total como número entero (0 o más)." }, `p-${pid}`);
  const { error } = await supabase.rpc("admin_set_sales_total", { p_participation: pid, p_total: total, p_note: opt(fd, "note") });
  back(fd, "/admin", error ? { err: friendlyDbError(error.message) } : { msg: `Total guardado: ${total} entradas.` }, `p-${pid}`);
}

export async function deliverInvitation(fd: FormData) {
  const { supabase } = await requireAdmin();
  const pid = str(fd, "pid");
  const seq = Number(str(fd, "seq"));
  const { error } = await supabase.rpc("admin_deliver_invitation", { p_participation: pid, p_seq: seq });
  back(fd, "/admin", error ? { err: friendlyDbError(error.message) } : { msg: `Invitación ${seq} marcada como entregada.` }, `p-${pid}`);
}

export async function setInstructions(fd: FormData) {
  const { supabase } = await requireAdmin();
  const pid = str(fd, "pid");
  const { error } = await supabase.rpc("admin_set_delivery_instructions", { p_participation: pid, p_text: str(fd, "instructions") });
  back(fd, "/admin", error ? { err: friendlyDbError(error.message) } : { msg: "Instrucciones guardadas." }, `p-${pid}`);
}
