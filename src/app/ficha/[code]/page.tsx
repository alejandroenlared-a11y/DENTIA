import { notFound } from "next/navigation";
import { formatDateTime, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PatientPortalPageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function PatientPortalPage({ params, searchParams }: PatientPortalPageProps) {
  const { code } = await params;
  const query = await searchParams;
  const contact = Array.isArray(query?.contact) ? query.contact[0] : query?.contact;

  const intake = await prisma.patientIntake.findUnique({
    where: { accessCode: code.toUpperCase() },
    include: {
      tenant: true,
      patient: {
        include: {
          appointments: {
            orderBy: { startsAt: "desc" },
            include: { provider: true, operatory: true, treatment: true }
          },
          invoices: {
            orderBy: { issuedAt: "desc" }
          }
        }
      }
    }
  });

  if (!intake) {
    notFound();
  }

  const verified = contact ? matchesContact(contact, intake.email, intake.phone, intake.patient?.email, intake.patient?.phone) : false;
  const appointments = intake.patient?.appointments ?? [];
  const invoices = intake.patient?.invoices ?? [];
  const requestedTreatment = intake.treatmentNeed || intake.patient?.treatmentNeed || "";
  const uniqueTreatments = Array.from(
    new Map(
      appointments
        .map(appointment => appointment.treatment)
        .filter(treatment => treatment !== null)
        .map(treatment => [treatment.id, treatment])
    ).values()
  );

  return (
    <main className="patient-portal-shell">
      <section className="patient-portal-card">
        <header>
          <span>{intake.tenant.name}</span>
          <h1>Ficha de paciente</h1>
          <p>Codigo {intake.accessCode}</p>
        </header>

        {!verified ? (
          <form className="patient-portal-form">
            <p>Para proteger tus datos, escribe el email o telefono que diste en el chat.</p>
            <label>
              <span>Email o telefono</span>
              <input name="contact" placeholder="nombre@dominio.com o telefono" required />
            </label>
            <button type="submit">Ver mi ficha</button>
            {contact ? <strong>No coincide con los datos de esta ficha.</strong> : null}
          </form>
        ) : (
          <div className="patient-portal-content">
            <section>
              <h2>Datos registrados</h2>
              <dl>
                <div><dt>Nombre</dt><dd>{intake.name || intake.patient?.name || "Pendiente"}</dd></div>
                <div><dt>Email</dt><dd>{intake.email || intake.patient?.email || "Pendiente"}</dd></div>
                <div><dt>Telefono</dt><dd>{intake.phone || intake.patient?.phone || "Pendiente"}</dd></div>
                <div><dt>Sede</dt><dd>{intake.location || "Pendiente"}</dd></div>
                <div><dt>Motivo</dt><dd>{intake.treatmentNeed || intake.patient?.treatmentNeed || "Pendiente"}</dd></div>
              </dl>
            </section>

            <section>
              <h2>Citas solicitadas y registradas</h2>
              {appointments.length ? (
                <div className="patient-portal-list">
                  {appointments.map(appointment => (
                    <article key={appointment.id}>
                      <strong>{appointment.title}</strong>
                      <span>{formatDateTime(appointment.startsAt)} · {appointment.status}</span>
                      <span>{appointment.provider?.name ?? "Doctor pendiente"} · {appointment.operatory?.name ?? "Gabinete pendiente"}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No hay citas registradas todavia.</p>
              )}
            </section>

            <section>
              <h2>Presupuestos y solicitudes</h2>
              {requestedTreatment || intake.patient?.estimatedValue ? (
                <div className="patient-portal-list">
                  <article>
                    <strong>{requestedTreatment || "Solicitud pendiente de clasificar"}</strong>
                    <span>Estado: pendiente de valoracion por la clinica</span>
                    {intake.patient?.estimatedValue ? <span>Importe estimado: {formatMoney(intake.patient.estimatedValue)}</span> : null}
                  </article>
                </div>
              ) : (
                <p>No hay presupuestos o solicitudes registradas todavia.</p>
              )}
            </section>

            <section>
              <h2>Tratamientos</h2>
              {uniqueTreatments.length ? (
                <div className="patient-portal-list">
                  {uniqueTreatments.map(treatment => (
                    <article key={treatment.id}>
                      <strong>{treatment.name}</strong>
                      <span>Duracion orientativa: {treatment.durationMinutes} min</span>
                      {treatment.priceCents ? <span>Precio orientativo: {formatMoney(treatment.priceCents)}</span> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p>No hay tratamientos registrados todavia.</p>
              )}
            </section>

            <section>
              <h2>Facturas</h2>
              {invoices.length ? (
                <div className="patient-portal-list">
                  {invoices.map(invoice => (
                    <article key={invoice.id}>
                      <strong>{invoice.number} · {invoice.treatmentName}</strong>
                      <span>{formatDateTime(invoice.issuedAt)} · {invoice.status}</span>
                      <span>Importe: {formatMoney(invoice.amountCents)}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No hay facturas registradas todavia.</p>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function matchesContact(contact: string, ...allowed: Array<string | null | undefined>) {
  const normalizedContact = normalizeContact(contact);
  return allowed.some(value => {
    if (!value) return false;
    const normalizedAllowed = normalizeContact(value);
    if (normalizedAllowed === normalizedContact) return true;
    if (normalizedContact.includes("@") || normalizedAllowed.includes("@")) return false;
    return (
      normalizedContact.length >= 9 &&
      normalizedAllowed.length >= 9 &&
      (normalizedContact.endsWith(normalizedAllowed) || normalizedAllowed.endsWith(normalizedContact))
    );
  });
}

function normalizeContact(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : trimmed.replace(/\D/g, "");
}
