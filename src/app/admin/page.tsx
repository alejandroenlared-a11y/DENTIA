import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Icon } from "@/components/icon";
import { hasRole, requireSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const user = await requireSessionUser();
  const adminEmails = getAdminEmails();
  const allowedByEmail = adminEmails.length > 0
    ? adminEmails.includes(user.email.toLowerCase())
    : process.env.NODE_ENV !== "production";

  if (!hasRole(user, UserRole.OWNER) || !allowedByEmail) {
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

function getAdminEmails() {
  return (process.env.DENTIA_ADMIN_EMAILS || "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}
