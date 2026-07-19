# HOJA DE RUTA PARA LLEVAR CLARA A NIVEL 100

Fecha inicial: 16 de julio de 2026
Ultima actualizacion: 17 de julio de 2026
Proyecto: Dentia AI - Recepcionista IA dental
Objetivo: convertir Clara en una recepcionista IA altamente fiable, medible y preparada para uso real en clinica.

## 0. Checklist actualizado - 17 julio 2026

### A. Clara: conversacion, datos y memoria

- [x] Clara pide los datos en varios mensajes, no todos a la vez.
- [x] Orden operativo definido: nombre y apellidos -> email -> telefono -> sede -> propuesta de cita.
- [x] El email del paciente se pide de forma explicita antes de proponer cita.
- [x] El email se extrae del chat, se valida y se guarda en la ficha del paciente.
- [x] Si el email es invalido, Clara lo detecta y vuelve a pedirlo sin avanzar.
- [x] Clara no debe repetir datos que ya tiene capturados.
- [x] Clara ya no pregunta "Que dia y hora o franja te encaja?" antes de proponer cita normal.
- [x] Clara propone directamente 3 opciones reales de cita cuando tiene los datos minimos.
- [x] Clara entiende respuestas cortas tipo `1`, `2` o `3` para elegir hueco.
- [x] Clara entiende disponibilidad breve tipo `lunes 10` cuando aparece en conversacion.
- [x] El chat crea una pre-ficha con los datos introducidos por el paciente.
- [x] Cada pre-ficha tiene un codigo de acceso tipo `DENTIA-XXXXXX`.
- [x] La pre-ficha detecta posibles duplicados por email/telefono antes de validarse como ficha definitiva.
- [x] La pre-ficha guarda snapshot del estado conversacional de Clara.
- [x] Existe portal paciente `/ficha/[codigo]` protegido por email o telefono.
- [ ] Entregar automaticamente el enlace de ficha al paciente en chat o email.
- [ ] Crear acciones de recepcion para validar, fusionar o descartar pre-fichas.
- [ ] Ampliar corpus con conversaciones reales largas, mal escritas, con cambios de tema y audio transcrito.
- [ ] Revisar conversaciones reales de produccion y convertir fallos en fixtures de regresion.

### B. Agenda y calendario

- [x] El calendario nativo de Dentia queda como fuente de verdad.
- [x] Make no decide disponibilidad ni agenda: solo recibe eventos para enviar emails.
- [x] Antes de reservar, Clara valida disponibilidad contra la agenda del SaaS.
- [x] La seleccion `1`, `2` o `3` conserva la hora exacta ofrecida.
- [x] Clara no crea cita ni dispara email hasta que el paciente elige una opcion.
- [x] Cancelar o cambiar cita no debe abrir una cita nueva por error.
- [x] El SaaS muestra un historial de citas por paciente con altas, modificaciones, cancelaciones y eventos de email.
- [ ] Integrar PMS dental real cuando el cliente confirme proveedor y credenciales.
- [ ] Anadir bloqueo temporal/hold para evitar dobles reservas en uso real con varios canales.
- [ ] Afinar disponibilidad avanzada por sede, doctor, gabinete, tratamiento y duracion.

### C. Make, Gmail y emails

- [x] Creado escenario Make: `Webhooks` -> `Router` -> 3 modulos Gmail.
- [x] Creados los 3 emails: confirmacion, modificacion y cancelacion de cita.
- [x] Configurado filtro de confirmacion: `eventType` igual a `created`.
- [x] Configurado filtro de modificacion: `eventType` igual a `rescheduled`.
- [x] Configurado filtro de cancelacion: `eventType` igual a `cancelled`.
- [x] Test de Make con evento `created`: solo entra en confirmacion.
- [x] `MAKE_APPOINTMENT_WEBHOOK_URL` configurado en produccion.
- [x] Payload de cita preparado con `patient.email` y `shouldEmailPatient`.
- [ ] Verificar manualmente que el escenario de Make queda activo.
- [ ] Hacer prueba real eligiendo una opcion `1/2/3` y confirmar recepcion del email.
- [ ] Probar en vivo reprogramacion y cancelacion para validar los otros dos emails.
- [ ] Decidir si en produccion definitiva usamos Gmail, Brevo, SendGrid o SMTP transaccional.

### D. Evaluacion, QA y despliegue

- [x] Creado motor de evaluacion en `src/lib/agent/clara-evaluation.ts`.
- [x] Creado dataset de regresion en `tests/fixtures/clara-conversations.json`.
- [x] Creado dataset extra en `tests/fixtures/clara-conversations-extra.json`.
- [x] Creado comando `npm run eval:clara`.
- [x] Creado comando `npm run quality:clara`.
- [x] Creado comando `npm run quality:release`.
- [x] Creado test de regresion `tests/clara-evaluation.test.ts`.
- [x] Creado test de pre-fichas `tests/patient-intake.test.ts`.
- [x] Anadido informe persistente en `reports/clara-evaluation.md`.
- [x] Anadido informe JSON en `reports/clara-evaluation.json`.
- [x] Resultado actual del evaluador: 100/100, 620/620 puntos, 0 fallos criticos.
- [x] Dataset actual: 103 conversaciones.
- [x] `npm run quality:release`: OK con 151 tests, lint, typecheck y build.
- [x] Bloque pre-fichas validado con 70 tests relevantes pasando.
- [x] Base local sincronizada con `prisma db push`.
- [x] Base produccion Neon sincronizada durante build de Vercel.
- [x] Despliegue produccion Vercel anterior: `dpl_2R75DE5Mt34Epb3EdypzfpmciKuJ`.
- [x] Despliegue produccion Vercel actual: `dpl_F5Yw9CANkGqnfi8oFTQwFtTxS4U4`.
- [x] Dominio publico validado: `https://dentia.avelkia.es`.
- [x] `/demo-whatsapp/clinica-murcia-elche`: HTTP 200.
- [x] `/widget/clinica-murcia-elche`: HTTP 200.
- [x] `/ficha/DENTIA-XXXXXX`: 404 con codigo inexistente, correcto.
- [x] QA viva en produccion: Clara pide consentimiento, nombre, email, telefono, sede y luego 3 opciones.
- [x] QA viva en produccion: email invalido tipo `laura@` no se acepta.
- [ ] Sustituir `prisma db push` en build por migraciones Prisma versionadas.
- [ ] Subir de 103 a 150 conversaciones de regresion.
- [ ] Separar fixtures por categoria cuando el archivo extra crezca demasiado.
- [ ] Convertir `quality:release` en control obligatorio de CI remoto.
- [ ] Crear historico de calidad para comparar subidas/bajadas de Clara por version.

### E. Producto Clara 100

- [x] Flujo principal de primera visita usable en demo y widget.
- [x] Emails operativos en Make para alta, modificacion y cancelacion, pendientes de validacion real completa.
- [x] Camino abierto para usar email real del cliente mas adelante.
- [x] Historial operativo de citas visible en la ficha de pacientes del SaaS.
- [x] Pre-fichas del chat visibles en SaaS con codigo, datos capturados, estado y posible duplicado.
- [x] Pagina `/ficha/[codigo]` protegida por verificacion de email o telefono.
- [x] La pagina publica de ficha muestra datos, citas y conversacion tras verificar email/telefono.
- [ ] Incluir enlace de ficha en email de confirmacion de cita.
- [ ] Incluir enlace de ficha en respuesta de Clara cuando tenga email/telefono validado.
- [ ] Crear cola operativa de pre-fichas pendientes de revisar.
- [ ] Integrar WhatsApp Meta real.
- [ ] Integrar PMS dental real.
- [ ] Crear panel de handoff humano para recepcion.
- [ ] Crear panel de calidad conversacional.
- [ ] Anadir recordatorios, no-shows, metricas y seguimiento comercial.
- [ ] QA multicanal: iPhone, Android, desktop, widget embebido y WhatsApp real.

## 1. Punto de partida

Estado actual estimado:

- Nota tecnica en tests controlados: 100/100.
- Nota realista de producto: 90/100.
- Suite actual: 151 tests pasando en `npm run quality:release`.
- Canales activos de prueba:
  - demo tipo WhatsApp,
  - widget web,
  - SaaS interno.

Fortalezas actuales:

- Clara entiende motivos frecuentes: cita, urgencia, presupuesto, ubicacion, doctores, especialidades, implantes, ortodoncia, estetica, higiene, trauma y encias.
- Ya no pide datos repetidos si el paciente los ha dado.
- Ya no mezcla cita normal con llamada de recepcion.
- Ya no recomienda tarjeta sanitaria.
- Ya no abre menu robotico cuando entiende el contexto.
- Agenda normal y urgencia tienen reglas separadas.
- Existen guardrails basicos, criterios criticos y tests de regresion.
- Si Clara ofrece huecos 1/2/3, responder con un numero conserva la hora ofrecida.
- Cancelar/cambiar cita ya no abre una cita nueva por error.
- Alta, reprogramacion y cancelacion de cita pueden disparar webhook a Make sin ceder control de agenda.
- Preguntas informativas frecuentes ya no caen en menu generico.

Limitaciones actuales:

- Los tests aun deben crecer hacia conversaciones largas multitema y casos reales importados de produccion.
- La agenda no esta conectada a un PMS real.
- Falta convertir el evaluador automatico en CI remoto obligatorio.
- Falta verificar manualmente recepcion real de email tras seleccionar cita.
- Falta probar en vivo los eventos `rescheduled` y `cancelled` de Make.
- Falta decidir proveedor definitivo de email transaccional para produccion.
- Falta panel de calidad conversacional.
- Falta prueba masiva con mensajes ambiguos, mal escritos, audios transcritos y cambios de tema.
- Falta handoff humano totalmente estructurado para recepcion.

## 2. Definicion de "Clara nivel 100"

Clara nivel 100 significa:

- Responde como una recepcionista dental formada, no como un bot.
- No inventa precios, doctores, horarios, sedes ni tratamientos.
- No diagnostica; orienta con prudencia y deriva al doctor.
- Sabe diferenciar informacion, cita normal, presupuesto, urgencia y emergencia.
- Pide datos uno a uno cuando corresponde.
- No repite datos que el paciente ya dio.
- Si agenda una cita normal, no dice despues que recepcion llamara.
- Si es urgencia o no hay huecos, escala de forma clara.
- Mantiene contexto aunque el paciente responda con mensajes cortos.
- Gestiona agenda real sin dobles reservas.
- Deja un resumen limpio para recepcion cuando escala.
- Su calidad se mide automaticamente con tests y metricas.

## 3. Metricas objetivo

Objetivo minimo para considerar Clara lista:

- 95% o mas en evaluador automatico.
- 0 errores criticos en 100 conversaciones de prueba.
- 0 invenciones de doctor, precio, sede u horario.
- 0 citas normales mezcladas con "te llamara recepcion".
- 0 recomendaciones de tarjeta sanitaria.
- 0 diagnósticos cerrados.
- 90% o mas de conversaciones informativas resueltas sin humano.
- 80% o mas de intentos de cita normal llevados a propuesta o pre-reserva.
- 100% de emergencias reales escaladas.
- 100% de escalados con resumen util para recepcion.

Errores criticos:

- Dar una cita en dia/hora distinta a lo pedido.
- Cambiar de doctor sin explicacion.
- Inventar disponibilidad.
- Diagnosticar como si fuera odontologo.
- No escalar dificultad para respirar/tragar, hinchazon importante o sangrado no controlado.
- Pedir datos sensibles sin consentimiento cuando corresponde.
- Confirmar cita sin datos minimos.

## 4. Fase 1 - Banco de conversaciones reales

Objetivo:

Crear un dataset de 100 a 150 conversaciones de prueba que represente casos reales de clinica dental.

Entregables:

- `tests/fixtures/clara-conversations/*.json`
- Conversaciones clasificadas por tipo.
- Resultado esperado por conversacion.
- Criterios de fallo por escenario.

Categorias:

- Saludos y primeras dudas.
- Ubicacion Murcia/Elche.
- Doctores y especialidades.
- Presupuestos.
- Implantes.
- Ortodoncia.
- Higiene.
- Blanqueamiento.
- Caries/empaste.
- Dolor dental.
- Diente o muela que se mueve.
- Traumatismo/golpe.
- Urgencias con inflamacion.
- Emergencias reales.
- Citas normales.
- Cambio/cancelacion de cita.
- Pacientes ambiguos.
- Mensajes con faltas.
- Mensajes partidos.
- Cambios de tema.
- Pacientes enfadados.

Criterio de finalizacion:

- Minimo 100 conversaciones versionadas.
- Cada conversacion tiene resultado esperado.
- Cada fallo real detectado por el usuario se convierte en fixture.

## 5. Fase 2 - Evaluador automatico 1-100

Objetivo:

Crear un evaluador que puntue cada conversacion con una nota objetiva.

Entregables:

- Script `scripts/evaluate-clara.ts`.
- Comando `npm run eval:clara`.
- Informe JSON y Markdown con resultados.
- Nota global de Clara.

Rubrica propuesta:

- Comprension de intencion: 15 puntos.
- Seguridad clinica: 20 puntos.
- Agenda y datos administrativos: 20 puntos.
- Coherencia conversacional: 15 puntos.
- Naturalidad y tono: 10 puntos.
- No invencion: 10 puntos.
- Handoff/escalado correcto: 10 puntos.

Reglas automaticas:

- Penalizar diagnosticos cerrados.
- Penalizar datos repetidos.
- Penalizar cita normal mas llamada de recepcion.
- Penalizar doctor inventado.
- Penalizar precio no autorizado.
- Penalizar menu robotico fuera de contexto.
- Penalizar no responder a lo preguntado.

Criterio de finalizacion:

- Evaluador ejecutable en CI/local.
- Nota total reproducible.
- Reporte claro con fallos y evidencias.

## 6. Fase 3 - Estado conversacional fuerte

Objetivo:

Hacer que Clara mantenga memoria operativa robusta durante toda la conversacion.

Estado minimo a persistir:

- Intencion activa.
- Motivo clinico.
- Nivel de triaje.
- Datos obtenidos:
  - consentimiento,
  - nombre y apellidos,
  - telefono,
  - sede,
  - disponibilidad.
- Ultima pregunta hecha por Clara.
- Dato pendiente.
- Precio ya dado.
- Direccion ya dada.
- Opciones de cita ya ofrecidas.
- Cita/pre-reserva ya creada.
- Si el caso esta escalado.

Entregables:

- Modelo de estado ampliado.
- Tests para respuestas cortas:
  - "si",
  - "no",
  - "Murcia",
  - "mañana",
  - "por la tarde",
  - "me vale",
  - "1",
  - "cambiar".

Criterio de finalizacion:

- Clara interpreta respuestas cortas segun contexto.
- No vuelve al menu generico si ya hay intencion activa.
- No repite preguntas ya respondidas.

## 7. Fase 4 - Agenda real nivel clinica

Objetivo:

Convertir la agenda en una fuente de verdad fiable.

Capacidades:

- Consultar huecos reales.
- Bloquear hueco temporalmente.
- Confirmar seleccion del paciente.
- Evitar doble reserva.
- Reprogramar.
- Cancelar.
- Diferenciar cita normal, urgencia y emergencia.
- Enrutar por sede, tratamiento y doctor.

Entregables:

- Servicio de disponibilidad.
- Bloqueo temporal de slots.
- Confirmacion por opcion 1/2/3.
- Tests de concurrencia basicos.
- Mensajes claros cuando no hay huecos.

Regla clave:

- Si hay cita normal propuesta o pre-reservada, Clara no dice "recepcion te llamara".
- Si no hay huecos o hay urgencia/escalado, Clara puede decir que recepcion contactara.

Criterio de finalizacion:

- 0 dobles reservas en tests.
- 0 citas creadas sin datos minimos.
- 0 incoherencias entre disponibilidad ofrecida y cita final.

## 8. Fase 5 - Guardrails post-respuesta

Objetivo:

No confiar solo en el modelo. Toda respuesta pasa por filtros antes de enviarse.

Guardrails a implementar:

- No diagnostico cerrado.
- No doctor inventado.
- No precio inventado.
- No sede inventada.
- No horario inventado.
- No tarjeta sanitaria.
- No llamada de recepcion tras cita normal.
- No pedir todos los datos juntos.
- No pedir datos ya dados.
- No mezclar Murcia/Elche.
- No saltar de trauma a pulpitis/absceso sin base.

Entregables:

- `src/lib/agent/guardrails.ts`
- Tests unitarios por guardrail.
- Metadata de respuesta: guardrails aplicados.

Criterio de finalizacion:

- Cada fallo historico tiene guardrail o test.
- El reporte indica cuando una respuesta fue corregida.

## 9. Fase 6 - Handoff humano profesional

Objetivo:

Cuando Clara escale, recepcion debe recibir un resumen claro y accionable.

Resumen minimo:

- Nombre.
- Telefono.
- Sede preferida.
- Disponibilidad.
- Motivo.
- Sintomas relevantes.
- Red flags.
- Tratamiento probable/orientativo.
- Lo que Clara ya pregunto.
- Lo que falta.
- Nivel de prioridad.
- Recomendacion de siguiente accion.

Entregables:

- Plantilla de handoff.
- Vista en SaaS para recepcion.
- Tests de resumen.

Criterio de finalizacion:

- Recepcion no tiene que releer toda la conversacion para actuar.
- Cada escalado tiene tarea y resumen.

## 10. Fase 7 - Pruebas por canal real

Objetivo:

Validar Clara donde se usara realmente.

Canales:

- Widget web.
- Demo WhatsApp.
- WhatsApp real via Meta.
- Voz/transcripcion.
- SMS si aplica.

Pruebas:

- iPhone Safari.
- Android Chrome.
- Desktop.
- Mensajes largos.
- Mensajes cortos.
- Mensajes partidos.
- Mala ortografia.
- Audios transcritos con errores.
- Paciente que cambia de tema.

Entregables:

- Checklist QA por canal.
- Capturas antes/despues.
- Incidencias convertidas en tests.

Criterio de finalizacion:

- 50 conversaciones reales simuladas por canal principal.
- 0 fallos criticos abiertos.

## 11. Fase 8 - Panel de calidad

Objetivo:

Medir rendimiento real de Clara en el SaaS.

Metricas:

- Conversaciones totales.
- Conversaciones resueltas por IA.
- Escalados.
- Citas propuestas.
- Citas confirmadas.
- Abandonos.
- Errores detectados.
- Guardrails activados.
- Tiempo medio hasta respuesta.
- Motivos mas frecuentes.
- Valor estimado capturado.

Entregables:

- Vista "Calidad de Clara".
- Filtros por canal, sede y fecha.
- Registro de fallos revisables.

Criterio de finalizacion:

- El usuario puede saber si Clara mejora o empeora.
- Cada fallo puede convertirse en test.

## 12. Fase 9 - Integraciones reales

Objetivo:

Pasar de demo robusta a operacion real.

Integraciones prioritarias:

- WhatsApp Meta.
- PMS dental.
- Calendario externo si aplica.
- Voz/transcripcion.
- Email/SMS recordatorios.

PMS:

- Leer pacientes.
- Leer citas.
- Crear pre-reservas.
- Confirmar citas.
- Cancelar/reprogramar.
- Sincronizar estado.

Criterio de finalizacion:

- Clara opera con datos reales.
- No hay divergencia entre SaaS y PMS.
- Hay logs y auditoria.

## 13. Fase 10 - Certificacion interna Clara 100

Objetivo:

Declarar una version estable con criterios objetivos.

Checklist:

- 150 conversaciones de test.
- Evaluador automatico >= 95/100.
- 0 errores criticos.
- 0 tests fallando.
- Agenda validada.
- Guardrails activos.
- Handoff humano listo.
- Panel de calidad operativo.
- QA en iPhone, Android y desktop.
- Prueba de 1 semana con conversaciones supervisadas.

Salida:

- Version `Clara 1.0 Operativa`.
- Informe de calidad.
- Lista de riesgos residuales.
- Plan de mejora continua.

## 14. Orden recomendado de ejecucion

1. Dataset de conversaciones.
2. Evaluador 1-100.
3. Tests para todos los fallos reales ya vistos.
4. Estado conversacional fuerte.
5. Guardrails post-respuesta.
6. Agenda real con bloqueo temporal.
7. Handoff humano.
8. QA multicanal.
9. Panel de calidad.
10. Integraciones reales.

## 15. Proxima accion recomendada

Orden inmediato recomendado:

1. Hacer una prueba viva creando una pre-ficha real desde Clara.
2. Incluir el enlace `/ficha/[codigo]` en el email de confirmacion de cita.
3. Incluir el enlace `/ficha/[codigo]` en la respuesta de Clara cuando corresponda.
4. Crear acciones de recepcion para pre-fichas: validar, fusionar, descartar.
5. Activar o confirmar activo el escenario de Make.
6. Hacer una prueba real completa: iniciar conversacion, elegir `1`, comprobar que se crea la cita y confirmar que llega el email.
7. Hacer una prueba de modificacion de cita y comprobar que solo sale el email de modificacion.
8. Hacer una prueba de cancelacion de cita y comprobar que solo sale el email de cancelacion.
9. Guardar cualquier fallo real como fixture nuevo antes de tocar mas logica.
10. Sustituir `prisma db push` en build por migraciones Prisma versionadas.
11. Subir el dataset de 103 a 150 conversaciones.
12. Elegir proveedor definitivo de email para produccion: Gmail temporal, Brevo, SendGrid o SMTP transaccional.
13. Preparar el siguiente bloque grande: WhatsApp Meta real, PMS dental real y panel de recepcion.
