# HANDOFF — 19 julio 2026

## Estado actual

- `HOJA-DE-RUTA-SAAS-DENTAL.md` reescrita por completo esta sesión. Es la fuente de verdad estratégica: camino directo (sección 0), estado real, fases renumeradas (Sprint 1/2, Fases B-E), deuda técnica crítica (sección 8), próximos pasos (sección 14).
- Proyecto: SaaS dental funcional en producción (`https://dentia.avelkia.es`, Vercel desde GitHub `main`, BD Neon). Clara (agente IA) evaluada 100/100, módulo protegido — NO tocar sin petición explícita.
- Working tree limpio al inicio de esta fase. La hoja de ruta y memoria operativa ya fueron commiteadas en sesiones posteriores.
- Cliente piloto: Ruiz Estrada (Murcia + Elche). **Agosto cerrado** → hito crítico: Clara viva en WhatsApp real antes del 1 de agosto.

## Decisiones tomadas

1. Camino directo acordado: piloto WhatsApp → agosto captura autónoma → hardening septiembre → 10 clientes de pago → voz + PMS 2027. Tarea que no acerca el hito activo no se hace.
2. Estrategia PULSO+Clara vigente: capa de recuperación de ingresos sobre el software actual de la clínica, NO PMS completo.
3. Orden de ataque inmediato (propuesto al usuario; pendiente su "adelante" explícito):
   - **Usuario**: credenciales Meta WhatsApp Cloud (bloqueante nº1; solo él puede — Meta Business → `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` → Vercel). Webhook `/api/whatsapp/meta` ya listo.
   - **Claude**: migraciones Prisma versionadas (deuda §8.1 — `build` ya no hace `prisma db push`; falta cerrar baseline Neon y activar `migrate deploy` en Vercel).
   - Después juntos: prueba E2E Make (conversación → opción 1/2/3 → email real recibido → ficha `/ficha/DENTIA-XXXXXX`).

## Archivos tocados

- `HOJA-DE-RUTA-SAAS-DENTAL.md` — reescrita entera (estrategia, estado real, deuda técnica, fases con gates, GTM, riesgos). Sin commitear.
- `HANDOFF.md` — este archivo.

## Tarea en curso

- **Migración a Prisma versionado: HECHA en local y commiteada.** Pendiente el paso final de producción (Neon) y activar `migrate deploy` en Vercel cuando la baseline esté resuelta.

Completado (fase 1 — desplegada):
- Baseline `prisma/migrations/0_init/migration.sql` generada (629 líneas) y marcada como aplicada en el postgres local (docker, puerto 56321). `prisma migrate status` local: up to date.
- `package.json`: `build` ahora es `prisma generate && next build` — **`db push` eliminado del build**. Riesgo directo de `db push` en cada deploy cerrado; falta automatizar migraciones productivas con `migrate deploy`.
- `quality:release` completo OK (eval Clara + lint + typecheck + 160 tests + build).
- Decisión: NO añadir aún `migrate deploy` al build de Vercel. Motivo: Neon producción no tiene la baseline marcada como aplicada; un `migrate deploy` intentaría crear tablas existentes, fallaría el deploy y dejaría una migración "failed" registrada en Neon (requeriría `migrate resolve --rolled-back`). Fase 2 lo activa tras resolver la baseline en Neon.
- Obstáculo documentado: mcp-sentinel bloquea (CRITICAL, sin allowlist efectiva — probado 9-jul) todo comando/edición que referencie rutas de ficheros de entorno o el nombre de la variable de BD. Claude no puede ejecutar el resolve contra Neon.

## SIGUIENTE PASO (fase 2 — requiere al usuario, 2 minutos)

1. Usuario ejecuta en la raíz del proyecto, exportando la variable de BD con la URL de Neon producción (está en Vercel → Settings → Environment Variables, o en el fichero de entorno productivo local del 16 jul):
   `npx prisma migrate resolve --applied 0_init`
   Verificación: `npx prisma migrate status` contra producción debe decir "Database schema is up to date!".
2. Usuario borra los ficheros de entorno productivos locales (protocolo MEMORIA_DENTAL; sentinel impide a Claude borrarlos).
3. Claude entonces: añadir `"vercel-build": "prisma migrate deploy && prisma generate && next build"` a `package.json` (Vercel lo usa con prioridad sobre `build`), commit, push, verificar checks.
4. Después: credenciales Meta WhatsApp (bloqueante nº1 del hito de agosto, solo el usuario) y prueba E2E Make.

Contexto necesario para retomar: leer sección 8 (deuda técnica) y sección 14 (próximos pasos) de `HOJA-DE-RUTA-SAAS-DENTAL.md`, y las reglas operativas al final de `MEMORIA_DENTAL.MD` (protocolo Neon, no tocar Clara, dev server y build no simultáneos).
