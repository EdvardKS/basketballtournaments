// React island: register/unregister toggle for a tournament.
import { useState } from "react";

interface Props { tournamentId: string; initiallyRegistered: boolean; }

export default function RegisterButton({ tournamentId, initiallyRegistered }: Props) {
  const [registered, setRegistered] = useState(initiallyRegistered);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async () => {
    setLoading(true); setMsg(null);
    const method = registered ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method, credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMsg(body.error ?? `Error ${res.status}`);
        return;
      }
      setRegistered(!registered);
      setMsg(registered ? "Te has dado de baja." : "¡Inscrito!");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-2 items-start">
      <button type="button" onClick={toggle} disabled={loading}
        className={registered ? "btn-danger" : "btn-primary"}>
        {loading ? "…" : registered ? "Darme de baja" : "Inscribirme"}
      </button>
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
    </div>
  );
}
