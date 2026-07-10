import { redirect } from "next/navigation";
import { signupAction } from "@/app/auth-actions";
import { Icon } from "@/components/icon";
import { getSessionUser } from "@/lib/auth";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
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
            <span>Onboarding de clinica nueva</span>
          </div>
        </div>
        {error ? (
          <div className="notice error" role="alert">
            <Icon name="task" />
            <span>{error}</span>
          </div>
        ) : null}
        <form action={signupAction} className="form-grid">
          <label className="field">
            <span>Nombre de la clinica</span>
            <input name="clinicName" required placeholder="Clinica Dental Ruiz Estrada" />
          </label>
          <label className="field">
            <span>Identificador (URL)</span>
            <input name="slug" required pattern="[a-z0-9-]{3,}" placeholder="ruiz-estrada-murcia" />
          </label>
          <label className="field">
            <span>Tu nombre</span>
            <input name="userName" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Contrasena (minimo 8 caracteres)</span>
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <button className="button primary" type="submit">Crear clinica</button>
        </form>
        <p className="auth-alt">
          Ya tienes cuenta? <a href="/login">Entrar</a>
        </p>
      </section>
    </div>
  );
}
