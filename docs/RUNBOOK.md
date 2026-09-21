# Runbook

Operational procedures for the Dexee Talent Platform. Assumes a Vercel project and two Supabase projects (dev, production).

## Environments

| Environment | Supabase                                        | Hosting                                  | Notes                               |
| ----------- | ----------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| local       | linked dev project or `supabase start` (Docker) | `npm run dev`                            | `.env.local` from `.env.example`    |
| dev         | dev project                                     | Vercel preview                           | migrations via `npm run db:push`    |
| production  | production project                              | Vercel production, domain dexeegroup.com | migrations promoted through CI only |

## First-time setup

1. `npm ci`
2. `supabase login` then `supabase link --project-ref <ref>`
3. `npm run db:push` to apply `supabase/migrations`
4. In the Supabase dashboard run `supabase/seed.sql` (dev only) or `psql "$SUPABASE_DB_URL" -f supabase/seed.sql`
5. `npm run db:seed` to load the JSON question banks into `assessment_questions`
6. `npm run db:types` to regenerate `src/types/database.ts`
7. Configure Auth: enable email confirmations, set Site URL to the deployment URL and add `https://<host>/auth/callback` to redirect URLs. Brand the email templates (Confirm signup, Reset password, Invite) with the Dexee logo and colors.
8. Create the first admin: sign up as a candidate with the Dexee email, confirm it, then `npm run promote-admin -- --email info@dexeegroup.com`.
9. `npm run rls:test` against the project to confirm access rules.

## Deploy

- Pull requests run lint, typecheck, unit tests, `db:verify` (migrations and RLS matrix on PGlite) and `next build`.
- Production deploy is a Vercel promotion of `main`. Apply migrations first: `supabase db push --linked` with the production ref from CI (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` secrets), then deploy.
- Cron jobs are declared in `vercel.json` and authenticate with `CRON_SECRET`. On the Vercel Hobby plan they run once a day (see DECISIONS 22); on Pro, set `process-attempts` and `process-outbox` back to `*/5 * * * *`.

## Rollback

- Application: redeploy the previous Vercel deployment.
- Database: migrations are forward-only. Write a new migration that reverts the change; never edit an applied migration.

## Site URL

`NEXT_PUBLIC_SITE_URL` goes without a trailing slash (`https://dexeegroup.com`, never
`https://dexeegroup.com/`). The code strips trailing slashes since phase D, but the value in
Vercel should be clean as well. After the domain switch, resubmit `sitemap.xml` in Google
Search Console so the canonical URLs are recrawled.

## Domain and DNS

- Registrar: Squarespace, under `aradi@dexeegroup.com`. Renewal 11 Sep 2027.
- Authoritative DNS since 21 Sep 2026: Cloudflare, zone in the account under `alejandroradib@gmail.com`, nameservers `art.ns.cloudflare.com` and `marissa.ns.cloudflare.com`. The registry delegation changed on 19 Sep 14:16 UTC; Cloudflare activated the zone two days later, after a manual "Check nameservers now". The previous zone (`vin`/`sloan`) sits in an account nobody at Dexee controls and is no longer used.
- Squarespace still holds the domain registration and used to host the old website. Before cancelling the website plan, check whether the Google Workspace subscription is billed through Squarespace (Squarespace domain page → Email, and `admin.google.com` → Billing → Subscriptions). If it is, move it to direct Google billing first and confirm the move, then cancel the site plan. Cancelling first can end the Workspace subscription and the mailboxes with it. Never cancel the domain registration itself.
- The application is served by Vercel. Both `dexeegroup.com` and `www.dexeegroup.com` are CNAMEs to the target Vercel prints under Settings, Domains. On Cloudflare they must be `DNS only` (grey cloud); the orange-cloud proxy breaks domain validation and can loop the certificate.
- Email is Google Workspace and does not live in this repo's control: one MX to `smtp.google.com` priority 1, the SPF TXT on the apex, and the DKIM TXT on `google._domainkey`. Never delete these three, and recreate them **before** changing nameservers, not after.
- Changing DNS provider: create every record listed above in the new provider first, then repoint nameservers at the registrar. Read the live values with `dns.resolveMx` / `dns.resolveTxt` before starting, since the DKIM public key is only recoverable from the current DNS or from the Google Workspace admin console.
- After any domain change: set `NEXT_PUBLIC_SITE_URL` in Vercel to the new origin and redeploy, then update Site URL and Redirect URLs in Supabase Authentication.

## Rotate keys

1. Supabase service role: rotate in Project settings, update `SUPABASE_SERVICE_ROLE_KEY` in Vercel and redeploy.
2. Anthropic, OpenAI, Resend: create the new key, update the environment variable, redeploy, revoke the old key.
3. `CRON_SECRET`: update in Vercel; cron requests pick it up on the next run.

## Promote an admin

`npm run promote-admin -- --email user@dexeegroup.com` (the user must exist). Or invite from `/admin/team`.

## Calibrate assessment thresholds

After roughly 100 written attempts, export attempt results and compare MCQ levels with validated writing levels. Adjust `thresholds` in `/admin/settings` (saving bumps `assessments.version`). Record the change in `docs/DECISIONS.md`.

## Handle data requests (Law 1581)

Requests appear in `/admin/candidates/<id>` and notify admins. For deletion: export the candidate's data if requested, then delete the auth user in the Supabase dashboard (cascades to profile, candidate, contacts, applications and attempts) and remove `resumes/candidates/<id>/` and `assessment-audio/attempts/<attempt>/` objects. Mark the request resolved.

## Retry a failed assessment

`/admin/assessments` lists `failed` attempts. Open one and use Retry processing (oral) or validate manually with a final level (written).

## Health and monitoring

- `GET /api/health` checks database connectivity and reports `email: configured | unconfigured` (audit G3). An unconfigured provider means every outbox row is parked as `skipped` until a key is set; nothing is silently lost, and nothing is sent either.
- The admin dashboard shows an email delivery tile: pending rows over 15 minutes, failed in 24 hours, parked for lack of provider. Red means look.
- Logs are structured JSON (pino) in Vercel logs. Set `SENTRY_DSN` when the Sentry project exists.

## Secrets scan

CI runs gitleaks on every pull request. Never commit `.env.local`.

## Aplicar una migración al proyecto remoto

`supabase db push` no funciona contra el proyecto alojado (identificador en las notas de
entrega): las versiones registradas allí
no coinciden con los nombres de archivo del repositorio (ver decisión 46), así que la CLI
intentaría reaplicar todo. Aplique cada migración nueva con `apply_migration` del MCP de
Supabase, pasando el contenido del archivo y su nombre lógico, y después confirme con una
consulta al catálogo que las columnas, los triggers y las vistas quedaron. Corra
`npm run db:verify` antes, que es la verificación real del esquema y sí usa los archivos.

## Bancos de evaluación

Los bancos con las claves no están en el repositorio (decisión 74). Viven en un directorio
que usted controla, por ejemplo `.banks/` en su equipo, y el cargador lo lee de
`ASSESSMENT_BANKS_DIR`. Sin esa variable los scripts terminan con un mensaje; no cargan un
banco de ejemplo por su cuenta.

Para cargar o actualizar los bancos en un entorno:

    ASSESSMENT_BANKS_DIR=/ruta/a/.banks npx tsx scripts/demo/load-banks.ts > banks.sql

Eso imprime inserciones idempotentes, que coinciden por `options->>'bank_id'`, de modo que
volver a correrlo no duplica preguntas. Aplique el SQL con psql o, en el proyecto alojado,
con `execute_sql` del MCP de Supabase por partes, porque el archivo excede el tamaño de una
llamada. Después confirme el conteo:

    select a.type, count(*) from assessment_questions q
      join assessments a on a.id = q.assessment_id
     where q.is_active group by a.type order by a.type;

Cuando rote un banco, retire primero las preguntas anteriores de ese tipo, porque el
cargador solo agrega:

    update assessment_questions set is_active = false
     where assessment_id = (select id from assessments where type = 'english_written');

Los intentos ya validados conservan su resultado: guardan el reporte, no las preguntas.
`.banks/retired-hashes.json` contiene las huellas de los bancos retirados y el cargador
rechaza cualquier ítem que las repita; consérvelo junto a los bancos.

### Estado en producción

Los bancos rotados se cargaron en el proyecto alojado el 21 de septiembre de 2026. Estado
verificado tras la carga, con los ítems expuestos desactivados y conservados:

| Prueba | Activas | Retiradas |
|---|---|---|
| english_written | 138 | 75 |
| english_oral | 40 | 12 |
| psychometric | 80 (50 IPIP + 30 situacionales) | 10 |
| disc | 28 | 28 |

Distribución del inglés escrito: 14 ítems por sección y banda en gramática, vocabulario y
lectura (42 por sección, 42 por banda) y 4 consignas de escritura por banda.

La carga se verificó comparando una huella de contenido calculada igual en local y en
producción, sobre `bank_id`, enunciado, clave, sección y banda de los 236 ítems nuevos:

    select count(*), md5(string_agg(sig, chr(10) order by sig)) from (
      select (q.options->>'bank_id') || '|' || q.prompt || '|' ||
             coalesce(q.answer_key::text,'-') || '|' || q.section || '|' ||
             coalesce(q.band::text,'-') as sig
      from assessment_questions q
      where (q.options->>'bank_id') ~ '^(gr|vo|rd|wr|or2|sjt2|disc2)-'
        and (q.options->>'bank_id') !~ '-[0-9]{3}$') s;

Repita esa consulta contra el directorio de bancos si vuelve a cargar: si la huella difiere,
algo se transcribió mal. Para revertir la rotación basta invertir la activación; los ítems
viejos siguen en la tabla.

## Activar DISC en producción

La migración `20260922000002` crea la fila de `assessments` para `disc` con `is_active = false`,
porque el banco de preguntas no viaja en la migración. Orden obligatorio:

1. Generar el SQL del banco y quedarse solo con las sentencias de `disc`:
   `npx tsx scripts/demo/load-banks.ts` imprime inserciones idempotentes para las cuatro
   pruebas (coinciden por `options->>'bank_id'`, así que repetirlas no duplica). Ejecute las
   28 inserciones cuyo `where a.type = 'disc'` con `execute_sql` del MCP de Supabase o con psql.
2. Confirmar: `select count(*) from assessment_questions q join assessments a on a.id = q.assessment_id where a.type = 'disc' and q.is_active;` debe devolver 28.
3. Activar: `update assessments set is_active = true where type = 'disc';`

Activar antes de cargar el banco hace fallar `startAttempt` para todos los candidatos.
Mientras `disc` esté inactiva, no cuenta como requisito para postular, aunque
`required_to_apply` sea `true`; la función `candidate_apply_requirements` solo considera
pruebas activas.

## Vigencia de resultados

`assessments.validity_days` (1–90, hoy 90 en las cuatro) fija cuántos días vale un resultado
validado. El trigger sella `valid_until` al validar; cambiar la columna no afecta los intentos
ya validados. Un candidato con un resultado vencido ve la prueba como pendiente en el hub y no
puede postular hasta repetirla; el cooldown de 90 días coincide con la vigencia, así que nunca
queda bloqueado por ambos a la vez. Registre cualquier cambio en `docs/DECISIONS.md`.

## Análisis de ajuste

- Requiere `ANTHROPIC_API_KEY` en Vercel. Sin ella cada postulación deja una fila `skipped`
  con `last_error = ai_unavailable` y el panel de recomendados lo indica. Al configurar la
  clave, el botón "Actualizar" del panel recalcula hasta cinco postulaciones por vacante, y
  el cron `process-attempts` toma el resto (diez por corrida mientras el plan sea Hobby).
- `select status, count(*) from application_fit group by 1;` da la foto del backlog.
  Filas `failed` con `attempts >= 3` no se reintentan solas; revise `last_error` y, si
  procede, fuerce con `computeApplicationFit(id, { force: true })` desde un script. Una hoja
  de vida sin capa de texto (PDF escaneado) no falla la fila: el modelo recibe la nota
  `resume_unreadable` y calcula el ajuste con el perfil y los resultados.
- El texto de la hoja de vida se anonimiza antes de salir hacia Anthropic
  (`src/lib/resume/redact.ts`). No añada campos al prompt sin pasar por esa función.

## Correo transaccional (Resend, DMARC, SMTP de Auth)

La aplicación envía por Resend desde `EMAIL_FROM` (`no-reply@dexeegroup.com`). Resend rechaza
todo envío desde un dominio que no haya verificado, y Supabase Auth sin SMTP propio solo entrega
correos a miembros del equipo del proyecto. Sin estos tres bloques configurados, ningún usuario
real completa el registro ni recibe acuses.

### 1. Verificar el dominio en Resend

En Resend → Domains → Add domain, `dexeegroup.com`, región US. Resend muestra tres registros;
créelos en la zona de Cloudflare, todos en **DNS only** (nube gris):

| Tipo | Nombre | Valor | Para qué |
|---|---|---|---|
| TXT | `resend._domainkey` | la clave DKIM que muestra Resend (`p=MIGf...`) | firma DKIM de los correos de la aplicación |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com`, prioridad 10 | rebotes y quejas de vuelta a Resend |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF del subdominio de envío |

El SPF de la raíz (`v=spf1 include:_spf.google.com ~all`) no cambia: Google sigue enviando
desde `@dexeegroup.com` y Resend firma con su propio selector y su subdominio `send`. Vuelva a
Resend y pulse Verify; tarda de uno a quince minutos. Copie los valores exactos del panel de
Resend, no de esta tabla, porque el host del MX depende de la región elegida.

### 2. DMARC

Hoy el dominio no tiene registro DMARC, así que cualquiera puede suplantar `@dexeegroup.com`
sin que el receptor tenga una política que aplicar. Para una firma de reclutamiento es
material: las ofertas de empleo falsas son de las estafas más comunes contra candidatos.

1. Cree el alias `dmarc@dexeegroup.com` en Google Workspace (o un grupo que redirija a un buzón
   que alguien lea).
2. TXT en `_dmarc`: `v=DMARC1; p=none; rua=mailto:dmarc@dexeegroup.com; fo=1`
3. Tres semanas después, si los reportes solo muestran Google y Resend como emisores legítimos:
   `p=quarantine; pct=100`. Tres semanas más y sin falsos positivos: `p=reject`.

Si en cualquier etapa un envío legítimo cae en spam, revise el reporte antes de retroceder:
casi siempre es un servicio nuevo enviando desde el dominio sin SPF ni DKIM.

### 3. SMTP de Supabase Auth con Resend

Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP:

| Campo | Valor |
|---|---|
| Sender email | `no-reply@dexeegroup.com` |
| Sender name | `Dexee` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | una llave de API de Resend con permiso de envío (puede ser la misma `RESEND_API_KEY`) |

Guarde y, en la misma sección, confirme que Site URL sea `https://dexeegroup.com` y que las
Redirect URLs incluyan `https://dexeegroup.com/auth/callback` y `https://dexeegroup.com/**`.
Mientras el SMTP propio no exista, la confirmación de cuenta solo llega a miembros del equipo
de Supabase: un candidato real no puede terminar de registrarse.

### 4. Prueba de humo, cinco minutos, después de cualquier cambio de DNS

1. `GET https://dexeegroup.com/api/health` debe responder `"email":"configured"`.
2. Con un correo personal que no sea del equipo, regístrese como candidato en
   `https://dexeegroup.com/es/sign-up/candidate`. El correo de confirmación debe llegar en menos
   de un minuto, desde `no-reply@dexeegroup.com`, y el enlace debe empezar por
   `https://dexeegroup.com/auth/callback`. Ese correo lo envía Supabase por el SMTP del paso 3.
3. Envíe un brief desde el formulario de empresas en `/es/for-companies`. El acuse lo envía la
   aplicación por Resend; debe llegar en menos de un minuto y aparecer en Resend → Emails como
   Delivered.
4. En el buzón receptor, abra "Mostrar original" (Gmail) y compruebe `SPF: PASS`, `DKIM: PASS`
   con `d=dexeegroup.com`, y `DMARC: PASS` una vez exista el registro.
5. En `/es/admin`, la tarjeta de entrega de correo debe estar en gris, sin cifras en rojo.

Si el paso 2 falla pero el 3 funciona, el problema es el SMTP de Auth. Si falla el 3, revise
primero que el dominio esté Verified en Resend y luego `RESEND_API_KEY` en Vercel.

## Correo saliente y cron

Desde la fase C de la auditoría, cada correo se intenta enviar en la misma petición que lo
encola (`after()` en `deliver`); el cron `process-outbox` de las 06:00 UTC es solo reintento de
lo que falló. Restaurar `*/5 * * * *` en `vercel.json` requiere el plan Pro de Vercel; en Hobby
solo se permite una ejecución diaria por cron.

## Cambio de contraseña seguro en el proyecto alojado

`supabase/config.toml` activa `secure_password_change` para el stack local. En el proyecto
alojado es un ajuste del panel: Authentication, Providers, Email, "Secure password change".
Actívelo; la acción `changePassword` ya exige la contraseña actual por su cuenta, así que el
ajuste es una segunda barrera y no un requisito para que funcione.

## Lead queue

Inbound briefs land in `contact_requests` with `request_type = 'hire'` and `status = 'new'`.
`/admin/leads` is the queue.

- **The promise.** The form commits Dexee to a written answer within one business day,
  saying whether the role can be filled, in what timeframe and at what cost. The queue
  measures against that: a lead still `new` after nine business hours (Monday to Friday,
  09:00 to 18:00 Bogotá) is flagged "past the promise".
- **Marking answered.** Use the button in the queue, not SQL. `answered_at` and
  `answered_by` are stamped by a database trigger so the response-time figures on the
  admin dashboard cannot be written around.
- **Converting.** Once the client has an account, paste the company id into the convert
  field. That links the lead to the company and moves it to `converted`.
- **The acknowledgement email.** Queued in `email_outbox` with `dedupe_key = lead:{id}`
  and sent by the outbox cron. If Resend is down, the lead is still saved: the insert
  happens first and on its own. A lead with no matching outbox row means the queue insert
  failed, and `lead_acknowledgement_queue_failed` is in the logs.

## Analytics

Behind `NEXT_PUBLIC_ANALYTICS_PROVIDER` (`plausible` or `ga4`) plus
`NEXT_PUBLIC_ANALYTICS_ID`. With neither set, nothing loads and `track()` is a no-op.

Nine events: `view_pricing`, `use_calculator`, `view_sample_report`, `start_lead_form`,
`submit_lead`, `start_candidate_signup`, `complete_assessment`, `view_job`, `apply_job`.
Properties are categories only; `sanitizeProps` drops anything personal before it leaves
the browser. To add an event, add the name to `ANALYTICS_EVENTS` and a case to
`tests/e2e/events.spec.ts`; the unit test fails if the catalogue and the doc disagree.

## Google Indexing API

Optional. Set `INDEXING_API_CREDENTIALS` to a service-account JSON key, as one line, for
an account granted Owner on the property in Search Console. Publishing, approving,
pausing and closing a vacancy then ping Google for both locale URLs. Without the
credential every call is a silent no-op and nothing else changes.
