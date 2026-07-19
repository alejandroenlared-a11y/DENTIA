"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "dentia-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme | null): void {
  if (theme) {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function resolveActiveTheme(): Theme {
  const stored = document.documentElement.getAttribute("data-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [active, setActive] = useState<Theme>("light");

  useEffect(() => {
    // Sync the button with the inline theme bootstrap script after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(resolveActiveTheme());
  }, []);

  function toggle() {
    const next: Theme = active === "dark" ? "light" : "dark";
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setActive(next);
  }

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={toggle}
      title={active === "dark" ? "Modo claro" : "Modo oscuro"}
      aria-label="Cambiar tema"
    >
      {active === "dark" ? (
        <svg className="icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.4M12 19.1v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7" />
        </svg>
      ) : (
        <svg className="icon" viewBox="0 0 24 24">
          <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
        </svg>
      )}
    </button>
  );
}

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem("${STORAGE_KEY}");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;
