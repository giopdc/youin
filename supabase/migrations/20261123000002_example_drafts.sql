-- Dos borradores de ejemplo. No contienen fechas, precios, carteles ni
-- compromisos: se completan con la información real antes de publicar.
insert into public.events (slug, status, title, promoter, city,
  guestlist_enabled, rewards_enabled, reward_threshold, reward_cap)
values
  ('elenco-borrador', 'draft', 'Elenco · borrador de ejemplo', 'Elenco', 'Valencia',
   true, true, 5, null),
  ('the-basement-borrador', 'draft', 'The Basement · borrador de ejemplo', 'The Basement', 'Valencia',
   true, false, 5, null)
on conflict (slug) do nothing;
