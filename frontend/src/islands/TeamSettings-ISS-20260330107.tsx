// Captain team settings: name + WhatsApp group info.
import { useState, type FormEvent } from "react";

interface Props {
  teamId: string; name: string;
  nameConfirmed: boolean;
  whatsappGroupName: string | null;
  whatsappGroupLink: string | null;
}

export default function TeamSettings(props: Props) {
  const [form, setForm] = useState({
    name: props.name,
    whatsappGroupName: props.whatsappGroupName ?? "",
    whatsappGroupLink: props.whatsappGroupLink ?? "",
    nameConfirmed: props.nameConfirmed,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/teams/${props.teamId}`, {
      method: "PATCH", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        nameConfirmed: form.nameConfirmed,
        whatsappGroupName: form.whatsappGroupName || null,
        whatsappGroupLink: form.whatsappGroupLink || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMsg(`Error: ${body.error ?? res.status}`);
    } else { setMsg("Guardado."); }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block"><span className="text-sm">Nombre del equipo</span>
        <input required className="w-full mt-1" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.nameConfirmed}
          onChange={(e) => setForm({ ...form, nameConfirmed: e.target.checked })} />
        Confirmar nombre definitivo
      </label>
      <label className="block"><span className="text-sm">Nombre del grupo WhatsApp</span>
        <input className="w-full mt-1" value={form.whatsappGroupName}
          onChange={(e) => setForm({ ...form, whatsappGroupName: e.target.value })} /></label>
      <label className="block"><span className="text-sm">Link de invitación</span>
        <input type="url" className="w-full mt-1" value={form.whatsappGroupLink}
          placeholder="https://chat.whatsapp.com/..."
          onChange={(e) => setForm({ ...form, whatsappGroupLink: e.target.value })} /></label>
      {msg && <p className="text-xs text-slate-400">{msg}</p>}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
