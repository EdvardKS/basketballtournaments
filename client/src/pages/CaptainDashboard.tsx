import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { playersApi, teamsApi, draftApi, tournamentsApi, type Team } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@/lib/store";

export default function CaptainDashboard() {
  const { currentUser } = useStore();
  const { toast } = useToast();
  
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myTeamPlayers, setMyTeamPlayers] = useState<Player[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<Player[]>([]);
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
      const { players } = await playersApi.getAll();
      setAllPlayers(players.filter(p => p.role === 'player'));

      if (currentUser.role === 'captain') {
        try {
          const { team, players: teamPlayers } = await teamsApi.getByCaptain(currentUser.id);
          setMyTeam(team);
          setMyTeamPlayers(teamPlayers);

          const { registeredPlayers } = await tournamentsApi.getById(team.tournamentId);
          setTournamentPlayers(registeredPlayers.filter(p => p.role === 'player'));
        } catch {
          setMyTeam(null);
          setMyTeamPlayers([]);
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
      toast({ title: "¡Jugador drafteado!" });
      await loadData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al draftear", description: error.message });
    }
  }

  const isCaptainView = currentUser?.role === 'captain';
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
  }, [allPlayers, tournamentPlayers, search, minRating, draftedPlayerIds, isCaptainView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-primary font-display">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col md:flex-row pt-16">
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
                  data-testid="input-search-player"
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
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {myTeamPlayers.map(player => (
                        <div key={player.id} className="flex items-center gap-2 bg-white/5 p-2 rounded">
                          <img 
                            src={player.avatar || '/placeholder-avatar.png'} 
                            className="w-8 h-8 rounded-full object-cover" 
                            alt={player.name}
                          />
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

        <div className="md:hidden p-4 border-b border-white/10 bg-background sticky top-16 z-30">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full cursor-pointer">
                <Filter className="w-4 h-4 mr-2" /> Filtros y Equipo
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-card border-r border-white/10">
              <SheetHeader>
                <SheetTitle className="font-display text-left">SALA DE DRAFT</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-6">
                <Input 
                  placeholder="Buscar jugador..." 
                  className="bg-white/5 border-white/10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
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
                {isCaptainView && myTeam && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <h3 className="font-display text-primary mb-2">{myTeam.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {myTeamPlayers.length} Jugadores
                    </p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <main className="flex-1 md:ml-80 p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-display text-4xl font-bold">
              {isCaptainView ? "SALA DE DRAFT" : "AGENTES LIBRES"}
            </h1>
            <span className="text-muted-foreground">{availablePlayers.length} Disponibles</span>
          </div>

          {availablePlayers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No hay jugadores disponibles</p>
            </div>
          ) : (
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
                      data-testid={`button-draft-${player.id}`}
                    >
                      DRAFTEAR
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
