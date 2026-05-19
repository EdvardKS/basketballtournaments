import { useState } from "react";
import { api, ApiError } from "../lib/api.js";
import NeonField from "./auth/NeonField.js";

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/dashboard/admin",
  captain: "/dashboard/captain",
  player: "/dashboard/player",
};

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.94 10.94 0 0112 20C5 20 1 12 1 12a18.5 18.5 0 014.06-5.94M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-3.17 4.19M14.12 14.12A3 3 0 119.88 9.88M1 1l22 22" />
  </svg>
);

interface Props { nextUrl?: string | null }

export default function LoginForm({ nextUrl }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { player } = await api<{ player: { role: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ identifier, password }) },
      );

      const target = nextUrl || ROLE_REDIRECT[player.role] || "/";
      const dest = new URL(target, window.location.origin);
      dest.searchParams.set("welcome", "login");
      // Hard nav so the next SSR uses the freshly-set session cookie.
      window.location.href = dest.pathname + dest.search + dest.hash;
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "ERROR";
      setError(code === "INVALID_CREDENTIALS" ? "Credenciales incorrectas" : "Error al iniciar sesión");
      setShake((s) => s + 1);
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      key={shake}
      className={`glass p-7 sm:p-9 space-y-6 ${error ? "animate-shake" : ""}`}
    >
      <header>
        <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--color-neon-orange)] font-bold mb-2">Acceso jugador</p>
        <h2 className="font-hero text-4xl text-white leading-none">Bienvenido<br/>de vuelta</h2>
        <p className="mt-3 text-court-muted text-sm">Accede para competir en la liga</p>
      </header>

      <div className="space-y-4">
        <NeonField
          id="identifier"
          label="Móvil, email o usuario"
          value={identifier}
          onChange={setIdentifier}
          placeholder="600 123 456 / tu@email.com / admin"
          icon={<IconUser />}
          required
          autoFocus
          autoComplete="username"
          validate={(v) => v.trim().length > 0 && v.trim().length < 3 ? "Mínimo 3 caracteres" : null}
          hint="Cualquiera de los tres vale: tu móvil, tu email o tu nombre de usuario."
        />

        <NeonField
          id="password"
          label="Contraseña"
          type={showPwd ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          icon={<IconLock />}
          required
          autoComplete="current-password"
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="hover:text-white transition-colors cursor-pointer"
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <IconEye open={showPwd} />
            </button>
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-court-muted hover:text-white transition-colors select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-neon-orange)]"
          />
          <span>Recordarme</span>
        </label>
        <a href="/recover" className="text-court-muted hover:text-[var(--color-neon-orange)] transition-colors">¿Olvidaste tu contraseña?</a>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
          style={{ background: "rgba(255,45,45,0.08)", borderColor: "rgba(255,45,45,0.4)", color: "#ff6b6b", boxShadow: "0 0 18px rgba(255,45,45,0.25)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="13" /><circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
          </svg>
          {error}
        </div>
      )}

      <button type="submit" className="btn-neon w-full" disabled={loading}>
        {loading ? <><span className="spinner-neon" /> Entrando…</> : <>INICIAR SESIÓN
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg></>}
      </button>

      <p className="text-center text-sm text-court-muted">
        ¿Sin cuenta?{" "}
        <a
          href={nextUrl ? `/register?next=${encodeURIComponent(nextUrl)}` : "/register"}
          className="text-[var(--color-neon-orange)] font-semibold hover:text-white transition-colors"
        >
          Regístrate aquí →
        </a>
      </p>
    </form>
  );
}
