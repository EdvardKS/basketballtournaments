import { useMemo, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import NeonField from "./auth/NeonField.js";

const resizeImage = (file: File, maxPx = 200): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * s; canvas.height = img.height * s;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.86 19.86 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" />
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const IconHash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const passwordScore = (p: string): number => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
};

const STRENGTH = [
  { label: "Vacía",    color: "#3a3f4f" },
  { label: "Débil",    color: "#ff2d2d" },
  { label: "Justa",    color: "#ffcc5c" },
  { label: "Buena",    color: "#3ecf8e" },
  { label: "Fortísima", color: "#ff6b00" },
];

interface Props {
  nextUrl?: string | null;
  joinTournamentId?: string | null;
}

export default function RegisterForm({ nextUrl, joinTournamentId }: Props) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);
  const strength = STRENGTH[score];

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatar(await resizeImage(file));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Las contraseñas no coinciden"); setShake((s) => s + 1); return; }
    if (!gdpr) { setError("Debes aceptar la política de privacidad"); setShake((s) => s + 1); return; }
    if (score < 1) { setError("La contraseña es demasiado corta (mín. 6)"); setShake((s) => s + 1); return; }
    setLoading(true);
    try {
      // Backend sets the session cookie on this response.
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name, mobile, email: email || null,
          password, age: age ? Number(age) : null,
          avatar, gdprAccepted: true,
        }),
      });

      // Optional: auto-join a tournament if the URL asked for it.
      let joinedTournament = false;
      if (joinTournamentId) {
        try {
          await api(`/tournaments/${joinTournamentId}/register`, { method: "POST" });
          joinedTournament = true;
        } catch { /* non-blocking — the user is registered + logged in either way */ }
      }

      const dest = new URL(nextUrl || "/dashboard/player", window.location.origin);
      dest.searchParams.set("welcome", "registered");
      if (joinedTournament) dest.searchParams.set("joined", "1");
      // Hard nav so the next SSR uses the freshly-set session cookie.
      window.location.href = dest.pathname + dest.search + dest.hash;
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "ERROR";
      const msgs: Record<string, string> = {
        MOBILE_TAKEN:  "Ese teléfono ya está registrado",
        GDPR_REQUIRED: "Debes aceptar la privacidad",
      };
      setError(msgs[code] ?? "Error al registrarse");
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
        <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--color-neon-orange)] font-bold mb-2">Paso 1 de 1</p>
        <h2 className="font-hero text-4xl text-white leading-none">Únete<br/>a la liga</h2>
        <p className="mt-3 text-court-muted text-sm">Forma parte del torneo 3×3 de Villena</p>
      </header>

      <div className="space-y-4">
        <NeonField
          id="name" label="Nombre completo" value={name} onChange={setName}
          placeholder="Lucas Gil" icon={<IconUser />} required autoFocus
          autoComplete="name"
          validate={(v) => v.trim().length > 0 && v.trim().length < 3 ? "Mínimo 3 caracteres" : null}
        />

        <div className="grid grid-cols-2 gap-3">
          <NeonField
            id="mobile" label="Teléfono" value={mobile} onChange={setMobile}
            placeholder="600 123 456" icon={<IconPhone />} required
            autoComplete="tel" inputMode="tel"
            validate={(v) => v && !/^[+\d][\d\s-]{6,}$/.test(v.trim()) ? "Teléfono no válido" : null}
          />
          <NeonField
            id="age" label="Edad" type="number" value={age} onChange={setAge}
            placeholder="25" icon={<IconHash />} required inputMode="numeric"
            validate={(v) => {
              const n = Number(v);
              if (!v) return null;
              if (Number.isNaN(n) || n < 10 || n > 80) return "Entre 10 y 80";
              return null;
            }}
          />
        </div>

        <NeonField
          id="email" label="Email (opcional)" type="email" value={email} onChange={setEmail}
          placeholder="tu@email.com" icon={<IconMail />} autoComplete="email" inputMode="email"
          validate={(v) => v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? "Email no válido" : null}
        />

        <div>
          <NeonField
            id="password" label="Contraseña" type="password" value={password} onChange={setPassword}
            placeholder="Mínimo 6 caracteres" icon={<IconLock />} required minLength={6}
            autoComplete="new-password"
          />
          {/* Strength meter */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: i <= score ? strength.color : "rgba(255,255,255,0.08)",
                    boxShadow: i <= score ? `0 0 8px ${strength.color}aa` : "none",
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
        </div>

        <NeonField
          id="confirm" label="Confirmar contraseña" type="password" value={confirm} onChange={setConfirm}
          placeholder="Repite la contraseña" icon={<IconLock />} required
          autoComplete="new-password"
          validate={(v) => v && v !== password ? "No coincide con la contraseña" : null}
        />

        <div>
          <label className="block text-[10px] uppercase tracking-[0.25em] text-court-muted font-semibold mb-1.5">
            Foto (opcional)
          </label>
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} className="w-14 h-14 rounded-xl object-cover border border-white/10" alt="preview" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/30">
                <IconUser />
              </div>
            )}
            <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-white/15 hover:border-[var(--color-neon-orange)]/60 hover:bg-white/5 transition-all px-4 py-3 text-xs text-court-muted text-center">
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              {avatar ? "Cambiar foto" : "Subir foto de perfil"}
            </label>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[var(--color-neon-orange)]" required
        />
        <span className="text-xs text-court-muted group-hover:text-white transition-colors">
          Acepto la <a href="/legal" target="_blank" className="text-[var(--color-neon-orange)] hover:underline">política de privacidad</a> y el tratamiento de mis datos conforme al RGPD.
        </span>
      </label>

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
        {loading
          ? <><span className="spinner-neon" /> Creando cuenta…</>
          : <>CREAR CUENTA
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </>}
      </button>

      <p className="text-center text-sm text-court-muted">
        ¿Ya tienes cuenta?{" "}
        <a
          href={nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : "/login"}
          className="text-[var(--color-neon-orange)] font-semibold hover:text-white transition-colors"
        >
          Inicia sesión →
        </a>
      </p>
    </form>
  );
}
