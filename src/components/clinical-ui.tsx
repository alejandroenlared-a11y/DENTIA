import type React from "react";
import { DashboardLink as Link } from "@/components/dashboard-link";
import { Icon, type IconName } from "@/components/icon";

export type Tone = "blue" | "green" | "orange" | "purple" | "red";

export function ViewHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="view-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

export function PanelHead({ icon, title, subtitle, href }: { icon: IconName; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="card-head">
      <div className="card-title">
        <span className="tile-icon accent-blue"><Icon name={icon} /></span>
        <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
      </div>
      {href ? <Link className="button ghost" href={href}>Ver todo</Link> : null}
    </div>
  );
}

export function Tile({ icon, label, value, note, accent }: { icon: IconName; label: string; value: React.ReactNode; note: string; accent: string }) {
  return (
    <div className={`card tile ${accent}`}>
      <div className="tile-icon"><Icon name={icon} /></div>
      <div>
        <div className="tile-label">{label}</div>
        <div className="tile-value">{value}</div>
        <div className="tile-note">{note}</div>
      </div>
    </div>
  );
}

export function MiniPipeline({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={accent} />
    </div>
  );
}

export function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
  disabled = false
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}{required ? <em className="required-mark">*</em> : null}</span>
      <input name={name} defaultValue={defaultValue} type={type} required={required} disabled={disabled} />
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue = "",
  hint,
  disabled = false
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="field" style={{ gridColumn: "1 / -1" }}>
      <span>{label}</span>
      <textarea name={name} defaultValue={defaultValue} disabled={disabled} />
      {hint ? <small style={{ color: "var(--muted)", fontWeight: 400 }}>{hint}</small> : null}
    </label>
  );
}

export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint: string }) {
  return (
    <section className="card pad empty-state">
      <span className="tile-icon accent-blue"><Icon name={icon} /></span>
      <h2>{title}</h2>
      <p>{hint}</p>
    </section>
  );
}
