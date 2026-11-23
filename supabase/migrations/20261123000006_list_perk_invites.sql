-- Ventaja de la lista (p. ej. «Gratis hasta las 21:30»), confirmación automática opcional,
-- teléfono y consentimiento de contacto en la lista, y registro de invitaciones enviadas.

alter table public.events
  add column guestlist_perk text check (guestlist_perk is null or length(guestlist_perk) <= 80),
  add column guestlist_auto_confirm boolean not null default false;

comment on column public.events.guestlist_perk is 'Ventaja corta de la lista, visible en portada y ficha. Ej.: Gratis hasta las 21:30';
comment on column public.events.guestlist_auto_confirm is 'Si es true, apuntarse confirma al momento (sin revisión manual).';

alter table public.guestlist_requests
  add column phone text check (phone is null or phone ~ '^\+?[0-9 ]{9,20}$'),
  add column contact_consent boolean not null default false;

drop function if exists public.request_guestlist(uuid);

create or replace function public.request_guestlist(p_event uuid, p_phone text default null, p_consent boolean default false)
returns public.guestlist_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  e public.events;
  r public.guestlist_requests;
  v_phone text := nullif(trim(regexp_replace(coalesce(p_phone, ''), '[^0-9+ ]', '', 'g')), '');
begin
  if uid is null then
    raise exception 'Inicia sesión para apuntarte a la lista' using errcode = '42501';
  end if;
  select * into e from public.events where id = p_event and status = 'published';
  if not found then
    raise exception 'Este evento no está disponible';
  end if;
  select * into r from public.guestlist_requests where event_id = p_event and user_id = uid;
  if found then
    -- Permite completar el teléfono o el consentimiento sin duplicar la solicitud.
    update public.guestlist_requests
       set phone = coalesce(r.phone, v_phone), contact_consent = r.contact_consent or coalesce(p_consent, false)
     where id = r.id
    returning * into r;
    return r;
  end if;
  if not e.guestlist_enabled or not e.guestlist_open or public.event_has_ended(e) then
    raise exception 'La lista de este evento está cerrada';
  end if;
  if v_phone is null or v_phone !~ '^\+?[0-9 ]{9,20}$' then
    raise exception 'Escribe un teléfono válido para la lista';
  end if;
  insert into public.guestlist_requests (event_id, user_id, phone, contact_consent, status, reviewed_at)
  values (p_event, uid, v_phone, coalesce(p_consent, false),
          case when e.guestlist_auto_confirm then 'confirmed' else 'pending' end,
          case when e.guestlist_auto_confirm then now() end)
  on conflict (event_id, user_id) do nothing;
  select * into r from public.guestlist_requests where event_id = p_event and user_id = uid;
  return r;
end;
$$;

revoke execute on function public.request_guestlist(uuid, text, boolean) from public, anon;
grant execute on function public.request_guestlist(uuid, text, boolean) to authenticated;

-- Invitaciones «¿Te vienes?» enviadas por personas con sesión iniciada.
create table public.invite_logs (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'share', 'copy')),
  message text check (message is null or length(message) <= 500),
  created_at timestamptz not null default now()
);

create index invite_logs_event_idx on public.invite_logs (event_id, created_at desc);
create index invite_logs_user_idx on public.invite_logs (user_id);

alter table public.invite_logs enable row level security;
revoke all on public.invite_logs from anon, authenticated;
grant select on public.invite_logs to authenticated;

create policy "invitaciones propias o admin" on public.invite_logs
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.log_invite(p_event uuid, p_channel text, p_message text default null)
returns public.invite_logs
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r public.invite_logs;
begin
  if uid is null then
    raise exception 'Inicia sesión' using errcode = '42501';
  end if;
  if not exists (select 1 from public.events where id = p_event and status = 'published') then
    raise exception 'Este evento no está disponible';
  end if;
  if p_channel not in ('whatsapp', 'share', 'copy') then
    raise exception 'Canal no válido';
  end if;
  -- Freno sencillo: como mucho 30 registros por persona y hora.
  if (select count(*) from public.invite_logs where user_id = uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Demasiadas invitaciones seguidas. Prueba más tarde';
  end if;
  insert into public.invite_logs (event_id, user_id, channel, message)
  values (p_event, uid, p_channel, left(nullif(trim(coalesce(p_message, '')), ''), 500))
  returning * into r;
  return r;
end;
$$;

revoke execute on function public.log_invite(uuid, text, text) from public, anon;
grant execute on function public.log_invite(uuid, text, text) to authenticated;

-- Contador público de personas en la lista (solo el número, nunca nombres).
create or replace function public.guestlist_count(p_event uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.guestlist_requests g
  join public.events e on e.id = g.event_id
  where g.event_id = p_event and e.status = 'published' and g.status <> 'rejected';
$$;

revoke execute on function public.guestlist_count(uuid) from public;
grant execute on function public.guestlist_count(uuid) to anon, authenticated;
