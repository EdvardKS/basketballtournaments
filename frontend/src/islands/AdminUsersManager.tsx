import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Player, Role } from "../lib/types.js";
import AdminPlayerActions from "./AdminPlayerActions.js";

interface Props { initial: Player[] }

const PAGE = 25;

export default function AdminUsersManager({ initial }: Props) {
  const [players, setPlayers] = useState<Player[]>(initial);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Player | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await api<Player[]>("/players");
      setPlayers(list);
    } catch { /* keep stale */ }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return players.filter((p) => {
      if (!showArchived && p.archivedAt) return false;
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      if (!needle) return true;
      const hay = `${p.name} ${p.mobile} ${p.email ?? ""} ${p.username ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [players, q, roleFilter, showArchived]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const view = filtered.slice(page * PAGE, page * PAGE + PAGE);
  useEffect(() => { if (page >= pages) setPage(pages - 1); }, [page, pages]);

  const onDelete = async (p: Player, hard = false) => {
    const word = hard ? "HARD" : "SOFT";
    const ans = prompt(`Escribe ${word} para confirmar eliminación de ${p.name}.`);
    if (ans !== word) return;
    try {
      await api(`/players/${p.id}${hard ? "?hard=true" : ""}`, { method: "DELETE" });
      setMsg(`${p.name} eliminado (${hard ? "definitivo" : "archivado"}).`);
      await refresh();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      setMsg(`No se pudo eliminar: ${code}.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex flex-col text-xs grow">
          Buscar
          <input value={q} onChange={(e) => setQ(e.target.value)}
            className="input-neon !py-2 !text-sm" placeholder="Nombre, móvil, email…" />
        </label>
        <label className="flex flex-col text-xs">
          Rol
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
            className="input-neon !py-2 !text-sm">
            <option value="all">Todos</option>
            <option value="player">Jugador</option>
            <option value="captain">Capitán</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-court-muted self-end pb-2">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Ver archivados
        </label>
      </div>

      {msg && <p className="text-xs text-court-muted">{msg}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-court-muted">
            <tr><th className="text-left py-2">Jugador</th><th>Rol</th><th>Móvil</th><th>OVR</th><th>Stats</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {view.map((p) => (
              <tr key={p.id} className="border-t border-court-border">
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-2">
                    {p.avatar ? <img src={p.avatar} alt="" className="w-8 h-8 rounded object-cover" /> :
                      <div className="w-8 h-8 rounded bg-court-border flex items-center justify-center text-xs">{p.name.charAt(0)}</div>}
                    <span className="text-white">{p.name}</span>
                  </div>
                </td>
                <td className="text-center">{p.role}</td>
                <td className="text-center text-court-muted text-xs">{p.mobile}</td>
                <td className="text-center font-bold">{p.role === "admin" ? "—" : p.overall}</td>
                <td className="text-center">{p.role === "admin" ? "—" : (p.canEditStats ? "🔓" : "🔒")}</td>
                <td className="text-center text-xs">{p.archivedAt ? "Archivado" : "Activo"}</td>
                <td className="text-right space-x-1">
                  <button onClick={() => setEditing(p)} className="chip text-xs">Editar</button>
                  <button onClick={() => onDelete(p, false)} className="chip text-xs">Archivar</button>
                  <button onClick={() => onDelete(p, true)} className="chip text-xs text-court-warn">Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-xs text-court-muted">
        <span>{filtered.length} resultados</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} className="chip">«</button>
          <span>{page + 1} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="chip">»</button>
        </div>
      </div>

      {editing && (
        <AdminPlayerActions player={editing}
          onClose={() => setEditing(null)}
          onChanged={() => { refresh(); setEditing(null); }} />
      )}
    </div>
  );
}
