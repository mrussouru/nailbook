# 💅 NailBook

Sistema de gestión de turnos desarrollado para **Tamy Ayelen**, diseñado para simplificar la administración de reservas de un salón de uñas.

---

## ✨ Características

- 📅 Reserva pública de turnos online.
- 🔒 Panel interno protegido con autenticación.
- 📆 Calendario mensual de turnos.
- 👩 Gestión de clientes y servicios.
- 🎨 Administración de estados (Pendiente, Confirmado, Completado y Cancelado).
- ⏰ Control de horarios ocupados.
- 🔔 Recordatorios para clientes.
- 🗄️ Base de datos en Supabase.

---

## 🛠️ Tecnologías utilizadas

- React
- Vite
- JavaScript
- Supabase
- CSS Inline

---

## 🚀 Instalación

Clonar el proyecto:

```bash
git clone https://github.com/TU-USUARIO/nailbook.git
```

Entrar al proyecto:

```bash
cd nailbook
```

Instalar dependencias:

```bash
npm install
```

Crear el archivo `.env` utilizando como base `.env.example`.

Ejecutar el proyecto:

```bash
npm run dev
```

---

## 📦 Build de producción

```bash
npm run build
```

---

## 📁 Estructura del proyecto

```
src/
│
├── Login.jsx
├── PanelInterno.jsx
├── ReservaPublica.jsx
├── helpers.js
├── supabaseClient.js
└── main.jsx
```

---

## 🔐 Seguridad

- Autenticación mediante Supabase Auth.
- Row Level Security (RLS).
- Panel privado accesible únicamente para usuarios autenticados.
- Reserva pública limitada mediante políticas de seguridad.

---

## 📈 Roadmap

### ✅ Versión 1.0

- Reserva online
- Panel administrativo
- Gestión de turnos
- Login
- Supabase
- Estados del turno
- Recordatorios

### 🔜 Próximas versiones

- Multi-manicura
- Confirmación automática por WhatsApp
- Dashboard con métricas
- Caja diaria
- Reportes
- Gestión de comisiones
- Historial de clientes
- Agenda inteligente

---

## 👩‍🎨 Proyecto desarrollado para

**Tamy Ayelen**

Sistema de gestión de turnos para salón de uñas.

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.