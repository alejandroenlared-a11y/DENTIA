# Dentia Operations Runbook

Fecha: 19 julio 2026

## Despliegue

- GitHub: `https://github.com/alejandroenlared-a11y/DENTIA.git`
- Rama productiva: `main`
- Vercel: despliega automaticamente cada push a `main`.
- Checks esperados:
  - `Vercel - dentia`
  - `Vercel - dentia-hu6t`
- Dominio principal: `https://dentia.avelkia.es`

Validacion local antes de push:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Para cambios de Clara:

```bash
npm run quality:release
```

## Prisma y Neon

Estado actual:

- `npm run build` ejecuta `prisma generate && next build`.
- `db push` no se ejecuta durante builds de Vercel.
- Migracion baseline local: `prisma/migrations/0_init/migration.sql`.
- Pendiente antes de nuevos cambios de schema: resolver/aplicar baseline en Neon produccion y activar `prisma migrate deploy` en Vercel.

Comandos seguros:

```bash
npm run db:generate
npm run deploy:db
```

Reglas:

- No usar `prisma db push` contra produccion.
- No guardar ni pegar `DATABASE_URL` productiva en documentacion, commits o chats.
- Si cambia `prisma/schema.prisma`, crear migracion versionada y probarla en local antes de despliegue.
- Activar `migrate deploy` en Vercel solo cuando Neon tenga la baseline marcada/aplicada correctamente.

## Backup y Restore Neon

Checklist antes de datos reales:

1. Confirmar que Neon tiene backups/PITR activos para la base productiva.
2. Documentar ventana de retencion contratada en el proyecto de Neon.
3. Hacer un restore de prueba a una rama/base temporal.
4. Ejecutar `prisma migrate status` contra la base restaurada.
5. Verificar login, dashboard y una ficha paciente en entorno temporal.
6. Documentar fecha, resultado y responsable de la prueba.

Restore de emergencia:

1. Congelar despliegues y pausar acciones que escriban en BD si hay riesgo de corrupcion.
2. Crear rama/restore en Neon desde el punto temporal anterior al incidente.
3. Apuntar un entorno temporal de Vercel a la BD restaurada.
4. Validar integridad funcional y datos criticos.
5. Promocionar la BD restaurada o cambiar `DATABASE_URL` productiva segun el procedimiento de Neon.
6. Rotar secretos si el incidente implica exposicion.
7. Registrar el incidente en `MEMORIA_DENTAL.MD`.

## Sentry

Variables en Vercel:

```bash
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

Notas:

- `sendDefaultPii` esta desactivado.
- Replay esta desactivado para evitar capturar pantallas con datos sensibles.
- `SENTRY_AUTH_TOKEN` solo sirve para subir source maps; mantenerlo como secreto en Vercel.
- Verificar primer evento con un error controlado en Preview, no en produccion con pacientes reales.

## Rate Limit Distribuido

Variables opcionales en Vercel:

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Comportamiento:

- Si Upstash esta configurado, API publica y webhooks usan Redis REST para limites distribuidos.
- Si Upstash no esta configurado o falla, el sistema vuelve al limitador en memoria y registra warning.
- El fallback mantiene desarrollo local simple, pero produccion debe usar Upstash antes de trafico real.

## Admin

`/admin` ya no acepta `?token=...`.

Requisitos:

- Usuario autenticado.
- Rol `OWNER`.
- Email incluido en `DENTIA_ADMIN_EMAILS` en produccion.

Variable:

```bash
DENTIA_ADMIN_EMAILS=alejandro@dentia.ai
```

En desarrollo, si `DENTIA_ADMIN_EMAILS` no existe, un `OWNER` puede entrar para no bloquear QA local.
