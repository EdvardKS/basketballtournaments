import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function CaptainDashboard() {
  const { players, draftPlayer, currentUser } = useStore();
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  
  const draftablePlayers = useMemo(() => {
    return players.filter(p => 
      p.role === 'player' && 
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      p.overall >= minRating
    );
  }, [players, search, minRating]);

  // Determine if viewing as admin or captain
  const isCaptainView = currentUser?.role === 'captain';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col md:flex-row pt-16">
        {/* Sidebar Controls - Desktop */}
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
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Media Mínima</span>
                <span className="text-sm text-primary font-bold">{minRating}</span>
              </div>
              <Slider 
                min={0} 
                max={99} 
                step={1} 
                value={[minRating]} 
                onValueChange={(val) => setMinRating(val[0])}
              />
            </div>
            
            {isCaptainView && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="font-display text-lg text-primary mb-2">TU PLANTILLA</h3>
                <p className="text-sm text-muted-foreground">0 Jugadores Seleccionados</p>
                {/* List selected players here */}
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Filter Trigger */}
        <div className="md:hidden p-4 border-b border-white/10 bg-background sticky top-16 z-30">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
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
                    min={0} 
                    max={99} 
                    step={1} 
                    value={[minRating]} 
                    onValueChange={(val) => setMinRating(val[0])}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content - Player Grid */}
        <main className="flex-1 md:ml-80 p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-display text-4xl font-bold">AGENTES LIBRES</h1>
            <span className="text-muted-foreground">{draftablePlayers.length} Disponibles</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
            {draftablePlayers.map((player) => (
              <div key={player.id} className="relative group">
                <PlayerCard 
                  player={player} 
                  showSensitive={!!currentUser} // Show sensitive info (mobile) only to logged in users (captains/admin)
                />
                {isCaptainView && (
                  <Button 
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 opacity-0 group-hover:opacity-100 transition-opacity font-display tracking-wider bg-primary text-black hover:bg-white z-30"
                    onClick={() => draftPlayer(currentUser.id, player.id, 'current-tournament')}
                  >
                    DRAFTEAR
                  </Button>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
