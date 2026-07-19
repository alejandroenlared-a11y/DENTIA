import Link from "next/link";
import type React from "react";
import { logoutAction } from "@/app/auth-actions";
import { ThemeToggle } from "@/app/theme-toggle";
import { Icon } from "@/components/icon";
import { navGroups, navItems, primaryActionHref, viewMeta } from "@/lib/app-navigation";
import type { AppView, getDashboardData } from "@/lib/dashboard";
import { getInitials } from "@/lib/format";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

type SaasAppShellProps = {
  data: DashboardData;
  view: AppView;
  patientQuery?: string;
  notices?: React.ReactNode;
  children: React.ReactNode;
};

export function SaasAppShell({ data, view, patientQuery, notices, children }: SaasAppShellProps) {
  const currentView = viewMeta[view];
  const primaryHref = primaryActionHref(view, currentView.actionView);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">
            <strong>DENTIA</strong>
            <span>Dental Software</span>
          </div>
        </div>
        {navGroups.map(group => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            <nav className="nav-section" aria-label={group.label}>
              {group.items.map(item => (
                <Link
                  key={item.id}
                  aria-current={view === item.id ? "page" : undefined}
                  className={`nav-item ${view === item.id ? "active" : ""}`}
                  href={`/?view=${item.id}`}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.badge === "unread" && data.metrics.unreadConversations > 0 ? (
                    <span className="count">{data.metrics.unreadConversations}</span>
                  ) : null}
                  {item.badge === "tasks" && data.metrics.openTasks > 0 ? (
                    <span className="count">{data.metrics.openTasks}</span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className={`assistant-pill ${data.tenant.assistantEnabled ? "online" : ""}`}>
            <span />
            IA {data.tenant.assistantEnabled ? "activa" : "pausada"}
          </div>
          <div className="account">
            <div className="avatar">{getInitials(data.currentUser.name)}</div>
            <div>
              <strong>{data.currentUser.name}</strong>
              <br />
              <span style={{ color: "var(--muted)" }}>{data.currentUser.role}</span>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="button" type="submit" style={{ width: "100%" }}>Cerrar sesion</button>
          </form>
        </div>
      </aside>
      <nav className="mobile-switch" aria-label="Navegacion principal">
        {navItems.slice(0, 6).map(item => (
          <Link
            key={item.id}
            aria-current={view === item.id ? "page" : undefined}
            className={`mobile-nav-item ${view === item.id ? "active" : ""}`}
            href={`/?view=${item.id}`}
          >
            <Icon name={item.icon} />
            <span>{item.shortLabel ?? item.label}</span>
            {item.id === "inbox" && data.metrics.unreadConversations > 0 ? (
              <span className="count">{data.metrics.unreadConversations}</span>
            ) : null}
          </Link>
        ))}
      </nav>
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <div className="page-kicker">{currentView.eyebrow}</div>
              <h1 className="topbar-title">{currentView.title}</h1>
            </div>
            <form className="global-search" action="/">
              <input type="hidden" name="view" value={view} />
              <Icon name="search" />
              <input name="q" defaultValue={view === "patients" ? patientQuery ?? "" : ""} placeholder={currentView.search} />
            </form>
            <nav className="site-tabs" aria-label="Sedes">
              <span className="active">Sede Centro</span>
              <span>Sede Playa</span>
            </nav>
          </div>
          <div className="top-actions">
            <ThemeToggle />
            <Link className="icon-button" href="/?view=inbox" title="Notificaciones" aria-label="Notificaciones">
              <Icon name="inbox" />
            </Link>
            {primaryHref ? (
              <Link className="button primary" href={primaryHref}>
                <Icon name="plus" />
                {currentView.action}
              </Link>
            ) : (
              <button className="button primary" type="button" disabled>
                <Icon name="plus" />
                {currentView.action}
              </button>
            )}
          </div>
        </header>
        <section id="main-content" className={`content ${view === "calendar" ? "calendar-content" : "panel-content"}`}>
          {notices}
          {view === "calendar" ? children : <div className="view-workspace">{children}</div>}
        </section>
      </main>
    </div>
  );
}
