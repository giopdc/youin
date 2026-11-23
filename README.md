# You In: comunidad de eventos (MVP)

Marca, voz, colores y tipografía: ver [BRAND.md](BRAND.md).

Web app en español para publicar fiestas de música electrónica en Valencia, gestionar listas y
recompensar con invitaciones a quien vende entradas con su enlace personal.
Usa Next.js (App Router, TypeScript) y Supabase (auth, Postgres con RLS y Storage para carteles).

El nombre «You In» está definido en un solo sitio: `src/config/site.ts` (o la variable `NEXT_PUBLIC_APP_NAME`).

## 1. Arrancar

```bash
npm install
cp .env.example .env.local   # rellena los valores (ver abajo)
npm run dev                  # http://localhost:3000
```

### Supabase

1. Crea un proyecto en https://supabase.com (región UE).
2. Aplica las migraciones de `supabase/migrations/` en orden, por una de estas dos vías:
   - con la CLI: `npx supabase link --project-ref <ref>` y después `npx supabase db push`;
   - o desde **SQL Editor**: pega y ejecuta cada archivo, por orden de nombre.
3. **Authentication → URL Configuration**:
   - Site URL: tu dominio (p. ej. `https://youin.example`).
   - Redirect URLs: `https://youin.example/auth/confirm` (y `http://localhost:3000/auth/confirm` para desarrollo).
4. **Authentication → Email Templates** (recomendado: el enlace funcionará aunque el correo se abra en otro navegador):
   - *Confirm signup*: `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirmar mi cuenta</a>`
   - *Reset password*: `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Elegir contraseña nueva</a>`
5. **Authentication → SMTP**: configura un SMTP propio antes de abrir el registro. El correo integrado
   de Supabase solo envía unos pocos correos por hora.

### Variables de entorno (`.env.local`)

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → clave `anon`/publishable |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la web, sin barra final (se usa en los enlaces `/r/…` y en los correos) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo para `npm run verify:story` contra un proyecto de pruebas. La app no la usa. |

## 2. Crear tu primer administrador

1. Regístrate en la web con tu correo (`/registro`) y confirma el correo.
2. En Supabase, en **SQL Editor**, ejecuta:
   ```sql
   select public.grant_admin_by_email('tu-correo@ejemplo.com');
   ```
3. Recarga la web: verás «Admin» en el menú.

Los administradores están en una tabla aparte (`public.admins`) sin permisos de escritura desde la
web. Nadie puede hacerse administrador editando su perfil.

## 3. Operar una noche de Elenco

1. **Preparar**: en Admin, abre «Elenco · borrador de ejemplo». Rellena título, fecha, horas (hora de
   Madrid), sala, dirección, cartel, artistas, precios, edad mínima y condiciones. Pega el enlace de
   venta de Xceed (puede ser tu enlace general de promotor). Activa «Lista» y/o «Compartir y ganar».
   La regla por defecto es 5 entradas = 1 invitación; el límite por persona es opcional.
2. **Previsualizar** y **Publicar**. Sin fecha no se puede publicar.
3. **Solicitudes del programa**: en «Ventas y recompensas», filtra «Pendiente de enlace». Cuando
   Elenco te dé el enlace oficial de Xceed que identifica las ventas de esa persona, pégalo en
   «Gestionar a …» → «Guardar y activar». Desde ese momento la persona ve su enlace `/r/…` en «Mi perfil».
   Si solo tienes el enlace general, déjalo como «Comprar entrada»: la app no deja asignarlo como
   canal personal. Las solicitudes quedan pendientes.
4. **Lista**: en «Lista», confirma o rechaza las solicitudes. Al final tienes los nombres confirmados
   para copiarlos para la puerta. Puedes cerrar la lista o el programa desde «Editar».
5. **Revisar ventas** (desde el móvil): abre el informe de Xceed y, para cada canal, escribe el
   **TOTAL acumulado** de entradas válidas. Cuenta entradas individuales; no cuentes invitaciones
   gratuitas ni reembolsos. Guardar el mismo total no suma nada. Cada cambio queda en el historial
   con autor, fecha, valor anterior, valor nuevo y nota.
6. **Entregar invitaciones**: filtra «Invitación pendiente», escribe las instrucciones privadas (p. ej.
   cómo identificarse en puerta) y pulsa «Marcar invitación N como entregada». Se registra una sola vez.
7. **Ventas por perfil**: en Admin → «Ventas por perfil» ves el total acumulado de cada persona en todas las fiestas,
   el desglose por fiesta, las invitaciones y un CSV descargable. Cada miembro ve sus propios totales en «Mis planes».
8. **Reembolsos**: corrige el total a la baja. Si una invitación ya entregada deja de corresponder,
   la fila aparece en «Para revisar» y el historial de entrega se conserva.

Un clic en un enlace nunca suma ventas. La app no se conecta a Xceed ni necesita credenciales de Xceed:
solo guarda y valida destinos `https://…xceed.me/…`.

## 4. Publicación (Cloudflare Workers)

Web publicada: https://you-in.ciaterbox.workers.dev

- `.env.production` lleva la URL y la clave pública de Supabase y la URL pública (no son secretos).
- `npm run deploy`: despliegue estándar con OpenNext (sube los estáticos como *static assets*).
- `npm run deploy:direct`: alternativa que incrusta los estáticos en el worker, para entornos
  donde la subida de *static assets* falla (como las sesiones en la nube de Claude Code).
- Recomendado: en Cloudflare → Workers → `you-in` → Settings → Builds, conecta este repositorio
  con *Build command* `npx opennextjs-cloudflare build` y *Deploy command* `npx opennextjs-cloudflare deploy`,
  para que cada push a `main` se publique solo.

## 5. Guion de comunidad

- `scripts/prueba-comunidad.md`: el guion de prueba con cinco personas.
- `scripts/guion-comunidad.mjs`: lo recorre en un móvil simulado de 390 × 844 (pasos 1, 2, 3 y 5).
  `BASE=https://you-in.ciaterbox.workers.dev EMAIL=… PASSWORD=… SHOTS=./capturas node scripts/guion-comunidad.mjs`
  (la cuenta debe existir y estar confirmada; el paso 4, el programa de Elenco, lo cubren `npm run test:db` y la E2E).
- `scripts/revisar-ficha-yuin.py URL`: comprueba la vista previa social (og:title, og:description, og:url).
  Cloudflare bloquea el agente por defecto de Python («Python-urllib»); WhatsApp, Telegram y Facebook sí la reciben.

## 6. Comprobaciones

```bash
npm run lint        # TypeScript
npm test            # lógica: mensajes de recompensa, validación de Xceed, zona horaria, redirecciones
npm run build
npm run test:db     # migraciones + RLS + historia completa en un Postgres local (PGHOST/PGPORT/PGUSER)
npm run verify:story  # historia completa contra un proyecto Supabase real de pruebas (usa la service role key)
```

`test:db` aplica `supabase/tests/local_shim.sql`, que imita los roles y `auth.uid()` de Supabase, y
después las migraciones y `story_test.sql`. No lo ejecutes contra Supabase.

## Estructura

- `supabase/migrations/`: esquema, RLS, funciones, borradores de ejemplo y bucket de carteles.
- `src/app/`: pantallas (portada, `eventos/[slug]`, `registro`, `acceso`, `recuperar`, `perfil`, `admin/…`).
- `src/app/r/[code]/route.ts`: enlace público corto que redirige a Xceed.
- `src/lib/`: reglas de recompensas, validación de Xceed y zona horaria Europe/Madrid.
