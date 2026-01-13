import { useRoute, Link } from "wouter";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, Crown, AlertCircle, UserPlus, RefreshCw, User } from "lucide-react";
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

type PlayerWithRegistration = Player & { isCaptain: boolean };

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

      toast({ title: "Jugador inscrito", description: `${newPlayerName} ha sido añadido al torneo` });
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
              ← Volver
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
                    Capitán: {draftState.currentCaptain?.name || 'N/A'}
                  </p>
                </div>

                {isMyTurn && (
                  <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30 flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-green-400" />
                    <p className="font-display text-green-400">¡ES TU TURNO! Selecciona un jugador</p>
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

          {!isDraftActive && (
            <Card className="lg:col-span-2 bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Reglas y Formato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-muted-foreground">
                <p>• Formato 5v5 Cancha Completa</p>
                <p>• Eliminación Doble</p>
                <p>• Dos partes de 20 minutos</p>
                <p>• Selección por Draft de Capitanes</p>
                <p>• Reglas FIBA</p>
              </CardContent>
            </Card>
          )}
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
                        Capitán: {captain?.name || 'N/A'}
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
                    {isDraftActive ? 'No quedan jugadores disponibles' : 'Aún no hay jugadores inscritos. ¡Sé el primero!'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playersList.map((player, index) => {
                  const isDrafted = draftedPlayerIds.includes(player.id);
                  const isCaptainRole = player.isCaptain;
                  const isSelectable = !isDrafted && !isCaptainRole;
                  
                  return (
                    <Card 
                      key={player.id} 
                      className={`bg-white/5 border-white/10 ${isDrafted ? 'opacity-60' : ''} ${isSelectable && isDraftActive && (isMyTurn || isAdmin) ? 'hover:border-primary/50 cursor-pointer' : ''}`}
                      data-testid={`player-row-${player.id}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {isDraftActive ? (
                              <div className="relative">
                                <SkillRadarChart
                                  pace={player.pace || 50}
                                  shooting={player.shooting || 50}
                                  passing={player.passing || 50}
                                  dribbling={player.dribbling || 50}
                                  defense={player.defense || 50}
                                  physical={player.physical || 50}
                                  size={80}
                                  showLabels={false}
                                />
                                {player.avatar ? (
                                  <img
                                    src={player.avatar}
                                    alt={player.name}
                                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border border-white/20 object-cover"
                                  />
                                ) : (
                                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-white/20">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                                {player.avatar ? (
                                  <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
                                ) : (
                                  <User className="w-7 h-7 text-primary" />
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                              <p className="font-medium text-foreground truncate">{player.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-display text-primary font-bold">{player.overall}</span>
                              {isCaptainRole ? (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                                  Capitan
                                </Badge>
                              ) : isDrafted ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                                  Seleccionado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                                  Disponible
                                </Badge>
                              )}
                            </div>
                            
                            {isDraftActive && (
                              <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                                <span>VEL {player.pace}</span>
                                <span>TIR {player.shooting}</span>
                                <span>PAS {player.passing}</span>
                                <span>REG {player.dribbling}</span>
                                <span>DEF {player.defense}</span>
                                <span>FIS {player.physical}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-shrink-0">
                            {isDraftActive && (isMyTurn || isAdmin) && isSelectable && (
                              <Button 
                                size="sm"
                                className="font-display bg-primary text-black hover:bg-white cursor-pointer"
                                onClick={() => handleDraftPlayer(player.id)}
                                disabled={isDrafting}
                                data-testid={`button-draft-${player.id}`}
                              >
                                DRAFT
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
