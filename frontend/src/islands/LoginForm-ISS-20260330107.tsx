// React island: login form. Posts to /api/auth/login, then navigates.
import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error === "INVALID_CREDENTIALS"
          ? "Usuario o contraseña incorrectos."
          : `Error: ${body.error ?? res.status}`);
        return;
      }
      const { player } = await res.json();
      const target = player.role === "admin" ? "/dashboard/admin"
        : player.role === "captain" ? "/dashboard/captain"
        : "/dashboard/player";
      window.location.href = target;
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <label className="block">
        <span className="text-sm text-slate-300">Usuario o móvil</span>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)}
          required autoFocus className="mt-1 w-full"
          placeholder="base1 o 600000001" />
      </label>
      <label className="block">
        <span className="text-sm text-slate-300">Contraseña</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          required className="mt-1 w-full" />
      </label>
      {error && <p className="text-court-danger text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        ¿Nuevo? <a href="/register" className="text-court-accent">Crea tu cuenta</a>
      </p>
    </form>
  );
}
