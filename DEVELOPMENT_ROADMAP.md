# Villena Basket League - Roadmap de Desarrollo

## Estado Actual
La aplicación tiene el esqueleto completo pero faltan funcionalidades críticas para que sea completamente operativa.

---

## SPRINT 1: Corrección de Errores Críticos
**Prioridad: URGENTE**
**Duración estimada: 2 horas**

### Tarea 1.1: Arreglar errores LSP en TournamentDetails.tsx
**Problema:** Los tipos Player y Tournament no están exportados correctamente desde api.ts
**Solución:**
```typescript
// client/src/lib/api.ts - Exportar los tipos
export interface Player {
  id: string;
  name: string;
  mobile: string;
  role: 'player' | 'captain' | 'admin';
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  overall: number;
  avatar?: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  status: 'open' | 'draft' | 'active' | 'completed';
  location: string;
  description: string;
  maxTeams: number;
  winnerId?: string;
}
```

### Tarea 1.2: Persistencia de sesión al recargar
**Problema:** Al recargar la página, el usuario pierde la sesión
**Solución:**
```typescript
// client/src/App.tsx - Añadir useEffect para verificar sesión
import { useEffect } from 'react';
import { authApi } from './lib/api';

function App() {
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  useEffect(() => {
    // Verificar sesión al cargar
    authApi.me().then((data) => {
      if (data?.player) {
        setCurrentUser(data.player);
      }
    }).catch(() => {
      // No hay sesión activa
    });
  }, []);

  // resto del código...
}
```

---

## SPRINT 2: Foto Obligatoria
**Prioridad: ALTA**
**Duración estimada: 1 hora**

### Tarea 2.1: Validación frontend en registro
**Problema:** La foto es opcional, debe ser obligatoria
**Solución:**
```typescript
// client/src/pages/Register.tsx
// Añadir validación antes de submit
async function onSubmit(values: z.infer<typeof formSchema>) {
  if (!previewImage) {
    toast({
      variant: "destructive",
      title: "Foto requerida",
      description: "Debes subir una foto para completar el registro.",
    });
    return;
  }
  // resto del código...
}
```

### Tarea 2.2: Validación backend
**Solución:**
```typescript
// server/routes.ts - En POST /api/players/register
app.post("/api/players/register", async (req, res) => {
  if (!req.body.avatar) {
    return res.status(400).json({ error: "La foto es obligatoria" });
  }
  // resto del código...
});
```

---

## SPRINT 3: Privacidad de Datos
**Prioridad: ALTA**
**Duración estimada: 2 horas**

### Tarea 3.1: Ocultar móviles en vistas públicas
**Problema:** Los números de móvil se muestran a todos
**Solución:**
```typescript
// server/routes.ts - Modificar GET /api/players
app.get("/api/players", async (req, res) => {
  const players = await storage.getAllPlayers();
  const isAuthenticated = !!req.session.playerId;
  
  const safePlayers = players.map(p => {
    const { password, ...safe } = p;
    // Ocultar móvil si no está autenticado
    if (!isAuthenticated) {
      safe.mobile = "***";
    }
    return safe;
  });
  res.json({ players: safePlayers });
});
```

### Tarea 3.2: PlayerCard con prop showMobile
**Solución:**
```typescript
// client/src/components/PlayerCard.tsx
interface PlayerCardProps {
  player: Player;
  showMobile?: boolean; // false por defecto para público
}

// En el render:
{showMobile && player.mobile !== "***" && (
  <p className="text-xs text-primary font-mono">{player.mobile}</p>
)}
```

---

## SPRINT 4: Página Pública de Jugadores
**Prioridad: MEDIA**
**Duración estimada: 1 hora**

### Tarea 4.1: Crear PlayersPage.tsx
**Problema:** /players usa CaptainDashboard, debe ser página dedicada
**Solución:**
```typescript
// client/src/pages/PlayersPage.tsx
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { PlayerCard } from "@/components/PlayerCard";

export default function PlayersPage() {
  const { players, fetchPlayers } = useStore();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const publicPlayers = players.filter(p => p.role !== 'admin');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-display font-bold mb-8">JUGADORES</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {publicPlayers.map(player => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              showMobile={false} // Vista pública
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Tarea 4.2: Actualizar App.tsx
```typescript
// client/src/App.tsx
import PlayersPage from "@/pages/PlayersPage";

<Route path="/players" component={PlayersPage} />
```

---

## SPRINT 5: APIs de Equipos (Backend)
**Prioridad: ALTA**
**Duración estimada: 3 horas**

### Tarea 5.1: Storage para equipos
**Solución:**
```typescript
// server/storage.ts - Añadir métodos
async getTeam(id: string): Promise<Team | undefined> {
  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  return team;
}

async deleteTeam(id: string): Promise<boolean> {
  await db.delete(teams).where(eq(teams.id, id));
  return true;
}

async getTeamByCaptain(captainId: string): Promise<Team | undefined> {
  const [team] = await db.select().from(teams).where(eq(teams.captainId, captainId));
  return team;
}
```

### Tarea 5.2: APIs de equipos
**Solución:**
```typescript
// server/routes.ts

// GET /api/tournaments/:id/teams
app.get("/api/tournaments/:id/teams", async (req, res) => {
  const teams = await storage.getTeamsForTournament(req.params.id);
  res.json({ teams });
});

// POST /api/teams
app.post("/api/teams", async (req, res) => {
  // Solo admin
  if (!req.session.playerId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  const currentPlayer = await storage.getPlayer(req.session.playerId);
  if (!currentPlayer || currentPlayer.role !== 'admin') {
    return res.status(403).json({ error: "Solo administradores" });
  }

  const { tournamentId, captainId, name } = req.body;
  if (!tournamentId || !captainId || !name) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const team = await storage.createTeam({ tournamentId, captainId, name });
  res.json({ team });
});

// DELETE /api/teams/:id
app.delete("/api/teams/:id", async (req, res) => {
  // Solo admin
  if (!req.session.playerId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  const currentPlayer = await storage.getPlayer(req.session.playerId);
  if (!currentPlayer || currentPlayer.role !== 'admin') {
    return res.status(403).json({ error: "Solo administradores" });
  }

  await storage.deleteTeam(req.params.id);
  res.json({ success: true });
});

// GET /api/teams/captain/:captainId
app.get("/api/teams/captain/:captainId", async (req, res) => {
  const team = await storage.getTeamByCaptain(req.params.captainId);
  if (!team) {
    return res.status(404).json({ error: "Equipo no encontrado" });
  }
  const players = await storage.getPlayersForTeam(team.id);
  res.json({ team, players });
});
```

---

## SPRINT 6: Gestión de Estados de Torneo
**Prioridad: ALTA**
**Duración estimada: 2 horas**

### Tarea 6.1: API para cambiar estado
**Solución:**
```typescript
// server/routes.ts
app.patch("/api/tournaments/:id/status", async (req, res) => {
  // Solo admin
  if (!req.session.playerId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  const currentPlayer = await storage.getPlayer(req.session.playerId);
  if (!currentPlayer || currentPlayer.role !== 'admin') {
    return res.status(403).json({ error: "Solo administradores" });
  }

  const { status } = req.body;
  const validStatuses = ['open', 'draft', 'active', 'completed'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado inválido" });
  }
  
  const tournament = await storage.updateTournament(req.params.id, { status });
  res.json({ tournament });
});
```

### Tarea 6.2: API client para cambiar estado
**Solución:**
```typescript
// client/src/lib/api.ts
export const tournamentsApi = {
  // ... métodos existentes ...

  async updateStatus(id: string, status: string): Promise<{ tournament: Tournament }> {
    const res = await fetch(`/api/tournaments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update status');
    }
    return res.json();
  },
};
```

### Tarea 6.3: UI en AdminDashboard
**Solución:**
```typescript
// client/src/pages/AdminDashboard.tsx
// Añadir función para cambiar estado
const handleStatusChange = async (tournamentId: string, newStatus: string) => {
  try {
    await tournamentsApi.updateStatus(tournamentId, newStatus);
    await fetchTournaments();
    toast({ title: "Estado actualizado" });
  } catch (error) {
    toast({ variant: "destructive", title: "Error", description: error.message });
  }
};

// En la tabla, reemplazar Badge por Select
<Select 
  value={t.status}
  onValueChange={(status) => handleStatusChange(t.id, status)}
>
  <SelectTrigger className="w-32 h-8">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="open">Abierto</SelectItem>
    <SelectItem value="draft">En Draft</SelectItem>
    <SelectItem value="active">Activo</SelectItem>
    <SelectItem value="completed">Finalizado</SelectItem>
  </SelectContent>
</Select>
```

---

## SPRINT 7: Gestión Completa de Jugadores (Admin)
**Prioridad: MEDIA**
**Duración estimada: 2 horas**

### Tarea 7.1: Storage deletePlayer
**Solución:**
```typescript
// server/storage.ts
async deletePlayer(id: string): Promise<boolean> {
  await db.delete(players).where(eq(players.id, id));
  return true;
}
```

### Tarea 7.2: APIs editar/eliminar jugador
**Solución:**
```typescript
// server/routes.ts

// PATCH /api/players/:id (Editar jugador)
app.patch("/api/players/:id", async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  const currentPlayer = await storage.getPlayer(req.session.playerId);
  if (!currentPlayer || currentPlayer.role !== 'admin') {
    return res.status(403).json({ error: "Solo administradores" });
  }

  try {
    const player = await storage.updatePlayer(req.params.id, req.body);
    if (!player) {
      return res.status(404).json({ error: "Jugador no encontrado" });
    }
    const { password, ...safePlayer } = player;
    res.json({ player: safePlayer });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar jugador" });
  }
});

// DELETE /api/players/:id
app.delete("/api/players/:id", async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  const currentPlayer = await storage.getPlayer(req.session.playerId);
  if (!currentPlayer || currentPlayer.role !== 'admin') {
    return res.status(403).json({ error: "Solo administradores" });
  }

  try {
    await storage.deletePlayer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar jugador" });
  }
});
```

### Tarea 7.3: API client
**Solución:**
```typescript
// client/src/lib/api.ts
export const playersApi = {
  // ... métodos existentes ...

  async update(id: string, data: Partial<RegisterPlayerData>): Promise<{ player: Player }> {
    const res = await fetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update player');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/players/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete player');
  },
};
```

### Tarea 7.4: UI en AdminDashboard
**Solución:**
```typescript
// AdminDashboard.tsx - Añadir funciones y botones
const handleDeletePlayer = async (playerId: string) => {
  if (!confirm("¿Eliminar este jugador?")) return;
  try {
    await playersApi.delete(playerId);
    await fetchPlayers();
    toast({ title: "Jugador eliminado" });
  } catch (error) {
    toast({ variant: "destructive", title: "Error" });
  }
};

// En la tabla de jugadores
<TableCell className="space-x-2">
  {p.role === 'player' && (
    <>
      <Button size="sm" variant="outline" onClick={() => openPromoteDialog(p.id)}>
        Hacer Capitán
      </Button>
      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeletePlayer(p.id)}>
        Eliminar
      </Button>
    </>
  )}
</TableCell>
```

---

## SPRINT 8: UI Creación de Equipos (Admin)
**Prioridad: ALTA**
**Duración estimada: 2 horas**

### Tarea 8.1: API client para equipos
**Solución:**
```typescript
// client/src/lib/api.ts
export const teamsApi = {
  async getForTournament(tournamentId: string): Promise<{ teams: Team[] }> {
    const res = await fetch(`/api/tournaments/${tournamentId}/teams`);
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  },

  async create(data: { tournamentId: string; captainId: string; name: string }): Promise<{ team: Team }> {
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create team');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete team');
  },

  async getByCaptain(captainId: string): Promise<{ team: Team; players: Player[] }> {
    const res = await fetch(`/api/teams/captain/${captainId}`);
    if (!res.ok) throw new Error('No team found');
    return res.json();
  },
};
```

### Tarea 8.2: Tab de Equipos en AdminDashboard
**Solución:**
```typescript
// client/src/pages/AdminDashboard.tsx
// Añadir estado para equipos
const [selectedTournamentForTeams, setSelectedTournamentForTeams] = useState<string>("");
const [teamsForTournament, setTeamsForTournament] = useState<Team[]>([]);
const [newTeamName, setNewTeamName] = useState("");
const [selectedCaptainId, setSelectedCaptainId] = useState("");

// Función para cargar equipos
const loadTeams = async (tournamentId: string) => {
  if (!tournamentId) return;
  const { teams } = await teamsApi.getForTournament(tournamentId);
  setTeamsForTournament(teams);
};

// Función para crear equipo
const handleCreateTeam = async () => {
  if (!selectedTournamentForTeams || !selectedCaptainId || !newTeamName) {
    toast({ variant: "destructive", title: "Completa todos los campos" });
    return;
  }
  try {
    await teamsApi.create({
      tournamentId: selectedTournamentForTeams,
      captainId: selectedCaptainId,
      name: newTeamName,
    });
    setNewTeamName("");
    setSelectedCaptainId("");
    await loadTeams(selectedTournamentForTeams);
    toast({ title: "Equipo creado" });
  } catch (error) {
    toast({ variant: "destructive", title: "Error al crear equipo" });
  }
};

// Añadir nueva pestaña
<TabsTrigger value="teams">Equipos</TabsTrigger>

<TabsContent value="teams">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    {/* Formulario crear equipo */}
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Crear Equipo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select onValueChange={(v) => { setSelectedTournamentForTeams(v); loadTeams(v); }}>
          <SelectTrigger><SelectValue placeholder="Selecciona torneo" /></SelectTrigger>
          <SelectContent>
            {tournaments.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input 
          placeholder="Nombre del equipo" 
          value={newTeamName} 
          onChange={(e) => setNewTeamName(e.target.value)} 
        />
        
        <Select onValueChange={setSelectedCaptainId}>
          <SelectTrigger><SelectValue placeholder="Selecciona capitán" /></SelectTrigger>
          <SelectContent>
            {players.filter(p => p.role === 'captain').map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button onClick={handleCreateTeam} className="w-full">Crear Equipo</Button>
      </CardContent>
    </Card>

    {/* Lista de equipos */}
    <Card className="md:col-span-2 bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Equipos del Torneo</CardTitle>
      </CardHeader>
      <CardContent>
        {teamsForTournament.length === 0 ? (
          <p className="text-muted-foreground">Selecciona un torneo para ver sus equipos</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Capitán</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamsForTournament.map(team => (
                <TableRow key={team.id}>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>{players.find(p => p.id === team.captainId)?.name}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-red-500" 
                      onClick={async () => {
                        await teamsApi.delete(team.id);
                        await loadTeams(selectedTournamentForTeams);
                      }}>
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  </div>
</TabsContent>
```

---

## SPRINT 9: Captain Dashboard - Conexión API
**Prioridad: CRÍTICA**
**Duración estimada: 3 horas**

### Tarea 9.1: Actualizar CaptainDashboard completo
**Solución:**
```typescript
// client/src/pages/CaptainDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { playersApi, teamsApi, draftApi, tournamentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function CaptainDashboard() {
  const { currentUser } = useStore();
  const { toast } = useToast();
  
  const [allPlayers, setAllPlayers] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [myTeamPlayers, setMyTeamPlayers] = useState([]);
  const [tournamentPlayers, setTournamentPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  async function loadData() {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      // Cargar todos los jugadores
      const { players } = await playersApi.getAll();
      setAllPlayers(players.filter(p => p.role === 'player'));

      // Si es capitán, cargar su equipo
      if (currentUser.role === 'captain') {
        try {
          const { team, players: teamPlayers } = await teamsApi.getByCaptain(currentUser.id);
          setMyTeam(team);
          setMyTeamPlayers(teamPlayers);

          // Cargar jugadores inscritos en el torneo
          const { registeredPlayers } = await tournamentsApi.getById(team.tournamentId);
          setTournamentPlayers(registeredPlayers);
        } catch (e) {
          // El capitán aún no tiene equipo asignado
          setMyTeam(null);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDraft(playerId: string) {
    if (!myTeam) {
      toast({ variant: "destructive", title: "No tienes equipo asignado" });
      return;
    }

    try {
      await draftApi.draftPlayer(myTeam.id, playerId);
      toast({ title: "Jugador drafteado!" });
      await loadData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error al draftear", description: error.message });
    }
  }

  const isCaptainView = currentUser?.role === 'captain';

  // Filtrar jugadores disponibles (inscritos en torneo, no drafteados)
  const draftedPlayerIds = myTeamPlayers.map(p => p.id);
  const availablePlayers = useMemo(() => {
    const basePlayers = isCaptainView && tournamentPlayers.length > 0 
      ? tournamentPlayers 
      : allPlayers;
    
    return basePlayers.filter(p => 
      p.role === 'player' &&
      !draftedPlayerIds.includes(p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      p.overall >= minRating
    );
  }, [allPlayers, tournamentPlayers, search, minRating, draftedPlayerIds]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col md:flex-row pt-16">
        {/* Sidebar */}
        <aside className="hidden md:block w-80 border-r border-white/10 bg-black/20 p-6 fixed h-full overflow-y-auto">
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-2xl mb-4">FILTROS DRAFT</h2>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar jugador..." 
                  className="pl-9 bg-white/5 border-white/10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Media Mínima</span>
                <span className="text-sm text-primary font-bold">{minRating}</span>
              </div>
              <Slider 
                min={0} max={99} step={1} 
                value={[minRating]} 
                onValueChange={(val) => setMinRating(val[0])}
              />
            </div>
            
            {isCaptainView && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="font-display text-lg text-primary mb-2">TU PLANTILLA</h3>
                {myTeam ? (
                  <>
                    <p className="text-sm font-bold mb-2">{myTeam.name}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {myTeamPlayers.length} Jugadores
                    </p>
                    <div className="space-y-2">
                      {myTeamPlayers.map(player => (
                        <div key={player.id} className="flex items-center gap-2">
                          <img src={player.avatar} className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-sm truncate flex-1">{player.name}</span>
                          <span className="text-xs text-primary font-bold">{player.overall}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tienes equipo asignado. Contacta al administrador.
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-80 p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-display text-4xl font-bold">
              {isCaptainView ? "SALA DE DRAFT" : "AGENTES LIBRES"}
            </h1>
            <span className="text-muted-foreground">{availablePlayers.length} Disponibles</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
            {availablePlayers.map((player) => (
              <div key={player.id} className="relative group">
                <PlayerCard 
                  player={player} 
                  showSensitive={!!currentUser}
                />
                {isCaptainView && myTeam && (
                  <Button 
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 opacity-0 group-hover:opacity-100 transition-opacity font-display tracking-wider bg-primary text-black hover:bg-white z-30 cursor-pointer"
                    onClick={() => handleDraft(player.id)}
                  >
                    DRAFTEAR
                  </Button>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
```

---

## SPRINT 10: Sistema de Turnos de Draft
**Prioridad: MEDIA-ALTA**
**Duración estimada: 4 horas**

### Tarea 10.1: Schema para estado de draft
**Solución:**
```typescript
// shared/schema.ts - Añadir tabla draftState
export const draftState = pgTable("draft_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  currentTeamIndex: integer("current_team_index").notNull().default(0),
  round: integer("round").notNull().default(1),
  teamOrder: text("team_order").array().notNull(), // Array de team IDs
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### Tarea 10.2: Storage para draft state
**Solución:**
```typescript
// server/storage.ts
async getDraftState(tournamentId: string): Promise<DraftState | undefined> {
  const [state] = await db.select().from(draftState)
    .where(eq(draftState.tournamentId, tournamentId));
  return state;
}

async createDraftState(data: InsertDraftState): Promise<DraftState> {
  const [state] = await db.insert(draftState).values(data).returning();
  return state!;
}

async advanceDraftTurn(tournamentId: string): Promise<DraftState | undefined> {
  const state = await this.getDraftState(tournamentId);
  if (!state) return undefined;

  let nextIndex = state.currentTeamIndex + 1;
  let nextRound = state.round;

  if (nextIndex >= state.teamOrder.length) {
    nextIndex = 0;
    nextRound += 1;
  }

  const [updated] = await db.update(draftState)
    .set({ currentTeamIndex: nextIndex, round: nextRound })
    .where(eq(draftState.tournamentId, tournamentId))
    .returning();
  return updated;
}
```

### Tarea 10.3: APIs de draft avanzadas
**Solución:**
```typescript
// server/routes.ts

// POST /api/draft/start/:tournamentId - Iniciar draft
app.post("/api/draft/start/:tournamentId", async (req, res) => {
  // Solo admin - verificar sesión
  const teams = await storage.getTeamsForTournament(req.params.tournamentId);
  if (teams.length < 2) {
    return res.status(400).json({ error: "Se necesitan al menos 2 equipos" });
  }

  // Orden aleatorio
  const teamOrder = teams.map(t => t.id).sort(() => Math.random() - 0.5);
  
  const state = await storage.createDraftState({
    tournamentId: req.params.tournamentId,
    teamOrder,
    isActive: true,
  });
  
  // Cambiar estado del torneo
  await storage.updateTournament(req.params.tournamentId, { status: 'draft' });
  
  res.json({ draftState: state });
});

// GET /api/draft/state/:tournamentId - Estado actual del draft
app.get("/api/draft/state/:tournamentId", async (req, res) => {
  const state = await storage.getDraftState(req.params.tournamentId);
  if (!state) {
    return res.status(404).json({ error: "Draft no iniciado" });
  }

  const currentTeamId = state.teamOrder[state.currentTeamIndex];
  const currentTeam = await storage.getTeam(currentTeamId);

  res.json({
    ...state,
    currentTeam,
    isMyTurn: currentTeam?.captainId === req.session.playerId,
  });
});

// Modificar POST /api/draft para avanzar turno
app.post("/api/draft", async (req, res) => {
  // ... código existente ...
  
  // Después de draftear exitosamente, avanzar turno
  const team = await storage.getTeam(teamId);
  if (team) {
    await storage.advanceDraftTurn(team.tournamentId);
  }

  res.json({ teamPlayer });
});
```

### Tarea 10.4: UI indicador de turno en CaptainDashboard
**Solución:**
```typescript
// Añadir al CaptainDashboard
const [draftState, setDraftState] = useState(null);

// En loadData():
if (myTeam) {
  const stateRes = await fetch(`/api/draft/state/${myTeam.tournamentId}`);
  if (stateRes.ok) {
    const state = await stateRes.json();
    setDraftState(state);
  }
}

// En el sidebar:
{draftState && (
  <div className={`p-4 rounded-lg border ${draftState.isMyTurn ? 'bg-green-500/20 border-green-500 animate-pulse' : 'bg-white/5 border-white/10'}`}>
    <h3 className="font-display text-lg mb-2">
      {draftState.isMyTurn ? '¡ES TU TURNO!' : 'Estado del Draft'}
    </h3>
    <p className="text-sm">Ronda: {draftState.round}</p>
    {!draftState.isMyTurn && draftState.currentTeam && (
      <p className="text-sm text-muted-foreground">
        Turno de: {draftState.currentTeam.name}
      </p>
    )}
  </div>
)}
```

---

## SPRINT 11: Cursor Pointer y UX
**Prioridad: BAJA**
**Duración estimada: 1 hora**

### Tarea 11.1: CSS global para cursor pointer
**Solución:**
```css
/* client/src/index.css - Añadir al final */
button:not(:disabled),
[role="button"]:not(:disabled),
a:not(:disabled),
.cursor-pointer,
[data-testid^="button-"],
[data-testid^="link-"],
.group:hover .group-hover\\:opacity-100 {
  cursor: pointer;
}

/* Asegurar que Select triggers tengan cursor */
[data-radix-collection-item] {
  cursor: pointer;
}
```

### Tarea 11.2: Revisar componentes
- Añadir `cursor-pointer` a todos los Button que no lo tengan
- Verificar en: Home, Register, Login, AdminDashboard, CaptainDashboard, TournamentDetails, Navbar

---

## SPRINT 12: Testing Final
**Prioridad: ALTA**
**Duración estimada: 2 horas**

### Lista de verificación:

#### Flujo Público
- [ ] Ver página principal con torneos
- [ ] Ver detalles de torneo
- [ ] Ver jugadores (sin móviles)
- [ ] Registrarse como jugador (foto obligatoria)

#### Flujo Admin
- [ ] Login: edvardks / SX515wifi
- [ ] Crear torneo
- [ ] Editar torneo
- [ ] Cambiar estado de torneo
- [ ] Eliminar torneo
- [ ] Ver lista de jugadores
- [ ] Promover jugador a capitán
- [ ] Eliminar jugador
- [ ] Crear equipo (asignar capitán)
- [ ] Eliminar equipo
- [ ] Iniciar draft

#### Flujo Capitán
- [ ] Login con móvil + contraseña
- [ ] Ver jugadores disponibles (solo del torneo)
- [ ] Ver indicador de turno
- [ ] Draftear jugador (solo si es tu turno)
- [ ] Ver equipo actual con jugadores

#### Persistencia
- [ ] Sesión se mantiene al recargar
- [ ] Datos se guardan en base de datos
- [ ] Logout funciona correctamente

---

## Resumen de Prioridades

| Sprint | Nombre | Prioridad | Horas |
|--------|--------|-----------|-------|
| 1 | Errores Críticos | URGENTE | 2h |
| 2 | Foto Obligatoria | ALTA | 1h |
| 3 | Privacidad Datos | ALTA | 2h |
| 4 | Página Jugadores | MEDIA | 1h |
| 5 | APIs Equipos | ALTA | 3h |
| 6 | Estados Torneo | ALTA | 2h |
| 7 | CRUD Jugadores | MEDIA | 2h |
| 8 | UI Equipos | ALTA | 2h |
| 9 | Captain API | CRÍTICA | 3h |
| 10 | Turnos Draft | MEDIA-ALTA | 4h |
| 11 | Cursor/UX | BAJA | 1h |
| 12 | Testing | ALTA | 2h |

**Total estimado: 25 horas de desarrollo**

---

## Orden Recomendado de Ejecución

1. Sprint 1 (Errores críticos)
2. Sprint 2 (Foto obligatoria)
3. Sprint 3 (Privacidad)
4. Sprint 5 (APIs Equipos)
5. Sprint 6 (Estados Torneo)
6. Sprint 8 (UI Equipos Admin)
7. Sprint 9 (Captain Dashboard)
8. Sprint 10 (Turnos Draft)
9. Sprint 4 (Página Jugadores)
10. Sprint 7 (CRUD Jugadores)
11. Sprint 11 (UX)
12. Sprint 12 (Testing)
