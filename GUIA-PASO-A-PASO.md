# NailBook — Guía para publicarlo gratis con base de datos

Este sistema tiene dos partes:
- **`/` (página principal)** → la ven tus clientas, reservan turno (queda "pendiente")
- **`/panel`** → lo usan vos y tu equipo, protegido con una clave, para gestionar todo

Vas a necesitar crear 3 cuentas gratuitas: **Supabase** (base de datos), **GitHub** (donde vive el código) y **Vercel** (donde se publica la web). Ninguna pide tarjeta de crédito para el plan gratuito.

---

## Paso 1 — Crear la base de datos en Supabase

1. Entrá a **supabase.com** → "Start your project" → creá cuenta (podés usar tu Google).
2. Click en "New project". Elegí un nombre (ej: `nailbook`), una contraseña para la base (guardala) y la región más cercana (ej: South America).
3. Esperá un par de minutos a que se cree el proyecto.
4. En el menú izquierdo, andá a **SQL Editor** → **New query**.
5. Abrí el archivo `supabase-setup.sql` que te generé, copiá **todo** el contenido, pegalo ahí, y tocá **Run**. Esto crea las tablas de servicios y turnos, con las reglas de seguridad para que las clientas no vean datos de otras personas.
6. Andá a **Project Settings** (ícono de tuerca) → **API**. Ahí vas a ver dos datos que necesitás copiar:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (una clave larga)

Guardalos, los vas a usar en el Paso 3.

---

## Paso 2 — Subir el código a GitHub

1. Entrá a **github.com** → creá cuenta gratis si no tenés.
2. Click en "New repository". Nombre: `nailbook`. Dejalo en "Public" o "Private" (cualquiera sirve para Vercel gratis). Creá el repositorio.
3. En tu computadora, abrí la carpeta del proyecto que te compartí (`nailbook`) y subila siguiendo las instrucciones que GitHub te muestra en pantalla ("…or push an existing repository from the command line"), o simplemente arrastrá los archivos desde la web de GitHub usando "uploading an existing file" si preferís no usar comandos.

---

## Paso 3 — Publicar en Vercel (gratis)

1. Entrá a **vercel.com** → "Sign Up" → elegí "Continue with GitHub" (así quedan conectados).
2. Click en "Add New" → "Project" → elegí el repositorio `nailbook` que subiste.
3. Antes de tocar "Deploy", abrí la sección **Environment Variables** y cargá estas tres:

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | la Project URL que copiaste de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | la anon public key que copiaste de Supabase |
   | `VITE_PANEL_PASSWORD` | la clave que quieras para entrar a `/panel` |

4. Tocá **Deploy**. En 1-2 minutos te da una URL pública gratis, algo como `nailbook-tunombre.vercel.app`.

¡Listo! Esa URL es la que les pasás a tus clientas para reservar. Y `nailbook-tunombre.vercel.app/panel` es donde vos y tu equipo gestionan todo, con la clave que elegiste.

---

## Cómo usarlo de ahora en más

- **Clientas**: entran a la URL principal, eligen servicio, día y horario libre, ponen su nombre y WhatsApp, y reservan. El turno queda "pendiente" hasta que ustedes lo confirmen.
- **Vos / tu equipo**: entran a `/panel`, ponen la clave, y ahí ven todos los turnos (los que cargaron ustedes y los reservados online, marcados con una etiqueta "Reservado online"). Pueden confirmar, cambiar estado, mandar recordatorios de WhatsApp, etc.
- Los datos ya **no se pierden nunca** más: quedan guardados en Supabase, en la nube, así que podés cerrar la página, abrila en otra compu, en el celu, etc., y todo sigue ahí.

## Cómo cambiar precios o servicios más adelante

Andá a Supabase → **Table Editor** → tabla `servicios` → editá directamente nombre, precio o duración de cada fila, o agregá una nueva. Se refleja al instante en ambas páginas.

## Notas de seguridad

- La clave de `/panel` es simple a propósito (para no complicarte con logins). Si más adelante querés algo más robusto (usuarios individuales por empleada, por ejemplo), se puede armar con el sistema de autenticación de Supabase — avisame si llegás a necesitarlo.
- Las clientas **nunca** pueden ver, editar ni cancelar turnos de otras personas: la página pública solo consulta qué horarios están ocupados, sin nombres ni teléfonos, gracias a las reglas que quedaron configuradas en el Paso 1.
