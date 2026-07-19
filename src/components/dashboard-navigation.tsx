"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { navGroups, navItems } from "@/lib/app-navigation";
import type { AppView } from "@/lib/dashboard";

type DashboardNavigationProps = {
  view: AppView;
  unreadConversations: number;
  openTasks: number;
};

export function SidebarNavigation({ view, unreadConversations, openTasks }: DashboardNavigationProps) {
  const navigation = usePendingNavigation(view);

  return (
    <>
      {navigation.pendingLabel ? <NavigationPendingNotice label={navigation.pendingLabel} /> : null}
      {navGroups.map(group => (
        <div className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          <nav className="nav-section" aria-label={group.label}>
            {group.items.map(item => (
              <Link
                key={item.id}
                aria-current={navigation.activeView === item.id ? "page" : undefined}
                className={navigation.className("nav-item", item.id)}
                href={`/?view=${item.id}`}
                onClick={() => navigation.markPending(item.id)}
                prefetch={false}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <NavBadge
                  badge={item.badge}
                  unreadConversations={unreadConversations}
                  openTasks={openTasks}
                />
                {navigation.pendingView === item.id ? <span className="nav-spinner" aria-hidden="true" /> : null}
              </Link>
            ))}
          </nav>
        </div>
      ))}
    </>
  );
}

export function MobileNavigation({ view, unreadConversations, openTasks }: DashboardNavigationProps) {
  const navigation = usePendingNavigation(view);

  return (
    <>
      {navigation.pendingLabel ? <NavigationPendingNotice label={navigation.pendingLabel} /> : null}
      <nav className="mobile-switch" aria-label="Navegacion principal">
        {navItems.slice(0, 6).map(item => (
          <Link
            key={item.id}
            aria-current={navigation.activeView === item.id ? "page" : undefined}
            className={navigation.className("mobile-nav-item", item.id)}
            href={`/?view=${item.id}`}
            onClick={() => navigation.markPending(item.id)}
            prefetch={false}
          >
            <Icon name={item.icon} />
            <span>{item.shortLabel ?? item.label}</span>
            <NavBadge
              badge={item.badge}
              unreadConversations={unreadConversations}
              openTasks={openTasks}
            />
            {navigation.pendingView === item.id ? <span className="nav-spinner" aria-hidden="true" /> : null}
          </Link>
        ))}
      </nav>
    </>
  );
}

function usePendingNavigation(view: AppView) {
  const [pendingView, setPendingView] = useState<AppView | null>(null);
  const visiblePendingView = pendingView !== view ? pendingView : null;

  const pendingLabel = useMemo(() => {
    if (!visiblePendingView) return null;
    return navItems.find(item => item.id === visiblePendingView)?.label ?? "pantalla";
  }, [visiblePendingView]);

  const activeView = visiblePendingView ?? view;

  return {
    activeView,
    pendingLabel,
    pendingView: visiblePendingView,
    className(baseClass: string, itemView: AppView) {
      return [
        baseClass,
        activeView === itemView ? "active" : "",
        visiblePendingView === itemView ? "pending" : ""
      ].filter(Boolean).join(" ");
    },
    markPending(targetView: AppView) {
      if (targetView !== view) {
        setPendingView(targetView);
      }
    }
  };
}

function NavBadge({
  badge,
  unreadConversations,
  openTasks
}: {
  badge?: "unread" | "tasks";
  unreadConversations: number;
  openTasks: number;
}) {
  if (badge === "unread" && unreadConversations > 0) {
    return <span className="count">{unreadConversations}</span>;
  }

  if (badge === "tasks" && openTasks > 0) {
    return <span className="count">{openTasks}</span>;
  }

  return null;
}

function NavigationPendingNotice({ label }: { label: string }) {
  return (
    <div className="route-pending-indicator" role="status" aria-live="polite">
      <span className="nav-spinner" aria-hidden="true" />
      Abriendo {label}
    </div>
  );
}
