# HOJA DE RUTA — SAAS PARA CLÍNICAS DENTALES + AGENTE IA RECEPCIONISTA

> Proyecto AVELKIA · Última actualización: 19 de julio de 2026
> Basado en investigación de RingLab, competidores internacionales (Arini, Annie, TrueLark/Weave, Savvy Agents, Adit) y el mercado español (Gesden, Klinikare, Clinic Cloud).
> Documentos hermanos: `MEMORIA_DENTAL.MD` (memoria operativa), `HOJA-RUTA-100.MD` (calidad de Clara), `NEW-HOJA DE RUTA.MD` (decisión estratégica PULSO+Clara), `DENTIA-SAAS-SITEMAP-DESIGN.md` (sistema de diseño).

---

## 0. EL CAMINO DIRECTO AL ÉXITO (LEER PRIMERO)

El proyecto ya no está en fase de investigación ni de fase cero. Hay un SaaS funcional desplegado en `https://dentia.avelkia.es`, un agente IA (Clara) con evaluación 100/100 sobre 103 conversaciones, y un cliente piloto real (Ruiz Estrada, Murcia + Elche) que **cierra en agosto**.

Ese cierre de agosto es la palanca estratégica número uno: una clínica cerrada que sigue captando pacientes, agendando primeras visitas gratuitas y recuperando presupuestos mediante IA es la demostración de ROI perfecta. Nadie más en España puede enseñar ese caso en septiembre.

El camino directo, en orden, sin desvíos:

```text
1. Clara viva en WhatsApp real de Ruiz Estrada ANTES del 1 de agosto  ← todo lo demás espera
2. Agosto = mes de captura autónoma → datos reales → caso de éxito en €
3. Septiembre = hardening técnico y RGPD para datos reales + demo comercial pulida
4. Oct-Dic = 10 primeras clínicas de pago (Stripe + onboarding) usando el caso Ruiz Estrada
5. 2027 T1 = voz entrante + primera integración PMS (Google Calendar → Klinikare)
6. 2027 T2+ = motor de ingresos completo, Gesden, escala nacional
```

Regla de decisión para cada tarea nueva: **si no acerca el hito activo de esta lista, no se hace ahora.**

Decisión estratégica vigente (de `NEW-HOJA DE RUTA.MD`): no construimos un PMS completo. Vendemos una **capa de recuperación de ingresos + recepción IA encima del software actual de la clínica**, sin migración, sin tocar historia clínica. El PMS es visión a largo plazo, no dirige el trabajo inmediato.

---

## 1. RESUMEN EJECUTIVO

Producto: **plataforma SaaS de gestión de comunicación y citas para clínicas dentales**, con un **agente IA recepcionista** (WhatsApp + web hoy; voz + SMS en roadmap) que atiende al paciente 24/7, conoce el nicho odontológico, orienta al paciente y **agenda citas de forma autónoma**, con el calendario nativo de Dentia como fuente de verdad y sincronización futura con el PMS de la clínica.

La tesis: las clínicas dentales pierden entre el 30% y el 40% de sus llamadas entrantes, cada paciente nuevo vale ~350 €, y la recepción está saturada y en rotación constante. Un agente IA que responde en segundos, agenda directamente y reduce no-shows tiene ROI demostrable desde el primer mes. RingLab ya valida este modelo en España (integración con Gesden G5); el mercado internacional (Arini, Annie, TrueLark) valida pricing y demanda.

**Diferenciación:**
1. Omnicanal real (WhatsApp + web + voz + SMS) en una sola bandeja — la mayoría de competidores son solo voz o solo mensajería.
2. Integración con el ecosistema español (Gesden G5, Klinikare, Clinic Cloud) — los players americanos no cubren España; RingLab solo cubre Gesden.
3. Agente IA con conocimiento clínico dental real: triaje de urgencias en dos tiempos, orientación por tratamiento, gestión de primeras visitas, guardrails evaluados automáticamente (100/100 en suite propia).
4. Cumplimiento RGPD nativo (dato de salud = categoría especial) como ventaja competitiva frente a soluciones USA.
5. **Panel de "dinero recuperado" en €** — el argumento de venta y renovación: no vendemos actividad, vendemos ingresos.

---

## 2. ESTADO REAL DEL PROYECTO A 19 DE JULIO DE 2026

### 2.1. Lo que ya existe y funciona

**Plataforma:**
- App full-stack: Next.js 16.2.10, React 19, TypeScript, Prisma 6.19.3, PostgreSQL.
- Producción: Vercel (proyecto `dentia-hu6t`) desde GitHub `main`, dominio `https://dentia.avelkia.es`, BD Neon.
- Local: Docker Postgres (`dentia-ai-postgres`, puerto 56321).
- Módulos navegables: Dashboard, Agenda, Conversaciones, Pacientes, Tratamientos, Tareas, Facturación, Analítica, Automatizaciones, Configuración.
- UI rediseñada según `saas new design/` (sistema "Clinical Precision": denso, sobrio, profesional).
- Auth propia (scrypt + sesiones httpOnly), multi-tenant real por sesión, roles con jerarquía (OWNER > MANAGER > RECEPTION/DOCTOR > READ_ONLY), auditoría con actor.
- API pública v1 (`/api/v1/patients`, `/api/v1/appointments`) con API key por tenant, envelope estándar, paginación, rate limit por plan.
- Facturación fiscal base: series, IVA, hash encadenado, QR, payload preliminar FacturaE, preparación SIF/VERI*FACTU (sin homologación aún — no afirmar "cumplimiento 100% Hacienda").

**Clara (agente IA) — módulo protegido, no tocar sin petición explícita:**
- Motor híbrido: engine determinista (`dental-senior-agent.ts`) + LLM (`openai-dental-agent.ts`) con fallback automático a reglas.
- Evaluador automático propio: `npm run quality:clara` → 100/100, 620/620 puntos, 103 conversaciones, 0 fallos críticos. Gate de release: `npm run quality:release`.
- Flujo validado en producción: consentimiento → nombre → email → teléfono → sede → 3 huecos numerados → elección 1/2/3 → cita + email.
- Triaje de urgencias en dos tiempos, guardrails clínicos (nunca diagnostica, precios solo del catálogo del tenant, se identifica como IA).
- Pre-fichas (`PatientIntake`) con código `DENTIA-XXXXXX`, detección de duplicados y portal paciente `/ficha/[code]` protegido por email/teléfono.
- 150+ tests en verde, 19 suites.

**Canales e integraciones:**
- Webhook genérico multicanal: `POST /api/webhooks/[slug]/[channel]` (whatsapp|sms|voice|web|email).
- Widget web público operativo: `/widget/clinica-murcia-elche`. Demo WhatsApp: `/demo-whatsapp/clinica-murcia-elche`.
- Webhook Meta WhatsApp Cloud listo: `/api/whatsapp/meta` — **solo faltan credenciales de Meta**.
- Make (emails de cita): escenario montado con Router + filtros `created`/`rescheduled`/`cancelled`, variable `MAKE_APPOINTMENT_WEBHOOK_URL` en Vercel. Pendiente: activación final + prueba E2E real.

### 2.2. Lo que NO existe todavía (honestidad brutal)

| Falta | Impacto |
|---|---|
| WhatsApp real conectado (credenciales Meta) | Bloquea el piloto — prioridad nº1 |
| Prueba E2E de Make (elegir opción 1/2/3 y recibir email) | Bloquea confianza en confirmaciones |
| Clientes de pago (Stripe) | 0 € de MRR |
| Voz (telefonía, STT/TTS) | Paridad con RingLab pendiente |
| Integraciones PMS (Gesden/Klinikare/Clinic Cloud) | El moat aún no está construido |
| Migraciones Prisma versionadas | Riesgo de pérdida de datos en cada deploy (ver §8) |
| Observabilidad (Sentry/OTel), backups documentados | Ceguera operativa en producción |
| Hardening RGPD completo (EIPD, DPA, retención) | Bloquea datos reales de pacientes |
| Arquitectura de menús validada por el usuario | UX actual marcada como "liosa" — rediseño pendiente |

### 2.3. Cliente piloto: Ruiz Estrada

- 2 sedes: Murcia (Paseo Duques de Lugo, 16) y Elche (Carrer Reina Victoria, 49).
- Ganchos: primera visita a coste cero, financiación hasta 24 meses sin intereses.
- **Agosto cerrado** → Clara captura demanda mientras la clínica no atiende. Es la oportunidad de caso de éxito.
- Dolores monetizables: cita online que no agenda nada, agosto perdido, sin 24/7, dos sedes con canales duplicados, presupuestos sin seguimiento.
- Base de conocimiento en `RUIZ-ESTRADA-BASE-CONOCIMIENTO.md` y dolores en `RUIZ-ESTRADA-DOLORES-DETECTADOS.md`.

---

## 3. INVESTIGACIÓN DE MERCADO (RESUMEN VIGENTE)

### 3.1. RingLab — referente directo español

Recepcionista virtual IA para dental: mensajería unificada (WhatsApp/SMS/llamadas), agendado automático, recordatorios, predicción de no-shows, dashboard en tiempo real. Integra **solo Gesden G5** (conector local para legacy). Métricas publicadas: primera respuesta 5 s, −68% no-shows en 3 meses, +92% confirmación, implantación en 72 h. Sin precios públicos.

**Debilidades = nuestra oportunidad:** solo Gesden; sin pricing público (fricción); solo capa de comunicación.

### 3.2. Competidores internacionales

| Plataforma | Enfoque | Precio | Notas |
|---|---|---|---|
| **Arini** (YC) | Voz IA dental | ~$249/mes | Booking en tiempo real, multiidioma. Referente en voz. |
| **Annie** (Dental Intelligence) | Relación con paciente | Bundle | Agendado directo en PMS. |
| **TrueLark / Weave** | Todo-en-uno comunicaciones | Bundle | Weave adquirió TrueLark en 2025. Para DSOs. |
| **Savvy Agents** | 4 agentes especializados | Desde $89/mes | Sync con 15+ PMS, 5 idiomas. |
| **Adit** | PMS todo-en-uno con IA | Bundle | 5.000+ clínicas. AI Front Desk feb-2026. |

**Pricing del mercado:** $49–800+/mes. Tarifa plana gana a por-minuto en clínicas con volumen. Punto dulce: **$150–300/mes por sede**.

### 3.3. PMS — mercado global y español

- Mercado global de software dental: $2.620M (2026) → $4.440M (2031), CAGR 11%. Tendencia: cloud + IA + interoperabilidad.
- España: **Gesden G5** (líder histórico, licencia+cloud), **Klinikare** (80–150 €/mes cloud), **Clinic Cloud** (desde 70 €/mes), Clinicbox/iDental.
- **Conclusión:** la capa de agente IA conversacional integrado en España tiene un solo player (RingLab) y solo cubre Gesden. Hueco claro: agente IA multicanal integrable con TODOS los PMS españoles + modo standalone con agenda propia.

### 3.4. Dolores del sector (validados con datos)

1. **Llamadas perdidas:** ~300/mes por clínica; 32% de llamadas de pacientes nuevos sin contestar; paciente nuevo ≈ 350 €; pérdida 4.200–7.000 €/mes; 73% más probabilidad de reservar con competidor el mismo día si no contactan.
2. **Crisis de recepción:** >50% del personal buscando otro empleo; reemplazo cuesta 11.000–14.000 €.
3. **No-shows:** intake estructurado los reduce 15–30% en 90 días (RingLab reporta 68%).
4. **Fuera de horario, fragmentación de canales, presupuestos sin seguimiento, reactivación inexistente, cero visibilidad de negocio, PMS sin API.**

---

## 4. PROPUESTA DE PRODUCTO

### 4.1. Visión

"La recepcionista perfecta que nunca duerme": toda la comunicación de la clínica en una bandeja, un agente IA que atiende, orienta y agenda en segundos por cualquier canal, y un panel que enseña al gerente el dinero que está dejando de perder.

### 4.2. Posicionamiento comercial (Fase activa)

```text
Recuperamos pacientes, presupuestos y huecos perdidos sin cambiar tu software actual.
```

- NO vendemos un nuevo PMS. NO pedimos migración. NO tocamos historia clínica.
- SÍ vendemos: captura de leads 24/7, recepción IA, pre-fichas sin duplicados, propuesta/confirmación/modificación/cancelación de citas, recuperación de presupuestos dormidos, reactivación, recalls, relleno de huecos, y **euros recuperados medidos**.

### 4.3. Módulos

- **M1 Bandeja omnicanal:** WhatsApp Business API, widget web (ambos con contrato de webhook ya construido), voz y SMS después. Timeline por paciente. Traspaso IA → humano con contexto.
- **M2 Agente IA (Clara):** ver §5.
- **M3 Agenda y citas:** agenda propia multi-sede/multi-doctor (fuente de verdad hoy) O sync bidireccional con PMS (futuro). Motor de disponibilidad por tratamiento. Confirmaciones y recordatorios (T-72h/24h/3h). Lista de espera inteligente.
- **M4 CRM de pacientes:** ficha 360, pre-fichas de chat, segmentación, campañas de reactivación y seguimiento de presupuestos.
- **M5 Dashboard:** llamadas atendidas vs perdidas, citas por IA, no-shows, ocupación, **panel "dinero recuperado" en €**.
- **M6 Integraciones:** Google Calendar (fallback rápido) → Klinikare → Clinic Cloud → Gesden G5 (conector local) → API pública + webhooks (ya existe v1).

### 4.4. Alcance negativo

- No es un PMS completo: sin odontograma, sin gestión de laboratorio. La facturación fiscal existente es base preparatoria, no sustituto del PMS fiscal del cliente hasta homologación.
- El agente orienta y agenda; **nunca diagnostica**.

---

## 5. AGENTE IA — ESTADO Y DISEÑO

Clara está construida y evaluada. Reglas de oro vigentes (no romper al evolucionar):

- Mensajes cortos estilo WhatsApp: 2-3 frases, UNA pregunta por turno.
- Datos por separado y en orden: consentimiento → nombre → email → teléfono → sede → 3 huecos numerados.
- Urgencias en dos tiempos: primero pregunta de seguridad, cita urgente en el turno siguiente (salvo banderas rojas presentes → prioridad inmediata).
- Nunca diagnostica, nunca inventa precios, se identifica como IA, consentimiento solo en contexto.
- Cita gestionada por Clara O llamada de recepción — nunca ambas en el mismo flujo normal.
- Modificación de citas solo con identidad verificada (mismo teléfono); ante duda, escalar.
- Base de conocimiento por tenant: tratamientos, sedes, doctores y especialidades, seguros, financiación, políticas.

**Calidad como sistema, no como esfuerzo puntual:** cada fallo real de producción se convierte en fixture de regresión (`tests/fixtures/clara-conversations*.json`). El gate `quality:release` (eval 100/100 + lint + typecheck + tests + build) es obligatorio antes de todo deploy.

**Stack del agente (vigente/previsto):**

| Capa | Hoy | Futuro |
|---|---|---|
| Razonamiento | Engine determinista + LLM configurable (fallback a reglas) | Claude/GPT con tool-use pleno |
| WhatsApp | Meta Cloud API (webhook listo) | BSP si el volumen lo exige |
| Voz | — | Comprar primero (Vapi/Retell) para validar; migrar a Pipecat/LiveKit + Twilio a >50 clínicas |
| STT/TTS voz | — | Deepgram + ElevenLabs (es-ES, baja latencia) |
| RAG conocimiento | Configuración estructurada por tenant | pgvector cuando el corpus crezca |
| Evaluación | Golden dialogs propios (103 conversaciones, gate automático) | Ampliar con conversaciones reales, audio transcrito, mal escritas |

---

## 6. ARQUITECTURA TÉCNICA

### 6.1. Principios

- **Multi-tenant estricto:** scoping por `tenant_id` en toda consulta; auditar aislamiento antes de cada piloto real; RLS de PostgreSQL como refuerzo futuro.
- **API-first:** todo lo que hace la UI lo hace la API (v1 ya pública).
- **Calendario nativo = fuente de verdad.** Make y cualquier integración externa solo reciben eventos; jamás deciden disponibilidad.
- **Inmutabilidad y auditoría:** log de auditoría de todo acceso/cambio sobre datos de paciente (obligación RGPD + argumento de venta).
- **Event-driven para lo asíncrono:** hoy webhooks salientes (Make); recordatorios y secuencias necesitarán colas reales (ver §8).

### 6.2. Stack vigente

| Capa | Tecnología |
|---|---|
| Frontend + Backend | Next.js 16 App Router + Server Actions + TypeScript |
| BD | PostgreSQL (Neon producción, Docker local) + Prisma 6 |
| Deploy | Vercel desde GitHub `main` (checks `Vercel - dentia` y `Vercel - dentia-hu6t`) |
| Auth | Propia: scrypt + sesiones en BD + roles. MFA pendiente |
| Emails transaccionales | Make (Webhooks → Router → Gmail); migrar a Brevo/SendGrid/SMTP en producción seria |
| Jobs/colas | Pendiente: Vercel Cron + Upstash Redis (QStash/BullMQ) para recordatorios y secuencias |
| Observabilidad | Pendiente: Sentry + logs estructurados |

Nota: la hoja de ruta original proponía NestJS separado. Decisión vigente: **Next.js full-stack se mantiene** mientras el equipo sea pequeño; extraer servicios (voz, conectores PMS) solo cuando existan y lo exijan.

### 6.3. Modelo de datos (núcleo ya implementado)

`Tenant` → `Location` → `Provider` → `Operatory` · `Patient` (+ fiscales) → `Conversation` → `Message` · `Appointment` → `AppointmentType` · `Treatment` · `Invoice` (fiscal) · `PatientIntake` (pre-fichas) · `Task` · `Session` · `AgentSession` · `AuditLog` · consentimientos RGPD.

---

## 7. CUMPLIMIENTO LEGAL (ESPAÑA/UE) — VENTAJA COMPETITIVA

- **RGPD + LOPDGDD:** datos de salud = categoría especial (art. 9). Base jurídica: consentimiento explícito + relación asistencial. Registro de actividades, DPO designado, **EIPD obligatoria** antes de datos reales a escala.
- **Encargado del tratamiento:** la clínica es responsable; nosotros encargados → **DPA robusto (art. 28) con cada cliente** — plantilla necesaria antes del primer contrato de pago.
- **Residencia UE**, TLS 1.3, cifrado en reposo, retención configurable, derecho de supresión automatizado.
- **AI Act:** transparencia obligatoria (Clara ya se identifica como IA); caso de uso = riesgo limitado — documentarlo.
- **LLM providers:** zero-data-retention/no-training por contrato; mínima PII al modelo; seudonimización donde sea posible.
- **Llamadas (cuando haya voz):** locución previa informando de asistente virtual y grabación.

Checklist operativo antes de datos reales de pacientes: EIPD hecha · DPA firmado · retención y supresión implementadas · auditoría de aislamiento multi-tenant · backups verificados · MFA para staff · pentest básico.

---

## 8. DEUDA TÉCNICA CRÍTICA (BLOQUEA ESCALA — RESOLVER EN SPRINT 2)

Lista honesta, por orden de riesgo:

1. **`build` ejecuta `prisma db push` contra producción.** Sin migraciones versionadas, un cambio de schema puede destruir datos en un deploy. → Migrar a `prisma migrate` + `migrate deploy` en build. **La más urgente.**
2. **`src/app/page.tsx` con 3.206 líneas.** Monolito de vistas; frena cada cambio de UI y viola el estándar propio (<800 líneas/archivo). → Trocear por módulo en rutas/componentes al ejecutar el rediseño de menús.
3. **Rate limiting in-memory.** En Vercel serverless cada instancia tiene su propia memoria → los límites no son reales. → Upstash Redis.
4. **Token admin con fallback hardcodeado** (`dentia-admin-local`) y superadmin por query param. → Eliminar fallback y proteger `/admin` con auth real antes de clientes de pago.
5. **Sin Sentry ni métricas.** Producción a ciegas. → Sentry + alertas + latencia del agente.
6. **Sin política de backups/restore documentada** para Neon. → Verificar PITR, documentar y probar una restauración.
7. **Sin MFA** en auth propia. → Obligatorio para roles MANAGER+ antes de datos reales.
8. **Emails vía Gmail personal en Make.** → Brevo/SendGrid con dominio propio antes de clientes de pago.
9. **Datos de QA en producción** (pacientes/conversaciones de test). → Script de limpieza + tenant de staging separado.

---

## 9. HOJA DE RUTA POR FASES (ACTUALIZADA AL ESTADO REAL)

> Las fases 0–1 originales (validación y MVP mensajería) están **superadas técnicamente**. Se renumeran las fases desde la realidad actual.

### SPRINT 1 — PILOTO VIVO (AHORA → 1 DE AGOSTO DE 2026) 🔴 CRÍTICO

Objetivo único: **Clara contestando el WhatsApp real de Ruiz Estrada antes del cierre de agosto.**

1. Alta del número en Meta Business / WhatsApp Cloud API; configurar `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` en Vercel (webhook `/api/whatsapp/meta` ya listo).
2. Activar escenario Make y prueba E2E real: conversación completa → elegir opción 1 → email de confirmación recibido → enlace `/ficha/DENTIA-XXXXXX` funcional. Probar también `rescheduled` y `cancelled`.
3. Cargar/verificar base de conocimiento Ruiz Estrada completa en el tenant (tratamientos, precios autorizados, doctores, horarios de agosto, mensaje "clínica cerrada, te agendamos para septiembre").
4. Modo agosto: Clara captura lead + pre-ficha + propone citas de septiembre + urgencias → derivación clara (teléfono de urgencias o instrucciones pactadas con la clínica).
5. Panel mínimo para el cliente: leads capturados, citas propuestas/confirmadas, presupuestos detectados — visible sin formación.
6. Acordar con Ruiz Estrada el protocolo de agosto por escrito (quién revisa pre-fichas, qué hace Clara ante urgencia real).

**Gate:** ≥1 conversación real de paciente gestionada de punta a punta con email de confirmación entregado. Cero incidentes de datos.

### SPRINT 2 — HARDENING PRE-DATOS-REALES (AGOSTO 2026)

Mientras Clara trabaja sola, se blinda la plataforma (la clínica está cerrada: ventana perfecta para deuda técnica).

- Toda la lista de §8, en orden (migraciones Prisma primero).
- Checklist RGPD de §7 (EIPD, DPA plantilla, retención/supresión, auditoría de aislamiento).
- Rediseño de arquitectura de menús/submenús (pendiente de directrices del usuario) + troceo de `page.tsx` en el mismo movimiento. Separación clara: recepción IA · pacientes/ficha · agenda · tratamientos/presupuestos · facturación · crecimiento · configuración.
- Recordatorios T-72h/24h/3h reales con cron + cola (hoy solo generación manual de tareas).
- Corpus de Clara ampliado con las conversaciones reales de agosto → fixtures de regresión.

**Gate:** migraciones versionadas en producción; Sentry activo; EIPD y DPA listos; menús validados por el usuario; `quality:release` en verde.

### FASE B — PRIMEROS CLIENTES DE PAGO (SEPT–DIC 2026)

- Caso de éxito Ruiz Estrada documentado en €: "clínica cerrada capturó X leads y Y citas en agosto".
- Stripe + planes reales (§10) + límites por plan ya modelados en API.
- Onboarding self-service del conocimiento de clínica (horarios, tratamientos, precios, seguros) — hoy requiere trabajo manual; convertirlo en asistente guiado.
- GTM (§10.3): outbound quirúrgico + auditoría gratuita de llamadas perdidas + partners prescriptores.
- Soporte y SLA básicos; contrato + DPA firmables.

**Gate:** 10 clínicas de pago; churn <5% mensual; NPS del piloto >8; MRR ≥2.500 €.

### FASE C — VOZ + PRIMERA INTEGRACIÓN PMS (2027 T1)

- Agente de voz entrante: desvío de número, plataforma comprada (Vapi/Retell) para validar en semanas; latencia <1s; transferencia a humano en caliente; transcripción + resumen en ficha.
- Triaje de urgencias por voz validado por odontólogo asesor.
- Integraciones por orden de esfuerzo/retorno: Google Calendar (fallback rápido) → Klinikare (API cloud) → Clinic Cloud.
- SMS como canal de fallback.
- Lanzamiento comercial ampliado: pricing público en web (ventaja frente a RingLab).

**Gate:** 25 clínicas; >70% de llamadas fuera de horario convertidas en cita o lead; coste de voz por clínica dentro del margen del plan PRO.

### FASE D — MOTOR DE INGRESOS + GESDEN (2027 T2–T3)

- Predicción de no-shows + sobreagendado inteligente.
- Lista de espera automática y relleno de huecos por cancelación.
- Secuencias de reactivación (+12 meses) y seguimiento de presupuestos abiertos.
- Post-tratamiento + reseñas Google.
- **Panel "dinero recuperado" en €** como centro del producto — el argumento de renovación.
- Conector local Gesden G5 (patrón RingLab: túnel saliente cifrado, sin puertos abiertos) — paridad y superación del referente.

**Gate:** 40 clínicas; NRR >100%; "+X €/mes recuperados" documentado en 3 clientes.

### FASE E — ESCALA NACIONAL (2027 T4 → 2028)

- Multi-sede/grupos y DSOs: vista consolidada, enrutado entre sedes.
- Marketplace de integraciones sobre la API pública; webhooks para partners.
- Catalán/inglés; Portugal como segunda geografía natural.
- Llamadas salientes proactivas de confirmación con IA de voz.
- Respuesta automática a leads de Google/Meta Ads en <1 min.
- ISO 27001 / SOC 2 para cadenas grandes.

---

## 10. MODELO DE NEGOCIO

### 10.1. Pricing (propuesta vigente)

| Plan | Precio/mes por sede | Incluye |
|---|---|---|
| **ESENCIAL** | 149 € | Bandeja omnicanal + Clara mensajería (WhatsApp/web) + recordatorios + panel básico. 500 conversaciones/mes |
| **PRO** | 299 € | + voz (500 min/mes) + integración PMS + triaje urgencias + transcripciones |
| **CRECIMIENTO** | 499 € | + no-show prediction + reactivación + presupuestos + reseñas + volúmenes ampliados |
| **GRUPOS/DSO** | Custom | Multi-sede, SLA, SSO, onboarding dedicado |

- Setup 250–500 € (bonificado con anual). Excedentes por packs.
- Justificación: si Clara salva 3–4 pacientes nuevos/mes (~350 €/ud), el plan PRO se paga solo ×4. **Anclar SIEMPRE la venta al dinero recuperado.**
- Benchmark: Arini $249, Savvy desde $89, mercado $49–800 → zona media con más producto.

### 10.2. Unit economics (estimación)

- Coste variable clínica/mes (PRO): LLM 15–30 € + voz 40–70 € + WhatsApp ~10 € + infra ~5 € → 70–115 € → margen bruto 60–75% (mejora al migrar voz a pipeline propio).
- CAC objetivo <900 € (payback <6 meses en PRO). LTV con churn 2%/mes ≈ 15.000 € → LTV/CAC >15.

### 10.3. Go-to-market España

1. **Nicho concentrado:** clínicas privadas independientes de 1–3 sedes (~24.000 clínicas en España, >80% pequeñas). Cadenas en Fase E.
2. **Caso Ruiz Estrada como arma:** "una clínica cerrada en agosto siguió captando pacientes" — apertura de puerta inigualable en septiembre.
3. **Outbound quirúrgico:** llamar a clínicas fuera de horario; si no contesta nadie, ese es el pitch.
4. **Auditoría gratuita de llamadas perdidas** (2 semanas de desvío) → informe con € perdidos → conversión.
5. **Partners prescriptores:** asesorías dentales, consultores, depósitos, protésicos; comisión 15–20% primer año.
6. **Contenido:** calculadora de llamadas perdidas como lead magnet; SEO/LinkedIn.
7. **Presencia sectorial:** Expodental (IFEMA), SEPA/SEPES, colegios de odontólogos.

---

## 11. KPIS

| Categoría | KPI | Objetivo |
|---|---|---|
| Agente | Evaluación Clara (gate automático) | 100/100 siempre — regresión = bloqueo de release |
| Agente | % conversaciones resueltas sin humano | >65% |
| Agente | Tasa de agendado (intención → cita) | >55% |
| Agente | Latencia voz (cuando exista) | <1 s |
| Cliente | No-shows | −30% en 90 días |
| Cliente | Llamadas/mensajes perdidos | −80% |
| Negocio | MRR a 12 meses de Fase B | 25–40 k€ (40–80 clínicas) |
| Negocio | Churn mensual | <3% |
| Negocio | NRR | >105% |

---

## 12. RIESGOS Y MITIGACIONES

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Deploy destruye datos (db push sin migraciones) | Alta si no se corrige | Muy alto | §8.1 — migraciones versionadas en Sprint 2, antes que nada |
| Alucinación del agente (precio/consejo clínico) | Media | Muy alto | Guardrails duros + eval automática 100/100 como gate + fallos reales → fixtures + seguro RC |
| Incidente RGPD con datos de salud | Baja | Muy alto | Checklist §7 completo ANTES de datos reales; mínima PII al LLM; residencia UE |
| RingLab consolida el mercado antes | Media | Alto | Velocidad + PMS que ellos no cubren + pricing público + caso agosto |
| Integración Gesden sin API pública | Alta | Alto | Conector local (patrón validado por RingLab); empezar por PMS cloud |
| Coste de voz se come el margen | Media | Medio | Buy primero, migrar a pipeline propio a >50 clínicas |
| Meta/WhatsApp cambia políticas o precios | Media | Medio | Multicanal real: voz y SMS como fallback |
| Recepción percibe amenaza laboral | Alta | Medio | Posicionar como asistente, no sustituto; formación en onboarding |
| Dependencia de Make/Gmail para emails | Media | Medio | Migrar a Brevo/SendGrid con dominio propio en Fase B |
| UX "liosa" frena la venta | Media | Alto | Rediseño de menús en Sprint 2 con directrices del usuario antes de demo comercial |

---

## 13. EQUIPO Y PRESUPUESTO ORIENTATIVO (12 MESES)

| Rol | Dedicación | Coste anual aprox. |
|---|---|---|
| Full-stack senior (founder/lead) | 100% | 55–70 k€ |
| Ingeniero IA/voz | 100% (desde Fase C) | 50–65 k€ |
| Full-stack mid | 100% (desde Fase B) | 40–50 k€ |
| Odontólogo asesor (protocolos) | 10% | 6–10 k€ |
| Sales/CS (founder-led al inicio; hire en Fase B) | 100% | 35–45 k€ + variable |
| Legal/DPO externo | Puntual | 8–12 k€ |
| Infra + APIs (LLM, voz, WhatsApp) | — | 15–30 k€ |
| **Total año 1** | | **~210–280 k€** |

---

## 14. PRÓXIMOS PASOS INMEDIATOS (SEMANA DEL 20 DE JULIO)

1. **Credenciales Meta WhatsApp Cloud** para el número del piloto → configurar en Vercel → verificar webhook. (Bloqueante nº1; requiere acción del usuario en Meta Business.)
2. **Prueba E2E Make completa:** conversación real → opción 1 → email recibido → ficha accesible. Después `rescheduled` y `cancelled`.
3. **Base de conocimiento Ruiz Estrada de agosto** cargada y validada con la clínica (horarios de cierre, protocolo de urgencias, citas para septiembre).
4. **Protocolo de agosto firmado** con Ruiz Estrada: quién revisa pre-fichas, escalados, teléfono de urgencias.
5. Iniciar en paralelo **migraciones Prisma versionadas** (§8.1) — única pieza de deuda que no espera a Sprint 2.

Protocolo de entrega vigente (invariable):

1. `git status --short` + últimos commits antes de tocar código.
2. Cambios pequeños y coherentes con `saas new design/`.
3. No tocar Clara salvo petición explícita.
4. Validar: `npm run typecheck` · `npm run lint` · `npm run build` · `npm test` (y `quality:release` antes de deploy).
5. Verificación visual en navegador de cambios de UI.
6. Commit claro en `main` → `git push origin main` → esperar checks Vercel en `success`.
7. Actualizar `MEMORIA_DENTAL.MD` y esta hoja de ruta al cerrar fase o decisión relevante.

---

## FUENTES

- [RingLab](https://www.ring-lab.com/) — producto de referencia analizado en detalle.
- [Mordor Intelligence — Dental PMS Market](https://www.mordorintelligence.com/industry-reports/dental-practice-management-software-market) · [Grand View Research](https://www.grandviewresearch.com/industry-analysis/dental-practice-management-software-market) — tamaño y cuotas de mercado.
- [Orthia — Dental AI Receptionist Competition 2026](https://orthia.io/blog/dental-ai-receptionist-competition) · [AInora — 7 Best AI Receptionists](https://ainora.lt/blog/ai-voice-agent-dental-clinics-2026) · [LuMay — Best AI Voice Agent](https://www.lumay.ai/blogs/best-ai-voice-agent-for-dental-clinics) — competidores IA y pricing.
- [Reach — 32% of dental calls go unanswered](https://www.getreach.co/blog/32-of-dental-calls-go-unanswered-how-to-fix-it) · [Resonate — Missed Calls Statistics](https://www.resonateapp.com/resources/missed-calls-dental-practices-statistics) · [Dental Managers — Staffing Crisis](https://www.dentalmanagers.com/blog/dental-staffing-crisis-and-the-path-forward/) — dolores del sector con datos.
- [Updent — Comparativa software dental España](https://updent.es/blog/software-gestion-dental-comparativa/) · [Akeito — Precios Gesden](https://akeito.com/blog/gesden-precios/) · [Echale — Qué es Klinikare](https://echale.es/blog/que-es-klinikare/) — mercado español y precios.
