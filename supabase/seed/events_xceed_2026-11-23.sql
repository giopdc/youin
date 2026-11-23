-- Fiestas publicadas el 23/11/2026 con datos del canal de Xceed gio-promotor.
-- Para recrearlas en un proyecto nuevo: aplica antes las migraciones y luego este archivo.
insert into public.events (slug,status,title,promoter,starts_at,ends_at,venue,address,city,poster_url,description,artists,price_text,min_age,access_conditions,ticket_url,guestlist_enabled,guestlist_open,guestlist_conditions,rewards_enabled,rewards_open,rewards_conditions,reward_threshold,reward_cap) values ('elenco-house-7-diciembre','published','Elenco House','Elenco · hosted by theBasement','2026-12-07 19:00:00+00','2026-12-08 05:00:00+00','Palau Alameda','Carrer de l''Arquitecte Mora, 2','Valencia','https://images.xceed.me/events/banners/elenco-house-lunes-7-de-diciembre-valencia-xceed-square-b43d.jpg?w=1920&h=1920&ar=1:1&fm=auto','ELENCO HOUSE, la última edición de la saga de 2026: full house en pleno centro de Valencia.

Dos salas:
· La Gran Sala, de 20:00 a 04:00
· Azza, de 02:00 a 06:00 (showcase Discovery Vinyl)','Fran Hernández (special house set)
Whatever Charles
Gio Porzio
Pau Thomas & Marc Strap
Wess Mayora
Elojet B2B Alberto Sola','La Sala: early birds 13 €; después 16 €, 20 € y 25 €
Azza (post-party): early birds 13 €; después 16 € y 20 €
La Sala + Azza: early birds 20 €; después 25 €
Reservado con botella (5 personas): La Gran Sala 200 €, Azza 150 €
Los gastos de gestión de Xceed se añaden al comprar.',21,'Solo mayores de 21 años.
Vestimenta: ven como estás.
Apertura de puertas: 20:00.','https://xceed.me/es/valencia/event/elenco-house-lunes-7-de-diciembre/253465/channel/gio-promotor',false,true,NULL,true,true,NULL,5,null) on conflict (slug) do nothing;

insert into public.events (slug,status,title,promoter,starts_at,ends_at,venue,address,city,poster_url,description,artists,price_text,min_age,access_conditions,ticket_url,guestlist_enabled,guestlist_open,guestlist_conditions,rewards_enabled,rewards_open,rewards_conditions,reward_threshold,reward_cap) values ('navidance-25-diciembre','published','Xmas Takeover · Navidance','theBasement','2026-12-25 16:00:00+00','2026-12-26 02:30:00+00','Veles e Vents','Sc Puerto, 2, Marina Real Juan Carlos I','Valencia','https://images.xceed.me/events/banners/xmas-takeover-navidance-by-thebasement-valencia-xceed-square-c849.png?w=1920&h=1920&ar=1:1&fm=auto','La mejor ocasión para empezar a bajar los turrones con baile. Para tan especial ocasión, nos juntamos dos teams: Cosmic + theBasement, en Veles e Vents.','theBasement Soundsystem','Early bird: 12 €
Pack Navidance + Reyes y Reinas (Cosmic & theBasement): 18 €
Los gastos de gestión de Xceed se añaden al comprar.',21,'Solo mayores de 21 años.
Vestimenta: ven como estás.
Apertura de puertas: 17:00.','https://xceed.me/es/valencia/event/25-dic-xmas-takeover-navidance-by-thebasement/251900/channel/gio-promotor',false,true,NULL,false,true,NULL,5,null) on conflict (slug) do nothing;

insert into public.events (slug,status,title,promoter,starts_at,ends_at,venue,address,city,poster_url,description,artists,price_text,min_age,access_conditions,ticket_url,guestlist_enabled,guestlist_open,guestlist_conditions,rewards_enabled,rewards_open,rewards_conditions,reward_threshold,reward_cap) values ('nye-31-diciembre','published','NYE Electronic · Mar Electronic x theBasement','Mar Electronic & theBasement','2026-12-31 21:00:00+00','2027-01-01 06:00:00+00','Veles e Vents','Sc Puerto, 2, Marina Real Juan Carlos I','Valencia','https://images.xceed.me/events/banners/19-dic-xmas-takeover-opening-season-by-mar-electronic-valencia-valencia-xceed-square-a979.png?w=1920&h=1920&ar=1:1&fm=auto','Mar Electronic x theBasement presentan NEW YEAR''S EVE.

El próximo 31 de diciembre, dos referentes de la escena electrónica valenciana unen fuerzas para despedir 2026 con una edición muy especial de XMAS TAKEOVER en VELES E VENTS.

Dos conceptos, una misma pasión por la música y una noche diseñada para dar la bienvenida al nuevo año como mejor sabemos hacerlo: bailando. Una cuidada selección musical, sonido de primer nivel y una producción a la altura de la ocasión en uno de los espacios más emblemáticos de Valencia.

El último baile del año. El primero de todo lo que está por venir.',NULL,'Early bird: 19 €
Backstage: 50 €
VIP Gold: 500 €
VIP DJ: 1000 €
Los gastos de gestión de Xceed se añaden al comprar.',18,'Solo mayores de 18 años.
Vestimenta: ven como estás.
Apertura de puertas: 22:00.','https://xceed.me/es/valencia/event/3112-nye-electronic-by-mar-electronic-thebasement/252852/channel/gio-promotor',false,true,NULL,false,true,NULL,5,null) on conflict (slug) do nothing;

insert into public.events (slug,status,title,promoter,starts_at,ends_at,venue,address,city,poster_url,description,artists,price_text,min_age,access_conditions,ticket_url,guestlist_enabled,guestlist_open,guestlist_conditions,rewards_enabled,rewards_open,rewards_conditions,reward_threshold,reward_cap) values ('reyes-y-reinas-5-enero','published','Xmas Takeover · Reyes y Reinas','theBasement','2027-01-05 16:00:00+00','2027-01-07 02:30:00+00','Veles e Vents','Sc Puerto, 2, Marina Real Juan Carlos I','Valencia','https://images.xceed.me/events/banners/xmas-takeover-reyes-y-reinas-by-thebasement-valencia-xceed-square-a6fd.png?w=1920&h=1920&ar=1:1&fm=auto','La mejor ocasión para empezar a bajar los turrones con baile. Para tan especial ocasión, nos juntamos dos teams: Cosmic + theBasement, en Veles e Vents.','theBasement Soundsystem','Early bird: 12 €
Los gastos de gestión de Xceed se añaden al comprar.',21,'Solo mayores de 21 años.
Vestimenta: ven como estás.
Apertura de puertas: 17:00.','https://xceed.me/es/valencia/event/xmas-takeover-reyes-y-reinas-by-thebasement/251918/channel/gio-promotor',false,true,NULL,false,true,NULL,5,null) on conflict (slug) do nothing;

insert into public.events (slug,status,title,promoter,starts_at,ends_at,venue,address,city,poster_url,description,artists,price_text,min_age,access_conditions,ticket_url,guestlist_enabled,guestlist_open,guestlist_conditions,rewards_enabled,rewards_open,rewards_conditions,reward_threshold,reward_cap) values ('dias-de-campo-2027','published','Días de Campo 2027 · 10º aniversario','theBasement','2027-05-13 16:00:00+00','2027-05-17 03:00:00+00','Montanejos',NULL,'Castellón','https://images.xceed.me/events/banners/dias-de-campo-2027-10-aniversario-montanejos-1-valencia-xceed-square-7b26.png?w=1920&h=1920&ar=1:1&fm=auto','Décimo aniversario del festival Días de Campo, edición 2027. Cuatro días de música electrónica en un entorno natural incomparable.

Hay autobuses Valencia–Montanejos a la venta en Xceed por separado.','Camion Bazar
Cinthie
Dj Masda
Elena Megi
Javier Carballo
Legram VG
Mathew Jonson
Stella Zekri
Persa
Francesco Farfa
Shakolin
Karine
Loa Szala
Frank Haag
Reptant
Andrés Llatas
MARLIE
Ivan Smagghe
Nuzzo
Pol K
Aury
Egyptian Lover
Hamish & Toby
Doudou MD
Le Camion Bazar Gang
Danilo Plessow
Vladimir Ivkovic
Phill Prince
Veruh
Breixo Martínez
Abscal
CANDEL','Abono full pass: 149 €
Los gastos de gestión de Xceed se añaden al comprar.',18,'Solo mayores de 18 años.
Vestimenta: ven como estás.
Apertura de puertas: 18:00.','https://xceed.me/es/valencia/event/dias-de-campo-2027-10-aniversario-montanejos-1/236318/channel/gio-promotor',false,true,NULL,false,true,NULL,5,null) on conflict (slug) do nothing;

-- El borrador de ejemplo de The Basement ya no se usa.
delete from public.events where slug = 'the-basement-borrador';
-- El borrador de ejemplo de Elenco se sustituye por elenco-house-7-diciembre.
delete from public.events where slug = 'elenco-borrador';

-- Estilos musicales (Xceed) y estado: solo Elenco House está confirmada por Giorgio.
update public.events set genres = '{House,"Nu-Disco / Disco","Tech house"}' where slug = 'elenco-house-7-diciembre';
update public.events set genres = '{House,"Tech house","Deep House"}' where slug in ('navidance-25-diciembre','reyes-y-reinas-5-enero');
update public.events set genres = '{House,"Tech house",Minimal}' where slug = 'nye-31-diciembre';
update public.events set genres = '{Techno,House,"Electrónica / Downtempo"}' where slug = 'dias-de-campo-2027';
update public.events set status = 'draft' where slug in ('navidance-25-diciembre','nye-31-diciembre','reyes-y-reinas-5-enero','dias-de-campo-2027');
