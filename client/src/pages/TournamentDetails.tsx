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
import { tournamentsApi, teamsApi, draftApi, playersApi, type Player, type Tournament, type Team, type DraftStateResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { SkillRadarChart } from "@/components/SkillRadarChart";
import { TournamentGroupsView } from "@/components/TournamentGroupsView";

export default function TournamentDetails() {
  const [match, params] = useRoute("/tournaments/:id");
  const { currentUser } = useStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftState, setDraftState] = useState<DraftStateResponse | null>(null);
  const [draftedPlayerIds, setDraftedPlayerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrafting, setIsDrafting] = useState(false);
  const { toast } = useToast();

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerMobile, setNewPlayerMobile] = useState("");
  const [newPlayerStats, setNewPlayerStats] = useState({
    pace: 50, shooting: 50, passing: 50, dribbling: 50, defense: 50, physical: 50
  });
  const [isRegistering, setIsRegistering] = useState(false);
  
  const loadTournament = useCallback(async (id: string) => {
    try {
      const data = await tournamentsApi.getById(id);
      setTournament(data.tournament);
      setRegisteredPlayers(data.registeredPlayers);

      const { teams: tournamentTeams } = await teamsApi.getForTournament(id);
      setTeams(tournamentTeams);

      const allDraftedIds: string[] = [];
      for (const team of tournamentTeams) {
        try {
          const teamData = await teamsApi.getByCaptain(team.captainId);
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
    if (!newPlayerName || !newPlayerMobile) {
      toast({ variant: "destructive", title: "Nombre y móvil son requeridos" });
      return;
    }

    setIsRegistering(true);
    try {
      await playersApi.register({
        name: newPlayerName,
        mobile: newPlayerMobile,
        ...newPlayerStats,
        tournamentId: params?.id,
      });

      toast({ title: "Jugador inscrito", description: `${newPlayerName} ha sido añadido al torneo` });
      setIsRegisterOpen(false);
      setNewPlayerName("");
      setNewPlayerMobile("");
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

  const isRegistered = currentUser && registeredPlayers.some(p => p.id === currentUser.id);
  const isAdmin = currentUser?.role === 'admin';
  const isCaptain = currentUser?.role === 'captain';
  const isDraftActive = tournament.status === 'draft' && draftState?.draftState?.isActive === 'true';
  
  const myTeam = isCaptain ? teams.find(t => t.captainId === currentUser?.id) : null;
  const isMyTurn = isDraftActive && draftState?.currentTeam?.id === myTeam?.id;

  const availablePlayers = registeredPlayers.filter(p => 
    p.role === 'player' && !draftedPlayerIds.includes(p.id)
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
                <Link href={`/register?tournamentId=${tournament.id}`}>
                  <Button 
                    size="lg" 
                    className="font-display text-xl px-8 h-14 bg-primary text-black hover:bg-white transition-all cursor-pointer"
                    data-testid="button-register-tournament"
                  >
                    INSCRIBIRSE AHORA
                  </Button>
                </Link>
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

                {isAdmin && tournament.status === 'draft' && (
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
                          <Label>Móvil</Label>
                          <Input 
                            value={newPlayerMobile}
                            onChange={(e) => setNewPlayerMobile(e.target.value)}
                            placeholder="Número de móvil"
                            className="bg-black/20"
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {tournament.status === 'active' && (
          <div className="mb-12">
            <h2 className="text-3xl font-display font-bold mb-6">FASE DE TORNEO</h2>
            <TournamentGroupsView tournamentId={tournament.id} isAdmin={isAdmin} />
          </div>
        )}

        <div>
          <h2 className="text-4xl font-display font-bold mb-8">
            {isDraftActive ? 'JUGADORES DISPONIBLES' : 'JUGADORES INSCRITOS'} ({registeredPlayers.filter(p => p.role === 'player').length})
          </h2>
          
          {(() => {
            const playersList = registeredPlayers
              .filter(p => p.role === 'player')
              .sort((a, b) => (b.overall || 0) - (a.overall || 0));

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
                  
                  return (
                    <Card 
                      key={player.id} 
                      className={`bg-white/5 border-white/10 ${isDrafted ? 'opacity-60' : ''} ${!isDrafted && isDraftActive && (isMyTurn || isAdmin) ? 'hover:border-primary/50 cursor-pointer' : ''}`}
                      data-testid={`player-row-${player.id}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {isDraftActive ? (
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
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-7 h-7 text-primary" />
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
                              {isDrafted ? (
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
                            {isDraftActive && (isMyTurn || isAdmin) && !isDrafted && (
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
