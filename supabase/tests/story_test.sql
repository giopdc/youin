-- Prueba de extremo a extremo de la base de datos (permisos, RLS y reglas).
-- Ejecutar con: npm run test:db  (requiere Postgres local; ver README)
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;

create schema if not exists t;
create or replace function t.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FALLO: %', label; end if;
  raise notice 'ok - %', label;
end $$;
create or replace function t.throws(stmt text, expect text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if position(lower(expect) in lower(sqlerrm)) > 0 then
      raise notice 'ok - % (error esperado: %)', label, sqlerrm;
      return;
    end if;
    raise exception 'FALLO: % -> error inesperado: %', label, sqlerrm;
  end;
  raise exception 'FALLO: % -> no dio error', label;
end $$;
grant usage on schema t to anon, authenticated;
grant execute on all functions in schema t to anon, authenticated;
create or replace function t.as_user(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select id into uid from auth.users where email = p_email;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
end $$;
create table t.ids (k text primary key, v uuid);
grant all on t.ids to anon, authenticated;
create or replace function t.code(k text) returns text language sql security definer as $$
  select public_code from public.participations where id = (select v from t.ids where t.ids.k = code.k)
$$;
grant execute on function t.code(text) to anon, authenticated;
set client_min_messages = notice;

-- Usuarios (el registro de Supabase inserta en auth.users -> trigger crea perfil)
insert into auth.users (email, raw_user_meta_data) values
  ('giorgio@example.com', '{"full_name":"Giorgio"}'),
  ('ana@example.com', '{"full_name":"Ana"}'),
  ('pablo@example.com', '{"full_name":"Pablo"}'),
  ('carla@example.com', '{"full_name":"Carla"}');
select public.grant_admin_by_email('giorgio@example.com');
select t.ok((select count(*) from public.profiles) = 4, 'perfiles creados al registrarse');

-- Borradores de ejemplo
select t.ok((select count(*) from public.events where status = 'draft') = 2, 'dos borradores de ejemplo');
select t.ok((select starts_at is null and price_text is null and poster_url is null
             from public.events where slug = 'elenco-borrador'), 'borrador Elenco sin fecha, precio ni cartel inventados');

-- ---------------------------------------------------------------- anónimo
set role anon;
select set_config('request.jwt.claims', '', false);
select t.ok((select count(*) from public.events) = 0, 'anónimo no ve borradores');
select t.throws('select * from public.profiles', 'permission denied', 'anónimo no lee perfiles');
reset role;

-- ---------------------------------------------------------------- Pablo intenta ser admin
select t.as_user('pablo@example.com');
set role authenticated;
select t.ok(public.is_admin() = false, 'Pablo no es admin');
select t.throws($$insert into public.admins (user_id) values (auth.uid())$$, 'permission denied', 'Pablo no puede insertarse en admins');
select t.throws($$insert into public.events (slug, title) values ('x', 'x')$$, 'row-level security', 'Pablo no puede crear eventos');
select t.throws($$update public.profiles set email = 'x@x' where id = auth.uid()$$, 'permission denied', 'Pablo solo puede editar su nombre');
update public.profiles set full_name = 'Pablo M.' where id = auth.uid();
select t.ok((select full_name from public.profiles where id = auth.uid()) = 'Pablo M.', 'Pablo edita su nombre');
reset role;

-- ---------------------------------------------------------------- Giorgio publica la fiesta de prueba
select t.as_user('giorgio@example.com');
set role authenticated;
select t.ok(public.is_admin(), 'Giorgio es admin');
select t.throws($$update public.events set status = 'published' where slug = 'elenco-borrador'$$,
  'events_publish_requires_date', 'no se publica sin fecha');
select t.throws($$update public.events set ticket_url = 'https://evil.example/xceed.me' where slug = 'elenco-borrador'$$,
  'check constraint', 'enlace de compra debe ser de Xceed');
insert into public.events (slug, status, title, promoter, starts_at, ends_at, venue, city,
  ticket_url, guestlist_enabled, guestlist_conditions, rewards_enabled, reward_threshold)
values ('prueba-elenco', 'published', 'Fiesta de prueba', 'Elenco',
  now() + interval '3 days', now() + interval '3 days 6 hours', 'Sala de prueba', 'Valencia',
  'https://xceed.me/es/valencia/event/prueba/123', true, 'Antes de la 01:00', true, 5);
insert into t.ids select 'event', id from public.events where slug = 'prueba-elenco';
select t.ok((select published_at is not null from public.events where slug = 'prueba-elenco'), 'fecha de publicación registrada');
reset role;

-- ---------------------------------------------------------------- Ana y Pablo
select t.as_user('ana@example.com');
set role authenticated;
select t.ok((select count(*) from public.events) = 1, 'Ana ve solo el evento publicado');
select public.join_program((select v from t.ids where k = 'event'));
select public.join_program((select v from t.ids where k = 'event')); -- doble clic
select t.ok((select count(*) from public.participations) = 1, 'una participación por persona y evento');
select t.ok((select status from public.participations) = 'pending', 'Ana: pendiente de enlace');
select t.ok((select count(*) from public.guestlist_requests) = 0, 'participar no apunta a la lista');
select t.throws($$select public.admin_assign_channel((select id from public.participations), 'https://xceed.me/a')$$,
  'Solo un administrador', 'Ana no puede asignarse un canal');
select t.throws($$select public.admin_set_sales_total((select id from public.participations), 50)$$,
  'Solo un administrador', 'Ana no puede editar ventas');
select t.throws($$update public.participations set confirmed_tickets = 50$$, 'permission denied', 'Ana no puede actualizar la tabla');
insert into t.ids select 'ana_p', id from public.participations;
reset role;

-- La resolución anónima de un enlace pendiente no redirige
set role anon;
select set_config('request.jwt.claims', '', false);
select t.ok((select state from public.resolve_referral(t.code('ana_p'))) = 'inactive',
  'enlace de Ana pendiente: no redirige');
reset role;

select t.as_user('pablo@example.com');
set role authenticated;
select public.join_program((select v from t.ids where k = 'event'));
select public.request_guestlist((select v from t.ids where k = 'event'), '+34 600 000 001', true);
insert into t.ids select 'pablo_p', id from public.participations;
select t.ok((select count(*) from public.participations) = 1, 'Pablo solo ve su participación');
select t.ok((select count(*) from public.participation_summary) = 1, 'Pablo solo ve su resumen');
select t.ok((select status from public.guestlist_requests) = 'pending', 'Pablo: solicitud de lista recibida');
reset role;

-- ---------------------------------------------------------------- Giorgio asigna canales
select t.as_user('giorgio@example.com');
set role authenticated;
select t.throws($$select public.admin_assign_channel((select v from t.ids where k = 'ana_p'), 'http://xceed.me/es/x')$$,
  'https de Xceed', 'rechaza http');
select t.throws($$select public.admin_assign_channel((select v from t.ids where k = 'ana_p'), 'https://xceed.me.evil.com/x')$$,
  'https de Xceed', 'rechaza dominio falso');
select t.throws($$select public.admin_assign_channel((select v from t.ids where k = 'ana_p'), 'https://xceed.me/es/valencia/event/prueba/123/')$$,
  'enlace general', 'rechaza el enlace general del evento');
select public.admin_assign_channel((select v from t.ids where k = 'ana_p'), 'https://xceed.me/es/valencia/event/prueba/123?ref=ana-canal');
select t.throws($$select public.admin_assign_channel((select v from t.ids where k = 'pablo_p'), 'https://XCEED.me/es/valencia/event/prueba/123?ref=ana-canal/')$$,
  'ya está asignado', 'no asigna el mismo canal a dos personas');
select public.admin_assign_channel((select v from t.ids where k = 'pablo_p'), 'https://xceed.me/es/valencia/event/prueba/123?ref=pablo-canal');
select t.ok((select count(*) from public.participations where status = 'active') = 2, 'dos canales activos distintos');
reset role;

-- ---------------------------------------------------------------- Tercera persona sin cuenta abre el enlace de Ana
set role anon;
select set_config('request.jwt.claims', '', false);
select t.throws($$select * from public.participations$$, 'permission denied', 'anónimo no lee participaciones');
create temp table r as select * from public.resolve_referral(t.code('ana_p'));
reset role;
select t.ok((select state = 'active' and destination = 'https://xceed.me/es/valencia/event/prueba/123?ref=ana-canal' from r),
  'enlace de Ana redirige a su destino de Xceed');
select t.ok((select public_code !~* 'ana' from public.participations where id = (select v from t.ids where k = 'ana_p')),
  'el código no contiene el nombre');
set role anon;
select t.ok((select state from public.resolve_referral('noexiste99')) = 'not_found', 'código inexistente');
reset role;
select t.ok((select confirmed_tickets from public.participations where id = (select v from t.ids where k = 'ana_p')) = 0,
  'un clic no suma ventas');

-- ---------------------------------------------------------------- Ventas
select t.as_user('giorgio@example.com');
set role authenticated;
select public.admin_set_sales_total((select v from t.ids where k = 'ana_p'), 3, 'Primera revisión');
select public.admin_set_sales_total((select v from t.ids where k = 'ana_p'), 5);
select public.admin_set_sales_total((select v from t.ids where k = 'pablo_p'), 2);
select t.ok((select earned = 1 and pending_invitations = 1 from public.participation_summary where id = (select v from t.ids where k = 'ana_p')),
  'Ana con 5 desbloquea 1 invitación');
select t.ok((select earned = 0 from public.participation_summary where id = (select v from t.ids where k = 'pablo_p')),
  'Pablo con 2 no desbloquea');
select public.admin_set_sales_total((select v from t.ids where k = 'ana_p'), 5);
select t.ok((select confirmed_tickets = 5 and earned = 1 from public.participation_summary where id = (select v from t.ids where k = 'ana_p')),
  'volver a guardar 5 conserva una única invitación');
select t.ok((select count(*) from public.sales_adjustments where participation_id = (select v from t.ids where k = 'ana_p')) = 2,
  'historial: 0→3 y 3→5 (guardar el mismo total no añade cambio)');
select t.ok((select previous_total = 3 and new_total = 5 and changed_by = auth.uid()
             from public.sales_adjustments where participation_id = (select v from t.ids where k = 'ana_p') order by id desc limit 1),
  'historial guarda quién, valor anterior y nuevo');
select t.throws($$select public.admin_set_sales_total((select v from t.ids where k = 'ana_p'), -1)$$, 'entre 0', 'no acepta negativos');

-- Entrega (doble clic)
select public.admin_deliver_invitation((select v from t.ids where k = 'ana_p'), 1);
select public.admin_deliver_invitation((select v from t.ids where k = 'ana_p'), 1);
select t.ok((select count(*) from public.invitation_deliveries) = 1, 'la entrega se registra una sola vez');
select t.throws($$select public.admin_deliver_invitation((select v from t.ids where k = 'ana_p'), 2)$$, 'No hay invitaciones pendientes', 'no entrega más de lo conseguido');
select t.throws($$select public.admin_deliver_invitation((select v from t.ids where k = 'pablo_p'), 1)$$, 'No hay invitaciones pendientes', 'Pablo no tiene invitación');
select public.admin_set_delivery_instructions((select v from t.ids where k = 'ana_p'), 'Di tu nombre en la puerta de invitados');
reset role;

-- ---------------------------------------------------------------- Ana ve su perfil
select t.as_user('ana@example.com');
set role authenticated;
select t.ok((select confirmed_tickets = 5 and delivered = 1 and pending_invitations = 0 and last_reviewed_at is not null
             and delivery_instructions like 'Di tu nombre%' from public.participation_summary), 'Ana ve 5 entradas, entregada e instrucciones');
select t.ok((select count(*) from public.invitation_deliveries) = 1, 'Ana ve su entrega');
select t.ok((select count(*) from public.sales_adjustments) = 0, 'Ana no ve el historial interno');
reset role;

-- ---------------------------------------------------------------- Pablo no ve ni toca lo de Ana
select t.as_user('pablo@example.com');
set role authenticated;
select t.ok((select count(*) from public.participations where id = (select v from t.ids where k = 'ana_p')) = 0, 'Pablo no ve la participación de Ana');
select t.ok((select count(*) from public.invitation_deliveries) = 0, 'Pablo no ve entregas de Ana');
select t.ok((select count(*) from public.profiles) = 1, 'Pablo no ve el perfil de Ana');
select t.throws($$select public.admin_set_sales_total((select v from t.ids where k = 'ana_p'), 0)$$, 'Solo un administrador', 'Pablo no modifica ventas de Ana');
select t.throws($$select public.admin_deliver_invitation((select v from t.ids where k = 'ana_p'), 2)$$, 'Solo un administrador', 'Pablo no entrega invitaciones');
select t.throws($$select public.admin_set_guestlist_status((select id from public.guestlist_requests), 'confirmed')$$, 'Solo un administrador', 'Pablo no se confirma en la lista');
select t.throws($$update public.participations set confirmed_tickets = 99 where true$$, 'permission denied', 'Pablo no puede escribir participaciones');
reset role;
select t.ok((select confirmed_tickets from public.participations where id = (select v from t.ids where k = 'ana_p')) = 5, 'datos de Ana intactos');

-- ---------------------------------------------------------------- Reembolso
select t.as_user('giorgio@example.com');
set role authenticated;
select public.admin_set_sales_total((select v from t.ids where k = 'ana_p'), 4, 'Reembolso de 1 entrada');
select t.ok((select earned = 0 and delivered = 1 and pending_invitations = 0 and needs_review
             from public.participation_summary where id = (select v from t.ids where k = 'ana_p')),
  'reembolso: recalcula y marca para revisión sin borrar la entrega');
select t.ok((select count(*) from public.invitation_deliveries) = 1, 'historial de entrega conservado');
select public.admin_set_sales_total((select v from t.ids where k = 'ana_p'), 5, 'Venta nueva compensa');
select t.ok((select not needs_review and pending_invitations = 0 from public.participation_summary where id = (select v from t.ids where k = 'ana_p')),
  'al volver a 5 deja de requerir revisión');

-- Límite por persona
update public.events set reward_cap = 1 where slug = 'prueba-elenco';
select public.admin_set_sales_total((select v from t.ids where k = 'pablo_p'), 12);
select t.ok((select earned = 1 from public.participation_summary where id = (select v from t.ids where k = 'pablo_p')), 'el límite por persona se respeta');
update public.events set reward_cap = null where slug = 'prueba-elenco';
select public.admin_set_sales_total((select v from t.ids where k = 'pablo_p'), 2, 'vuelta al valor real');

-- ---------------------------------------------------------------- Lista independiente
select public.admin_set_guestlist_status((select id from public.guestlist_requests), 'confirmed');
reset role;
select t.ok((select status from public.guestlist_requests) = 'confirmed', 'Giorgio confirma a Pablo en la lista');
select t.ok((select confirmed_tickets = 2 and status = 'active' from public.participations where id = (select v from t.ids where k = 'pablo_p')),
  'la lista no afecta al programa');

select t.as_user('carla@example.com');
set role authenticated;
select public.request_guestlist((select v from t.ids where k = 'event'), '+34 600 000 001', true);
select t.ok((select count(*) from public.participations) = 0, 'apuntarse a la lista no inscribe como promotora');
reset role;

-- Cierre de la lista y del programa
update public.events set guestlist_open = false, rewards_open = false where slug = 'prueba-elenco';
select t.as_user('giorgio@example.com');
set role authenticated;
select t.throws($$select public.join_program((select v from t.ids where k = 'event'))$$, 'cerrado', 'programa cerrado');
select t.throws($$select public.request_guestlist((select v from t.ids where k = 'event'), '600000002')$$, 'cerrada', 'lista cerrada');
reset role;

-- Desactivar el enlace y fiesta terminada
select t.as_user('giorgio@example.com');
set role authenticated;
select public.admin_set_participation_active((select v from t.ids where k = 'pablo_p'), false);
reset role;
select t.ok((select state from public.resolve_referral(t.code('pablo_p'))) = 'inactive',
  'enlace desactivado muestra estado');
update public.events set starts_at = now() - interval '2 days', ends_at = now() - interval '1 day' where slug = 'prueba-elenco';
select t.ok((select state from public.resolve_referral(t.code('ana_p'))) = 'ended',
  'fiesta terminada muestra estado');


-- ---------------------------------------------------------------- Planes guardados
update public.events set starts_at = now() + interval '3 days', ends_at = now() + interval '3 days 6 hours' where slug = 'prueba-elenco';
select t.as_user('ana@example.com');
set role authenticated;
select public.save_plan((select v from t.ids where k = 'event'));
select public.save_plan((select v from t.ids where k = 'event'));
select t.ok((select count(*) from public.saved_plans) = 1, 'guardar dos veces deja un único plan');
select t.ok((select has_ticket is null from public.saved_plans), 'el plan empieza sin contestar «¿tienes entrada?»');
select public.set_plan_ticket((select v from t.ids where k = 'event'), true);
select t.ok((select has_ticket from public.saved_plans), 'Ana responde que ya tiene entrada');
select t.throws($$insert into public.saved_plans (user_id, event_id) values (auth.uid(), (select v from t.ids where k = 'event'))$$, 'permission denied', 'no se escribe la tabla directamente');
reset role;
select t.as_user('pablo@example.com');
set role authenticated;
select t.ok((select count(*) from public.saved_plans) = 0, 'Pablo no ve el plan de Ana');
select t.throws($$select public.set_plan_ticket((select v from t.ids where k = 'event'), true)$$, 'Primero guarda', 'Pablo no cambia un plan que no tiene');
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select t.throws($$select public.save_plan((select v from t.ids where k = 'event'))$$, 'permission denied', 'sin cuenta no se guarda el plan');
reset role;
select t.as_user('giorgio@example.com');
set role authenticated;
select t.throws($$select public.save_plan((select id from public.events where slug = 'elenco-borrador'))$$, 'no está disponible', 'no se guarda un borrador');
reset role;


-- ---------------------------------------------------------------- Ventas por perfil
select t.as_user('giorgio@example.com');
set role authenticated;
select t.ok((select count(*) from public.promoter_totals) = 2, 'el admin ve el total de cada perfil');
select t.ok((select confirmed_tickets from public.promoter_totals where user_id = (select id from public.profiles where full_name = 'Ana')) = 5, 'total de Ana: 5 entradas');
reset role;
select t.as_user('pablo@example.com');
set role authenticated;
select t.ok((select count(*) from public.promoter_totals) = 1, 'Pablo solo ve su propio total');
reset role;
set role anon;
select t.throws('select * from public.promoter_totals', 'permission denied', 'sin cuenta no se ven totales');
reset role;


-- ---------------------------------------------------------------- Lista con ventaja y autoconfirmación
update public.events set guestlist_open = true, guestlist_auto_confirm = true, guestlist_perk = 'Gratis hasta las 21:30',
  starts_at = now() + interval '3 days', ends_at = now() + interval '3 days 6 hours' where slug = 'prueba-elenco';
select t.as_user('ana@example.com');
set role authenticated;
select t.throws($$select public.request_guestlist((select v from t.ids where k = 'event'))$$, 'teléfono', 'la lista pide teléfono');
select t.throws($$select public.request_guestlist((select v from t.ids where k = 'event'), 'abc')$$, 'teléfono', 'teléfono no válido');
select public.request_guestlist((select v from t.ids where k = 'event'), '+34 611 22 33 44', false);
select public.request_guestlist((select v from t.ids where k = 'event'), '+34 611 22 33 44', true);
select t.ok((select count(*) from public.guestlist_requests) = 1, 'apuntarse dos veces deja una solicitud');
select t.ok((select status = 'confirmed' and reviewed_at is not null and phone = '+34 611 22 33 44' and contact_consent from public.guestlist_requests),
  'con autoconfirmación queda confirmada al momento, con teléfono y consentimiento');
-- Invitaciones enviadas
select public.log_invite((select v from t.ids where k = 'event'), 'whatsapp', '¿Te vienes el lunes?');
select public.log_invite((select v from t.ids where k = 'event'), 'copy', null);
select t.ok((select count(*) from public.invite_logs) = 2, 'Ana ve sus 2 invitaciones registradas');
select t.throws($$select public.log_invite((select v from t.ids where k = 'event'), 'sms', 'x')$$, 'Canal no válido', 'canal no válido');
select t.throws($$insert into public.invite_logs (event_id, user_id, channel) values ((select v from t.ids where k = 'event'), auth.uid(), 'copy')$$, 'permission denied', 'no se escribe la tabla de invitaciones directamente');
reset role;
select t.as_user('pablo@example.com');
set role authenticated;
select t.ok((select count(*) from public.invite_logs) = 0, 'Pablo no ve las invitaciones de Ana');
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select t.throws($$select public.log_invite((select v from t.ids where k = 'event'), 'copy', 'x')$$, 'permission denied', 'sin cuenta no se registran invitaciones');
reset role;
select t.as_user('giorgio@example.com');
set role authenticated;
select t.ok((select count(*) from public.invite_logs) = 2, 'el admin ve todas las invitaciones');
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select t.ok(public.guestlist_count((select v from t.ids where k = 'event')) = 3, 'el contador público da el número de apuntados');
reset role;

\echo 'TODAS LAS COMPROBACIONES DE BASE DE DATOS PASARON'
