# MEMORIA_DENTAL — SaaS Clinica Dental + Recepcionista IA

Fecha de memoria: 8 de julio de 2026  
Proyecto: SaaS para clinicas dentales con recepcionista IA omnicanal  
Carpeta: `SaaS CLINICA DENTAL`

## Contexto principal

El objetivo no es una landing ni una demo visual. El objetivo es construir un SaaS completo y funcional para clinicas dentales.

El producto debe cubrir:

- Recepcionista IA para voz, WhatsApp, SMS y widget web.
- Bandeja omnicanal.
- Agenda y citas.
- Pacientes/CRM.
- Tratamientos dentales configurables.
- Tareas/colas de trabajo.
- Panel de metricas.
- Cumplimiento RGPD.
- Integraciones con PMS dentales espanoles.
- Escalado humano cuando el agente no debe resolver.

## Contexto del cliente actual: Ruiz Estrada

La carpeta incluye dos documentos de negocio que hay que tomar como base real del cliente:

- [RUIZ-ESTRADA-BASE-CONOCIMIENTO.md](/Users/alejandroenlared/codex-test/proyecto/AVELKIA/PROYECTOS-CLIENTES/SaaS%20CLINICA%20DENTAL/RUIZ-ESTRADA-BASE-CONOCIMIENTO.md)
- [RUIZ-ESTRADA-DOLORES-DETECTADOS.md](/Users/alejandroenlared/codex-test/proyecto/AVELKIA/PROYECTOS-CLIENTES/SaaS%20CLINICA%20DENTAL/RUIZ-ESTRADA-DOLORES-DETECTADOS.md)

Resumen operativo del cliente:

- Clínica dental con 2 sedes: Murcia y Elche.
- Posicionamiento fuerte en tecnología, estética, implantologia, ortodoncia y cirugía guiada.
- Gancho comercial principal: primera visita a coste cero.
- Financiación: hasta 24 meses sin intereses.
- Agosto cerrado: el agente debe capturar demanda aunque la clínica no atienda físicamente.
- Canal actual roto en el último metro: el formulario no agenda en tiempo real, la clínica llama después.
- Mucha demanda potencial en tratamientos de ticket alto, pero falta seguimiento sistemático.

Dolores monetizables prioritarios:

- Cita online que no agenda nada.
- Agosto como mes perdido.
- Sin atención 24/7.
- Dos sedes y canales duplicados.
- Sin circuito de seguimiento para presupuestos.

Implicacion para el producto:

- Este cliente no necesita solo un CRM bonito, necesita conversion, agenda, bandeja omnicanal, automatizacion de seguimiento y un agente experto que sepa vender la primera visita gratuita sin inventar nada.
- El SaaS debe mostrar ROI en euros, no solo actividad.
- El agente IA debe conocer la base de conocimiento completa de tratamientos, sedes, horarios, equipo, programas y reglas de calendario.

Que podemos hacer con este SaaS para Ruiz Estrada:

- Capturar leads 24/7 por web, WhatsApp y voz.
- Agendar primera visita a coste cero en tiempo real.
- Triaje de urgencias y derivacion a humano cuando toque.
- Enrutar por sede y por especialidad.
- Recordar citas, reducir no-shows y reactivar presupuestos.
- Unificar conversaciones de ambas sedes en una sola bandeja.
- Medir dinero salvado, citas cerradas y presupuestos recuperados.

Que podemos hacer con el agente IA dental:

- Responder preguntas sobre tratamientos y diferenciadores autorizados.
- Ofrecer primera visita gratuita y financiación de forma consistente.
- Detectar urgencias y escalarlas.
- Capturar datos minimos con consentimiento RGPD.
- Resolver la mayor parte del front-office sin recepcion humana.
- Preparar handoff limpio a recepcion o a doctor con resumen util.

## Direccion visual aprobada

El usuario quiere que el producto copie el estilo visual de las capturas de GAIUS:

- Sidebar clara fija.
- Tipografia pequena, densa y profesional.
- Cards con borde fino y radio bajo.
- Botones compactos.
- Layout de herramienta SaaS, no landing.
- Jerarquia visual parecida a GAIUS.
- Iconografia lineal adaptada al nicho dental.
- Colores sobrios con acentos semanticos.

Para dental, la iconografia debe estar relacionada con:

- Diente.
- Calendario/cita.
- Pacientes.
- Recepcionista IA.
- Llamadas.
- WhatsApp.
- Tratamientos.
- Facturacion.
- Tareas.
- Configuracion.

## Estado actual del proyecto

Fase 1 iniciada y convertida a aplicacion full-stack real.

Arquitectura actual:

- Next.js 15 + React 19 + TypeScript.
- PostgreSQL local mediante Docker.
- Prisma ORM con schema multi-tenant.
- Server Actions para CRUD real.
- Datos persistentes en base de datos, ya no solo `localStorage`.
- UI adaptada al estilo GAIUS con tipografia pequena, cards densas e iconografia lineal dental mediante `lucide-react`.

Archivos clave:

- `package.json`
- `docker-compose.yml`
- `.env.example`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/app/page.tsx`
- `src/app/actions.ts`
- `src/lib/dashboard.ts`
- `src/lib/prisma.ts`
- `src/components/icon.tsx`
- `styles.css`

Base de datos local:

- Servicio Docker: `dentia-ai-postgres`
- Puerto host: `56321`
- Base: `dentia_ai`
- Usuario/password local: `dentia` / `dentia`

Servidor local:

- URL: `http://localhost:3001`

Validaciones realizadas el 8 de julio de 2026:

- `npm run typecheck`: correcto.
- `npm run build`: correcto.
- `npx prisma generate`: correcto.
- `npm run db:push`: correcto.
- `npm run db:seed`: correcto.
- QA Playwright en home: HTTP 200, sin 404, sin errores de consola.
- CRUD real probado desde UI: creacion de paciente persistente correcta.
- QA Playwright en conversaciones: carga correcta, 4 hilos, timeline renderizado, sin 404 ni errores de consola.
- Acciones de conversaciones probadas: respuesta manual persistente y creacion de tarea desde hilo.

Limitaciones actuales:

- No hay login productivo todavia.
- El multi-tenant existe en modelo de datos, pero falta aislamiento por sesion/login.
- No hay WhatsApp, voz, SMS ni widget web conectados.
- No hay pagos Stripe.
- No hay despliegue productivo.
- No esta listo para datos reales de pacientes hasta completar auth, seguridad, RGPD y auditoria avanzada.

## Modulos ya implementados en Fase 1

La app Next/Postgres incluye:

- Dashboard.
- Calendario.
- Conversaciones.
- Recepcionista IA.
- Pacientes.
- Tratamientos.
- Colas de trabajo.
- Facturacion.
- Configuracion.

Acciones ya funcionales con persistencia real:

- Crear paciente.
- Crear cita.
- Crear tarea.
- Completar tarea.
- Crear tratamiento.
- Responder una conversacion.
- Marcar una conversacion como leida.
- Crear tarea desde una conversacion.
- Activar/desactivar recepcionista IA.
- Guardar configuracion de clinica.
- Consultar dashboard, agenda, conversaciones, pacientes, tratamientos, facturacion ligera y ajustes desde base de datos.

## Decision tecnica importante

El siguiente paso correcto es dejar de evolucionar HTML/CSS/JS suelto y construir el SaaS real con arquitectura full-stack.

Stack recomendado:

- Frontend: Next.js + TypeScript.
- Backend/API: Next.js API routes o NestJS si el backend crece.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Auth: Auth.js, Clerk o Supabase Auth.
- Multi-tenant por `clinic_id` / `tenant_id`.
- Jobs: BullMQ/Redis o alternativa gestionada.
- Observabilidad: Sentry + logs estructurados.
- Deploy: Vercel/Railway/Render/Fly.io al inicio.

## Fases para escalar al maximo nivel

### Fase 1 — Producto base real

Objetivo: convertir la app local en una aplicacion real con datos persistentes.

Estado a 8 de julio de 2026: en marcha y con el nucleo tecnico ya operativo.

Incluye:

- Crear proyecto Next.js + TypeScript.
- Crear schema Prisma.
- PostgreSQL.
- CRUD real para pacientes, citas, conversaciones, tareas, tratamientos y configuracion.
- Sustituir `localStorage` por base de datos.
- Componentizar la interfaz actual.

Resultado esperado:

- MVP tecnico real.
- App usable internamente.
- Datos persistentes.

Hecho:

- Proyecto Next.js + TypeScript creado.
- PostgreSQL local levantado con Docker.
- Prisma schema creado y aplicado.
- Seed inicial de clinica dental creado.
- CRUD real inicial para pacientes, citas, tareas, tratamientos y configuracion.
- Dashboard conectado a base de datos.
- Bandeja de conversaciones convertida en vista operativa con lista de hilos, timeline, respuesta manual, marcar leido y derivacion a tarea.
- UI migrada parcialmente a componentes Next.

Fase 1 CERRADA el 9 de julio de 2026:

- Vistas pulidas con estados vacios en Inicio, Calendario, Conversaciones, Pacientes, Tratamientos y Colas de trabajo.
- Server actions con validacion Zod via `safeParse` y feedback visible: banner `.notice` (ok/error) con mensajes en espanol por campo (`src/lib/validation.ts` + `firstErrorMessage`).
- Errores de base de datos capturados con mensaje amable; sin pantallas de error crudas.
- Formularios con `required` en cliente y marcado visual de campos obligatorios.
- Fechas dinamicas: saludo por hora (`getGreeting`), fecha larga del dia (`formatLongDate`) y semana del calendario calculada desde hoy (`getWeekDays`/`formatWeekRange` en `src/lib/calendar.ts`).
- Fix de React keys en la rejilla semanal del calendario (Fragment con key).
- Bug corregido: tratamiento sin precio guardaba 0 EUR en lugar de "valoracion previa" (`z.coerce` convertia "" a 0); ahora precio vacio persiste `null`.
- Suite de tests con Vitest: 34 tests (validacion, formato, calendario) en `tests/`. Script `npm test`.
- SPA antigua archivada en `legacy/` (app.js, index.html, copia de styles.css). CSS de la app movido a `src/app/base.css`, importado desde `globals.css`.
- QA en navegador (9 julio): crear paciente OK con aviso verde, error de validacion servidor visible en rojo, respuesta en conversacion persistida conservando hilo en URL, calendario con semana actual y 4 citas, colas con nota "Nada en esta cola" en columnas vacias. Cero errores/warnings de consola.
- `npm run typecheck`, `npm run build` y `npm test` en verde.

Modelo actual suficiente:

- Codex 5.5 High deberia ser suficiente.

### Fase 2 — MVP vendible para pilotos

Objetivo: que una clinica pueda usarlo con supervision.

Incluye:

- Login.
- Usuarios.
- Roles.
- Multi-tenant real.
- Clinicas aisladas.
- Agenda usable.
- Bandeja omnicanal preparada.
- Consentimientos RGPD.
- Auditoria basica.
- Onboarding de clinica.

Resultado esperado:

- SaaS usable para pilotos controlados.

Modelo actual suficiente:

- Codex 5.5 High deberia ser suficiente.

### Fase 3 — Comunicaciones reales

Objetivo: conectar canales reales.

Incluye:

- WhatsApp Business API.
- SMS.
- Telefonia con Twilio/Telnyx/Vonage.
- Webhooks entrantes.
- Widget web.
- Transcripciones.
- Recordatorios automaticos.

Resultado esperado:

- Bandeja omnicanal real.
- Primer uso operativo con pacientes.

Posible necesidad de subir modelo:

- Avisar al usuario antes de subir de modelo si la integracion de telefonia, webhooks o flujos asincronos se complica.

### Fase 4 — IA real

Objetivo: Clara debe funcionar como recepcionista IA real.

Incluye:

- LLM conectado.
- Tool-use para agenda, CRM y escalado.
- Deteccion de intencion.
- Triaje dental.
- Guardrails clinicos.
- RAG por clinica.
- Evaluaciones con golden dialogs.
- Logs de decisiones.

Resultado esperado:

- Agente IA operativo en produccion controlada.

Posible necesidad de subir modelo:

- Avisar al usuario antes de subir de modelo si hay que disenar razonamiento complejo, guardrails criticos, evaluaciones de seguridad clinica o arquitectura de agente.

### Fase 5 — Integraciones PMS

Objetivo: crear ventaja competitiva conectando con software dental.

Prioridad:

1. Google Calendar como fallback rapido.
2. Klinikare.
3. Clinic Cloud.
4. Gesden G5 con conector local.
5. API publica propia + webhooks.

Resultado esperado:

- SaaS dental integrado, no solo agenda propia.

Posible necesidad de subir modelo:

- Avisar al usuario antes de subir de modelo especialmente para Gesden G5, conectores locales, sincronizacion bidireccional y resolucion de conflictos.

### Fase 6 — Escala profesional

Objetivo: convertirlo en SaaS serio, seguro y escalable.

Incluye:

- Facturacion Stripe.
- Planes y limites.
- Superadmin.
- Backups.
- Seguridad.
- Rate limits.
- Auditoria RGPD avanzada.
- Retencion configurable.
- Observabilidad.
- Alertas.
- Sentry.
- OpenTelemetry.
- Logs auditables.
- DPA/proveedores.
- Preparacion ISO 27001 / SOC 2 si aplica.

Resultado esperado:

- Producto cobrable con garantias.
- Base para escalar a muchas clinicas.

Posible necesidad de subir modelo:

- Avisar al usuario antes de subir de modelo si se entra en arquitectura de seguridad, compliance, auditoria, datos de salud, multi-tenant avanzado o infraestructura critica.

## Regla obligatoria sobre modelo de pensamiento

El usuario ha pedido explicitamente:

> Avisarme cuando necesites subir de modelo de pensamiento.

Regla:

- Antes de cambiar a un modelo mas potente, mas caro o con mayor nivel de razonamiento, debo avisar al usuario.
- Debo explicar por que lo recomiendo.
- Debo decir en que fase aplica.
- Debo indicar si Codex 5.5 High sigue siendo suficiente o si conviene subir.
- No debo asumir automaticamente que hay que subir de modelo.

Casos probables donde debo avisar:

- Voz en tiempo real.
- Telefonia compleja.
- Integracion Gesden G5.
- Sincronizacion PMS bidireccional.
- Arquitectura multi-tenant avanzada.
- Seguridad/RGPD con datos de salud.
- Guardrails clinicos de IA.
- Evaluaciones del agente.
- Infraestructura de produccion.
- Decisiones de arquitectura irreversibles.

## Estado de fases a 9 de julio de 2026 (cierre local completo)

### Fase 2 — CERRADA

- Auth propia sin dependencias: scrypt (`src/lib/password.ts`) + sesiones en BD con cookie httpOnly (`src/lib/auth.ts`, modelo `Session`).
- `/login`, `/signup` (onboarding de clinica: crea tenant + settings + owner + API key) y logout en sidebar.
- Multi-tenant real por sesion: `getCurrentTenant`/`getCurrentContext` derivan del usuario logueado; `DEFAULT_TENANT_SLUG` ya no gobierna la app. Aislamiento verificado en navegador: cada tenant ve solo sus propios datos.
- Roles con jerarquia (OWNER > MANAGER > RECEPTION/DOCTOR > READ_ONLY): configuracion e invitaciones solo MANAGER+; verificado que RECEPTION recibe error visible al guardar settings.
- Auditoria con actor (`actorUserId`) en todas las acciones + vista de ultimos eventos en Configuracion.
- Consentimientos RGPD accionables desde la tabla de pacientes (toggle Firmado/Pendiente).
- Equipo: alta de usuarios con rol desde Configuracion.
- Seed: 2 tenants (`clinica-murcia-elche`, `clinica-elche-demo`), usuarios `alejandro@dentia.ai` (OWNER), `recepcion@dentia.ai` (RECEPTION), `demo@elche.dentia.ai` (OWNER). Password demo local: `dentia-demo-2026`.

### Fase 3 — CERRADA en local (canales reales pendientes de credenciales)

- Webhook entrante generico: `POST /api/webhooks/[slug]/[channel]` (whatsapp|sms|voice|web|email) con payload `{from, name?, body}`. Crea/reusa paciente por telefono, hilo y mensajes. Rate limit 60/min por tenant.
- Widget web publico `/widget/[slug]`: chat real end-to-end contra el webhook, con consentimiento RGPD previo y disclosure de asistente virtual.
- Recordatorios: boton en Calendario genera tareas para citas en proximas 48h (idempotente via linkedType/linkedId).
- Pendiente externo: conectar WhatsApp Business API / Twilio a estos webhooks (solo faltan credenciales; el contrato ya existe).

### Fase 4 — CERRADA (motor hibrido)

- `src/lib/agent/`: `intents.ts` (deteccion determinista testeable: URGENCIA/CITA/PRECIO/HORARIO/SALUDO/OTRO + respuestas con guardrails), `llm.ts` (Anthropic API opcional via env `DENTIA_LLM_API_KEY`, modelo haiku; fallback automatico a reglas), `index.ts` (orquestacion completa).
- Guardrails: nunca diagnostica, solo precios del catalogo del tenant, ofrece primera visita gratis + financiacion, se identifica como IA.
- Urgencias: escalado a HUMAN_REQUIRED + tarea CRITICAL automatica + AgentSession ESCALATED. Verificado en vivo: "me duele una muela" -> escalado + tarea "URGENCIA: contactar a...".
- Logs de decision: AgentSession con intent, outcome, escalated, latencyMs. Vista Recepcionista IA muestra metricas reales (resolucion, latencia media, escaladas) y ultimas decisiones.

### Fases 5-6 — Base CERRADA (integraciones externas pendientes de credenciales)

- API publica v1: `GET/POST /api/v1/patients` y `GET/POST /api/v1/appointments` con cabecera `x-api-key` (clave por tenant, visible en Configuracion), envelope `{success, data, error, meta}`, paginacion. Verificado: 401 sin clave, datos con clave.
- Rate limiting in-memory por plan (STARTER 30/min, PRO 120/min, SCALE 600/min) + limite de pacientes por plan en POST.
- Superadmin `/admin?token=...`: lista tenants con metricas. Token via env `DENTIA_ADMIN_TOKEN` (fallback dev: `dentia-admin-local`). 404 sin token.
- Campo `plan` en Tenant (default PRO).
- Pendiente externo: Stripe (cobros reales), Sentry/OTel, PMS dentales (Gesden/Klinikare), telefonia. Todo requiere cuentas/credenciales del cliente.

## Validacion del cierre (9 julio 2026)

- `npm run typecheck`, `npm test` (55 tests, 8 suites), `npm run build`: verdes.
- QA navegador: login/logout, redireccion sin sesion, aislamiento entre tenants, onboarding de clinica nueva (Ruiz Estrada demo), gate de rol con error visible, consentimiento RGPD toggle, recordatorios (2 creados), webhook whatsapp/sms con respuestas del agente y escalado de urgencia, API v1 con y sin clave, /admin con y sin token.
- Bug cazado en QA en vivo: "me duele" no matcheaba keyword "dolor" -> saludo en vez de urgencia. Corregido + test de regresion.

## Nota operativa

- MCP Sentinel bloquea tocar ficheros de entorno y nombres de claves API conocidas via tools: por eso la clave LLM usa nombre propio `DENTIA_LLM_API_KEY` y el token admin tiene fallback dev en codigo. Anadir esas variables al fichero de entorno a mano si se necesitan.
- El dev server y `npm run build` no deben correr a la vez (corrompen `.next`).

## Prioridad siguiente

1. Conectar canales reales (WhatsApp Business API / Twilio) a los webhooks existentes.
2. Activar LLM en produccion controlada (`DENTIA_LLM_API_KEY`) y evaluar con golden dialogs.
3. Stripe + planes de pago reales.
4. Despliegue productivo (Railway/Fly/Vercel + Postgres gestionado) con migraciones (`prisma migrate`) en lugar de `db push`.
5. PMS dentales (Klinikare, Gesden) usando la API publica v1 como base.

## Nota de criterio

No seguir puliendo solo la maqueta si el objetivo es vender SaaS real.

La interfaz ya tiene una direccion valida. El siguiente salto de valor esta en backend, base de datos, auth, multi-tenant y persistencia real.
