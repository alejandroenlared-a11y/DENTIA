# NEW HOJA DE RUTA - DENTIA / PULSO + CLARA

Fecha: 17 de julio de 2026
Proyecto: Dentia AI / PULSO / Clara
Objetivo: construir el mejor producto dental nacional empezando por una cuna vendible, medible y rapida: recuperacion de ingresos + recepcion IA, sin caer todavia en construir un PMS completo.

---

## 0. Decision estrategica

La estrategia correcta no es empezar por el PMS completo.

La estrategia correcta es:

```text
PULSO + Clara
-> recuperacion de ingresos y huecos
-> clientes reales pagando
-> aprendizaje operativo dental
-> base instalada
-> PMS solo despues de validar demanda y caja
```

El PMS sigue siendo la vision grande, pero no debe dirigir el trabajo inmediato.

La fase activa debe ser:

```text
FASE ACTIVA: A
Producto vendible: PULSO + Clara Recepcion IA
No construir PMS completo antes de superar Puerta 1.
```

---

## 1. Posicionamiento nacional

### Promesa comercial

```text
Recuperamos pacientes, presupuestos y huecos perdidos sin cambiar tu software actual.
```

### Lo que NO vendemos todavia

```text
No vendemos "un nuevo PMS dental".
No pedimos migracion.
No tocamos historia clinica.
No emitimos facturas.
No obligamos a cambiar el software actual de la clinica.
```

### Lo que SI vendemos ahora

```text
Una capa inteligente encima del sistema actual de la clinica.
```

Capacidades:

- Captura leads.
- Atiende primeras conversaciones.
- Pide datos en orden.
- Crea pre-ficha.
- Detecta duplicados.
- Propone citas.
- Confirma, modifica y cancela citas.
- Recupera presupuestos dormidos.
- Reactiva pacientes.
- Gestiona recalls.
- Rellena huecos.
- Mide euros recuperados.

---

## 2. Producto Fase A: PULSO + Clara

PULSO debe absorber Clara como motor operativo.

```text
PULSO = recuperacion de ingresos
Clara = recepcion IA + captura + agenda + seguimiento
```

### Modulos incluidos en Fase A

- Recepcion IA.
- Pre-fichas del chat.
- Confirmacion/modificacion/cancelacion de citas.
- Emails transaccionales.
- Portal documental ligero del paciente.
- Presupuestos dormidos.
- Recalls y reactivacion.
- Confirmaciones de cita.
- Lista de espera simple.
- Panel ROI.
- Bandeja de respuestas/tareas.
- Consentimientos de comunicacion.
- Auditoria operativa.

### Modulos excluidos de Fase A

- Odontograma.
- Periodontograma.
- Historia clinica completa.
- Facturacion a pacientes.
- Imagen/radiologia.
- Inventario.
- Laboratorio.
- Receta.
- PMS multicentro completo.
- IA diagnostica.
- Portal completo del paciente.

---

## 3. Estado actual real

### Ya hecho

- [x] Clara conversa en demo tipo WhatsApp y widget.
- [x] Clara pide datos en mensajes separados.
- [x] Orden actual: nombre y apellidos -> email -> telefono -> sede -> opciones de cita.
- [x] Clara valida email.
- [x] Clara propone 3 huecos directamente.
- [x] El paciente puede responder `1`, `2` o `3`.
- [x] El SaaS crea cita al elegir opcion.
- [x] Make recibe eventos de cita:
  - `created`
  - `rescheduled`
  - `cancelled`
- [x] Make tiene router con 3 Gmail:
  - confirmacion,
  - modificacion,
  - cancelacion.
- [x] Historial de citas visible en SaaS.
- [x] Pre-fichas del chat implementadas.
- [x] Codigo de acceso tipo `DENTIA-XXXXXX`.
- [x] Deteccion de duplicados por email/telefono.
- [x] Portal ligero `/ficha/[codigo]` protegido por email o telefono.
- [x] Portal ligero del paciente convertido en ficha documental, sin mostrar conversacion.
- [x] Ficha del paciente muestra citas solicitadas/registradas.
- [x] Ficha del paciente prepara bloques para presupuestos/solicitudes, tratamientos y facturas.
- [x] Payload Make incluye `patientPortalUrl` y `patientIntake`.
- [x] Emails Make incluyen enlace a la ficha del paciente.
- [x] Recepcion interna ve pre-fichas con conversacion, citas asociadas y duplicados.
- [x] Recepcion puede crear tarea desde una pre-ficha.
- [x] Recepcion puede marcar pre-ficha como duplicado en revision, vinculada o descartada.
- [x] Pre-fichas movidas conceptualmente a `Conversaciones`, no a `Pacientes`.
- [x] `Pacientes` convertido en registro maestro con busqueda, alta, baja logica y acceso a ficha 360.
- [x] Ficha 360 interna basica creada con datos, citas, tratamientos, presupuestos/facturacion y placeholders clinicos.
- [x] Base local sincronizada.
- [x] Base Neon produccion sincronizada.
- [x] Produccion desplegada en `https://dentia.avelkia.es`.
- [x] Evaluador Clara: 100/100, 620/620, 0 fallos criticos.
- [x] Tests relevantes de pre-fichas, agente y notificaciones pasando.

### Feedback UX actual

- [ ] La estructura actual de menus/submenus no esta validada por el usuario.
- [ ] El usuario ve la organizacion actual como demasiado liosa.
- [ ] Antes de seguir anadiendo funcionalidades, hay que redefinir arquitectura de informacion.
- [ ] Pausadas nuevas ampliaciones visuales grandes hasta recibir nueva propuesta de menus/submenus.

### Riesgos actuales

- [x] Make/Gmail validado para creacion de cita con email real controlado.
- [x] El enlace de ficha se entrega al paciente desde el email.
- [ ] Falta probar end-to-end modificacion de cita real.
- [ ] Falta probar end-to-end cancelacion de cita real.
- [x] Las pre-fichas ya tienen acciones operativas basicas de recepcion: revisar duplicado, marcar vinculada, descartar y crear tarea.
- [ ] Falta accion real de fusionar pre-ficha con paciente existente sin duplicar.
- [ ] Falta vista de auditoria visible para cambios de pre-ficha.
- [ ] Falta modelo clinico real para alergias, enfermedades, medicacion y alertas.
- [ ] Falta ruta dedicada de ficha paciente completa cuando crezca la ficha 360.
- [x] `prisma db push` ya no esta en `build`; queda pendiente cerrar baseline Neon y activar `migrate deploy` en Vercel.
- [ ] Todavia no existe importador CSV de presupuestos dormidos.
- [ ] Todavia no existe panel ROI real.
- [ ] Todavia no existe motor de secuencias con consentimiento/frecuencia/idempotencia.
- [ ] Riesgo UX: producto tecnicamente funcional pero con organizacion de menu poco clara.

---

## 4. Puertas de validacion

### Puerta 1 - Validacion de venta

Objetivo:

```text
5 clinicas pagando PULSO + Clara en 90 dias de venta activa.
```

Criterios:

- 5 clinicas con pago real.
- No cuentan demos gratuitas.
- No cuentan favores.
- Debe haber uso real de al menos un flujo:
  - presupuestos dormidos,
  - recepcion IA,
  - recuperacion de citas,
  - recalls.

Si no se supera:

```text
STOP PMS.
Revisar oferta, canal, precio o vertical.
```

### Puerta 2 - Traccion

Objetivo:

```text
20 clinicas activas, churn <2% mensual, ROI demostrado.
```

Criterios:

- Uso semanal.
- Gerente ve valor.
- Recepcion no lo abandona.
- Datos suficientes para casos de exito.
- Al menos 5 clinicas piden explicitamente mas sistema operativo/PMS.

### Puerta 3 - PMS beta

Objetivo:

```text
3-5 clinicas operan 60 dias en PMS beta sin volver al sistema anterior.
```

Antes de esta puerta, no se lanza PMS nacional.

---

## 5. Roadmap inmediato: 0-14 dias

Objetivo:

Cerrar el flujo PULSO + Clara minimo vendible.

### 5.0. Redefinicion UX / Arquitectura de informacion

- [ ] Definir menu principal definitivo.
- [ ] Definir submenus por modulo.
- [ ] Decidir donde vive cada flujo:
  - recepcion IA,
  - conversaciones,
  - pre-fichas,
  - pacientes,
  - ficha clinica,
  - agenda,
  - tratamientos,
  - presupuestos,
  - facturacion,
  - marketing/recuperacion,
  - configuracion.
- [ ] Revisar si `Conversaciones` debe llamarse `Recepcion IA`.
- [ ] Revisar si `Pacientes` debe abrir por defecto listado maestro o ficha clinica.
- [ ] Definir estructura de ficha paciente:
  - resumen,
  - citas,
  - historial clinico,
  - odontograma,
  - tratamientos,
  - presupuestos,
  - facturas,
  - documentos,
  - consentimientos,
  - comunicaciones.
- [ ] Crear wireframe textual antes de volver a escribir codigo de UI.
- [ ] No seguir ampliando pantallas hasta cerrar esta seccion.

### 5.1. Citas y email

- [x] Validar Make activo.
- [x] Hacer prueba real con email controlado.
- [x] Elegir opcion `1`, `2` o `3`.
- [x] Confirmar que se crea cita.
- [x] Confirmar que llega email de confirmacion al paciente.
- [x] Confirmar que el email lleva enlace a ficha.
- [x] Confirmar que la ficha abre con codigo `DENTIA-XXXXXX`.
- [ ] Probar modificacion real.
- [ ] Probar cancelacion real.
- [ ] Verificar que cada ruta de Make se dispara sola con eventos reales.

### 5.2. Enlace de ficha

- [x] Incluir `patientIntake.accessCode` en payload de Make.
- [x] Incluir `patientPortalUrl` en payload de Make.
- [x] Anadir enlace de ficha en email de confirmacion.
- [x] Anadir enlace de ficha en email de modificacion.
- [x] Anadir enlace de ficha en email de cancelacion.
- [x] Quitar conversacion de la ficha publica del paciente.
- [x] Mostrar en ficha publica solo informacion documental:
  - datos registrados,
  - citas,
  - presupuestos/solicitudes,
  - tratamientos,
  - facturas.
- [ ] Decidir si Clara tambien envia el enlace por chat.
- [x] Crear vista interna en `Pacientes` donde recepcion si pueda ver la conversacion vinculada a la pre-ficha.
- [x] Mover esta vista interna de pre-fichas a `Conversaciones`, que es su ubicacion correcta.

### 5.3. Pre-fichas operativas

- [x] Mostrar resumen por estado:
  - nuevas,
  - duplicadas,
  - vinculadas,
  - descartadas.
- [x] Mostrar datos capturados por Clara.
- [x] Mostrar origen/canal de la pre-ficha.
- [x] Mostrar conversacion interna reciente desde la tarjeta.
- [x] Mostrar citas asociadas desde la tarjeta.
- [x] Crear accion de recepcion para marcar duplicado en revision.
- [x] Crear accion de recepcion para marcar vinculada si ya tiene paciente.
- [x] Crear accion de recepcion para descartar.
- [x] Crear accion de recepcion para generar tarea.
- [ ] Crear accion real de fusionar pre-ficha con paciente existente.
- [ ] Crear vista filtrada:
  - nuevas,
  - duplicadas,
  - vinculadas,
  - descartadas.
- [ ] Crear auditoria visible de cambios de pre-ficha.

### 5.5. Registro maestro de pacientes

- [x] Separar `Pacientes` de la bandeja de recepcion IA.
- [x] Crear busqueda por nombre, telefono, email, fiscal, tratamiento y estado.
- [x] Crear accion de alta desde el propio modulo.
- [x] Crear baja logica sin borrar historial.
- [x] Crear activacion de pacientes dados de baja.
- [x] Crear ficha 360 interna basica:
  - resumen,
  - datos personales,
  - citas,
  - tratamiento activo,
  - facturas,
  - placeholders clinicos.
- [ ] Crear edicion completa de datos personales/fiscales.
- [ ] Crear modelo clinico real:
  - alergias,
  - enfermedades,
  - medicacion,
  - alertas.
- [ ] Crear odontograma solo cuando el registro maestro este consolidado.

### 5.4. Seguridad y base

- [x] Sustituir `prisma db push` en build por migraciones versionadas.
- [ ] Cerrar baseline Neon y activar `prisma migrate deploy` en Vercel.
- [ ] Revisar que `/ficha/[codigo]` no expone datos sin verificacion.
- [ ] Registrar acceso a ficha publica.

---

## 6. Roadmap corto: 15-30 dias

Objetivo:

Convertir Clara en producto comercial PULSO, no solo demo.

### 6.1. Importador de presupuestos dormidos

- [ ] Plantilla CSV descargable.
- [ ] Importacion con validacion fila a fila.
- [ ] Informe de errores.
- [ ] Campos minimos:
  - paciente,
  - telefono,
  - email opcional,
  - importe,
  - fecha presentacion,
  - etiqueta generica,
  - estado.
- [ ] Prohibir importacion silenciosa.
- [ ] Detectar duplicados.
- [ ] Crear presupuesto dormido vinculado a paciente/pre-ficha.

### 6.2. Consentimientos de comunicacion

- [ ] Consentimiento por canal:
  - WhatsApp,
  - email,
  - SMS,
  - llamada.
- [ ] Evidencia del consentimiento.
- [ ] Baja automatica por `STOP`, `BAJA`, equivalente.
- [ ] Bloquear envio si no hay consentimiento.
- [ ] Bloquear envio fuera de horario.
- [ ] Bloquear frecuencia excesiva.

### 6.3. Motor de secuencias v1

- [ ] Secuencia presupuestos dormidos:
  - D+3 WhatsApp/email suave.
  - D+7 tarea llamada.
  - D+14 alternativa/financiacion.
  - D+30 cierre y motivo.
- [ ] Idempotencia por paso.
- [ ] Cualquier respuesta detiene secuencia.
- [ ] Crear tarea humana si hay respuesta.
- [ ] Registro en auditoria.

### 6.4. Bandeja y tareas

- [ ] Bandeja de respuestas entrantes.
- [ ] Clasificacion IA:
  - interesado,
  - quiere cita,
  - objecion precio,
  - financiacion,
  - no interesado,
  - baja,
  - humano.
- [ ] Tarea automatica para recepcion.
- [ ] Boton de resultado:
  - cita conseguida,
  - presupuesto aceptado,
  - perdido,
  - no localizable.

---

## 7. Roadmap 30-60 dias

Objetivo:

Medir dinero recuperado y preparar venta repetible.

### 7.1. Panel ROI

- [ ] Euros recuperados este mes.
- [ ] Presupuestos aceptados atribuidos.
- [ ] Citas rellenadas.
- [ ] No-shows evitados.
- [ ] Huecos recuperados.
- [ ] Embudo:
  - presentado,
  - seguimiento,
  - respondio,
  - cita,
  - aceptado,
  - perdido.
- [ ] Cada cifra abre listado filtrado.
- [ ] Export mensual PDF/HTML.
- [ ] Nada calculado por LLM.

### 7.2. Lista de espera simple

- [ ] Crear candidatos.
- [ ] Preferencias horarias.
- [ ] Tratamiento/motivo.
- [ ] Prioridad.
- [ ] Consentimiento de contacto.
- [ ] Cuando se libera hueco, sugerir candidatos.
- [ ] Oferta con caducidad.
- [ ] No prometer exclusividad simultanea a varios pacientes.

### 7.3. Recalls y reactivacion

- [ ] Importar pacientes inactivos.
- [ ] Crear recall de revision/higiene.
- [ ] Secuencia corta.
- [ ] Resultado cita conseguida.
- [ ] Atribucion a ROI.

### 7.4. Comercial

- [ ] Definir oferta:
  - setup,
  - cuota mensual,
  - garantia 90 dias.
- [ ] Crear demo con datos sinteticos realistas.
- [ ] Crear pitch de 15 minutos.
- [ ] Crear landing simple.
- [ ] Crear PDF de venta.
- [ ] Crear contrato/DPA RGPD.
- [ ] Crear checklist onboarding.

---

## 8. Roadmap 60-90 dias

Objetivo:

Conseguir 5 clinicas pagando.

### 8.1. Venta activa

- [ ] 100 contactos/semana.
- [ ] 20 demos/mes.
- [ ] 5 pilotos/mes.
- [ ] 5 clinicas pagando en 90 dias.

Canales:

- Red AVELKIA.
- Clinicas Murcia/Alicante.
- Asesorias fiscales de clinicas.
- Laboratorios protesicos.
- Depositos dentales.
- Colegios profesionales.
- Cold WhatsApp/email con auditoria personalizada.

### 8.2. Casos de exito

- [ ] Medir ROI por clinica.
- [ ] Caso con nombre si autorizan.
- [ ] Caso anonimo si no autorizan.
- [ ] Antes/despues:
  - presupuestos dormidos,
  - citas recuperadas,
  - huecos rellenados.

### 8.3. Operacion

- [ ] Formacion 2 horas por rol.
- [ ] Reuniones semana 1, 2 y 4.
- [ ] Soporte medido.
- [ ] Registrar dudas recurrentes.
- [ ] Convertir dudas en producto/documentacion.

---

## 9. Roadmap Fase A+ despues de Puerta 1

Objetivo:

Escalar a 20-30 clinicas y preparar decision PMS.

- [ ] Mejorar multi-tenant real.
- [ ] Mejorar roles:
  - gerente,
  - recepcion,
  - AVELKIA admin.
- [ ] Mejorar auditoria.
- [ ] Endurecer RGPD.
- [ ] Mejorar integracion WhatsApp Meta real.
- [ ] Sustituir Gmail por proveedor transaccional:
  - Brevo,
  - SendGrid,
  - SMTP dominio clinica.
- [ ] Crear motor de plantillas.
- [ ] Crear configuracion por clinica.
- [ ] Crear analitica de uso interna.
- [ ] Documentar procesos reales observados.
- [ ] Entrevistas/shadowing con clientes PULSO.

---

## 10. Fase B: PMS nucleo solo si se superan puertas

No iniciar Fase B hasta:

- [ ] Puerta 1 superada.
- [ ] Puerta 2 superada.
- [ ] Demanda explicita de PMS.
- [ ] Caja o financiacion para 12+ meses.
- [ ] Consejo clinico remunerado.

Orden de PMS si llega el momento:

1. Tenancy, usuarios, roles, auditoria.
2. Paciente y relaciones.
3. Agenda.
4. Ficha paciente.
5. Historia clinica minima.
6. Odontograma por eventos.
7. Planes/presupuestos.
8. Motor fiscal tercero conforme RRSIF.
9. Cobros.
10. Comunicaciones.
11. Migracion desde incumbentes.

---

## 11. Lo que hay que quitar o congelar

### Quitar del foco inmediato

- PMS completo.
- Odontograma.
- Periodontograma.
- Imagen/radiologia.
- Inventario.
- Laboratorio.
- Facturacion propia.
- IA clinica avanzada.
- Analitica natural.
- Portal paciente completo.

### Mantener como vision futura

- PMS nacional.
- Motor de migracion.
- Mudanza garantizada.
- VERI*FACTU como arma comercial 2027.
- Odontograma superior.
- Historia clinica con trazabilidad.
- Motor de planes de tratamiento.

---

## 12. Cambios recomendados sobre el documento maestro

### Cambiar

- Integrar Clara explicitamente dentro de PULSO.
- Adaptar el stack del documento al stack real actual:
  - Next.js,
  - TypeScript,
  - Prisma,
  - PostgreSQL/Neon,
  - Vercel,
  - Make provisional.
- Separar "portal paciente completo" de "ficha ligera PULSO".
- Convertir las puertas de validacion en tablero visible.

### Anadir

- Modulo `Clara Recepcion IA`.
- Modulo `Pre-fichas del chat`.
- Modulo `Ficha ligera del paciente`.
- Modulo `Acciones de recepcion sobre pre-fichas`.
- Metricas internas de venta.
- Playbook comercial semanal.
- Plan de marca y busqueda OEPM/EUIPO.
- Plan de migraciones Prisma versionadas.

### Quitar

- Cualquier obligacion de reescribir PULSO en Supabase/Vite.
- Cualquier construccion PMS antes de Puerta 1.
- Cualquier promesa clinica regulada en la venta inicial.

---

## 13. Metricas norte

### Para la clinica

- Euros recuperados.
- Presupuestos recuperados.
- Citas recuperadas.
- Huecos rellenados.
- No-shows evitados.
- Tiempo de respuesta.
- Pacientes reactivados.

### Para AVELKIA

- Contactos semanales.
- Demos realizadas.
- Pilotos iniciados.
- Clinicas pagando.
- Tiempo de onboarding.
- Coste de soporte por clinica.
- Churn.
- MRR.
- LTV/CAC.
- Casos de exito publicados.

### Para producto

- Conversaciones completadas por Clara.
- Pre-fichas creadas.
- Duplicados detectados.
- Citas creadas.
- Emails entregados.
- Fallos de Make/email.
- Secuencias pausadas por respuesta.
- Tareas creadas.
- ROI atribuido.

---

## 14. Riesgos principales

### Riesgo 1: construir demasiado

Mitigacion:

- Fase activa visible.
- PMS congelado.
- Cada tarea debe mapear a PULSO o Clara.

### Riesgo 2: no demostrar ROI

Mitigacion:

- Panel ROI antes de ampliar funcionalidades.
- Casos de exito reales.
- Seguimiento mensual.

### Riesgo 3: RGPD/comunicaciones

Mitigacion:

- Consentimiento por canal.
- No incluir datos de salud en mensajes.
- Auditoria.
- Contrato encargado tratamiento.

### Riesgo 4: dependencia Make/Gmail

Mitigacion:

- Make solo provisional.
- Pasar a proveedor transaccional.
- Eventos internos/outbox en Fase A+.

### Riesgo 5: marca DENTIA

Mitigacion:

- Buscar OEPM/EUIPO.
- Mantener nombre configurable.
- Preparar alternativa comercial.

### Riesgo 6: base de datos sin migraciones formales

Mitigacion:

- Migraciones Prisma versionadas creadas.
- `db push` quitado del build.
- Pendiente: resolver baseline Neon y activar `migrate deploy` como paso productivo controlado.

---

## 15. Definition of Done para cualquier tarea nueva

Una tarea no esta cerrada si solo "se ve".

Debe tener:

- Criterio de aceptacion.
- Validacion backend.
- UI clara.
- Estado vacio.
- Estado error.
- Auditoria si cambia datos.
- Tests relevantes.
- Typecheck.
- Lint.
- Build.
- Documentacion en memoria/hoja de ruta si cambia estrategia.

---

## 16. Siguiente bloque recomendado

Orden exacto:

1. [x] Devolver `accessCode` y `patientPortalUrl` en eventos Make.
2. [ ] Meter enlace de ficha en emails.
3. [ ] Probar email real end-to-end.
4. [ ] Crear acciones de pre-ficha: validar, fusionar, descartar.
5. [ ] Crear migracion Prisma versionada.
6. [ ] Crear importador CSV de presupuestos dormidos.
7. [ ] Crear consentimientos de comunicacion por canal.
8. [ ] Crear motor de secuencias v1.
9. [ ] Crear panel ROI.
10. [ ] Preparar oferta comercial y vender.

---

## 17. Frase guia

```text
No estamos construyendo todavia el PMS dental mas grande de Espana.
Estamos construyendo la forma mas rapida, medible y segura de recuperar ingresos para clinicas dentales.
Si eso vende, el PMS nace con clientes, datos y confianza.
```
