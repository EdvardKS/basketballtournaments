import { useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Tournament } from "../lib/types.js";

interface Props { tournament?: Tournament | null; onSaved: (t: Tournament) => void; onCancel: () => void }

export default function TournamentForm({ tournament: init, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    name: init?.name ?? "",
    location: init?.location ?? "Polideportivo Norte",
    description: init?.description ?? "",
    rules: init?.rules ?? "Formato 3x3 Media Cancha\nReglas FIBA 3x3 adaptadas",
    inscriptionStart: init?.inscriptionStart?.slice(0,10) ?? "",
    inscriptionEnd: init?.inscriptionEnd?.slice(0,10) ?? "",
    draftStart: init?.draftStart?.slice(0,10) ?? "",
    draftEnd: init?.draftEnd?.slice(0,10) ?? "",
    matchDate: init?.matchDate?.slice(0,10) ?? "",
    halfCourt: init?.halfCourt ?? true,
    bracketFormat: init?.bracketFormat ?? "top2_per_group",
    bracketSize: init?.bracketSize == null ? "" : String(init.bracketSize),
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    const body: Record<string, unknown> = { ...form };
    // bracket_size empty string → null (auto). 4/8/16 → number.
    body.bracketSize = form.bracketSize === "" ? null : Number(form.bracketSize);
    try {
      const saved = await api<Tournament>(
        init ? `/tournaments/${init.id}` : "/tournaments",
        { method: init ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      onSaved(saved);
    } catch (e) {
      setError(e instanceof ApiError ? (e.code === "ONE_ACTIVE_ONLY" ? "Ya existe un torneo activo" : e.code) : "Error");
    } finally { setLoading(false); }
  };

  const row = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label className="label-text">{label}</label>
      <input className="input-field" type={type} value={String(form[key])} onChange={set(key)} placeholder={placeholder} required={type === "date"} />
    </div>
  );

  return (
    <form onSubmit={submit} className="card space-y-4 max-w-lg">
      <h3 className="font-display text-2xl text-white">{init ? "Editar torneo" : "Nuevo torneo"}</h3>
      {row("Nombre del torneo *", "name", "text", "Liga Primavera 2026")}
      {row("Lugar *", "location", "text", "Polideportivo Norte")}
      <div>
        <label className="label-text">Descripción *</label>
        <textarea className="input-field resize-none" rows={2} value={form.description} onChange={set("description")} placeholder="Descripción del torneo…" required />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.halfCourt} onChange={set("halfCourt")} className="accent-court-accent" />
        <span className="text-sm text-court-muted">Media cancha (2 partidos simultáneos) · formato 3x3 por defecto</span>
      </label>
      <p className="text-[11px] text-court-muted leading-snug">
        El número de equipos lo decide el admin nombrando capitanes; el draft
        corre tantas rondas como hagan falta hasta repartir a todos los
        inscritos entre los capitanes.
      </p>

      <p className="label-text pt-2">Cuadro de eliminatorias</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-text">Formato de clasificación</label>
          <select
            className="input-field"
            value={form.bracketFormat}
            onChange={(e) => setForm((f) => ({ ...f, bracketFormat: e.target.value as typeof form.bracketFormat }))}
          >
            <option value="top2_per_group">Los 2 mejores de cada grupo</option>
            <option value="top1_plus_best2_seconds">1º de cada grupo + 2 mejores 2dos</option>
          </select>
        </div>
        <div>
          <label className="label-text">Cuadro inicial</label>
          <select
            className="input-field"
            value={form.bracketSize}
            onChange={(e) => setForm((f) => ({ ...f, bracketSize: e.target.value }))}
          >
            <option value="">Auto (según clasificados)</option>
            <option value="4">Solo semifinales (4)</option>
            <option value="8">Desde cuartos (8)</option>
            <option value="16">Desde octavos (16)</option>
          </select>
        </div>
      </div>
      <p className="text-[11px] text-court-muted leading-snug">
        Si eliges un cuadro mayor que los clasificados (p.ej. octavos con
        sólo 6 equipos), la app te avisa al cerrar la fase de grupos.
      </p>
      <p className="label-text pt-2">Fechas del torneo *</p>
      <div className="grid grid-cols-2 gap-3">
        {row("Inicio inscripciones", "inscriptionStart", "date")}
        {row("Fin inscripciones", "inscriptionEnd", "date")}
        {row("Inicio draft", "draftStart", "date")}
        {row("Fin draft", "draftEnd", "date")}
        <div className="col-span-2">{row("Día del torneo", "matchDate", "date")}</div>
      </div>
      <div>
        <label className="label-text">Bases y reglas</label>
        <textarea className="input-field resize-none" rows={4} value={form.rules} onChange={set("rules")} />
      </div>
      {error && <p className="text-court-danger text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="button" className="btn-ghost flex-1 justify-center" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}
