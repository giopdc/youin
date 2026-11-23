-- Vídeos para crear expectación en la ficha (se suben al bucket público «posters»).
alter table public.events
  add column videos jsonb not null default '[]'::jsonb
  check (jsonb_typeof(videos) = 'array' and jsonb_array_length(videos) <= 6);

comment on column public.events.videos is 'Vídeos para la ficha: [{"src": "https://…mp4", "poster": "https://…jpg"}]';
