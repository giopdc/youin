-- Ventas acumuladas por perfil, sumando todas las fiestas. Respeta el RLS de quien consulta:
-- el administrador ve a todo el mundo; cada miembro, solo su propia fila.
create view public.promoter_totals
with (security_invoker = true)
as
select
  s.user_id,
  count(*)::int as programs,
  count(*) filter (where s.status = 'active')::int as active_links,
  count(*) filter (where s.status = 'pending')::int as pending_links,
  coalesce(sum(s.confirmed_tickets), 0)::int as confirmed_tickets,
  coalesce(sum(s.earned), 0)::int as invitations_earned,
  coalesce(sum(s.delivered), 0)::int as invitations_delivered,
  coalesce(sum(s.pending_invitations), 0)::int as invitations_pending,
  bool_or(s.needs_review) as needs_review,
  max(s.last_reviewed_at) as last_reviewed_at
from public.participation_summary s
group by s.user_id;

revoke all on public.promoter_totals from anon, authenticated;
grant select on public.promoter_totals to authenticated;
