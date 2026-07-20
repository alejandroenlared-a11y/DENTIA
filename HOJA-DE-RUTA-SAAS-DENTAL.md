# HOJA DE RUTA — SAAS PARA CLÍNICAS DENTALES + AGENTE IA RECEPCIONISTA

> Proyecto AVELKIA · Fecha: 8 de julio de 2026
> Basado en investigación de RingLab, competidores internacionales (Arini, Annie, TrueLark/Weave, Savvy Agents, Adit) y el mercado español (Gesden, Klinikare, Clinic Cloud).

---

## 1. RESUMEN EJECUTIVO

Producto: **plataforma SaaS de gestión de comunicación y citas para clínicas dentales**, con un **agente IA recepcionista** (voz + WhatsApp + SMS) que atiende al paciente 24/7, conoce el nicho odontológico a la perfección, orienta al paciente y **agenda citas de forma autónoma** sincronizadas con el software de gestión de la clínica.

La tesis: las clínicas dentales pierden entre el 30% y el 40% de sus llamadas entrantes, cada paciente nuevo vale ~350 €, y la recepción está saturada y en rotación constante. Un agente IA que responde en segundos, agenda directamente en el PMS de la clínica y reduce no-shows, tiene un ROI demostrable desde el primer mes. RingLab ya valida este modelo en España (integración con Gesden G5); el mercado internacional (Arini, Annie, TrueLark) valida el pricing y la demanda.

**Diferenciación propuesta:**
1. Omnicanal real (voz + WhatsApp + SMS + web) en una sola bandeja — la mayoría de competidores son solo voz o solo mensajería.
2. Integración profunda con el ecosistema español (Gesden G5, Klinikare, Clinic Cloud) — los players americanos no cubren España.
3. Agente IA con conocimiento clínico dental real: triaje de urgencias, orientación por tratamiento, gestión de primeras visitas.
4. Cumplimiento RGPD nativo (dato de salud = categoría especial) como ventaja competitiva frente a soluciones USA.

---

## 2. INVESTIGACIÓN DE MERCADO

### 2.1. RINGLAB — ANÁLISIS DEL REFERENTE DIRECTO

RingLab (ring-lab.com) es una plataforma española de gestión inteligente para clínicas dentales. Funciona como recepcionista virtual con IA.

**Qué hace:**
- Mensajería unificada: WhatsApp, SMS y llamadas telefónicas en una sola interfaz.
- Agendado automático de citas sin intervención humana, también fuera de horario.
- Recordatorios automáticos multicanal y predicción/prevención de no-shows.
- Alta automatizada de pacientes nuevos, historial, seguimiento post-tratamiento y encuestas de satisfacción.
- Dashboard en tiempo real: conversión, ocupación de agenda, estado del recepcionista virtual.
- IA con respuestas contextuales según historial, reconocimiento de intención, transcripción de llamadas en tiempo real, escalado de casos complejos al personal y personalidad configurable.

**Integraciones:**
- Sincronización directa con **Gesden G5** (único PMS soportado hoy; más en desarrollo).
- Soporte de sistemas legacy on-premise mediante **conector local seguro** (sin acceso remoto).
- Desvío de número de teléfono sin necesidad de portabilidad.

**Métricas que publican:**
| Métrica | Valor |
|---|---|
| Primera respuesta media | 5 segundos |
| Reducción de no-shows | 68% de media en los primeros 3 meses |
| Confirmación de citas | +92% |
| Reducción de llamadas operativas | 35% |
| Satisfacción del paciente | 4,9 estrellas |
| Tiempo de implantación | hasta 72 horas |

**Seguridad que comunican:** aislamiento físico de datos, cifrado en reposo, sistema de permisos, logs de auditoría, cero acceso remoto, monitorización 24/7, los datos del paciente nunca se almacenan en servidores de RingLab.

**Modelo comercial:** sin precios públicos; demo + onboarding progresivo con responsable técnico dedicado y garantía de resolución en 24h para incidencias críticas.

**Debilidades detectadas (oportunidad):**
- Solo integra Gesden G5 → clínicas con Klinikare, Clinic Cloud, iDental o Clinicbox quedan fuera.
- Sin precios públicos → fricción comercial (los competidores USA publican desde $89/mes).
- Producto centrado en comunicación; no es el sistema de gestión → depende siempre del PMS de terceros.

### 2.2. COMPETIDORES INTERNACIONALES (AGENTES IA DENTALES)

| Plataforma | Enfoque | Precio | Integraciones PMS | Notas |
|---|---|---|---|---|
| **Arini** (YC) | Voz IA pura para dental | ~$249/mes | Dentrix, Open Dental, Eaglesoft, Curve | Booking en tiempo real, multiidioma. Referente en voz. |
| **Annie** (Dental Intelligence) | Relación con paciente | Bundle | Agendado directo en PMS | FAQ inteligente, respuestas personalizadas. |
| **TrueLark / Weave** | Todo-en-uno comunicaciones | Bundle (VoIP+SMS+pagos) | Amplio | Weave adquirió TrueLark en 2025. Orientado a DSOs grandes. |
| **Savvy Agents** | 4 agentes especializados | Desde $89/mes | Sync bidireccional con 15+ PMS | Ira (recepción), Sia (notas clínicas), Novi (retención), Milo (seguros). 5 idiomas. |
| **Adit** | PMS todo-en-uno con IA | Bundle | Propio | 5.000+ clínicas. AI Front Desk lanzado feb-2026. |
| **My AI Front Desk, Goodcall, Resonate, HeyGent** | Voz genérica/dental | $49–$800/mes | Variable | Gama baja del mercado. |

**Aprendizajes de pricing:** el rango va de $49 a $800+/mes. Los modelos de tarifa plana ganan a los de por-minuto ($1–3/min) o por-llamada en clínicas con 200+ llamadas/mes. Punto dulce: **$150–300/mes por sede**.

### 2.3. GESTIÓN DE CLÍNICAS (PMS) — MERCADO GLOBAL

- Mercado de software de gestión dental: **$2.620M en 2026 → $4.440M en 2031 (CAGR 11,12%)**.
- Henry Schein (Dentrix), Carestream, NextGen, Patterson y Veradigm concentran ~70% del mercado.
- Dentrix pierde cuota (problemas de ciberseguridad + migración cloud); **CareStack y tab32 crecen** con arquitectura multi-tenant, API abierta y FHIR.
- **Denticon** (Planet DDS): 13.000+ clínicas, diseñado para DSOs multi-sede.
- **Curve Dental**: cloud, para clínicas pequeñas/medianas, foco en simplicidad.
- Tendencia clara: **cloud + IA + interoperabilidad** desplazan al software de escritorio.

### 2.4. MERCADO ESPAÑOL (PMS)

| Software | Modelo | Precio orientativo | Posición |
|---|---|---|---|
| **Gesden G5** (Infomed/Henry Schein) | Licencia + cloud | 2.000–3.000 € licencia + 400–600 €/año mantenimiento, o 50–100 €/mes cloud | Líder histórico (20+ años), base instalada enorme, cadenas grandes |
| **Klinikare** | 100% cloud | 80–150 €/mes según sillones/módulos | Moderno, todo-en-uno |
| **Clinic Cloud** | 100% cloud | Desde 70 €/mes; clínica 2 gabinetes: 120–180 €/mes | Alternativa moderna |
| **Clinicbox / iDental** | Cloud | Variable | Entre los 4 más usados |

**Conclusión:** el mercado español de PMS está cubierto, pero la **capa de agente IA conversacional integrado apenas tiene un player (RingLab) y solo cubre Gesden**. Hueco claro: agente IA multicanal integrable con TODOS los PMS españoles + versión standalone con agenda propia para clínicas sin PMS moderno.

---

## 3. DOLORES DEL SECTOR (VALIDADOS CON DATOS)

### 3.1. LLAMADAS PERDIDAS — EL DOLOR Nº1

- La clínica dental media **pierde ~300 llamadas al mes** (fuentes conservadoras: 30–50/mes; ~40% son pacientes reales buscando cita).
- **El 32% de las llamadas de pacientes nuevos no se contestan.**
- Valor medio de un paciente nuevo: **~350 €** (primer tratamiento; el lifetime value es muy superior).
- Pérdida estimada: **4.200–7.000 €/mes**; clínicas con 100 llamadas nuevas/mes pueden perder **+200.000 €/año**.
- Los pacientes que no logran contactar tienen un **73% más de probabilidad de reservar con un competidor ese mismo día**.
- **El 70%+ de los pacientes nuevos eligen clínica según su primer contacto** — casi siempre telefónico.

### 3.2. CRISIS DE PERSONAL EN RECEPCIÓN

- El 60% de las clínicas que pierden llamadas citan **escasez de personal** como causa principal.
- **Más del 50% del personal de recepción está buscando activamente otro empleo.**
- Coste de reemplazar una recepcionista: **11.000–14.000 €** (selección + onboarding + pérdida de productividad).
- La recepción hace demasiadas cosas a la vez: atención presencial, seguros, cobros, agenda → las llamadas van al buzón.

### 3.3. NO-SHOWS Y CANCELACIONES

- Causa raíz: coordinación pobre durante el agendado (sin confirmación, sin recordatorios estructurados).
- Clínicas con sistemas de intake estructurados reducen no-shows **15–30% en 90 días** (RingLab reporta hasta 68%).
- Cada hueco vacío de sillón es coste fijo puro (odontólogo + gabinete parados).

### 3.4. OTROS DOLORES RELEVANTES

- **Fuera de horario:** una parte importante de las solicitudes de cita llega por la tarde-noche o fin de semana; nadie responde.
- **Fragmentación de canales:** teléfono + WhatsApp personal + Instagram + web sin unificar; se pierden hilos de conversación.
- **Presupuestos no seguidos:** tratamientos presupuestados que nunca se cierran por falta de follow-up sistemático.
- **Reactivación inexistente:** pacientes que no vuelven a revisión/higiene anual y nadie les llama.
- **Cero visibilidad de negocio:** el gerente no sabe cuántas llamadas se pierden, ni la tasa de conversión de primera visita, ni la ocupación real de agenda.
- **Software heredado:** PMS de escritorio (Gesden clásico) sin API pública → la integración exige conectores locales.

---

## 4. PROPUESTA DE PRODUCTO

### 4.1. VISIÓN

"La recepcionista perfecta que nunca duerme": toda la comunicación de la clínica en una bandeja, un agente IA que atiende, orienta y agenda al paciente en segundos por cualquier canal, y un panel que enseña al gerente el dinero que está dejando de perder.

### 4.2. MÓDULOS DEL SAAS

**M1 — Bandeja omnicanal unificada**
- WhatsApp Business API, llamadas de voz (desvío de número, sin portabilidad), SMS, formulario web/widget.
- Timeline por paciente: todas las conversaciones de todos los canales en un hilo.
- Traspaso IA → humano con contexto completo (transcripción + intención + datos capturados).

**M2 — Agente IA recepcionista** (detallado en sección 5)

**M3 — Agenda y citas**
- Agenda propia multi-gabinete/multi-doctor (modo standalone) O sincronización bidireccional con el PMS de la clínica (modo integrado).
- Motor de disponibilidad: reglas por tipo de tratamiento (duración, gabinete, doctor, buffers).
- Confirmaciones y recordatorios automáticos (T-72h, T-24h, T-3h) por el canal preferido del paciente.
- Lista de espera inteligente: hueco por cancelación → oferta automática a pacientes en espera.

**M4 — CRM de pacientes**
- Ficha del paciente: datos, historial de comunicación, citas, presupuestos, preferencias, consentimientos RGPD.
- Segmentación: nuevos, activos, inactivos +12 meses, presupuestos abiertos.
- Campañas de reactivación y seguimiento de presupuestos (secuencias automáticas).

**M5 — Dashboard y analítica**
- KPIs firma: llamadas atendidas vs perdidas, citas agendadas por IA, tasa de no-show, ocupación de agenda, ingresos recuperados (€).
- Panel "dinero salvado": cada cita agendada por la IA fuera de horario o en llamada que se habría perdido, valorizada.
- Transcripciones y análisis de sentimiento de llamadas.

**M6 — Integraciones**
- Fase 1: Gesden G5 (conector local, mismo enfoque RingLab), Klinikare y Clinic Cloud (API cloud).
- Fase 2: Clinicbox, iDental, Google Calendar, y API pública propia + webhooks.

### 4.3. LO QUE NO ES (ALCANCE NEGATIVO)

- No es un PMS completo: no hace odontograma, ni facturación fiscal, ni gestión de laboratorio (fase 1-3). Se integra con los PMS, no los reemplaza. Esto acelera el time-to-market y evita competir con Gesden/Klinikare de frente.
- No da consejo clínico ni diagnóstico: el agente orienta y agenda, nunca diagnostica.

---

## 5. AGENTE IA — DISEÑO COMPLETO

### 5.1. PERSONALIDAD Y COMPORTAMIENTO

- Nombre configurable por clínica (ej. "Clara, la asistente de Clínica Sonrisa").
- Tono: cercano, profesional, empático; configurable (formal/informal, tuteo/usted).
- Idiomas: español (día 1), catalán/inglés (fase 2), más idiomas después.
- Latencia objetivo en voz: **< 1 segundo** entre turno y respuesta; primera respuesta en mensajería **< 5 segundos**.

### 5.2. BASE DE CONOCIMIENTO DEL NICHO (LO QUE EL AGENTE DOMINA)

**Catálogo de tratamientos** (con lenguaje de paciente, no técnico):
- Preventiva: revisión, higiene/limpieza, fluorización, selladores.
- Conservadora: empastes (obturaciones), endodoncia, reconstrucciones.
- Prótesis: coronas, puentes, prótesis removibles, prótesis sobre implantes.
- Implantología: implante unitario, All-on-4/6, elevación de seno, injertos.
- Ortodoncia: brackets metálicos/estéticos, alineadores invisibles, retenedores.
- Estética: blanqueamiento, carillas de composite/porcelana.
- Periodoncia: curetajes, mantenimiento periodontal, tratamiento de piorrea.
- Cirugía: extracciones, cordales, apicectomía.
- Odontopediatría e infantil: primera visita niño, PADI/programas públicos por comunidad.
- ATM/bruxismo: férulas de descarga.

Por cada tratamiento el agente sabe: qué es en lenguaje llano, duración típica de cita, si requiere valoración previa, rangos de precio de la clínica (si la clínica los autoriza), financiación disponible, y qué doctor/gabinete lo hace.

**Triaje de urgencias (protocolo crítico):**
| Síntoma | Clasificación | Acción del agente |
|---|---|---|
| Traumatismo con avulsión (diente fuera), sangrado que no cesa, inflamación con fiebre/dificultad para tragar | URGENCIA REAL | Escalado inmediato a humano + instrucciones de primeros auxilios validadas + hueco de urgencia el mismo día o derivación a urgencias hospitalarias si la clínica está cerrada |
| Dolor agudo, flemón, empaste/corona caída con dolor | PRIORITARIA | Ofrece primer hueco disponible en 24h, marca la cita como urgencia |
| Sensibilidad, revisión, estética, molestia leve | ORDINARIA | Agenda normal |

Regla de oro: **ante duda, escalar**. El agente jamás minimiza un síntoma ni da diagnóstico ("eso suena a caries") — describe opciones y agenda.

**Conocimiento operativo de la clínica (configurable por tenant):**
- Horarios, direcciones, parking, cómo llegar.
- Doctores y especialidades de cada uno.
- Seguros/mutuas aceptados (Adeslas, Sanitas, DKV, Asisa…) y qué cubre cada convenio.
- Política de precios, financiación (ej. 12 meses sin intereses), promociones vigentes.
- Políticas: cancelación, retraso, primera visita gratuita o no, radiografías.

**Conocimiento del funnel del paciente:**
- Paciente nuevo → capta: nombre, teléfono, motivo, cómo nos conoció, seguro → agenda primera visita/valoración → dispara secuencia de bienvenida (ubicación, qué traer, consentimiento RGPD).
- Paciente existente → identifica por teléfono → contexto de su historial de citas → agenda/reprograma/cancela.
- Presupuesto abierto → responde dudas de precio/financiación → ofrece cita de cierre.

### 5.3. FLUJOS CONVERSACIONALES PRINCIPALES

1. **AGENDAR CITA NUEVA** — intención detectada → identifica/da de alta al paciente → motivo → triaje → propone 2-3 huecos según reglas de tratamiento → confirma → escribe en agenda/PMS → envía confirmación con ubicación e instrucciones.
2. **REPROGRAMAR / CANCELAR** — localiza cita → ofrece alternativas → actualiza PMS → si cancela, ofrece hueco a lista de espera automáticamente.
3. **URGENCIA** — protocolo de triaje → hueco de urgencia o escalado inmediato.
4. **INFORMACIÓN DE TRATAMIENTO/PRECIO** — explica en lenguaje llano → rango de precios autorizado → propone valoración gratuita → captura lead aunque no agende.
5. **CONFIRMACIÓN / RECORDATORIO (saliente)** — T-72h/24h/3h → si no confirma, reintento por otro canal → si cancela, recupera el hueco.
6. **REACTIVACIÓN (saliente)** — pacientes sin visita en 12 meses → mensaje personalizado de revisión → agenda.
7. **SEGUIMIENTO POST-TRATAMIENTO** — 24-48h tras intervención → pregunta cómo se encuentra → detecta complicaciones (escala) → encuesta de satisfacción + petición de reseña Google si es positiva.
8. **ESCALADO A HUMANO** — triggers: urgencia real, enfado/queja, petición explícita, 2 intentos fallidos de entender, temas clínicos fuera de guion, pagos/reclamaciones. Entrega: transcripción + resumen + datos capturados.

### 5.4. GUARDRAILS (INNEGOCIABLES)

- Nunca diagnostica, nunca prescribe, nunca contradice al odontólogo.
- Nunca inventa precios ni promociones: solo lee de la configuración del tenant.
- Nunca confirma disponibilidad sin verificar la agenda en tiempo real.
- Identifica que es un asistente virtual si el paciente lo pregunta (transparencia, exigible por AI Act).
- Datos de salud: solo captura lo mínimo necesario para agendar (motivo general, no historial).
- Grabación/transcripción de llamadas: locución informativa previa + base legal (RGPD).

### 5.5. STACK TÉCNICO DEL AGENTE

| Capa | Tecnología propuesta | Alternativa |
|---|---|---|
| LLM / razonamiento | Claude (Anthropic API) con tool-use para agenda, CRM y escalado | GPT-4o |
| Orquestación | Motor de agente propio (state machine + tools) con Agent SDK | LangGraph |
| Voz — telefonía | Twilio Programmable Voice / SIP trunk local español | Vonage, Telnyx |
| Voz — STT | Deepgram (streaming, español) | Whisper streaming |
| Voz — TTS | ElevenLabs (voz natural es-ES, baja latencia) | Azure TTS |
| Pipeline voz tiempo real | Pipecat / LiveKit Agents (turn-taking, barge-in) | Vapi (build vs buy) |
| WhatsApp | WhatsApp Business API (Meta / BSP tipo 360dialog) | Twilio WA |
| RAG conocimiento clínica | pgvector sobre PostgreSQL, embeddings por tenant | Pinecone |
| Evaluación | Suite de tests de conversación (golden dialogs) + revisión humana de muestras + métricas de resolución | — |

Decisión clave **build vs buy en voz**: empezar con plataforma (Vapi/Retell) para validar en semanas y migrar a pipeline propio (Pipecat + Twilio) cuando el volumen justifique el margen. El coste por minuto de plataforma (~$0,10–0,20/min) se come el margen a escala.

---

## 6. ARQUITECTURA TÉCNICA DEL SAAS

### 6.1. PRINCIPIOS

- **Multi-tenant desde el día 1**: PostgreSQL con Row-Level Security por `tenant_id`; aislamiento estricto de datos entre clínicas.
- **API-first**: todo lo que hace la UI lo hace la API; API pública documentada en fase 3.
- **Event-driven** para lo asíncrono: recordatorios, secuencias, sincronización PMS → colas (BullMQ/Redis).
- **Inmutabilidad y auditoría**: log de auditoría append-only de todo acceso a datos de paciente (obligación RGPD + argumento de venta).

### 6.2. STACK

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind — design system AVELKIA |
| Backend | NestJS (Node/TypeScript) — API REST + WebSockets para bandeja en tiempo real |
| Base de datos | PostgreSQL (RLS multi-tenant) + pgvector |
| Colas/cache | Redis + BullMQ |
| Infra | Docker + despliegue EU (Hetzner/AWS eu-west) — datos SIEMPRE en la UE |
| Conector local PMS | Agente ligero instalado en el servidor de la clínica (para Gesden on-premise): túnel saliente cifrado, sin puertos abiertos, sin acceso remoto — mismo patrón que RingLab |
| Observabilidad | Sentry + OpenTelemetry + dashboards de latencia del agente |
| Auth | Auth propia con MFA + roles (gerente, recepción, doctor, solo-lectura) |

### 6.3. MODELO DE DATOS (NÚCLEO)

`tenants` → `locations` → `providers` (doctores) → `operatories` (gabinetes)
`patients` → `conversations` → `messages` (canal, dirección, transcripción)
`appointments` (estado: solicitada/confirmada/completada/no-show/cancelada) → `appointment_types` (duración, reglas, precio)
`treatments_catalog` · `budgets` (presupuestos + estado de seguimiento) · `waitlist` · `consents` (RGPD) · `audit_log`
`agent_sessions` (intención, resultado, escalado, coste tokens/minutos)

---

## 7. CUMPLIMIENTO LEGAL (ESPAÑA/UE) — VENTAJA COMPETITIVA

- **RGPD + LOPDGDD**: los datos de salud son **categoría especial (art. 9 RGPD)**. Base jurídica: consentimiento explícito + relación asistencial. Registro de actividades de tratamiento, DPO designado, EIPD (evaluación de impacto) obligatoria por tratamiento a gran escala de datos de salud.
- **Encargado del tratamiento**: la clínica es responsable; nosotros encargados → contrato DPA robusto con cada cliente (art. 28).
- **Residencia de datos en la UE**, cifrado en tránsito (TLS 1.3) y en reposo (AES-256), retención configurable, derecho de supresión automatizado.
- **Llamadas**: locución previa informando de asistente virtual y grabación; opt-out a humano siempre disponible.
- **AI Act (UE)**: transparencia obligatoria (el usuario debe saber que habla con IA); el caso de uso (agendado) es riesgo limitado, no alto — documentarlo.
- **LLM providers**: acuerdos con zero-data-retention / no-training (Anthropic lo ofrece vía API); nunca enviar más PII de la necesaria al modelo; seudonimización donde sea posible.

---

## 8. HOJA DE RUTA POR FASES

### FASE 0 — VALIDACIÓN (SEMANAS 1–4)

- 15–20 entrevistas con gerentes de clínica y recepcionistas (guion sobre los 6 dolores de la sección 3).
- Mapear el parque de PMS de las clínicas entrevistadas (¿% Gesden vs Klinikare vs otros?).
- Prototipo Wizard-of-Oz: número de WhatsApp atendido con IA supervisada en 2 clínicas amigas; medir tasa de agendado real.
- 5 cartas de intención (LOI) con precio anclado antes de escribir código de producción.
- **Gate de salida:** ≥60% de entrevistados confirman dolor nº1 (llamadas perdidas) y ≥3 LOIs firmadas.

### FASE 1 — MVP MENSAJERÍA (MESES 1–3)

Alcance:
- Bandeja unificada WhatsApp + widget web.
- Agente IA texto: flujos 1, 2, 4 y 8 (agendar, reprogramar, info, escalado).
- Agenda propia standalone (sin integración PMS aún) multi-doctor.
- Confirmaciones y recordatorios automáticos por WhatsApp.
- Panel básico: citas agendadas por IA, conversaciones, tasa de respuesta.
- Onboarding self-service del conocimiento de clínica (horarios, tratamientos, precios, seguros).
- 3–5 clínicas piloto de las LOIs, gratis 2 meses a cambio de feedback semanal.

**Gate:** ≥50% de las conversaciones entrantes resueltas sin humano; ≥30 citas/mes agendadas por IA por clínica.

### FASE 2 — VOZ + INTEGRACIÓN GESDEN (MESES 4–6)

- Agente de voz entrante: desvío de número, STT/TTS es-ES, latencia <1s, transferencia a humano en caliente.
- Triaje de urgencias completo (flujo 3) con protocolo validado por odontólogo asesor.
- Conector local Gesden G5 (lectura/escritura de agenda) — paridad con RingLab.
- Integración API con Klinikare y Clinic Cloud (ventaja sobre RingLab).
- Transcripción + resumen de cada llamada en la ficha del paciente.
- Lanzamiento comercial: pricing público, web, casos de éxito de los pilotos.

**Gate:** 15 clínicas de pago; churn < 5% mensual; >70% de llamadas fuera de horario convertidas en cita o lead.

### FASE 3 — MOTOR DE INGRESOS (MESES 7–9)

- Predicción de no-shows (modelo sobre historial: antigüedad, canal, tipo de cita, clima de confirmaciones) + sobreagendado inteligente.
- Lista de espera automática y relleno de huecos por cancelación.
- Secuencias de reactivación (+12 meses) y seguimiento de presupuestos abiertos.
- Flujo 7 (post-tratamiento + reseñas Google).
- Panel "dinero recuperado" en € — el argumento de renovación.
- SMS como canal de fallback.

**Gate:** 40 clínicas; NRR >100%; caso de éxito medible: "+X€/mes recuperados" documentado en 3 clientes.

### FASE 4 — ESCALA (MESES 10–18)

- Multi-sede / grupos y DSOs: vista consolidada, enrutado de llamadas entre sedes.
- API pública + webhooks + marketplace de integraciones (contabilidad, marketing, laboratorios).
- Catalán, inglés, francés (mercado belga/francés como segunda geografía; Portugal natural por proximidad).
- Llamadas salientes proactivas de confirmación con IA de voz.
- Módulo de campañas de captación (respuesta automática a leads de Google/Meta Ads en <1 min).
- SOC 2 / ISO 27001 para entrar en cadenas grandes.

---

## 9. MODELO DE NEGOCIO

### 9.1. PRICING (PROPUESTA)

| Plan | Precio/mes por sede | Incluye |
|---|---|---|
| **ESENCIAL** | 149 € | Bandeja omnicanal + agente IA mensajería (WhatsApp/web) + recordatorios + panel básico. 500 conversaciones/mes |
| **PRO** | 299 € | Todo lo anterior + agente de voz (500 min/mes) + integración PMS + triaje urgencias + transcripciones |
| **CRECIMIENTO** | 499 € | Todo + no-show prediction + reactivación + presupuestos + reseñas + minutos/conversaciones ampliados |
| **GRUPOS/DSO** | Custom | Multi-sede, SLA, SSO, onboarding dedicado |

- Setup: 250–500 € (se bonifica con contrato anual). Excedentes: packs de minutos/conversaciones.
- Justificación de precio: si el agente salva 3–4 pacientes nuevos/mes (~350 €/ud), el plan PRO se paga solo ×4. Anclar SIEMPRE la venta al "dinero recuperado".
- Benchmark: Arini $249, Savvy desde $89, mercado $49–800 → estamos en zona media con más producto (omnicanal + integración española).

### 9.2. UNIT ECONOMICS (ESTIMACIÓN INICIAL)

- Coste variable por clínica/mes (plan PRO): LLM ~15–30 € + voz (STT/TTS/telefonía) ~40–70 € + WhatsApp ~10 € + infra ~5 € → **~70–115 €** → margen bruto ~60–75%. Mejora al migrar de plataforma de voz a pipeline propio.
- CAC objetivo <900 € (payback <6 meses en PRO). LTV con churn 2%/mes ≈ 15.000 € → LTV/CAC >15.

### 9.3. GO-TO-MARKET ESPAÑA

1. **Nicho concentrado primero:** clínicas privadas independientes de 1–3 sedes (España tiene ~24.000 clínicas dentales; >80% pequeñas). Evitar cadenas (ciclo largo) hasta fase 4.
2. **Canal directo:** outbound quirúrgico — llamar a clínicas fuera de horario; si no contesta nadie, ese es el pitch ("acabo de ser el paciente que has perdido").
3. **Partners prescriptores:** asesorías dentales, consultores de gestión, depósitos dentales, protésicos; comisión 15–20% primer año.
4. **Prueba con riesgo cero:** auditoría gratuita de llamadas perdidas (desvío de no-contestadas al agente 2 semanas) → informe con € perdidos → conversión.
5. **Contenido SEO/LinkedIn:** "cuánto dinero pierde tu clínica en llamadas", calculadora online de llamadas perdidas como lead magnet.
6. **Presencia sectorial:** Expodental (IFEMA), congresos SEPA/SEPES, colegios de odontólogos.

---

## 10. KPIS DEL PRODUCTO

| Categoría | KPI | Objetivo año 1 |
|---|---|---|
| Agente | % conversaciones resueltas sin humano | >65% |
| Agente | Tasa de agendado (conversaciones con intención → cita) | >55% |
| Agente | Latencia voz (turno a turno) | <1 s |
| Cliente | No-shows del cliente | −30% en 90 días |
| Cliente | Llamadas perdidas del cliente | −80% |
| Negocio | MRR | 25–40 k€ (40–80 clínicas) |
| Negocio | Churn mensual | <3% |
| Negocio | NRR | >105% |

---

## 11. RIESGOS Y MITIGACIONES

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Integración Gesden sin API pública | Alta | Alto | Conector local (patrón RingLab validado); empezar por PMS cloud con API; ingeniería inversa de BD local solo con autorización del cliente |
| Alucinación del agente (precio/consejo clínico erróneo) | Media | Muy alto | Guardrails duros, respuestas de precio solo desde configuración, suite de golden dialogs, revisión humana de muestras, seguro de RC |
| RingLab consolida el mercado español antes | Media | Alto | Velocidad + cubrir los PMS que ellos no cubren + pricing público transparente |
| Coste de voz se come el margen | Media | Medio | Empezar buy (Vapi/Retell), migrar a Pipecat/Twilio a >50 clínicas |
| RGPD: incidente con datos de salud | Baja | Muy alto | EIPD, DPO, cifrado, residencia UE, pentest anual, mínimos datos al LLM, DPA con proveedores |
| Adopción: recepción percibe amenaza laboral | Alta | Medio | Posicionar como "asistente de la recepción, no sustituto": les quita llamadas repetitivas, no el puesto. Formación incluida en onboarding |
| Meta/WhatsApp cambia políticas o precios | Media | Medio | Multicanal real: voz y SMS como fallback; BSP con contrato |

---

## 12. EQUIPO Y PRESUPUESTO ORIENTATIVO (12 MESES)

| Rol | Dedicación | Coste anual aprox. |
|---|---|---|
| Full-stack senior (founder/lead) | 100% | 55–70 k€ |
| Ingeniero IA/voz | 100% | 50–65 k€ |
| Full-stack mid | 100% (desde mes 4) | 40–50 k€ |
| Odontólogo asesor (protocolos + validación) | 10% | 6–10 k€ |
| Sales/CS (founder-led al inicio; hire mes 6) | 100% | 35–45 k€ + variable |
| Legal/DPO externo | Puntual | 8–12 k€ |
| Infra + APIs (LLM, voz, WhatsApp) | — | 15–30 k€ |
| **Total año 1** | | **~210–280 k€** |

---

## 13. PRÓXIMOS PASOS INMEDIATOS (ESTA SEMANA)

1. Cerrar 5 entrevistas con clínicas (guion de descubrimiento sobre sección 3).
2. Auditoría mystery-shopper: llamar a 30 clínicas locales en horario punta y fuera de horario; documentar % sin respuesta → primer dato propio para el pitch.
3. Prototipo del agente de texto (WhatsApp sandbox + Claude + agenda dummy) — demo interna en 2 semanas.
4. Solicitar demo de RingLab como cliente potencial → desmontar su onboarding y pricing real.
5. Contactar con 1 odontólogo asesor para validar el protocolo de triaje.

---

## FUENTES

- [RingLab](https://www.ring-lab.com/) — producto de referencia analizado en detalle.
- [Mordor Intelligence — Dental PMS Market](https://www.mordorintelligence.com/industry-reports/dental-practice-management-software-market) · [Grand View Research](https://www.grandviewresearch.com/industry-analysis/dental-practice-management-software-market) — tamaño y cuotas de mercado.
- [Orthia — Dental AI Receptionist Competition 2026](https://orthia.io/blog/dental-ai-receptionist-competition) · [AInora — 7 Best AI Receptionists](https://ainora.lt/blog/ai-voice-agent-dental-clinics-2026) · [LuMay — Best AI Voice Agent](https://www.lumay.ai/blogs/best-ai-voice-agent-for-dental-clinics) — competidores IA y pricing.
- [Reach — 32% of dental calls go unanswered](https://www.getreach.co/blog/32-of-dental-calls-go-unanswered-how-to-fix-it) · [Resonate — Missed Calls Statistics](https://www.resonateapp.com/resources/missed-calls-dental-practices-statistics) · [Dental Managers — Staffing Crisis](https://www.dentalmanagers.com/blog/dental-staffing-crisis-and-the-path-forward/) — dolores del sector con datos.
- [Updent — Comparativa software dental España](https://updent.es/blog/software-gestion-dental-comparativa/) · [Akeito — Precios Gesden](https://akeito.com/blog/gesden-precios/) · [Echale — Qué es Klinikare](https://echale.es/blog/que-es-klinikare/) — mercado español y precios.
