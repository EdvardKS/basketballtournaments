// Admin panel: create tournament + transition states.
import { useState, type FormEvent } from "react";
import type { Tournament } from "../lib/types.js";

interface Props { tournaments: Tournament[]; }

export default function AdminTournaments({ tournaments: initial }: Props) {
  const [list, setList] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", date: "", location: "", description: "",
  });
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    const r = await fetch("/api/tournaments", { credentials: "include" });
    if (r.ok) setList(await r.json());
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setCreating(true); setMsg(null);
    const res = await fetch("/api/tournaments", {
      method: "POST", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", date: "", location: "", description: "" });
      setMsg("Torneo creado.");
      await refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setMsg(`Error: ${b.error ?? res.status}`);
    }
    setCreating(false);
  };

  const changeStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: "PATCH", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await refresh(); else setMsg(`Error al cambiar estado`);
  };

  const del = async (id: string) => {
    if (!confirm("¿Seguro?")) return;
    await fetch(`/api/tournaments/${id}`, { method: "PATCH",
      credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "completed" }) });
    await refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-3">
        <h3 className="text-2xl">Nuevo torneo</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input required placeholder="Nombre" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input required placeholder="Sede" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <textarea required placeholder="Descripción" rows={2}
          className="w-full" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
        <button type="submit" disabled={creating} className="btn-primary">
          {creating ? "Creando…" : "Crear torneo"}
        </button>
      </form>

      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 uppercase">
          <tr><th className="text-left py-2">Nombre</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id} className="border-t border-slate-800">
              <td className="py-2">{t.name}</td>
              <td className="text-center">{t.date}</td>
              <td className="text-center">
                <select className="text-xs" value={t.status}
                  onChange={(e) => changeStatus(t.id, e.target.value)}>
                  {["open","draft","setup","scheduled","active","completed"].map((s) =>
                    <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="text-right space-x-2">
                <a href={`/tournaments/${t.id}`} className="chip">Ver</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
