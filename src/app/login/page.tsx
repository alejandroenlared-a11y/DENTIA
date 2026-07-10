import { redirect } from "next/navigation";
import { loginAction } from "@/app/auth-actions";
import { Icon } from "@/components/icon";
import { getSessionUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const error = Array.isArray(params?.error) ? params?.error[0] : params?.error;

  return (
    <div className="auth-shell">
      <section className="card pad auth-card">
        <div className="brand">
          <div className="brand-badge">
            <Icon name="tooth" />
          </div>
          <div className="brand-title">
            <strong>Dentia AI</strong>
            <span>Acceso al espacio de trabajo</span>
          </div>
        </div>
        {error ? (
          <div className="notice error" role="alert">
            <Icon name="task" />
            <span>{error}</span>
          </div>
        ) : null}
        <form action={loginAction} className="form-grid">
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Contrasena</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button primary" type="submit">Entrar</button>
        </form>
        <p className="auth-alt">
          Sin cuenta de clinica? <a href="/signup">Crear clinica nueva</a>
        </p>
      </section>
    </div>
  );
}
