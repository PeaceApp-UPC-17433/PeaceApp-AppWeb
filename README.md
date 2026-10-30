# PeaceApp Web

Frontend de PeaceApp (Vue 3 + Vite). Consume el backend `PeaceApp-Backend` (ver su README, sección "API por fases").

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # completar VITE_MAPBOX_ACCESS_TOKEN
pnpm dev               # http://localhost:5173
pnpm build
```

El backend debe estar en `http://localhost:8080` (cambiable con `VITE_API_URL`).

## Estructura

```
src/
  api/          un módulo por contexto del backend (auth, users, reports, alerts, notifications, contacts, community/admin)
                http.js: cliente axios con token, errores uniformes (ApiError) y manejo de 401
  config/       env.js (variables de entorno) y domain.js (enums del backend: tipos, severidades, estados)
  stores/       session.js (sesión y perfil) y badges.js (contadores de no leídos)
  composables/  toasts, mensajes de error, formato de fechas, ubicación del usuario
  layouts/      AuthLayout (acceso) y AppLayout (barra de navegación)
  views/        una vista por pantalla, cargadas bajo demanda desde router/index.js
  components/   ui/ (diálogo, paginación, toasts…), reports/ (tarjeta, votos, comentarios, denuncias)
  locales/      es.json y en.json
  styles/       base.css (tokens de diseño y componentes base)
```

## Pantallas y endpoints

| Pantalla | Ruta | Endpoints |
|---|---|---|
| Inicio de sesión / registro / recuperación | `/login`, `/register`, `/forgot-password`, `/reset-password` | `authentication/*` |
| Mapa (marcadores y mapa de calor) | `/map` | `reports/map`, `reports/heatmap`, `reports/{id}` |
| Reportes (filtros y paginación) | `/reports` | `reports` |
| Detalle de reporte | `/reports/:id` | `reports/{id}`, `/status`, `/vote(s)`, `/comments`, `/flag`, `comments/{id}` |
| Crear / editar reporte | `/reports/new`, `/reports/:id/edit` | `POST/PUT reports` |
| Alertas y configuración | `/alerts` | `alerts/*` |
| Avisos y preferencias | `/notifications` | `notifications/*` |
| Contactos de confianza | `/contacts` | `contacts/*` |
| Perfil | `/profile` | `users/*`, `authentication/change-password` |
| Administración (solo admin) | `/admin` | `admin/flags`, `admin/moderation-log`, `admin/metrics` |

Notas de integración:

- El rol no viene en el JWT: se detecta admin probando `GET /admin/flags` (200 admin, 403 usuario).
- Para recibir alertas por proximidad el front envía la ubicación a `PUT /alerts/settings/location` al entrar y cada 5 minutos.
- Los contadores de alertas y avisos sin leer se refrescan cada minuto.
- Tras cambiar el correo en el perfil se cierra la sesión (el token lleva el correo como identidad).
- El push al teléfono no existe todavía en el backend; las preferencias push se guardan igualmente.
