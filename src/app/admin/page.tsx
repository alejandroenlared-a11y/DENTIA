import { Icon } from "@/components/icon";
import { resetDemoPatientsAction } from "@/app/admin/actions";
import { requireAdminUser } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdminUser();
  const params = await searchParams;
  const okNotice = Array.isArray(params?.ok) ? params.ok[0] : params?.ok;
  const errorNotice = Array.isArray(params?.error) ? params.error[0] : params?.error;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { patients: true, appointments: true, conversations: true, users: true, agentSessions: true }
      }
    }
  });

  return (
    <div className="auth-shell">
      <section className="card pad admin-card">
        <div className="brand">
          <div className="brand-badge">
            <Icon name="tooth" />
          </div>
          <div className="brand-title">
            <strong>Dentia AI · Superadmin</strong>
            <span>{tenants.length} clinicas activas</span>
          </div>
        </div>
        {okNotice ? <div className="notice ok"><span>{okNotice}</span></div> : null}
        {errorNotice ? <div className="notice error"><span>{errorNotice}</span></div> : null}
        <section className="card pad" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Mantenimiento de demo</h2>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Resetea los datos vinculados a pacientes del tenant seleccionado y recrea 5 fichas ficticias completas.
          </p>
          <form action={resetDemoPatientsAction} className="form-grid two">
            <label className="field">
              <span>Tenant</span>
              <select name="tenantSlug" defaultValue="clinica-murcia-elche">
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.slug}>{tenant.name} · {tenant.slug}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Confirmacion</span>
              <input name="confirmation" placeholder="RESET PACIENTES DEMO" />
            </label>
            <div />
            <button className="button danger" type="submit">
              <Icon name="archive" />
              Resetear pacientes demo
            </button>
          </form>
        </section>
        <div style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Clinica</th>
                <th>Slug</th>
                <th>Plan</th>
                <th>Usuarios</th>
                <th>Pacientes</th>
                <th>Citas</th>
                <th>Conversaciones</th>
                <th>Sesiones IA</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => (
                <tr key={tenant.id}>
                  <td><strong>{tenant.name}</strong></td>
                  <td>{tenant.slug}</td>
                  <td>{tenant.plan}</td>
                  <td>{tenant._count.users}</td>
                  <td>{tenant._count.patients}</td>
                  <td>{tenant._count.appointments}</td>
                  <td>{tenant._count.conversations}</td>
                  <td>{tenant._count.agentSessions}</td>
                  <td>{formatDate(tenant.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
