import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { playersApi, tournamentsApi, draftApi } from "@/lib/api";
import { Link } from "wouter";
import { Calendar, MapPin, Users, Play, Eye, Settings, Trophy, Clock, Search } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PlayerCard } from "@/components/PlayerCard";
import type { Player } from "@/lib/store";

const DEFAULT_TOURNAMENT_RULES = [
  "Formato 5v5 Cancha Completa",
  "Eliminacion Doble",
  "Dos partes de 20 minutos",
  "Seleccion por Draft de Capitanes",
  "Reglas FIBA",
];
const DEFAULT_TOURNAMENT_RULES_TEXT = DEFAULT_TOURNAMENT_RULES.join("\n");
const POSITION_OPTIONS = [
  { value: "base", label: "Base" },
  { value: "alero-base", label: "Alero-Base" },
  { value: "escolta", label: "Escolta" },
  { value: "alero", label: "Alero" },
  { value: "ala-pivot", label: "Ala-Pivot" },
  { value: "pivot", label: "Pivot" },
  { value: "alero-escolta", label: "Alero-Escolta" },
];

export default function AdminDashboard() {
  const { 
    tournaments, 
    players, 
    createTournament, 
    updateTournament, 
    deleteTournament,
    fetchPlayers,
    fetchTournaments
  } = useStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDate, setNewTournamentDate] = useState("");
  const [newTournamentLocation, setNewTournamentLocation] = useState("Pistas Municipales Villena");
  const [newTournamentDescription, setNewTournamentDescription] = useState("");
  const [newTournamentRules, setNewTournamentRules] = useState(DEFAULT_TOURNAMENT_RULES_TEXT);
  const { toast } = useToast();

  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [editTournamentName, setEditTournamentName] = useState("");
  const [editTournamentDate, setEditTournamentDate] = useState("");
  const [editTournamentLocation, setEditTournamentLocation] = useState("");
  const [editTournamentDescription, setEditTournamentDescription] = useState("");
  const [editTournamentRules, setEditTournamentRules] = useState(DEFAULT_TOURNAMENT_RULES_TEXT);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);


  const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);

  const [playerSearch, setPlayerSearch] = useState("");
  const [playerRoleFilter, setPlayerRoleFilter] = useState<"all" | "player" | "captain" | "admin">("all");
  const [playerMinOverall, setPlayerMinOverall] = useState(0);

  const [isPlayerEditOpen, setIsPlayerEditOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editRole, setEditRole] = useState<"player" | "captain" | "admin">("player");
  const [editPosition, setEditPosition] = useState("base");
  const [editAvatar, setEditAvatar] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editStats, setEditStats] = useState({
    pace: 50,
    shooting: 50,
    passing: 50,
    dribbling: 50,
    defense: 50,
    physical: 50,
  });
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordConfirm, setEditPasswordConfirm] = useState("");
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchPlayers(), fetchTournaments()])
      .finally(() => setIsLoading(false));
  }, []);

  const openTournaments = tournaments.filter(t => t.status === 'open');
  const draftTournaments = tournaments.filter(t => t.status === 'draft');
  const activeTournaments = tournaments.filter(t =>
    t.status === 'active' || t.status === 'draft' || t.status === 'open' || t.status === 'setup' || t.status === 'scheduled'
  );
  const pastTournaments = tournaments.filter(t => t.status === 'completed');
  const totalPlayers = players.length;
  const totalCaptains = players.filter(p => p.role === 'captain').length;
  const totalAdmins = players.filter(p => p.role === 'admin').length;

  const filteredPlayers = useMemo(() => {
    const term = playerSearch.trim().toLowerCase();
    return players.filter((player) => {
      if (playerRoleFilter !== "all" && player.role !== playerRoleFilter) return false;
      if ((player.overall || 0) < playerMinOverall) return false;
      if (!term) return true;
      const haystack = [
        player.name,
        player.username || "",
        player.email || "",
        player.mobile || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [players, playerSearch, playerRoleFilter, playerMinOverall]);

  const filteredCardPlayers = useMemo(() => {
    return filteredPlayers.filter((player) => player.role !== "admin");
  }, [filteredPlayers]);

  const handleCreateTournament = async () => {
    if (!newTournamentName || !newTournamentDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nombre y fecha son requeridos",
      });
      return;
    }

    try {
      await createTournament({
        name: newTournamentName,
        date: newTournamentDate,
        location: newTournamentLocation || "Pistas Municipales Villena",
        description: newTournamentDescription || "Nuevo torneo de la liga",
        rules: newTournamentRules || DEFAULT_TOURNAMENT_RULES_TEXT,
        maxTeams: 8,
      });
      setNewTournamentName("");
      setNewTournamentDate("");
      setNewTournamentLocation("Pistas Municipales Villena");
      setNewTournamentDescription("");
      setNewTournamentRules(DEFAULT_TOURNAMENT_RULES_TEXT);
      setIsCreateTournamentOpen(false);
      toast({ title: "Torneo Creado", description: "El torneo ha sido anadido al calendario." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al crear torneo",
      });
    }
  };

  const handleEditTournament = (tournament: typeof tournaments[0]) => {
    setEditingTournamentId(tournament.id);
    setEditTournamentName(tournament.name);
    setEditTournamentDate(tournament.date);
    setEditTournamentLocation(tournament.location);
    setEditTournamentDescription(tournament.description);
    setEditTournamentRules(tournament.rules || DEFAULT_TOURNAMENT_RULES_TEXT);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditTournament = async () => {
    if (!editingTournamentId) return;

    try {
      await updateTournament(editingTournamentId, {
        name: editTournamentName,
        date: editTournamentDate,
        location: editTournamentLocation,
        description: editTournamentDescription,
        rules: editTournamentRules || DEFAULT_TOURNAMENT_RULES_TEXT,
      });
      setIsEditDialogOpen(false);
      setEditingTournamentId(null);
      toast({ title: "Torneo Actualizado", description: "Los cambios han sido guardados." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al actualizar torneo",
      });
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm("Estas seguro de que quieres eliminar este torneo?")) return;

    try {
      await deleteTournament(id);
      toast({ title: "Torneo Eliminado", description: "El torneo ha sido eliminado." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al eliminar torneo",
      });
    }
  };

  const handleStatusChange = async (tournamentId: string, newStatus: string) => {
    try {
      await tournamentsApi.update(tournamentId, { status: newStatus });
      await fetchTournaments();
      toast({ title: "Estado actualizado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleStartDraft = async (tournamentId: string) => {
    try {
      const existingState = await draftApi.getState(tournamentId);
      if (existingState?.draftState?.isActive === 'true') {
        toast({ title: "Draft ya activo", description: "Usa la vista del torneo para gestionar el draft." });
        return;
      }
    } catch {}
    
    try {
      const result = await draftApi.start(tournamentId, 0);
      await fetchTournaments();
      if (!result.draftState) {
        toast({
          title: "Draft no iniciado",
          description: result.message || "No hay jugadores para draftear.",
        });
        return;
      }
      toast({ title: "Draft iniciado", description: "Los capitanes pueden empezar a elegir jugadores." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al iniciar draft", description: error.message });
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm("Eliminar este jugador?")) return;
    try {
      await playersApi.delete(playerId);
      await fetchPlayers();
      toast({ title: "Jugador eliminado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleOpenPlayerEdit = (player: Player) => {
    setPlayerToEdit(player);
    setEditName(player.name || "");
    setEditUsername(player.username || "");
    setEditEmail(player.email || "");
    setEditMobile(player.mobile || "");
    setEditRole((player.role as "player" | "captain" | "admin") || "player");
    setEditPosition(player.position || "base");
    setEditAvatar(player.avatar || "");
    setEditIsPublic(!!player.isPublic);
    setEditStats({
      pace: player.pace ?? 50,
      shooting: player.shooting ?? 50,
      passing: player.passing ?? 50,
      dribbling: player.dribbling ?? 50,
      defense: player.defense ?? 50,
      physical: player.physical ?? 50,
    });
    setEditPassword("");
    setEditPasswordConfirm("");
    setIsPlayerEditOpen(true);
  };

  const handleSavePlayerEdit = async () => {
    if (!playerToEdit) return;
    if (!editName.trim() || !editMobile.trim()) {
      toast({ variant: "destructive", title: "Nombre y movil son requeridos" });
      return;
    }
    if (editPassword && editPassword !== editPasswordConfirm) {
      toast({ variant: "destructive", title: "Las contrasenas no coinciden" });
      return;
    }

    const payload: any = {
      name: editName.trim(),
      username: editUsername.trim() || null,
      email: editEmail.trim() || null,
      mobile: editMobile.trim(),
      role: editRole,
      position: editPosition,
      avatar: editAvatar.trim() || null,
      isPublic: editIsPublic,
      pace: editStats.pace,
      shooting: editStats.shooting,
      passing: editStats.passing,
      dribbling: editStats.dribbling,
      defense: editStats.defense,
      physical: editStats.physical,
    };

    if (editPassword) {
      payload.password = editPassword;
    }

    setIsSavingPlayer(true);
    try {
      await playersApi.update(playerToEdit.id, payload);
      await fetchPlayers();
      setIsPlayerEditOpen(false);
      toast({ title: "Jugador actualizado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: "bg-green-500/20 text-green-400 border-green-500/50",
      draft: "bg-amber-500/20 text-amber-400 border-amber-500/50",
      setup: "bg-orange-500/20 text-orange-400 border-orange-500/50",
      scheduled: "bg-purple-500/20 text-purple-400 border-purple-500/50",
      active: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      completed: "bg-gray-500/20 text-gray-400 border-gray-500/50",
    };
    const labels: Record<string, string> = {
      open: "Inscripciones Abiertas",
      draft: "En Draft",
      setup: "Config. WhatsApp",
      scheduled: "En Espera",
      active: "En Curso",
      completed: "Finalizado",
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.open}>
        {labels[status] || status}
      </Badge>
    );
  };

  const editOverall = Math.round(
    (editStats.pace +
      editStats.shooting +
      editStats.passing +
      editStats.dribbling +
      editStats.defense +
      editStats.physical) / 6
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex justify-center items-center">
          <p className="text-xl">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-display font-bold">PANEL DE ADMINISTRADOR</h1>
          <div className="flex gap-2">
            <Dialog open={isCreateTournamentOpen} onOpenChange={setIsCreateTournamentOpen}>
              <DialogTrigger asChild>
                <Button className="font-display cursor-pointer" data-testid="button-new-tournament">
                  + NUEVO TORNEO
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">Crear Nuevo Torneo</DialogTitle>
                  <p className="text-sm text-muted-foreground">Completa la informacion del torneo. Todos los campos son importantes para que los jugadores conozcan los detalles.</p>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nombre del Torneo *</label>
                    <Input 
                      placeholder="Ej: Torneo Verano 2026" 
                      value={newTournamentName}
                      onChange={(e) => setNewTournamentName(e.target.value)}
                      className="bg-black/20 h-12"
                      data-testid="input-tournament-name"
                    />
                    <p className="text-xs text-muted-foreground">Nombre descriptivo que identifique el torneo</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Fecha del Torneo *</label>
                    <Input 
                      type="date"
                      value={newTournamentDate}
                      onChange={(e) => setNewTournamentDate(e.target.value)}
                      className="bg-black/20 h-12"
                      data-testid="input-tournament-date"
                    />
                    <p className="text-xs text-muted-foreground">Selecciona la fecha oficial del torneo</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ubicacion</label>
                    <Input 
                      placeholder="Ej: Pistas Municipales Villena" 
                      value={newTournamentLocation}
                      onChange={(e) => setNewTournamentLocation(e.target.value)}
                      className="bg-black/20 h-12"
                      data-testid="input-tournament-location"
                    />
                    <p className="text-xs text-muted-foreground">Direccion o nombre del lugar donde se jugara</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Descripcion</label>
                    <textarea 
                      placeholder="Describe el formato del torneo, premios, horarios estimados, etc."
                      value={newTournamentDescription}
                      onChange={(e) => setNewTournamentDescription(e.target.value)}
                      className="w-full bg-black/20 border border-input rounded-md px-3 py-2 min-h-[100px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid="input-tournament-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Reglas y formato</label>
                    <textarea
                      placeholder="Una regla por linea"
                      value={newTournamentRules}
                      onChange={(e) => setNewTournamentRules(e.target.value)}
                      className="w-full bg-black/20 border border-input rounded-md px-3 py-2 min-h-[120px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">Se mostrara en la ficha del torneo.</p>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <Button onClick={handleCreateTournament} className="w-full h-12 font-display text-lg tracking-wider cursor-pointer" data-testid="button-create-tournament">
                      CREAR TORNEO
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">Una vez creado, podras editar estos datos en cualquier momento</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Total Torneos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">{tournaments.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-400" />
                Inscripciones Abiertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-green-400">{openTournaments.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400" />
                Torneos en Draft
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-amber-400">{draftTournaments.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Jugadores Registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-primary">{totalPlayers}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Capitanes {totalCaptains} - Admins {totalAdmins}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <Play className="w-6 h-6 text-primary" />
            TORNEOS ACTIVOS
          </h2>
          
          {activeTournaments.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No hay torneos activos. Crea uno nuevo.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTournaments.map((t) => (
                <Card key={t.id} className="bg-white/5 border-white/10 hover:border-primary/50 transition-colors" data-testid={`card-tournament-${t.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-display text-xl">{t.name}</CardTitle>
                      {getStatusBadge(t.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{t.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{t.location}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/tournaments/${t.id}`}>
                        <Button size="sm" variant="outline" className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => handleEditTournament(t)}>
                        <Settings className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      
                      <Select value={t.status} onValueChange={(status) => handleStatusChange(t.id, status)}>
                        <SelectTrigger className="w-32 h-8 bg-transparent border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Abierto</SelectItem>
                          <SelectItem value="draft">En Draft</SelectItem>
                          <SelectItem value="setup">Config. WhatsApp</SelectItem>
                          <SelectItem value="scheduled">En Espera</SelectItem>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="completed">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {t.status === 'draft' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-display cursor-pointer"
                        onClick={() => handleStartDraft(t.id)}
                        data-testid={`button-start-draft-${t.id}`}
                      >
                        <Play className="w-4 h-4 mr-1" /> INICIAR DRAFT
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-muted-foreground" />
            TORNEOS PASADOS
          </h2>
          
          {pastTournaments.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No hay torneos finalizados.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pastTournaments.map((t) => (
                <Card key={t.id} className="bg-white/5 border-white/10 opacity-75" data-testid={`card-past-tournament-${t.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display text-lg">{t.name}</h3>
                      {getStatusBadge(t.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{t.date}</p>
                    <div className="flex gap-2">
                      <Link href={`/tournaments/${t.id}`}>
                        <Button size="sm" variant="ghost" className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-500 cursor-pointer"
                        onClick={() => handleDeleteTournament(t.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold">GESTION DE JUGADORES</h2>
              <p className="text-sm text-muted-foreground">Control total de perfiles, roles y rendimiento.</p>
            </div>
          </div>

          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar jugador por nombre, usuario o email..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    className="pl-9 bg-black/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={playerRoleFilter} onValueChange={(value) => setPlayerRoleFilter(value as "all" | "player" | "captain" | "admin")}>
                    <SelectTrigger className="bg-black/20">
                      <SelectValue placeholder="Filtrar por rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los roles</SelectItem>
                      <SelectItem value="player">Jugadores</SelectItem>
                      <SelectItem value="captain">Capitanes</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Min overall: {playerMinOverall}</Label>
                  <Slider
                    min={0}
                    max={99}
                    step={1}
                    value={[playerMinOverall]}
                    onValueChange={([value]) => setPlayerMinOverall(value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredCardPlayers.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No hay jugadores con esos filtros.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredCardPlayers.map((player) => (
                <div key={player.id} className="space-y-3" data-testid={`admin-player-card-${player.id}`}>
                  <PlayerCard
                    player={player}
                    onClick={() => handleOpenPlayerEdit(player)}
                    showSensitive
                  />
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-white/10 text-white/70 border-white/20">
                      {player.role === "admin" ? "ADMIN" : player.role === "captain" ? "CAPITAN" : "JUGADOR"}
                    </Badge>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      OVR {player.overall}
                    </Badge>
                    {player.isPublic ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                        Publico
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-white/10 text-white/50 border-white/20">
                        Privado
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => handleOpenPlayerEdit(player)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 cursor-pointer"
                      onClick={() => handleDeletePlayer(player.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Editar Torneo</DialogTitle>
            <p className="text-sm text-muted-foreground">Actualiza la informacion del torneo. Los cambios se reflejan al instante.</p>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nombre del Torneo *</label>
              <Input 
                placeholder="Nombre" 
                value={editTournamentName}
                onChange={(e) => setEditTournamentName(e.target.value)}
                className="bg-black/20 h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha del Torneo *</label>
              <Input 
                type="date"
                value={editTournamentDate}
                onChange={(e) => setEditTournamentDate(e.target.value)}
                className="bg-black/20 h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ubicacion</label>
              <Input 
                placeholder="Ubicacion" 
                value={editTournamentLocation}
                onChange={(e) => setEditTournamentLocation(e.target.value)}
                className="bg-black/20 h-12"
              />
              <p className="text-xs text-muted-foreground">Direccion o nombre del lugar</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Descripcion</label>
              <textarea 
                placeholder="Descripcion del torneo"
                value={editTournamentDescription}
                onChange={(e) => setEditTournamentDescription(e.target.value)}
                className="w-full bg-black/20 border border-input rounded-md px-3 py-2 min-h-[100px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reglas y formato</label>
              <textarea
                placeholder="Una regla por linea"
                value={editTournamentRules}
                onChange={(e) => setEditTournamentRules(e.target.value)}
                className="w-full bg-black/20 border border-input rounded-md px-3 py-2 min-h-[120px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="pt-2 border-t border-white/10">
              <Button onClick={handleSaveEditTournament} className="w-full h-12 font-display text-lg tracking-wider cursor-pointer">
                GUARDAR CAMBIOS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPlayerEditOpen} onOpenChange={setIsPlayerEditOpen}>
        <DialogContent className="bg-card border-white/10 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Editar jugador</DialogTitle>
            <p className="text-sm text-muted-foreground">Actualiza la ficha del jugador.</p>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre completo</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Usuario</label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Movil</label>
                <Input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Avatar (URL o base64)</label>
                <Input value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Rol</label>
                <Select value={editRole} onValueChange={(value) => setEditRole(value as "player" | "captain" | "admin")}>
                  <SelectTrigger className="bg-black/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Jugador</SelectItem>
                    <SelectItem value="captain">Capitan</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Posicion</label>
                <Select value={editPosition} onValueChange={setEditPosition}>
                  <SelectTrigger className="bg-black/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Perfil publico</p>
                  <p className="text-xs text-muted-foreground">Visible para usuarios no registrados.</p>
                </div>
                <Switch checked={editIsPublic} onCheckedChange={setEditIsPublic} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-muted-foreground mb-1">Overall calculado</p>
                <p className="text-3xl font-display text-primary font-bold">{editOverall}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Ritmo</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={editStats.pace}
                    onChange={(e) => setEditStats((prev) => ({ ...prev, pace: Number(e.target.value) || 0 }))}
                    className="bg-black/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Tiro</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={editStats.shooting}
                    onChange={(e) => setEditStats((prev) => ({ ...prev, shooting: Number(e.target.value) || 0 }))}
                    className="bg-black/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Pase</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={editStats.passing}
                    onChange={(e) => setEditStats((prev) => ({ ...prev, passing: Number(e.target.value) || 0 }))}
                    className="bg-black/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Regate</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={editStats.dribbling}
                    onChange={(e) => setEditStats((prev) => ({ ...prev, dribbling: Number(e.target.value) || 0 }))}
                    className="bg-black/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Defensa</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={editStats.defense}
                    onChange={(e) => setEditStats((prev) => ({ ...prev, defense: Number(e.target.value) || 0 }))}
                    className="bg-black/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Fisico</label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={editStats.physical}
                    onChange={(e) => setEditStats((prev) => ({ ...prev, physical: Number(e.target.value) || 0 }))}
                    className="bg-black/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Nueva contrasena</label>
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="bg-black/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Confirmar contrasena</label>
                  <Input
                    type="password"
                    value={editPasswordConfirm}
                    onChange={(e) => setEditPasswordConfirm(e.target.value)}
                    className="bg-black/20"
                  />
                </div>
              </div>
              <Button
                onClick={handleSavePlayerEdit}
                className="w-full font-display cursor-pointer"
                disabled={isSavingPlayer}
              >
                {isSavingPlayer ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
