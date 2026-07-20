# Escenario Make - Emails de citas Dentia

Objetivo: Dentia mantiene el calendario nativo como fuente de verdad y Make solo envia emails al paciente cuando Dentia crea, modifica o cancela una cita.

## 1. Crear el webhook en Make

1. En Make, crea un escenario nuevo.
2. Primer modulo: `Webhooks > Custom webhook`.
3. Nombre recomendado: `Dentia - appointment events`.
4. Copia la URL generada por Make.
5. En Vercel, crea esta variable de entorno:

```env
MAKE_APPOINTMENT_WEBHOOK_URL=https://hook.eu2.make.com/xxxxx
```

6. Redeploy del proyecto en Vercel tras guardar la variable.

Dentia enviara eventos a ese webhook cuando ocurra:

- `created`: cita creada.
- `rescheduled`: cita modificada.
- `cancelled`: cita cancelada.

## 2. Payload que recibira Make

Campos principales:

```json
{
  "source": "dentia",
  "sourceOfTruth": "dentia_native_calendar",
  "eventType": "created",
  "shouldEmailPatient": true,
  "tenant": {
    "name": "Clinica Dental Murcia-Elche"
  },
  "patient": {
    "name": "Ana Perez Lopez",
    "phone": "654718663",
    "email": "ana@example.com"
  },
  "appointment": {
    "title": "Revision",
    "status": "PROPOSED",
    "startsAt": "2026-07-20T15:30:00.000Z",
    "endsAt": "2026-07-20T16:00:00.000Z",
    "treatment": {
      "name": "Primera visita"
    },
    "provider": {
      "name": "Dra. Demo"
    },
    "operatory": {
      "name": "Gabinete 1"
    }
  },
  "change": {
    "previousStartsAt": null,
    "newStartsAt": "2026-07-20T15:30:00.000Z",
    "reason": null
  },
  "control": {
    "calendarOwner": "dentia",
    "makeRole": "email_delivery_only"
  }
}
```

Regla importante: Make no crea ni modifica citas. Solo envia emails.

## 3. Crear router

Despues del webhook, anade `Tools > Router`.

Crea 4 rutas:

1. `Cita creada`
2. `Cita modificada`
3. `Cita cancelada`
4. `Sin email de paciente`

## 4. Filtros de rutas

### Ruta 1 - Cita creada

Filtro:

```text
eventType = created
AND shouldEmailPatient = true
AND patient.email exists
```

### Ruta 2 - Cita modificada

Filtro:

```text
eventType = rescheduled
AND shouldEmailPatient = true
AND patient.email exists
```

### Ruta 3 - Cita cancelada

Filtro:

```text
eventType = cancelled
AND shouldEmailPatient = true
AND patient.email exists
```

### Ruta 4 - Sin email de paciente

Filtro:

```text
shouldEmailPatient = false
OR patient.email does not exist
```

Esta ruta puede enviar aviso interno a recepcion o no hacer nada.

## 5. Modulo de email

Puedes usar:

- Gmail
- SMTP
- Brevo
- SendGrid
- Mailgun

Recomendacion: para clinica real, mejor SMTP/Brevo/SendGrid que Gmail personal.

Campo `To`:

```text
patient.email
```

Campo `From name`:

```text
Clinica Dental Murcia-Elche
```

## 6. Plantilla - Cita creada

Asunto:

```text
Confirmacion de tu cita en Clinica Dental Murcia-Elche
```

Cuerpo:

```text
Hola {{patient.name}},

Te confirmamos que hemos dejado registrada tu cita en {{tenant.name}}.

Fecha y hora: {{formatDate(appointment.startsAt; "DD/MM/YYYY HH:mm")}}
Tratamiento/visita: {{appointment.treatment.name}}
Gabinete: {{appointment.operatory.name}}

Si necesitas cambiarla o cancelarla, responde a este mensaje o contacta con la clinica.

Gracias,
Clinica Dental Murcia-Elche
```

Si `appointment.treatment.name`, `appointment.provider.name` u `appointment.operatory.name` vienen vacios, no los muestres en el email.

## 7. Plantilla - Cita modificada

Asunto:

```text
Tu cita ha sido modificada
```

Cuerpo:

```text
Hola {{patient.name}},

Te confirmamos que tu cita ha sido modificada.

Nueva fecha y hora: {{formatDate(appointment.startsAt; "DD/MM/YYYY HH:mm")}}
Fecha anterior: {{formatDate(change.previousStartsAt; "DD/MM/YYYY HH:mm")}}
Tratamiento/visita: {{appointment.treatment.name}}
Gabinete: {{appointment.operatory.name}}

Si esta nueva cita no te encaja, contacta con la clinica.

Gracias,
Clinica Dental Murcia-Elche
```

## 8. Plantilla - Cita cancelada

Asunto:

```text
Tu cita ha sido cancelada
```

Cuerpo:

```text
Hola {{patient.name}},

Te confirmamos que tu cita ha sido cancelada.

Cita cancelada: {{formatDate(appointment.startsAt; "DD/MM/YYYY HH:mm")}}
Tratamiento/visita: {{appointment.treatment.name}}

Si quieres reservar una nueva cita, contacta con la clinica o escribe de nuevo a Clara.

Gracias,
Clinica Dental Murcia-Elche
```

## 9. Ruta sin email

Si `shouldEmailPatient` es `false`, significa que Dentia no tiene email del paciente.

Opciones:

- No hacer nada.
- Enviar email interno a recepcion:

```text
El paciente {{patient.name}} no tiene email registrado. Evento: {{eventType}}. Telefono: {{patient.phone}}.
```

## 10. Prueba final

1. Activa el escenario en Make.
2. Copia el webhook.
3. Pegalo en Vercel como `MAKE_APPOINTMENT_WEBHOOK_URL`.
4. Redeploy.
5. En Dentia, crea una cita de prueba para un paciente con email.
6. Verifica en Make que entra el bundle.
7. Verifica que llega el email.
8. Reprograma la cita.
9. Cancela la cita.

Si los tres emails llegan, el flujo queda cerrado.

