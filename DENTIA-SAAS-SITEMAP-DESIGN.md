# DENTIA SaaS - Sitemap y Sistema de Diseno

## Objetivo

Redisenar el SaaS sobre los cimientos existentes sin tocar la logica de Clara, el agente recepcionista ni sus endpoints. El producto debe sentirse como software clinico profesional: compacto, sobrio, rapido de escanear y preparado para operacion diaria de una clinica dental.

## Principios

- Mantener la logica de negocio existente en `src/lib`, `src/app/actions.ts` y APIs.
- Tratar el redisenyo como una capa de producto: navegacion, shell, vistas y componentes visuales.
- Evitar HTML prototipo copiado directamente desde `saas new design`; reconstruir patrones en React/Next.
- Usar datos reales existentes cuando el modelo ya existe.
- Usar datos visuales locales solo en modulos que aun no tienen persistencia especifica.
- Mantener radios pequenos, bordes finos, ausencia de gradientes decorativos y densidad alta.

## Sistema Visual Clinical Precision

Referencia principal: `saas new design/clinical_precision/DESIGN.md`.

Tokens base:

- Fondo: `#F5F6F7`
- Superficie: `#FFFFFF`
- Superficie secundaria: `#F0F2F4`
- Borde: `#D9DEE3`
- Borde suave: `#E8EBEE`
- Texto principal: `#17212B`
- Texto secundario: `#5C6873`
- Accion principal: `#005A8C`
- Exito: `#278561`
- Aviso: `#B37D00`
- Error: `#C53030`

Layout base:

- Sidebar desktop: `224px`
- Header desktop: `52px`
- Radio general: `4-6px`
- Boton compacto: `30-32px`
- Fila de tabla: `32-38px`
- Tipografia operativa: `Inter`, `11-12px`

Implementacion:

- Contrato de sitemap: `src/lib/app-navigation.ts`
- Shell del SaaS: `src/components/saas-app-shell.tsx`
- Capa visual: `src/app/clinical-design.css`
- Vistas de producto: `src/app/page.tsx`

## Sitemap

### Operacion

- Inicio: centro de control general, agenda, tareas, pipeline y finanzas resumidas.
- Agenda: agenda semanal/mensual, creacion de cita, bloqueos, recordatorios.
- Pacientes: listado maestro, busqueda, ficha 360, historial, alta y estados.
- Clinica: encuentros del dia, workspace clinico, alertas y cierre clinico.
- Tratamientos: catalogo operativo y base para planes de tratamiento.

### Crecimiento

- Bandeja omnicanal: conversaciones, pre-fichas, derivaciones y respuesta manual.
- Recepcionista IA: estado, demo entrenada, logs y canales del agente existente.
- Revision IA: validacion humana de sugerencias, escalados y pre-fichas.
- CRM: leads, pipeline comercial, campanas y valor estimado.
- Automatizaciones: reglas visuales para recordatorios, pagos, urgencias y CRM.

### Gestion

- Finanzas: resumen financiero, facturas, cobros, prevision y cumplimiento fiscal.
- Documentos: biblioteca documental, consentimientos y firma.
- Inventario: stock clinico, alertas y pedidos.
- Laboratorio: trabajos de laboratorio, fases y demoras.
- Equipo: directorio, roles, horarios y capacidad.
- Analitica: cuadro ejecutivo y constructor de informe.
- Radiologia: visor radiologico y observaciones.
- Configuracion: tenant, fiscalidad, API, usuarios y auditoria.

## Estado De Implementacion

Base ya implementada:

- Sitemap completo conectado al menu.
- Shell SaaS reusable con sidebar, topbar, buscador, sedes y accion principal.
- Capa visual Clinical Precision.
- Nuevas vistas base: Clinica, CRM, Documentos, Inventario, Laboratorio, Equipo, Analitica, Automatizaciones, Radiologia y Revision IA.
- Vistas existentes conservadas: Inicio, Agenda, Bandeja, Recepcionista IA, Pacientes, Tratamientos, Colas, Finanzas y Configuracion.

Pendiente de profundizar:

- Convertir cada modulo visual nuevo en funcionalidad persistente cuando tenga modelo propio.
- QA visual autenticado con Postgres activo.
- Sustituir gradualmente clases antiguas por componentes UI compartidos.
- Dividir `src/app/page.tsx` por modulos cuando el redisenyo este validado visualmente.

## Regla Intocable

No modificar `src/lib/agent/*` ni alterar el comportamiento de Clara salvo peticion explicita. La recepcionista IA es una capacidad aprobada por cliente; solo se puede actualizar su contenedor visual dentro del SaaS.
