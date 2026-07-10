import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const expected =
    process.env.DENTIA_ADMIN_TOKEN ??
    (process.env.NODE_ENV === "development" ? "dentia-admin-local" : undefined);
  const params = await searchParams;
  const token = Array.isArray(params?.token) ? params?.token[0] : params?.token;

  if (!expected || token !== expected) {
    notFound();
  }

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
