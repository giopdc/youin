-- Esquema principal de la comunidad (Yuin, nombre provisional).
-- Todas las tablas tienen RLS. Las escrituras sensibles pasan por funciones
-- SECURITY DEFINER que comprueban permisos dentro de la base de datos.

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Solo destinos HTTPS de Xceed (xceed.me y sus subdominios), sin puerto,
-- sin credenciales y sin espacios.
create or replace function public.is_xceed_url(u text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select u is not null
     and length(u) <= 2000
     and u !~ '\s'
     and u ~* '^https://([a-z0-9-]+\.)*xceed\.me(/[^#]*)?$';
$$;

-- Código público aleatorio (10 caracteres, ~50 bits). Sin nombres ni correos.
create or replace function public.new_public_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  b bytea := uuid_send(gen_random_uuid());
  idx int[] := array[0,1,2,3,4,5,9,10,11,12];
  i int;
  out text := '';
begin
  foreach i in array idx loop
    out := out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return out;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfiles y administradores
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text,
  created_at timestamptz not null default now()
);

-- Los administradores viven en una tabla aparte sin políticas de escritura:
-- nadie puede convertirse en administrador editando su perfil.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solo ejecutable desde el editor SQL / rol postgres.
create or replace function public.grant_admin_by_email(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'No existe ninguna cuenta con el correo %', p_email;
  end if;
  insert into public.admins (user_id) values (uid) on conflict do nothing;
  return 'Administrador activado: ' || p_email;
end;
$$;

-- ---------------------------------------------------------------------------
-- Eventos
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  title text not null check (length(trim(title)) between 1 and 160),
  promoter text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue text,
  address text,
  city text default 'Valencia',
  poster_url text check (poster_url is null or poster_url ~* '^https://'),
  description text,
  artists text,
  price_text text,
  min_age int check (min_age is null or min_age between 0 and 99),
  access_conditions text,
  ticket_url text check (ticket_url is null or public.is_xceed_url(ticket_url)),
  guestlist_enabled boolean not null default false,
  guestlist_open boolean not null default true,
  guestlist_conditions text,
  rewards_enabled boolean not null default false,
  rewards_open boolean not null default true,
  rewards_conditions text,
  reward_threshold int not null default 5 check (reward_threshold between 1 and 1000),
  reward_cap int check (reward_cap is null or reward_cap between 1 and 1000),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_publish_requires_date check (status = 'draft' or starts_at is not null),
  constraint events_end_after_start check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index events_status_starts_idx on public.events (status, starts_at);

create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create or replace function public.events_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger events_published_at before insert or update on public.events
  for each row execute function public.events_set_published_at();

-- Una fiesta termina en ends_at o, si no hay hora de fin, 12 h después del inicio.
create or replace function public.event_has_ended(e public.events)
returns boolean
language sql
stable
set search_path = ''
as $$
  select e.starts_at is not null
     and coalesce(e.ends_at, e.starts_at + interval '12 hours') < now();
$$;

-- ---------------------------------------------------------------------------
-- Lista de asistentes
-- ---------------------------------------------------------------------------

create table public.guestlist_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index guestlist_requests_user_idx on public.guestlist_requests (user_id);

create trigger guestlist_requests_updated_at before update on public.guestlist_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Programa «compartir y ganar»: una participación por persona y evento
-- ---------------------------------------------------------------------------

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  public_code text not null unique default public.new_public_code(),
  channel_url text check (channel_url is null or public.is_xceed_url(channel_url)),
  confirmed_tickets int not null default 0 check (confirmed_tickets between 0 and 100000),
  last_reviewed_at timestamptz,
  last_reviewed_by uuid references auth.users (id) on delete set null,
  delivery_instructions text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id),
  constraint participations_active_needs_channel check (status <> 'active' or channel_url is not null)
);

-- Un mismo canal oficial no puede asignarse a dos personas de la misma fiesta.
create unique index participations_event_channel_uidx
  on public.participations (event_id, lower(channel_url))
  where channel_url is not null;

create index participations_user_idx on public.participations (user_id);

create trigger participations_updated_at before update on public.participations
  for each row execute function public.set_updated_at();

-- Historial de cambios del total de entradas confirmadas.
create table public.sales_adjustments (
  id bigint generated always as identity primary key,
  participation_id uuid not null references public.participations (id) on delete cascade,
  previous_total int not null,
  new_total int not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index sales_adjustments_participation_idx on public.sales_adjustments (participation_id, created_at desc);

-- Entregas de invitaciones: la n-ésima invitación solo puede registrarse una vez.
create table public.invitation_deliveries (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations (id) on delete cascade,
  seq int not null check (seq > 0),
  delivered_by uuid references auth.users (id) on delete set null,
  delivered_at timestamptz not null default now(),
  unique (participation_id, seq)
);

-- Resumen calculado (respeta el RLS de quien consulta).
create view public.participation_summary
with (security_invoker = true)
as
select
  p.id,
  p.event_id,
  p.user_id,
  p.status,
  p.public_code,
  p.channel_url,
  p.confirmed_tickets,
  p.last_reviewed_at,
  p.delivery_instructions,
  p.activated_at,
  p.created_at,
  e.reward_threshold,
  e.reward_cap,
  e.rewards_enabled,
  x.earned,
  d.delivered,
  greatest(x.earned - d.delivered, 0) as pending_invitations,
  d.delivered > x.earned as needs_review
from public.participations p
join public.events e on e.id = p.event_id
cross join lateral (
  select case
           when e.reward_cap is null then p.confirmed_tickets / e.reward_threshold
           else least(p.confirmed_tickets / e.reward_threshold, e.reward_cap)
         end::int as earned
) x
cross join lateral (
  select count(*)::int as delivered
  from public.invitation_deliveries i
  where i.participation_id = p.id
) d;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.events enable row level security;
alter table public.guestlist_requests enable row level security;
alter table public.participations enable row level security;
alter table public.sales_adjustments enable row level security;
alter table public.invitation_deliveries enable row level security;

-- Permisos de tabla explícitos (no dependemos de los permisos por defecto).
revoke all on public.profiles, public.admins, public.events, public.guestlist_requests,
  public.participations, public.sales_adjustments, public.invitation_deliveries,
  public.participation_summary from anon, authenticated;

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.guestlist_requests to authenticated;
grant select on public.participations to authenticated;
grant select on public.participation_summary to authenticated;
grant select on public.invitation_deliveries to authenticated;
grant select on public.sales_adjustments to authenticated;
-- public.admins: sin permisos para anon/authenticated.

create policy "perfil propio o admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "editar nombre propio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "eventos publicados o admin" on public.events
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));

create policy "admin crea eventos" on public.events
  for insert to authenticated with check ((select public.is_admin()));

create policy "admin edita eventos" on public.events
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin borra eventos" on public.events
  for delete to authenticated using ((select public.is_admin()));

create policy "lista propia o admin" on public.guestlist_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "participación propia o admin" on public.participations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "entregas propias o admin" on public.invitation_deliveries
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.participations p
      where p.id = participation_id and p.user_id = (select auth.uid())
    )
  );

create policy "historial solo admin" on public.sales_adjustments
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Acciones de miembros
-- ---------------------------------------------------------------------------

create or replace function public.request_guestlist(p_event uuid)
returns public.guestlist_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  e public.events;
  r public.guestlist_requests;
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
    return r;
  end if;
  if not e.guestlist_enabled or not e.guestlist_open or public.event_has_ended(e) then
    raise exception 'La lista de este evento está cerrada';
  end if;
  insert into public.guestlist_requests (event_id, user_id)
  values (p_event, uid)
  on conflict (event_id, user_id) do nothing;
  select * into r from public.guestlist_requests where event_id = p_event and user_id = uid;
  return r;
end;
$$;

create or replace function public.join_program(p_event uuid)
returns public.participations
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  e public.events;
  r public.participations;
begin
  if uid is null then
    raise exception 'Inicia sesión para participar' using errcode = '42501';
  end if;
  select * into e from public.events where id = p_event and status = 'published';
  if not found then
    raise exception 'Este evento no está disponible';
  end if;
  select * into r from public.participations where event_id = p_event and user_id = uid;
  if found then
    return r;
  end if;
  if not e.rewards_enabled or not e.rewards_open or public.event_has_ended(e) then
    raise exception 'El programa de invitaciones de este evento está cerrado';
  end if;
  insert into public.participations (event_id, user_id)
  values (p_event, uid)
  on conflict (event_id, user_id) do nothing;
  select * into r from public.participations where event_id = p_event and user_id = uid;
  return r;
end;
$$;

-- Enlace público /r/<código>: accesible sin cuenta. Solo devuelve el destino
-- si la participación está activa y la fiesta no ha terminado.
create or replace function public.resolve_referral(p_code text)
returns table (state text, destination text, event_slug text, event_title text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.participations;
  e public.events;
begin
  if p_code is null or p_code !~ '^[a-z0-9]{6,32}$' then
    return query select 'not_found'::text, null::text, null::text, null::text;
    return;
  end if;
  select * into p from public.participations where public_code = p_code;
  if not found then
    return query select 'not_found'::text, null::text, null::text, null::text;
    return;
  end if;
  select * into e from public.events where id = p.event_id;
  if e.status <> 'published' then
    return query select 'unavailable'::text, null::text, null::text, null::text;
  elsif public.event_has_ended(e) then
    return query select 'ended'::text, null::text, e.slug, e.title;
  elsif p.status <> 'active' or not public.is_xceed_url(p.channel_url) then
    return query select 'inactive'::text, null::text, e.slug, e.title;
  else
    return query select 'active'::text, p.channel_url, e.slug, e.title;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Acciones de administración
-- ---------------------------------------------------------------------------

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede hacer esto' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_set_guestlist_status(p_request uuid, p_status text)
returns public.guestlist_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.guestlist_requests;
begin
  perform public.assert_admin();
  if p_status not in ('pending', 'confirmed', 'rejected') then
    raise exception 'Estado no válido';
  end if;
  update public.guestlist_requests
     set status = p_status,
         reviewed_at = case when p_status = 'pending' then null else now() end,
         reviewed_by = case when p_status = 'pending' then null else auth.uid() end
   where id = p_request
  returning * into r;
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
  return r;
end;
$$;

create or replace function public.admin_assign_channel(p_participation uuid, p_url text)
returns public.participations
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.participations;
  e public.events;
  url text := trim(p_url);
begin
  perform public.assert_admin();
  if not public.is_xceed_url(url) then
    raise exception 'El enlace debe ser una dirección https de Xceed (xceed.me)';
  end if;
  select * into p from public.participations where id = p_participation for update;
  if not found then
    raise exception 'Participación no encontrada';
  end if;
  select * into e from public.events where id = p.event_id;
  if e.ticket_url is not null
     and rtrim(lower(e.ticket_url), '/') = rtrim(lower(url), '/') then
    raise exception 'Ese es el enlace general de venta del evento: no identifica las ventas de una persona';
  end if;
  if exists (
    select 1 from public.participations o
    where o.event_id = p.event_id and o.id <> p.id
      and o.channel_url is not null
      and rtrim(lower(o.channel_url), '/') = rtrim(lower(url), '/')
  ) then
    raise exception 'Ese enlace ya está asignado a otra persona en esta fiesta';
  end if;
  update public.participations
     set channel_url = url,
         status = 'active',
         activated_at = coalesce(activated_at, now())
   where id = p.id
  returning * into p;
  return p;
end;
$$;

create or replace function public.admin_set_participation_active(p_participation uuid, p_active boolean)
returns public.participations
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.participations;
begin
  perform public.assert_admin();
  select * into p from public.participations where id = p_participation for update;
  if not found then
    raise exception 'Participación no encontrada';
  end if;
  if p_active and p.channel_url is null then
    raise exception 'Asigna primero el enlace oficial de Xceed';
  end if;
  update public.participations
     set status = case
                    when p_active then 'active'
                    when p.channel_url is null then 'pending'
                    else 'inactive'
                  end
   where id = p.id
  returning * into p;
  return p;
end;
$$;

-- Guarda el TOTAL acumulado de entradas válidas (no un incremento).
-- Guardar dos veces el mismo total no cambia nada.
create or replace function public.admin_set_sales_total(p_participation uuid, p_total int, p_note text default null)
returns public.participations
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.participations;
  note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform public.assert_admin();
  if p_total is null or p_total < 0 or p_total > 100000 then
    raise exception 'El total debe ser un número entero entre 0 y 100000';
  end if;
  select * into p from public.participations where id = p_participation for update;
  if not found then
    raise exception 'Participación no encontrada';
  end if;
  if p.channel_url is null then
    raise exception 'Esta persona aún no tiene enlace asignado';
  end if;
  if p_total <> p.confirmed_tickets or note is not null then
    insert into public.sales_adjustments (participation_id, previous_total, new_total, note, changed_by)
    values (p.id, p.confirmed_tickets, p_total, note, auth.uid());
  end if;
  update public.participations
     set confirmed_tickets = p_total,
         last_reviewed_at = now(),
         last_reviewed_by = auth.uid()
   where id = p.id
  returning * into p;
  return p;
end;
$$;

-- Registra la entrega de la invitación número p_seq. Idempotente: si ya
-- estaba registrada (doble clic) no hace nada.
create or replace function public.admin_deliver_invitation(p_participation uuid, p_seq int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.participations;
  e public.events;
  v_earned int;
  v_delivered int;
begin
  perform public.assert_admin();
  select * into p from public.participations where id = p_participation for update;
  if not found then
    raise exception 'Participación no encontrada';
  end if;
  select * into e from public.events where id = p.event_id;
  select count(*) into v_delivered from public.invitation_deliveries where participation_id = p.id;
  if p_seq is null or p_seq < 1 then
    raise exception 'Invitación no válida';
  end if;
  if p_seq <= v_delivered then
    return v_delivered; -- ya registrada
  end if;
  if p_seq <> v_delivered + 1 then
    raise exception 'Los datos han cambiado. Recarga la página';
  end if;
  v_earned := p.confirmed_tickets / e.reward_threshold;
  if e.reward_cap is not null then
    v_earned := least(v_earned, e.reward_cap);
  end if;
  if p_seq > v_earned then
    raise exception 'No hay invitaciones pendientes de entrega';
  end if;
  insert into public.invitation_deliveries (participation_id, seq, delivered_by)
  values (p.id, p_seq, auth.uid())
  on conflict (participation_id, seq) do nothing;
  return p_seq;
end;
$$;

create or replace function public.admin_set_delivery_instructions(p_participation uuid, p_text text)
returns public.participations
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.participations;
begin
  perform public.assert_admin();
  update public.participations
     set delivery_instructions = nullif(trim(coalesce(p_text, '')), '')
   where id = p_participation
  returning * into p;
  if not found then
    raise exception 'Participación no encontrada';
  end if;
  return p;
end;
$$;

-- Permisos de ejecución
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_xceed_url(text) to anon, authenticated;
grant execute on function public.event_has_ended(public.events) to anon, authenticated;
grant execute on function public.resolve_referral(text) to anon, authenticated;
grant execute on function public.request_guestlist(uuid) to authenticated;
grant execute on function public.join_program(uuid) to authenticated;
grant execute on function public.admin_set_guestlist_status(uuid, text) to authenticated;
grant execute on function public.admin_assign_channel(uuid, text) to authenticated;
grant execute on function public.admin_set_participation_active(uuid, boolean) to authenticated;
grant execute on function public.admin_set_sales_total(uuid, int, text) to authenticated;
grant execute on function public.admin_deliver_invitation(uuid, int) to authenticated;
grant execute on function public.admin_set_delivery_instructions(uuid, text) to authenticated;
-- grant_admin_by_email, assert_admin, handle_new_user: solo propietario (postgres).
