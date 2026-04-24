import { useState } from "react";
import { api, ApiError } from "../lib/api.js";

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/dashboard/admin",
  captain: "/dashboard/captain",
  player: "/dashboard/player",
};

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      window.location.href = ROLE_REDIRECT[player.role] ?? "/";
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "ERROR";
      setError(code === "INVALID_CREDENTIALS" ? "Credenciales incorrectas" : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card max-w-sm mx-auto space-y-4">
      <h2 className="font-display text-3xl text-white">Iniciar sesión</h2>
      <p className="text-sm text-court-muted">Jugadores y capitanes: usa tu número de teléfono.<br />Admin: usa tu nombre de usuario.</p>

      <div>
        <label className="label-text">Teléfono o usuario</label>
        <input
          className="input-field"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="600123456 / admin1"
          required autoFocus
        />
      </div>

      <div>
        <label className="label-text">Contraseña</label>
        <input
          className="input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      {error && (
        <div className="chip bg-court-danger/20 text-court-danger w-full justify-center py-2 rounded-lg">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
        {loading ? "Entrando…" : "Entrar →"}
      </button>

      <p className="text-xs text-center text-court-muted">
        ¿Sin cuenta?{" "}
        <a href="/register" className="text-court-accent hover:underline">Regístrate aquí</a>
      </p>
    </form>
  );
}
