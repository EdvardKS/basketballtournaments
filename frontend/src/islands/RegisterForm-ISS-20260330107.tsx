// React island: registration with stat sliders + overall preview.
import { useMemo, useState, type FormEvent } from "react";

const STATS = [
  ["pace", "Velocidad"], ["shooting", "Tiro"], ["passing", "Pase"],
  ["dribbling", "Manejo"], ["defense", "Defensa"], ["physical", "Físico"],
] as const;

export default function RegisterForm() {
  const [form, setForm] = useState({
    name: "", mobile: "", email: "", password: "", position: "base",
    pace: 60, shooting: 60, passing: 60, dribbling: 60, defense: 60, physical: 60,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const overall = useMemo(() => {
    const ks = STATS.map(([k]) => form[k as keyof typeof form] as number);
    return Math.round(ks.reduce((a, b) => a + b, 0) / ks.length);
  }, [form]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error === "MOBILE_TAKEN"
          ? "Ese móvil ya está registrado." : `Error: ${body.error ?? res.status}`);
        return;
      }
      window.location.href = "/dashboard/player";
    } finally { setLoading(false); }
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block"><span className="text-sm">Nombre</span>
          <input required minLength={2} className="w-full mt-1" value={form.name}
            onChange={(e) => set("name", e.target.value)} /></label>
        <label className="block"><span className="text-sm">Móvil</span>
          <input required inputMode="numeric" className="w-full mt-1" value={form.mobile}
            onChange={(e) => set("mobile", e.target.value)} /></label>
        <label className="block"><span className="text-sm">Email (opcional)</span>
          <input type="email" className="w-full mt-1" value={form.email}
            onChange={(e) => set("email", e.target.value)} /></label>
        <label className="block"><span className="text-sm">Contraseña</span>
          <input type="password" required minLength={6} className="w-full mt-1"
            value={form.password} onChange={(e) => set("password", e.target.value)} /></label>
      </div>
      <div className="card bg-slate-900/50">
        <header className="flex justify-between items-center mb-3">
          <h3 className="text-xl">Stats</h3>
          <span className="font-display text-4xl text-court-accent">{overall}</span>
        </header>
        <div className="grid md:grid-cols-2 gap-3">
          {STATS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-3">
              <span className="w-28 text-xs text-slate-300">{label}</span>
              <input type="range" min={30} max={99} value={form[k as keyof typeof form] as number}
                onChange={(e) => set(k as keyof typeof form, Number(e.target.value) as never)}
                className="flex-1 accent-court-accent" />
              <span className="w-8 text-right text-sm">{form[k as keyof typeof form] as number}</span>
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-court-danger text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}
