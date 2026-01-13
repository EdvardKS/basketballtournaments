import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { playersApi, type Tournament } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link, Redirect } from "wouter";
import { Calendar, MapPin, Trophy, Users, Eye } from "lucide-react";

export default function PlayerDashboard() {
  const { currentUser } = useStore();
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const data = await playersApi.getTournaments(currentUser.id);
      setMyTournaments(data.tournaments);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  const activeTournaments = myTournaments.filter(t =>
    t.status === 'active' || t.status === 'draft' || t.status === 'open' || t.status === 'setup' || t.status === 'scheduled'
  );
  const pastTournaments = myTournaments.filter(t => t.status === 'completed');

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-display font-bold">MIS TORNEOS</h1>
          <Link href="/register">
            <Button className="font-display cursor-pointer">
              Inscribirse a Torneo
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Cargando...</div>
        ) : (
          <>
            {activeTournaments.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-primary" />
                  Torneos Activos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTournaments.map((tournament) => (
                    <Card key={tournament.id} className="hover:border-primary/50 transition-colors" data-testid={`card-tournament-${tournament.id}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="font-display">{tournament.name}</CardTitle>
                          {getStatusBadge(tournament.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {tournament.date}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {tournament.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Máx. {tournament.maxTeams} equipos
                          </div>
                        </div>
                        <p className="text-sm mb-4 line-clamp-2">{tournament.description}</p>
                        <Link href={`/tournaments/${tournament.id}`}>
                          <Button variant="outline" size="sm" className="w-full cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {pastTournaments.length > 0 && (
              <section>
                <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-muted-foreground" />
                  Torneos Finalizados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastTournaments.slice(0, 6).map((tournament) => (
                    <Card key={tournament.id} className="opacity-75 hover:opacity-100 transition-opacity" data-testid={`card-tournament-past-${tournament.id}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="font-display text-lg">{tournament.name}</CardTitle>
                          {getStatusBadge(tournament.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Calendar className="w-4 h-4" />
                          {tournament.date}
                        </div>
                        <Link href={`/tournaments/${tournament.id}`}>
                          <Button variant="ghost" size="sm" className="w-full cursor-pointer">
                            Ver Resumen
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {activeTournaments.length === 0 && pastTournaments.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-display font-bold mb-2">Sin Torneos</h3>
                  <p className="text-muted-foreground mb-4">
                    Todavía no estás inscrito en ningún torneo
                  </p>
                  <Link href="/register">
                    <Button className="font-display cursor-pointer">
                      Inscribirse Ahora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
