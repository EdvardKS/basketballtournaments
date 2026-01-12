import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teamsApi, tournamentsApi, type Team } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Calendar, MapPin, Users, Trophy, Play, Eye } from "lucide-react";
import type { Player } from "@/lib/store";

interface TournamentWithDetails {
  id: string;
  name: string;
  date: string;
  status: string;
  location: string;
  description: string;
  maxTeams: number;
  myTeam?: Team;
  myTeamPlayers?: Player[];
}

export default function CaptainDashboard() {
  const { currentUser } = useStore();
  const { toast } = useToast();
  
  const [myTournaments, setMyTournaments] = useState<TournamentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  async function loadData() {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const { tournaments } = await tournamentsApi.getAll();
      const myTournamentsList: TournamentWithDetails[] = [];

      let captainTeamData: { team: Team; players: Player[] } | null = null;
      if (currentUser.role === 'captain') {
        try {
          captainTeamData = await teamsApi.getByCaptain(currentUser.id);
        } catch {}
      }

      for (const tournament of tournaments) {
        try {
          const { registeredPlayers } = await tournamentsApi.getById(tournament.id);
          const isRegistered = registeredPlayers.some(p => p.id === currentUser.id);
          
          let myTeam: Team | undefined;
          let myTeamPlayers: Player[] | undefined;

          if (captainTeamData && captainTeamData.team.tournamentId === tournament.id) {
            myTeam = captainTeamData.team;
            myTeamPlayers = captainTeamData.players;
          }

          if (isRegistered || myTeam) {
            myTournamentsList.push({
              ...tournament,
              myTeam,
              myTeamPlayers,
            });
          }
        } catch {
        }
      }

      setMyTournaments(myTournamentsList);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ variant: "destructive", title: "Error al cargar datos" });
    } finally {
      setIsLoading(false);
    }
  }

  const activeTournaments = myTournaments.filter(t => 
    t.status === 'active' || t.status === 'draft' || t.status === 'open'
  );
  const pastTournaments = myTournaments.filter(t => t.status === 'completed');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: "bg-green-500/20 text-green-400 border-green-500/50",
      draft: "bg-amber-500/20 text-amber-400 border-amber-500/50",
      active: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      completed: "bg-gray-500/20 text-gray-400 border-gray-500/50",
    };
    const labels: Record<string, string> = {
      open: "Inscripciones Abiertas",
      draft: "En Draft",
      active: "En Curso",
      completed: "Finalizado",
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.open}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-primary font-display">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold">
            {currentUser?.role === 'captain' ? 'PANEL DE CAPITÁN' : 'MIS TORNEOS'}
          </h1>
          <p className="text-muted-foreground mt-2">
            Bienvenido, {currentUser?.name}
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <Play className="w-6 h-6 text-primary" />
            TORNEOS ACTIVOS
          </h2>
          
          {activeTournaments.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No estás participando en ningún torneo activo.</p>
                <Link href="/tournaments">
                  <Button className="mt-4 cursor-pointer">Ver Torneos Disponibles</Button>
                </Link>
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

                    {t.myTeam && (
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="font-display text-primary text-sm mb-1">TU EQUIPO</p>
                        <p className="font-bold">{t.myTeam.name}</p>
                        {t.myTeamPlayers && (
                          <p className="text-xs text-muted-foreground">{t.myTeamPlayers.length} jugadores</p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Link href={`/tournaments/${t.id}`}>
                        <Button size="sm" className="cursor-pointer font-display">
                          <Eye className="w-4 h-4 mr-1" /> 
                          {t.status === 'draft' ? 'IR AL DRAFT' : 'VER TORNEO'}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-muted-foreground" />
            TORNEOS PASADOS
          </h2>
          
          {pastTournaments.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No tienes torneos finalizados.</p>
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
                    <p className="text-sm text-muted-foreground mb-2">{t.date}</p>
                    
                    {t.myTeam && (
                      <div className="mb-3 p-2 bg-white/5 rounded">
                        <p className="text-xs text-muted-foreground">Tu equipo:</p>
                        <p className="font-medium">{t.myTeam.name}</p>
                      </div>
                    )}
                    
                    <Link href={`/tournaments/${t.id}`}>
                      <Button size="sm" variant="ghost" className="cursor-pointer">
                        <Eye className="w-4 h-4 mr-1" /> Ver Resultados
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
