import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";

const DEV_EMAIL = "developerweks@gmail.com";

type Step = "verify" | "reset" | "blocked" | "done";

interface Challenge { challengeId: string; question: string }

export default function RecoverForm() {
  const [step, setStep] = useState<Step>("verify");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  // Honeypot — bots fill every field they can see; humans never touch this.
  const [website, setWebsite] = useState("");

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChallenge = async () => {
    try {
      const c = await api<Challenge>("/auth/recover/challenge");
      setChallenge(c);
      setAnswer("");
    } catch {
      setError("No se pudo cargar la verificación. Recarga la página.");
    }
  };

  useEffect(() => { loadChallenge(); }, []);

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    if (website.trim()) {
      // Honeypot tripped — pretend success then dead-end, no point telling
      // the bot what gave them away.
      setStep("blocked");
      return;
    }
    setError(null); setLoading(true);
    try {
      const r = await api<{ recoveryToken: string }>("/auth/recover/check", {
        method: "POST",
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          challengeAnswer: answer.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
          username: username.trim(),
        }),
      });
      setToken(r.recoveryToken);
      setStep("reset");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "IDENTITY_MISMATCH") {
          setStep("blocked");
        } else if (
          err.code === "CHALLENGE_INVALID" ||
          err.code === "CHALLENGE_EXPIRED" ||
          err.code === "CHALLENGE_FAILED"
        ) {
          setError("La verificación anti-bot no es correcta. Inténtalo otra vez.");
          await loadChallenge();
        } else {
          setError("Algo ha ido mal. Recarga la página y vuelve a intentarlo.");
        }
      } else {
        setError("Algo ha ido mal. Recarga la página y vuelve a intentarlo.");
      }
    } finally { setLoading(false); }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setError(null); setLoading(true);
    try {
      await api("/auth/recover/reset", {
        method: "POST",
        body: JSON.stringify({ recoveryToken: token, password }),
      });
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError && (err.code === "TOKEN_INVALID" || err.code === "TOKEN_EXPIRED")) {
        setError("La sesión de recuperación ha caducado. Empieza de nuevo.");
        setStep("verify");
        setToken(null);
        await loadChallenge();
      } else {
        setError("No se pudo guardar la contraseña.");
      }
    } finally { setLoading(false); }
  };

  if (step === "done") {
    return (
      <div className="glass p-7 sm:p-9 space-y-5 text-center">
        <p className="text-5xl">✅</p>
        <h2 className="font-hero text-3xl text-white leading-none">Contraseña actualizada</h2>
        <p className="text-court-muted text-sm">
          Ya puedes entrar con tu nueva contraseña.
        </p>
        <a href="/login" className="btn-neon inline-flex">Ir al login</a>
      </div>
    );
  }

  if (step === "blocked") {
    return (
      <div className="glass p-7 sm:p-9 space-y-5">
        <p className="text-5xl text-center">📧</p>
        <h2 className="font-hero text-3xl text-white leading-none text-center">No podemos verificarte</h2>
        <p className="text-court-muted text-sm">
          Los datos introducidos no coinciden con ninguna cuenta. Para recuperar
          el acceso escribe a:
        </p>
        <a
          href={`mailto:${DEV_EMAIL}?subject=Recuperar%20acceso%20Villena%20Basket%20League`}
          className="block font-hero text-2xl text-[var(--color-neon-orange)] text-center break-all hover:text-white transition-colors"
        >
          {DEV_EMAIL}
        </a>
        <p className="text-court-muted text-[11px]">
          Indica tu nombre, móvil y cualquier dato que ayude a confirmar tu
          identidad. Te responderemos para retomar el acceso.
        </p>
        <a href="/login" className="btn-ghost w-full justify-center inline-flex">← Volver al login</a>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <form onSubmit={submitReset} className="glass p-7 sm:p-9 space-y-5">
        <header>
          <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--color-neon-orange)] font-bold mb-2">Casi</p>
          <h2 className="font-hero text-3xl text-white leading-none">Crea tu nueva contraseña</h2>
        </header>
        <label className="block">
          <span className="label-text">Nueva contraseña</span>
          <input
            type="password" minLength={6} maxLength={100} required
            className="input-field" value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus autoComplete="new-password"
          />
        </label>
        <label className="block">
          <span className="label-text">Confirma la contraseña</span>
          <input
            type="password" minLength={6} maxLength={100} required
            className="input-field" value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {error && <p className="text-court-danger text-sm">{error}</p>}
        <button type="submit" className="btn-neon w-full" disabled={loading}>
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    );
  }

  // step === "verify"
  return (
    <form onSubmit={submitVerify} className="glass p-7 sm:p-9 space-y-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--color-neon-orange)] font-bold mb-2">Recuperar acceso</p>
        <h2 className="font-hero text-3xl text-white leading-none">¿Olvidaste tu contraseña?</h2>
        <p className="mt-2 text-court-muted text-sm">
          Verifica que no eres un bot y dinos los tres datos de tu cuenta.
          Si coinciden te dejamos crear una nueva contraseña.
        </p>
      </header>

      {/* Honeypot — hidden from real users, visible to naive bots. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: -10000, top: "auto", width: 1, height: 1, overflow: "hidden" }}
      >
        <label>
          Sitio web
          <input
            type="text" tabIndex={-1} autoComplete="off"
            value={website} onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div className="rounded-xl border border-white/10 px-3 py-2 flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-widest text-court-muted shrink-0">
          {challenge?.question ?? "Cargando…"}
        </span>
        <input
          type="text" inputMode="numeric" required maxLength={4}
          className="input-field !py-1 w-20" value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button
          type="button" onClick={loadChallenge}
          className="text-[11px] text-court-muted hover:text-white"
          title="Otra pregunta"
        >
          ↻
        </button>
      </div>

      <label className="block">
        <span className="label-text">Móvil</span>
        <input
          type="tel" required className="input-field"
          value={mobile} onChange={(e) => setMobile(e.target.value)}
          autoComplete="tel"
        />
      </label>
      <label className="block">
        <span className="label-text">Email</span>
        <input
          type="email" required className="input-field"
          value={email} onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="block">
        <span className="label-text">Usuario</span>
        <input
          type="text" required className="input-field"
          value={username} onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
      </label>

      {error && <p className="text-court-danger text-sm">{error}</p>}

      <button type="submit" className="btn-neon w-full" disabled={loading || !challenge}>
        {loading ? "Verificando…" : "Verificar identidad"}
      </button>
      <p className="text-center">
        <a href="/login" className="text-court-muted hover:text-white text-xs">← Volver al login</a>
      </p>
    </form>
  );
}
