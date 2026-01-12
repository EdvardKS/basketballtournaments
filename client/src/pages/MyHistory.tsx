import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { playerHistoryApi, tournamentsApi, type PlayerSkillSnapshot, type Tournament } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Trophy, TrendingUp, Calendar, Target } from "lucide-react";
import { Redirect } from "wouter";

export default function MyHistory() {
  const { currentUser } = useStore();
  const [snapshots, setSnapshots] = useState<PlayerSkillSnapshot[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
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
      const [historyData, tournamentsData] = await Promise.all([
        playerHistoryApi.getSnapshots(currentUser.id),
        tournamentsApi.getAll()
      ]);
      setSnapshots(historyData.snapshots);
      setTournaments(tournamentsData.tournaments);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  const calculateGrowth = () => {
    if (snapshots.length < 2) return 0;
    const oldest = snapshots[snapshots.length - 1];
    const newest = snapshots[0];
    return newest.overall - oldest.overall;
  };

  const growth = calculateGrowth();

  const getStatColor = (stat: number) => {
    if (stat >= 80) return "text-green-400";
    if (stat >= 60) return "text-yellow-400";
    if (stat >= 40) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-display font-bold mb-8">MI HISTORIAL</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Mi Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center">
                {currentUser.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-24 h-24 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <span className="font-bold text-3xl text-primary">{currentUser.name.charAt(0)}</span>
                  </div>
                )}
                <h2 className="text-xl font-bold">{currentUser.name}</h2>
                <Badge className="mt-2">
                  {currentUser.role === 'captain' ? 'Capitán' : 'Jugador'}
                </Badge>
                
                <div className="mt-6 text-6xl font-display font-bold text-primary">
                  {currentUser.overall}
                </div>
                <p className="text-muted-foreground text-sm">Overall</p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display">Estadísticas Actuales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-black/20 rounded-lg">
                  <p className={`text-3xl font-display font-bold ${getStatColor(currentUser.pace)}`}>
                    {currentUser.pace}
                  </p>
                  <p className="text-sm text-muted-foreground">Velocidad</p>
                </div>
                <div className="text-center p-4 bg-black/20 rounded-lg">
                  <p className={`text-3xl font-display font-bold ${getStatColor(currentUser.shooting)}`}>
                    {currentUser.shooting}
                  </p>
                  <p className="text-sm text-muted-foreground">Tiro</p>
                </div>
                <div className="text-center p-4 bg-black/20 rounded-lg">
                  <p className={`text-3xl font-display font-bold ${getStatColor(currentUser.passing)}`}>
                    {currentUser.passing}
                  </p>
                  <p className="text-sm text-muted-foreground">Pase</p>
                </div>
                <div className="text-center p-4 bg-black/20 rounded-lg">
                  <p className={`text-3xl font-display font-bold ${getStatColor(currentUser.dribbling)}`}>
                    {currentUser.dribbling}
                  </p>
                  <p className="text-sm text-muted-foreground">Regate</p>
                </div>
                <div className="text-center p-4 bg-black/20 rounded-lg">
                  <p className={`text-3xl font-display font-bold ${getStatColor(currentUser.defense)}`}>
                    {currentUser.defense}
                  </p>
                  <p className="text-sm text-muted-foreground">Defensa</p>
                </div>
                <div className="text-center p-4 bg-black/20 rounded-lg">
                  <p className={`text-3xl font-display font-bold ${getStatColor(currentUser.physical)}`}>
                    {currentUser.physical}
                  </p>
                  <p className="text-sm text-muted-foreground">Físico</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Crecimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshots.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-center p-6 bg-black/20 rounded-lg">
                    <p className={`text-4xl font-display font-bold ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {growth >= 0 ? '+' : ''}{growth}
                    </p>
                    <p className="text-muted-foreground">Puntos de crecimiento total</p>
                  </div>
                  <div className="space-y-2">
                    {snapshots.slice(0, 5).map((snap, i) => (
                      <div key={snap.id} className="flex justify-between items-center p-2 bg-black/10 rounded">
                        <span className="text-sm text-muted-foreground">
                          {new Date(snap.snapshotAt).toLocaleDateString()}
                        </span>
                        <span className="font-display font-bold">{snap.overall}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Todavía no hay historial de habilidades
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Torneos Jugados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshots.length > 0 ? (
                <div className="space-y-3">
                  {snapshots.map((snap) => {
                    const tournament = tournaments.find(t => t.id === snap.tournamentId);
                    return (
                      <div key={snap.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                        <div>
                          <p className="font-medium">{tournament?.name || 'Torneo'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {tournament?.date}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-display font-bold text-primary">{snap.overall}</p>
                          <p className="text-xs text-muted-foreground">Overall</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Todavía no has participado en ningún torneo
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
