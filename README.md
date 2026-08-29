# Barbería City — sitio web + sistema de reservas real

Este proyecto tiene tres partes:

1. **Frontend** (`index.html`, `admin.html`, `css/`, `js/`) — el sitio y el panel de administración.
2. **Backend** (`netlify/functions/`) — funciones serverless que corren en Netlify y hablan con la base de datos.
3. **Base de datos** (Supabase, gratis) — donde se guardan las reservas de verdad, compartidas entre todos los que entran a la página.

Sin la base de datos, el sitio se ve bien pero el sistema de turnos **no va a funcionar** (las funciones necesitan conectarse a algo). Los pasos de abajo son para dejarlo 100% funcional. Se tarda entre 15 y 20 minutos la primera vez.

---

## Paso 1 — Crear la base de datos en Supabase (gratis)

1. Andá a [supabase.com](https://supabase.com) y creá una cuenta gratuita.
2. Creá un nuevo proyecto (elegí cualquier nombre, por ejemplo "barberia-city", y una contraseña para la base — guardala, no la vas a necesitar para el sitio pero sí por si entrás manualmente a la base).
3. Esperá a que el proyecto termine de crearse (1-2 minutos).
4. Andá a **SQL Editor** (menú izquierdo) → **New query**.
5. Abrí el archivo `supabase-schema.sql` de esta carpeta, copiá todo su contenido, pegalo en el editor y apretá **Run**.
   - Esto crea las tablas `bookings`, `horarios_config` y `horarios_bloqueados`, junto con la protección contra doble reserva.
6. Andá a **Project Settings → API**. Ahí vas a encontrar dos datos que necesitás para el paso 3:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **service_role key** (en la sección "Project API keys" — es la clave larga que dice `service_role`, **no** la `anon public`).

⚠️ La `service_role key` da acceso total a la base de datos. Nunca la pongas en el código del frontend ni la subas a un repositorio público — solo va a vivir como variable de entorno en Netlify (paso 3).

---

## Paso 2 — Subir el sitio a Netlify

Tenés dos formas:

**Opción A — Arrastrar y soltar (más simple, pero sin funciones automáticas al principio):**
No recomendada para este proyecto porque las funciones necesitan que Netlify instale la dependencia `@supabase/supabase-js`. Usá la opción B.

**Opción B — Conectar con un repositorio de GitHub (recomendada):**
1. Subí esta carpeta completa a un repositorio nuevo en GitHub.
2. En Netlify: **Add new site → Import an existing project → GitHub** → elegí el repositorio.
3. Netlify va a detectar el `netlify.toml` automáticamente. Dejá:
   - Build command: `npm install`
   - Publish directory: `.`
4. Todavía no hagas clic en "Deploy" — primero configurá las variables de entorno (paso 3), o agregalas después y volvé a desplegar.

---

## Paso 3 — Configurar las variables de entorno en Netlify

En el panel del sitio en Netlify: **Site configuration → Environment variables → Add a variable**. Agregá estas tres:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | La Project URL que copiaste de Supabase |
| `SUPABASE_SERVICE_KEY` | La service_role key que copiaste de Supabase |
| `ADMIN_PASSWORD` | Una contraseña que vos elijas para entrar al panel de administración |

Después andá a **Deploys → Trigger deploy → Deploy site** para que tome las variables nuevas.

---

## Paso 4 — Configurar los horarios de atención

El sitio **no inventa horarios de atención** — hay que cargarlos una vez desde el panel:

1. Entrá a `https://tu-sitio.netlify.app/admin.html`.
2. Ingresá la contraseña que definiste en `ADMIN_PASSWORD`.
3. Pestaña **"Configurar horarios"**: marcá los días que atiende la barbería, con su hora de inicio, hora de fin, y cada cuántos minutos dura un turno (por ejemplo 30). Guardá.
4. Listo — ya se puede reservar desde la página principal.

Desde el panel también podés:
- Ver todas las reservas (fecha, hora, servicio, si pidieron barba, nombre y WhatsApp del cliente).
- Cancelar una reserva (el horario se libera automáticamente).
- Bloquear un día completo o un horario puntual (feriados, turnos médicos, etc).

---

## Cómo funciona la protección contra doble reserva

Cuando alguien confirma un turno, la función `crear-reserva` intenta insertar la fila en la base de datos. La base tiene una **restricción única** sobre (fecha, hora) para reservas confirmadas. Si dos personas confirman el mismo horario casi al mismo tiempo, solo la primera inserción tiene éxito — la segunda es rechazada automáticamente por la base de datos (no por el código), y esa persona ve el mensaje "Este horario acaba de ser reservado por otra persona" con la lista de horarios actualizada. Es una garantía a nivel de base de datos, no una validación que se pueda esquivar.

---

## Cambiar precios, WhatsApp o Instagram más adelante

- **Precios**: en `js/main.js` (`PRECIOS`) y en `netlify/functions/crear-reserva.js` (`PRECIOS`) — hay que cambiarlo en los dos lugares porque el precio final siempre lo calcula el servidor, nunca el navegador.
- **WhatsApp**: variable `WHATSAPP_NUMERO` en `js/main.js`, y los links `wa.me` en `index.html`.
- **Instagram**: buscar `instagram.com/barberia.city` en `index.html` y reemplazar por el nuevo usuario.

---

## Probar en local antes de subir

Si tenés Node instalado:

```bash
npm install -g netlify-cli
npm install
netlify dev
```

Esto levanta el sitio y las funciones en `http://localhost:8888`, usando las variables de entorno que configures en un archivo `.env` local (mismas claves que en la tabla del Paso 3).
