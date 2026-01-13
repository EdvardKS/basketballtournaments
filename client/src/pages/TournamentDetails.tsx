import { useRoute, Link } from "wouter";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, Crown, AlertCircle, UserPlus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect, useCallback, useMemo } from "react";
import { tournamentsApi, teamsApi, draftApi, playersApi, registrationsApi, type Player, type Tournament, type Team, type DraftStateResponse, type TournamentRegistration } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SkillRadarChart } from "@/components/SkillRadarChart";
import { TournamentGroupsView } from "@/components/TournamentGroupsView";
import { PlayerCard } from "@/components/PlayerCard";

type PlayerWithRegistration = Player & { isCaptain: boolean };

const DEFAULT_TOURNAMENT_RULES = [
  "Formato 5v5 Cancha Completa",
  "Eliminacion Doble",
  "Dos partes de 20 minutos",
  "Seleccion por Draft de Capitanes",
  "Reglas FIBA",
];
const DEFAULT_TOURNAMENT_RULES_TEXT = DEFAULT_TOURNAMENT_RULES.join("\n");

export default function TournamentDetails() {
  const [match, params] = useRoute("/tournaments/:id");
  const { currentUser } = useStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftState, setDraftState] = useState<DraftStateResponse | null>(null);
  const [draftedPlayerIds, setDraftedPlayerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerUsername, setNewPlayerUsername] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerMobile, setNewPlayerMobile] = useState("");
  const [newPlayerPassword, setNewPlayerPassword] = useState("");
  const [newPlayerConfirmPassword, setNewPlayerConfirmPassword] = useState("");
  const [newPlayerIsPublic, setNewPlayerIsPublic] = useState(false);
  const [newPlayerStats, setNewPlayerStats] = useState({
    pace: 50, shooting: 50, passing: 50, dribbling: 50, defense: 50, physical: 50
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [isSavingTeamName, setIsSavingTeamName] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "player" | "captain">("all");
  const [minOverall, setMinOverall] = useState(0);
  const [statFilter, setStatFilter] = useState<"overall" | "pace" | "shooting" | "passing" | "dribbling" | "defense" | "physical">("overall");
  const [minStat, setMinStat] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [rulesDraft, setRulesDraft] = useState(DEFAULT_TOURNAMENT_RULES_TEXT);
  const [isSavingRules, setIsSavingRules] = useState(false);

  const [isPlayerEditOpen, setIsPlayerEditOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editRole, setEditRole] = useState<"player" | "captain" | "admin">("player");
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
  
  const loadTournament = useCallback(async (id: string) => {
    try {
      const data = await tournamentsApi.getById(id);
      setTournament(data.tournament);

      const registrationsRes = await registrationsApi.getForTournament(id);
      setRegistrations(registrationsRes.registrations);
      setRegisteredPlayers(registrationsRes.registrations.map(r => r.player));

      const { teams: tournamentTeams } = await teamsApi.getForTournament(id);
      setTeams(tournamentTeams);

      const allDraftedIds: string[] = [];
      for (const team of tournamentTeams) {
        try {
          const teamData = await teamsApi.getByCaptain(team.captainId, id);
          if (teamData.players) {
            allDraftedIds.push(...teamData.players.map(p => p.id));
          }
        } catch {}
      }
      setDraftedPlayerIds(allDraftedIds);

      if (data.tournament.status === 'draft') {
        try {
          const state = await draftApi.getState(id);
          setDraftState(state);
        } catch {
          setDraftState(null);
        }
      }
    } catch (error) {
      console.error("Failed to load tournament:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el torneo",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (match && params?.id) {
      setIsLoading(true);
      loadTournament(params.id).finally(() => setIsLoading(false));
    }
  }, [match, params?.id, loadTournament]);

  useEffect(() => {
    if (!params?.id) return;
    const interval = setInterval(() => {
      loadTournament(params.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [params?.id, loadTournament]);

  useEffect(() => {
    if (!currentUser) return;
    const myTeam = teams.find(t => t.captainId === currentUser.id);
    if (myTeam && !myTeam.nameConfirmed) {
      setTeamNameInput(myTeam.name);
    }
  }, [teams, currentUser]);

  const handleRefresh = async () => {
    if (params?.id) {
      await loadTournament(params.id);
      toast({ title: "Actualizado" });
    }
  };

  const handleDraftPlayer = async (playerId: string) => {
    if (!currentUser || !draftState?.currentTeam) return;

    const myTeam = teams.find(t => t.captainId === currentUser.id);
    const teamToDraft = currentUser.role === 'admin' ? draftState.currentTeam : myTeam;

    if (!teamToDraft) {
      toast({ variant: "destructive", title: "No tienes equipo asignado" });
      return;
    }

    setIsDrafting(true);
    try {
      const result = await draftApi.draftPlayer(teamToDraft.id, playerId);
      
      if (result.draftComplete) {
        toast({ title: "Draft completado", description: result.message });
      } else {
        toast({ title: "Jugador drafteado" });
      }

      if (params?.id) {
        await loadTournament(params.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al draftear", description: error.message });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleRegisterNewPlayer = async () => {
    if (!newPlayerName || !newPlayerUsername || !newPlayerEmail || !newPlayerMobile || !newPlayerPassword) {
      toast({ variant: "destructive", title: "Nombre, usuario, email y movil son requeridos" });
      return;
    }
    if (newPlayerPassword !== newPlayerConfirmPassword) {
      toast({ variant: "destructive", title: "Las contrasenas no coinciden" });
      return;
    }

    setIsRegistering(true);
    try {
      await playersApi.register({
        name: newPlayerName,
        username: newPlayerUsername,
        email: newPlayerEmail,
        password: newPlayerPassword,
        isPublic: newPlayerIsPublic,
        mobile: newPlayerMobile,
        ...newPlayerStats,
        tournamentId: params?.id,
      });

      toast({ title: "Jugador inscrito", description: `${newPlayerName} ha sido anadido al torneo` });
      setIsRegisterOpen(false);
      setNewPlayerName("");
      setNewPlayerUsername("");
      setNewPlayerEmail("");
      setNewPlayerMobile("");
      setNewPlayerPassword("");
      setNewPlayerConfirmPassword("");
      setNewPlayerIsPublic(false);
      setNewPlayerStats({ pace: 50, shooting: 50, passing: 50, dribbling: 50, defense: 50, physical: 50 });

      if (params?.id) {
        await loadTournament(params.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al inscribir", description: error.message });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleJoinTournament = async () => {
    if (!currentUser || !params?.id) return;
    setIsJoining(true);
    try {
      await tournamentsApi.register(params.id, currentUser.id);
      toast({ title: "Inscripcion completada", description: "Ya estas inscrito en el torneo" });
      await loadTournament(params.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al inscribirse", description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  const handleToggleCaptain = async (playerId: string, isCaptain: boolean) => {
    if (!params?.id) return;
    try {
      await registrationsApi.setCaptain(params.id, playerId, isCaptain);
      toast({ title: isCaptain ? "Capitan asignado" : "Capitan removido" });
      await loadTournament(params.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleConfirmTeamName = async (teamId: string) => {
    if (!teamNameInput.trim()) {
      toast({ variant: "destructive", title: "Nombre requerido" });
      return;
    }

    setIsSavingTeamName(true);
    try {
      const result = await teamsApi.updateName(teamId, teamNameInput.trim());
      toast({ title: "Nombre guardado", description: result.groupsGenerated ? "Grupos generados automaticamente" : "Nombre confirmado" });
      if (params?.id) {
        await loadTournament(params.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSavingTeamName(false);
    }
  };

  const handleOpenRules = () => {
    const currentRules = tournament?.rules?.trim() || DEFAULT_TOURNAMENT_RULES_TEXT;
    setRulesDraft(currentRules);
    setIsRulesOpen(true);
  };

  const handleSaveRules = async () => {
    if (!tournament) return;
    const cleaned = rulesDraft
      .split("\n")
      .map((rule) => rule.trim())
      .filter(Boolean)
      .join("\n");

    setIsSavingRules(true);
    try {
      await tournamentsApi.update(tournament.id, {
        rules: cleaned || DEFAULT_TOURNAMENT_RULES_TEXT,
      });
      await loadTournament(tournament.id);
      setIsRulesOpen(false);
      toast({ title: "Reglas actualizadas" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleOpenPlayerEdit = (player: Player) => {
    setPlayerToEdit(player);
    setEditName(player.name || "");
    setEditUsername(player.username || "");
    setEditEmail(player.email || "");
    setEditMobile(player.mobile || "");
    setEditRole((player.role as "player" | "captain" | "admin") || "player");
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
      if (params?.id) {
        await loadTournament(params.id);
      }
      setIsPlayerEditOpen(false);
      toast({ title: "Jugador actualizado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const captainIds = useMemo(() => new Set(registrations.filter(r => r.isCaptain).map(r => r.playerId)), [registrations]);

  const playersWithRole = useMemo<PlayerWithRegistration[]>(() => {
    return registrations.map((registration) => ({
      ...registration.player,
      isCaptain: registration.isCaptain,
    }));
  }, [registrations]);

  const filteredPlayers = useMemo(() => {
    const list = playersWithRole.filter((player) => {
      if (roleFilter === "captain" && !player.isCaptain) return false;
      if (roleFilter === "player" && player.isCaptain) return false;
      if ((player.overall || 0) < minOverall) return false;
      const statValueMap = {
        overall: player.overall,
        pace: player.pace,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defense: player.defense,
        physical: player.physical,
      };
      const statValue = statValueMap[statFilter];
      if ((statValue || 0) < minStat) return false;
      return true;
    });

    return list.sort((a, b) => (b.overall || 0) - (a.overall || 0));
  }, [playersWithRole, roleFilter, minOverall, statFilter, minStat]);

  const rulesList = useMemo(() => {
    const source = tournament?.rules?.trim() || DEFAULT_TOURNAMENT_RULES_TEXT;
    return source
      .split("\n")
      .map((rule) => rule.trim())
      .filter(Boolean);
  }, [tournament?.rules]);
  const editOverall = Math.round(
    (editStats.pace +
      editStats.shooting +
      editStats.passing +
      editStats.dribbling +
      editStats.defense +
      editStats.physical) / 6
  );

  if (!match || !params) return null;
  
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

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display mb-4">Torneo no encontrado</h1>
          <Link href="/">
            <Button className="cursor-pointer">Volver a Inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isRegistered = !!currentUser && registrations.some(r => r.playerId === currentUser.id);
  const isAdmin = currentUser?.role === 'admin';
  const isCaptain = !!currentUser && registrations.some(r => r.playerId === currentUser.id && r.isCaptain);
  const isDraftActive = tournament.status === 'draft' && draftState?.draftState?.isActive === 'true';
  
  const myTeam = isCaptain ? teams.find(t => t.captainId === currentUser?.id) : null;
  const isMyTurn = isDraftActive && draftState?.currentTeam?.id === myTeam?.id;

  const availablePlayers = playersWithRole.filter(p => 
    !p.isCaptain && !draftedPlayerIds.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="mb-8">
          <Link href={isAdmin ? "/admin" : isCaptain ? "/captain" : "/"}>
            <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary cursor-pointer">
              {"<- Volver"}
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white uppercase tracking-tighter">
                  {tournament.name}
                </h1>
                <Badge variant="outline" className="text-lg px-4 py-1 border-primary text-primary">
                  {tournament.status === 'open' ? 'Inscripciones Abiertas' : 
                   tournament.status === 'draft' ? 'En Draft' :
                   tournament.status === 'active' ? 'En Curso' : 'Finalizado'}
                </Badge>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl">
                {tournament.description}
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleRefresh} className="cursor-pointer">
                <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
              </Button>
              
              {!isRegistered && tournament.status === 'open' && (
                currentUser ? (
                  <Button 
                    size="lg" 
                    className="font-display text-xl px-8 h-14 bg-primary text-black hover:bg-white transition-all cursor-pointer"
                    onClick={handleJoinTournament}
                    disabled={isJoining}
                    data-testid="button-register-tournament"
                  >
                    {isJoining ? "INSCRIBIENDO..." : "INSCRIBIRME"}
                  </Button>
                ) : (
                  <Link href={`/register?tournamentId=${tournament.id}`}>
                    <Button 
                      size="lg" 
                      className="font-display text-xl px-8 h-14 bg-primary text-black hover:bg-white transition-all cursor-pointer"
                      data-testid="button-register-tournament"
                    >
                      INSCRIBIRSE AHORA
                    </Button>
                  </Link>
                )
              )}
              {isRegistered && (
                 <Button disabled size="lg" className="font-display text-xl px-8 h-14 bg-green-500/20 text-green-500 border border-green-500/50">
                   YA INSCRITO
                 </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3 text-lg">
                <Calendar className="w-6 h-6 text-primary" />
                <span>{format(new Date(tournament.date), "d MMMM yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <MapPin className="w-6 h-6 text-primary" />
                <span>{tournament.location}</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <Users className="w-6 h-6 text-primary" />
                <span>{registeredPlayers.length} jugadores inscritos</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <Trophy className="w-6 h-6 text-primary" />
                <span>{teams.length} equipos creados</span>
              </div>
            </CardContent>
          </Card>

          {isDraftActive && draftState && (
            <Card className="lg:col-span-2 bg-amber-500/10 border-amber-500/30">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-400" />
                  DRAFT EN CURSO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-black/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ronda Actual</p>
                    <p className="text-3xl font-display text-amber-400">
                      {draftState.draftState.currentRound} / {draftState.draftState.maxRounds}
                    </p>
                  </div>
                  <div className="p-4 bg-black/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Jugadores Disponibles</p>
                    <p className="text-3xl font-display text-primary">
                      {availablePlayers.length}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-primary/20 rounded-lg border border-primary/30">
                  <p className="text-sm text-muted-foreground mb-1">TURNO DE:</p>
                  <p className="text-2xl font-display text-primary">
                    {draftState.currentTeam?.name || 'Cargando...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Capitan: {draftState.currentCaptain?.name || 'N/A'}
                  </p>
                </div>

                {isMyTurn && (
                  <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30 flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-green-400" />
                    <p className="font-display text-green-400">ES TU TURNO! Selecciona un jugador</p>
                  </div>
                )}

                {isAdmin && (tournament.status === 'draft' || tournament.status === 'active') && (
                  <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-blue-500 hover:bg-blue-400 text-white font-display cursor-pointer">
                        <UserPlus className="w-4 h-4 mr-2" /> INSCRIBIR NUEVO JUGADOR
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-white/10 max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-display">Inscribir Jugador al Draft</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Nombre</Label>
                          <Input 
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                            placeholder="Nombre del jugador"
                            className="bg-black/20"
                          />
                        </div>
                        <div>
                          <Label>Usuario</Label>
                          <Input 
                            value={newPlayerUsername}
                            onChange={(e) => setNewPlayerUsername(e.target.value)}
                            placeholder="usuario"
                            className="bg-black/20"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input 
                            value={newPlayerEmail}
                            onChange={(e) => setNewPlayerEmail(e.target.value)}
                            placeholder="email@ejemplo.com"
                            className="bg-black/20"
                          />
                        </div>
                        <div>
                          <Label>Movil</Label>
                          <Input 
                            value={newPlayerMobile}
                            onChange={(e) => setNewPlayerMobile(e.target.value)}
                            placeholder="Numero de movil"
                            className="bg-black/20"
                          />
                        </div>
                        <div>
                          <Label>Contrasena</Label>
                          <Input 
                            type="password"
                            value={newPlayerPassword}
                            onChange={(e) => setNewPlayerPassword(e.target.value)}
                            placeholder="********"
                            className="bg-black/20"
                          />
                        </div>
                        <div>
                          <Label>Confirmar Contrasena</Label>
                          <Input 
                            type="password"
                            value={newPlayerConfirmPassword}
                            onChange={(e) => setNewPlayerConfirmPassword(e.target.value)}
                            placeholder="********"
                            className="bg-black/20"
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
                          <div>
                            <Label className="text-sm">Perfil publico</Label>
                            <p className="text-xs text-muted-foreground">Visible para usuarios no registrados.</p>
                          </div>
                          <Switch
                            checked={newPlayerIsPublic}
                            onCheckedChange={setNewPlayerIsPublic}
                          />
                        </div>
                        
                        <div className="space-y-3">
                          {Object.entries(newPlayerStats).map(([stat, value]) => (
                            <div key={stat} className="space-y-1">
                              <div className="flex justify-between">
                                <Label className="capitalize">{stat}</Label>
                                <span className="text-primary font-bold">{value}</span>
                              </div>
                              <Slider
                                min={1}
                                max={99}
                                value={[value]}
                                onValueChange={([v]) => setNewPlayerStats(prev => ({ ...prev, [stat]: v }))}
                              />
                            </div>
                          ))}
                        </div>

                        <Button 
                          onClick={handleRegisterNewPlayer} 
                          className="w-full font-display cursor-pointer"
                          disabled={isRegistering}
                        >
                          {isRegistering ? 'Inscribiendo...' : 'INSCRIBIR JUGADOR'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="lg:col-span-2 bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="font-display text-2xl">Reglas y Formato</CardTitle>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={handleOpenRules}
                >
                  Editar reglas
                </Button>
              )}
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <ul className="list-disc space-y-2 pl-5">
                {rulesList.map((rule, index) => (
                  <li key={`${rule}-${index}`}>{rule}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {isAdmin && registrations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-display font-bold mb-6">GESTION DE CAPITANES</h2>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-6 space-y-3">
                {registrations.map((registration) => (
                  <div key={registration.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <p className="font-medium">{registration.player.name}</p>
                      <p className="text-xs text-muted-foreground">Overall {registration.player.overall}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={registration.isCaptain ? "bg-amber-500/20 text-amber-400 border-amber-500/50" : "bg-white/10 text-white/60 border-white/20"}>
                        {registration.isCaptain ? "CAPITAN" : "JUGADOR"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={tournament.status === "active" || tournament.status === "completed"}
                        onClick={() => handleToggleCaptain(registration.playerId, !registration.isCaptain)}
                      >
                        {registration.isCaptain ? "Quitar capitan" : "Hacer capitan"}
                      </Button>
                    </div>
                  </div>
                ))}
                {tournament.status !== "open" && (
                  <p className="text-xs text-muted-foreground">Los capitanes solo pueden modificarse mientras el torneo esta en inscripciones o draft.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {isCaptain && myTeam && !myTeam.nameConfirmed && tournament.status === "active" && (
          <div className="mb-12">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="font-display text-2xl">CONFIRMA EL NOMBRE DE TU EQUIPO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cuando todos los capitanes confirmen sus nombres se generaran los grupos automaticamente.
                </p>
                <Input
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="Nombre del equipo"
                  className="bg-black/20"
                />
                <Button
                  onClick={() => handleConfirmTeamName(myTeam.id)}
                  className="font-display cursor-pointer"
                  disabled={isSavingTeamName}
                >
                  {isSavingTeamName ? "GUARDANDO..." : "CONFIRMAR NOMBRE"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {teams.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-display font-bold mb-6">EQUIPOS ({teams.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map(team => {
                const captain = registeredPlayers.find(p => p.id === team.captainId);
                const isCurrentTurn = isDraftActive && draftState?.currentTeam?.id === team.id;
                return (
                  <Card 
                    key={team.id} 
                    className={`bg-white/5 border-white/10 ${isCurrentTurn ? 'border-primary ring-2 ring-primary/50' : ''}`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        {isCurrentTurn && <Crown className="w-5 h-5 text-primary animate-pulse" />}
                        <h3 className="font-display text-lg">{team.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Capitan: {captain?.name || 'N/A'}
                      </p>
                    {team.nameConfirmed ? (
                        <Badge variant="outline" className="mt-2 bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                          Nombre confirmado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-2 bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                          Nombre pendiente
                        </Badge>
                      )}
</CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {(tournament.status === 'active' || tournament.status === 'completed') && (
          <div className="mb-12">
            <h2 className="text-3xl font-display font-bold mb-6">
              {tournament.status === 'completed' ? 'RESULTADOS DEL TORNEO' : 'FASE DE TORNEO'}
            </h2>
            <TournamentGroupsView tournamentId={tournament.id} isAdmin={isAdmin} />
          </div>
        )}

        <div>
          <h2 className="text-4xl font-display font-bold mb-8">
            {isDraftActive ? 'JUGADORES DISPONIBLES' : 'JUGADORES INSCRITOS'} ({filteredPlayers.length})
          </h2>

          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | "player" | "captain")}>
                <SelectTrigger className="bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="player">Jugadores</SelectItem>
                  <SelectItem value="captain">Capitanes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Min overall: {minOverall}</Label>
              <Slider
                min={0}
                max={99}
                step={1}
                value={[minOverall]}
                onValueChange={([value]) => setMinOverall(value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Filtro de habilidad: {statFilter.toUpperCase()} {minStat}</Label>
              <Select value={statFilter} onValueChange={(value) => setStatFilter(value as typeof statFilter)}>
                <SelectTrigger className="bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall</SelectItem>
                  <SelectItem value="pace">Velocidad</SelectItem>
                  <SelectItem value="shooting">Tiro</SelectItem>
                  <SelectItem value="passing">Pase</SelectItem>
                  <SelectItem value="dribbling">Regate</SelectItem>
                  <SelectItem value="defense">Defensa</SelectItem>
                  <SelectItem value="physical">Fisico</SelectItem>
                </SelectContent>
              </Select>
              <Slider
                min={0}
                max={99}
                step={1}
                value={[minStat]}
                onValueChange={([value]) => setMinStat(value)}
              />
            </div>
          </div>
          
          {(() => {
            const playersList = filteredPlayers;

            if (playersList.length === 0) {
              return (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-lg">
                  <p className="text-muted-foreground text-xl">
                    {isDraftActive ? 'No quedan jugadores disponibles' : 'Aun no hay jugadores inscritos. Se el primero!'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {playersList.map((player) => {
                  const isDrafted = draftedPlayerIds.includes(player.id);
                  const isCaptainRole = player.isCaptain;
                  const isSelectable = !isDrafted && !isCaptainRole;
                  const cardPlayer = { ...player, role: isCaptainRole ? "captain" : player.role };

                  return (
                    <div key={player.id} className="space-y-3" data-testid={`player-card-${player.id}`}>
                      <div className="relative">
                        <PlayerCard
                          player={cardPlayer}
                          onClick={isAdmin ? () => handleOpenPlayerEdit(player) : undefined}
                          showSensitive={isAdmin}
                        />
                        {isDrafted && (
                          <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center text-xs font-display tracking-widest text-white">
                            SELECCIONADO
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                        {isCaptainRole ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                            Capitan
                          </Badge>
                        ) : isDrafted ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                            Seleccionado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                            Disponible
                          </Badge>
                        )}
                        {isAdmin && (
                          <Badge variant="outline" className="bg-white/10 text-white/70 border-white/20 text-xs">
                            Click para editar
                          </Badge>
                        )}
                      </div>
                      {isDraftActive && (
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3 flex items-center justify-center">
                          <SkillRadarChart
                            pace={player.pace || 50}
                            shooting={player.shooting || 50}
                            passing={player.passing || 50}
                            dribbling={player.dribbling || 50}
                            defense={player.defense || 50}
                            physical={player.physical || 50}
                            size={120}
                            showLabels={false}
                          />
                        </div>
                      )}
                      {isDraftActive && (isMyTurn || isAdmin) && isSelectable && (
                        <Button
                          size="sm"
                          className="w-full font-display bg-primary text-black hover:bg-white cursor-pointer"
                          onClick={() => handleDraftPlayer(player.id)}
                          disabled={isDrafting}
                          data-testid={`button-draft-${player.id}`}
                        >
                          DRAFT
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      <Dialog open={isRulesOpen} onOpenChange={setIsRulesOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Editar reglas y formato</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Escribe una regla por linea. Se mostraran en el apartado publico del torneo.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={rulesDraft}
              onChange={(e) => setRulesDraft(e.target.value)}
              className="w-full bg-black/20 border border-input rounded-md px-3 py-2 min-h-[140px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={handleSaveRules}
              className="w-full font-display cursor-pointer"
              disabled={isSavingRules}
            >
              {isSavingRules ? "Guardando..." : "Guardar reglas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPlayerEditOpen} onOpenChange={setIsPlayerEditOpen}>
        <DialogContent className="bg-card border-white/10 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Editar jugador</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Actualiza los datos del jugador y guarda los cambios.
            </p>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <Label>Movil</Label>
                <Input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <Label>Avatar (URL o base64)</Label>
                <Input value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} className="bg-black/20" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
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
                  <Label>Ritmo</Label>
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
                  <Label>Tiro</Label>
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
                  <Label>Pase</Label>
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
                  <Label>Regate</Label>
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
                  <Label>Defensa</Label>
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
                  <Label>Fisico</Label>
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
                  <Label>Nueva contrasena</Label>
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="bg-black/20"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Confirmar contrasena</Label>
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
