-- Música y recomendaciones de Giorgio en cada fiesta, y planes guardados por persona.

alter table public.events
  add column genres text[] not null default '{}',
  add column recommendation text;

comment on column public.events.genres is 'Estilos musicales (House, Techno…). Se muestran antes que el precio.';
comment on column public.events.recommendation is 'Recomendación personal de Giorgio. Si existe, la fiesta aparece destacada.';

-- Un plan guardado por persona y fiesta. has_ticket: null = sin contestar.
create table public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  has_ticket boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index saved_plans_event_idx on public.saved_plans (event_id);

create trigger saved_plans_updated_at before update on public.saved_plans
  for each row execute function public.set_updated_at();

alter table public.saved_plans enable row level security;
revoke all on public.saved_plans from anon, authenticated;
grant select on public.saved_plans to authenticated;

create policy "planes propios o admin" on public.saved_plans
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Guardar un plan es idempotente: repetirlo no crea otro.
create or replace function public.save_plan(p_event uuid)
returns public.saved_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r public.saved_plans;
begin
  if uid is null then
    raise exception 'Inicia sesión para guardar el plan' using errcode = '42501';
  end if;
  if not exists (select 1 from public.events where id = p_event and status = 'published') then
    raise exception 'Este evento no está disponible';
  end if;
  insert into public.saved_plans (user_id, event_id) values (uid, p_event)
  on conflict (user_id, event_id) do nothing;
  select * into r from public.saved_plans where user_id = uid and event_id = p_event;
  return r;
end;
$$;

create or replace function public.set_plan_ticket(p_event uuid, p_has_ticket boolean)
returns public.saved_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r public.saved_plans;
begin
  if uid is null then
    raise exception 'Inicia sesión' using errcode = '42501';
  end if;
  update public.saved_plans set has_ticket = p_has_ticket
   where user_id = uid and event_id = p_event
  returning * into r;
  if not found then
    raise exception 'Primero guarda el plan';
  end if;
  return r;
end;
$$;

create or replace function public.remove_plan(p_event uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión' using errcode = '42501';
  end if;
  delete from public.saved_plans where user_id = auth.uid() and event_id = p_event;
end;
$$;

revoke execute on function public.save_plan(uuid), public.set_plan_ticket(uuid, boolean), public.remove_plan(uuid) from public, anon;
grant execute on function public.save_plan(uuid), public.set_plan_ticket(uuid, boolean), public.remove_plan(uuid) to authenticated;
