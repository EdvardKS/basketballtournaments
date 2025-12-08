import { useRoute, Link } from "wouter";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PlayerCard } from "@/components/PlayerCard";

export default function TournamentDetails() {
  const [match, params] = useRoute("/tournaments/:id");
  const { tournaments, players, currentUser } = useStore();
  
  if (!match || !params) return null;
  
  const tournament = tournaments.find(t => t.id === params.id);
  
  if (!tournament) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display mb-4">Torneo no encontrado</h1>
          <Link href="/">
            <Button>Volver a Inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  const registeredPlayers = players.filter(p => tournament.playersRegistered.includes(p.id));
  // In this mock, we don't have persistent auth ID check effectively without real backend, 
  // but let's assume if currentUser is set we check ID. 
  // But wait, Register page just registers a new player, it doesn't log them in persistently as that user.
  // So 'isRegistered' check is loose here.
  const isRegistered = currentUser && tournament.playersRegistered.includes(currentUser.id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tournaments">
            <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
              ← Volver a Torneos
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white uppercase tracking-tighter">
                  {tournament.name}
                </h1>
                <Badge variant="outline" className="text-lg px-4 py-1 border-primary text-primary">
                  {tournament.status}
                </Badge>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl">
                {tournament.description}
              </p>
            </div>
            
            <div className="flex gap-4">
              {!isRegistered && tournament.status === 'open' && (
                <Link href={`/register?tournamentId=${tournament.id}`}>
                  <Button 
                    size="lg" 
                    className="font-display text-xl px-8 h-14 bg-primary text-black hover:bg-white transition-all"
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

        {/* Info Grid */}
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
                <span>{registeredPlayers.length} / {tournament.maxTeams * 5} Plazas Máx</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <Trophy className="w-6 h-6 text-primary" />
                <span>Premio: Trofeo y Reconocimiento</span>
              </div>
            </CardContent>
          </Card>

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
        </div>

        {/* Registered Players */}
        <div>
          <h2 className="text-4xl font-display font-bold mb-8">BOLSA DE JUGADORES ({registeredPlayers.length})</h2>
          {registeredPlayers.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-lg">
              <p className="text-muted-foreground text-xl">Aún no hay jugadores inscritos. ¡Sé el primero!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
              {registeredPlayers.map(player => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
