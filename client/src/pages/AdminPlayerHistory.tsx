import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, type PlayerStats } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Users, Trophy, TrendingUp, TrendingDown, Search, Filter } from "lucide-react";

export default function AdminPlayerHistory() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [activeTournaments, setActiveTournaments] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const filters = roleFilter !== 'all' ? { role: roleFilter } : undefined;
      const data = await adminApi.getPlayerHistory(filters);
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

  const filteredStats = playerStats.filter(ps => 
    ps.player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      captain: "Capitán",
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
        <h1 className="text-4xl font-display font-bold mb-8">HISTÓRICO DE JUGADORES</h1>

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
                {playerStats.length > 0 
                  ? (playerStats.reduce((acc, ps) => acc + ps.growth, 0) / playerStats.length).toFixed(1)
                  : 0
                }
              </p>
            </CardContent>
          </Card>
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
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Estadísticas de Jugadores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-center">Overall</TableHead>
                    <TableHead className="text-center">Torneos</TableHead>
                    <TableHead className="text-center">Crecimiento</TableHead>
                    <TableHead>Habilidades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.map((ps) => (
                    <TableRow key={ps.player.id} data-testid={`row-player-${ps.player.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {ps.player.avatar ? (
                            <img 
                              src={ps.player.avatar} 
                              alt={ps.player.name} 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="font-bold text-primary">{ps.player.name.charAt(0)}</span>
                            </div>
                          )}
                          <span className="font-medium">{ps.player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(ps.player.role)}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-display text-lg font-bold text-primary">{ps.player.overall}</span>
                      </TableCell>
                      <TableCell className="text-center">{ps.tournamentsPlayed}</TableCell>
                      <TableCell className="text-center">{getGrowthBadge(ps.growth)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 text-xs">
                          <span className="px-1.5 py-0.5 bg-green-500/20 rounded">PAC {ps.player.pace}</span>
                          <span className="px-1.5 py-0.5 bg-blue-500/20 rounded">SHO {ps.player.shooting}</span>
                          <span className="px-1.5 py-0.5 bg-purple-500/20 rounded">PAS {ps.player.passing}</span>
                          <span className="px-1.5 py-0.5 bg-amber-500/20 rounded">DRI {ps.player.dribbling}</span>
                          <span className="px-1.5 py-0.5 bg-red-500/20 rounded">DEF {ps.player.defense}</span>
                          <span className="px-1.5 py-0.5 bg-orange-500/20 rounded">PHY {ps.player.physical}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
