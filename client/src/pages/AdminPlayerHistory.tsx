import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { adminApi, tournamentsApi, type PlayerStats, type Tournament } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Users, Trophy, TrendingUp, TrendingDown, Search, Filter } from "lucide-react";
import { PlayerCard } from "@/components/PlayerCard";

export default function AdminPlayerHistory() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tournamentFilter, setTournamentFilter] = useState<string>("all");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [activeTournaments, setActiveTournaments] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [roleFilter, tournamentFilter]);

  useEffect(() => {
    tournamentsApi.getAll()
      .then((data) => setTournaments(data.tournaments))
      .catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const filters: { role?: string; tournamentId?: string } = {};
      if (roleFilter !== 'all') filters.role = roleFilter;
      if (tournamentFilter !== 'all') filters.tournamentId = tournamentFilter;
      const data = await adminApi.getPlayerHistory(Object.keys(filters).length ? filters : undefined);
      setPlayerStats(data.playerStats);
      setTotalPlayers(data.totalPlayers);
      setTotalTournaments(data.totalTournaments);
      setActiveTournaments(data.activeTournaments);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return playerStats;
    return playerStats.filter((ps) =>
      ps.player.name.toLowerCase().includes(term)
    );
  }, [playerStats, searchTerm]);

  const averageGrowth = useMemo(() => {
    if (playerStats.length === 0) return 0;
    return playerStats.reduce((acc, ps) => acc + ps.growth, 0) / playerStats.length;
  }, [playerStats]);

  const topOverall = useMemo(() => {
    return [...playerStats].sort((a, b) => b.player.overall - a.player.overall)[0];
  }, [playerStats]);

  const topGrowth = useMemo(() => {
    return [...playerStats].sort((a, b) => b.growth - a.growth)[0];
  }, [playerStats]);

  const mostTournaments = useMemo(() => {
    return [...playerStats].sort((a, b) => b.tournamentsPlayed - a.tournamentsPlayed)[0];
  }, [playerStats]);

  const getGrowthBadge = (growth: number) => {
    if (growth > 0) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{growth}
        </Badge>
      );
    } else if (growth < 0) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
          <TrendingDown className="w-3 h-3 mr-1" />
          {growth}
        </Badge>
      );
    }
    return <Badge variant="outline">Sin cambios</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: "bg-purple-500/20 text-purple-400 border-purple-500/50",
      captain: "bg-amber-500/20 text-amber-400 border-amber-500/50",
      player: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    };
    const labels: Record<string, string> = {
      admin: "Admin",
      captain: "Capitan",
      player: "Jugador",
    };
    return (
      <Badge variant="outline" className={styles[role] || styles.player}>
        {labels[role] || role}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-display font-bold mb-8">HISTORICO DE JUGADORES</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Jugadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">{totalPlayers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Total Torneos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">{totalTournaments}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-400" />
                Torneos Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-green-400">{activeTournaments}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Promedio Crecimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-primary">
                {averageGrowth.toFixed(1)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {topOverall && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Top Overall</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PlayerCard player={topOverall.player} size="sm" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall</span>
                  <span className="font-display text-primary text-xl">{topOverall.player.overall}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Torneos</span>
                  <span className="font-display">{topOverall.tournamentsPlayed}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {topGrowth && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Mayor crecimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PlayerCard player={topGrowth.player} size="sm" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Crecimiento</span>
                  <span>{getGrowthBadge(topGrowth.growth)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall actual</span>
                  <span className="font-display">{topGrowth.player.overall}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {mostTournaments && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Mas torneos jugados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PlayerCard player={mostTournaments.player} size="sm" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Torneos</span>
                  <span className="font-display text-primary text-xl">{mostTournaments.tournamentsPlayed}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall</span>
                  <span className="font-display">{mostTournaments.player.overall}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar jugador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/20"
                  data-testid="input-search-player"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40 bg-black/20" data-testid="select-role-filter">
                    <SelectValue placeholder="Filtrar por rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="player">Jugadores</SelectItem>
                    <SelectItem value="captain">Capitanes</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                  <SelectTrigger className="w-56 bg-black/20" data-testid="select-tournament-filter">
                    <SelectValue placeholder="Filtrar por torneo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los torneos</SelectItem>
                    {tournaments.map((tournament) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Cargando...</div>
        ) : filteredStats.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No hay jugadores para mostrar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredStats.map((ps) => (
              <div key={ps.player.id} className="space-y-3">
                <PlayerCard player={ps.player} size="sm" />
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  {getRoleBadge(ps.player.role)}
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    OVR {ps.player.overall}
                  </Badge>
                  {getGrowthBadge(ps.growth)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center">
                    Torneos {ps.tournamentsPlayed}
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/20 p-2 text-center">
                    {ps.snapshots.length > 0 ? `Ultimo ${ps.snapshots[0].overall}` : "Sin historial"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
