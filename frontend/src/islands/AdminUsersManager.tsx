import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Player, Role } from "../lib/types.js";
import NeonInput from "../components/ui/NeonInput.js";
import NeonSelect from "../components/ui/NeonSelect.js";
import NeonButton from "../components/ui/NeonButton.js";
import NeonModal from "../components/ui/NeonModal.js";
import { useRevealStagger } from "../lib/neon.js";
import AdminPlayerActions from "./AdminPlayerActions.js";

interface Props { initial: Player[] }
const PAGE = 25;

type DeleteTarget = { player: Player; hard: boolean } | null;

export default function AdminUsersManager({ initial }: Props) {
  const [players, setPlayers] = useState<Player[]>(initial);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Player | null>(null);
  const [del, setDel] = useState<DeleteTarget>(null);
  const [delConfirm, setDelConfirm] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    try { setPlayers(await api<Player[]>("/players")); } catch { /* keep stale */ }
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

  const containerRef = useRevealStagger([view.length, q, roleFilter, showArchived]);

  const openDelete = (player: Player, hard: boolean) => {
    setDel({ player, hard }); setDelConfirm(""); setDelErr(null);
  };
  const closeDelete = () => { setDel(null); setDelConfirm(""); setDelErr(null); };

  const confirmDelete = async () => {
    if (!del) return;
    const expected = del.hard ? "BORRAR" : "ARCHIVAR";
    if (delConfirm !== expected) { setDelErr(`Escribe "${expected}" para confirmar.`); return; }
    setDelBusy(true); setDelErr(null);
    try {
      await api(`/players/${del.player.id}${del.hard ? "?hard=true" : ""}`, { method: "DELETE" });
      setMsg(`${del.player.name} ${del.hard ? "borrado" : "archivado"}.`);
      closeDelete();
      await refresh();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      setDelErr(`No se pudo eliminar (${code}).`);
    } finally { setDelBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
        <NeonInput label="Buscar" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, móvil, email…" />
        <NeonSelect label="Rol" value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "all")}>
          <option value="all">Todos</option>
          <option value="player">Jugador</option>
          <option value="captain">Capitán</option>
          <option value="admin">Admin</option>
        </NeonSelect>
        <label className="flex items-center gap-2 text-xs text-court-muted pb-2">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[var(--color-neon-orange)]" />
          Ver archivados
        </label>
      </div>

      {msg && <p className="text-xs text-court-muted">{msg}</p>}

      <div ref={containerRef} className="overflow-x-auto rounded-lg border border-court-border">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.25em] text-court-muted bg-court-bg/60">
            <tr>
              <th className="text-left py-2.5 pl-4">Jugador</th>
              <th>Rol</th>
              <th>Móvil</th>
              <th>OVR</th>
              <th>Stats</th>
              <th>Estado</th>
              <th className="pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-court-muted text-xs">Sin resultados.</td></tr>
            )}
            {view.map((p) => (
              <tr key={p.id} data-reveal className="neon-row border-t border-court-border">
                <td className="py-2 pl-4">
                  <div className="flex items-center gap-2">
                    {p.avatar ? (
                      <img src={p.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-court-border" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-court-border flex items-center justify-center text-xs text-white/70">{p.name.charAt(0)}</div>
                    )}
                    <span className="text-white">{p.name}</span>
                  </div>
                </td>
                <td className="text-center">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-court-border text-court-muted">{p.role}</span>
                </td>
                <td className="text-center text-court-muted text-xs">{p.mobile}</td>
                <td className="text-center font-display text-base">{p.role === "admin" ? "—" : p.overall}</td>
                <td className="text-center">{p.role === "admin" ? "—" : (p.canEditStats ? "🔓" : "🔒")}</td>
                <td className="text-center text-[10px] uppercase tracking-widest">{p.archivedAt ? <span className="text-court-warn">Archivado</span> : <span className="text-court-ok">Activo</span>}</td>
                <td className="pr-4 text-right whitespace-nowrap">
                  <div className="inline-flex gap-1">
                    <NeonButton variant="ghost" size="sm" onClick={() => setEditing(p)} title="Editar">✎</NeonButton>
                    <NeonButton variant="ghost" size="sm" onClick={() => openDelete(p, false)} title="Archivar">📦</NeonButton>
                    <NeonButton variant="danger" size="sm" onClick={() => openDelete(p, true)} title="Borrar">🗑</NeonButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-xs text-court-muted">
        <span>{filtered.length} resultados</span>
        <div className="flex gap-2 items-center">
          <NeonButton variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>«</NeonButton>
          <span>{page + 1} / {pages}</span>
          <NeonButton variant="ghost" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>»</NeonButton>
        </div>
      </div>

      {editing && (
        <AdminPlayerActions player={editing}
          onClose={() => setEditing(null)}
          onChanged={() => { refresh(); setEditing(null); }} />
      )}

      <NeonModal open={!!del} title={del?.hard ? "Borrar definitivamente" : "Archivar jugador"}
        subtitle={del?.player.name} onClose={closeDelete} hideCancel>
        <div className="space-y-3">
          <p className="text-sm text-court-muted">
            {del?.hard
              ? "Esta operación elimina al jugador y todos sus datos asociados (achievements custom, fotos, registros). Solo permitido si nunca fue capitán."
              : "Archivar oculta al jugador de la lista activa pero conserva su historial. Puedes revertirlo cambiando el filtro."}
          </p>
          <NeonInput label={`Escribe ${del?.hard ? '"BORRAR"' : '"ARCHIVAR"'} para confirmar`}
            value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} autoFocus
            error={delErr ?? null} />
          <div className="flex gap-2 justify-end">
            <NeonButton variant="ghost" size="sm" disabled={delBusy} onClick={closeDelete}>Cancelar</NeonButton>
            <NeonButton variant={del?.hard ? "danger" : "primary"} size="sm" disabled={delBusy} onClick={confirmDelete}>
              {delBusy ? "Eliminando…" : del?.hard ? "Borrar definitivamente" : "Archivar"}
            </NeonButton>
          </div>
        </div>
      </NeonModal>
    </div>
  );
}
