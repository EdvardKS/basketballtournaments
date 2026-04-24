import { useState } from "react";
import { api, ApiError } from "../lib/api.js";

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

export default function RegisterForm() {
  const [form, setForm] = useState({ name: "", mobile: "", email: "", password: "", confirm: "", age: "", gdpr: false });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatar(await resizeImage(file));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden"); return; }
    if (!form.gdpr) { setError("Debes aceptar la política de privacidad"); return; }
    setLoading(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name, mobile: form.mobile, email: form.email || null,
          password: form.password, age: form.age ? Number(form.age) : null,
          avatar, gdprAccepted: true,
        }),
      });
      window.location.href = "/dashboard/player";
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "ERROR";
      const msgs: Record<string, string> = { MOBILE_TAKEN: "Ese teléfono ya está registrado", GDPR_REQUIRED: "Debes aceptar la privacidad" };
      setError(msgs[code] ?? "Error al registrarse");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="card max-w-md mx-auto space-y-4">
      <h2 className="font-display text-3xl text-white">Crear cuenta</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label-text">Nombre completo *</label>
          <input className="input-field" value={form.name} onChange={set("name")} placeholder="Lucas Gil" required />
        </div>
        <div>
          <label className="label-text">Teléfono *</label>
          <input className="input-field" value={form.mobile} onChange={set("mobile")} placeholder="600123456" required />
        </div>
        <div>
          <label className="label-text">Edad *</label>
          <input className="input-field" type="number" value={form.age} onChange={set("age")} placeholder="25" min="10" max="80" required />
        </div>
        <div className="col-span-2">
          <label className="label-text">Email (opcional)</label>
          <input className="input-field" type="email" value={form.email} onChange={set("email")} placeholder="tu@email.com" />
        </div>
        <div>
          <label className="label-text">Contraseña *</label>
          <input className="input-field" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" minLength={6} required />
        </div>
        <div>
          <label className="label-text">Confirmar contraseña *</label>
          <input className="input-field" type="password" value={form.confirm} onChange={set("confirm")} placeholder="••••••••" required />
        </div>
        <div className="col-span-2">
          <label className="label-text">Foto (opcional)</label>
          {avatar && <img src={avatar} className="w-16 h-16 rounded-xl object-cover mb-2 border border-court-border" alt="preview" />}
          <input type="file" accept="image/*" onChange={handlePhoto} className="input-field text-court-muted py-1.5 cursor-pointer" />
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input type="checkbox" checked={form.gdpr} onChange={set("gdpr")} className="mt-0.5 accent-court-accent" required />
        <span className="text-xs text-court-muted group-hover:text-white transition-colors">
          Acepto la <a href="/legal" target="_blank" className="text-court-accent hover:underline">política de privacidad</a> y el tratamiento de mis datos conforme al RGPD. *
        </span>
      </label>

      {error && <div className="chip bg-court-danger/20 text-court-danger w-full justify-center py-2 rounded-lg text-sm">{error}</div>}

      <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
        {loading ? "Creando cuenta…" : "Crear cuenta →"}
      </button>
    </form>
  );
}
