import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { PlayerCard } from "@/components/PlayerCard";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search } from "lucide-react";
import { playersApi } from "@/lib/api";
import type { Player } from "@/lib/store";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      const { players } = await playersApi.getAll();
      setPlayers(players.filter(p => p.role !== 'admin'));
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredPlayers = useMemo(() => {
    return players.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      p.overall >= minRating
    );
  }, [players, search, minRating]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-primary font-display">Cargando jugadores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold">JUGADORES</h1>
            <p className="text-muted-foreground">{filteredPlayers.length} jugadores registrados</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar jugador..." 
                className="pl-9 bg-white/5 border-white/10 w-full sm:w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-players"
              />
            </div>
            
            <div className="flex items-center gap-4 min-w-48">
              <span className="text-sm whitespace-nowrap">Min: {minRating}</span>
              <Slider 
                min={0} max={99} step={1} 
                value={[minRating]} 
                onValueChange={(val) => setMinRating(val[0])}
                className="w-32"
              />
            </div>
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No se encontraron jugadores</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
            {filteredPlayers.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                showSensitive={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
