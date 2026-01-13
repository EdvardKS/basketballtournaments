import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { playersApi, tournamentsApi, draftApi } from "@/lib/api";
import { Link } from "wouter";
import { Calendar, MapPin, Users, Play, Eye, Settings, Trophy, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { 
    tournaments, 
    players, 
    createTournament, 
    updateTournament, 
    deleteTournament,
    fetchPlayers,
    fetchTournaments
  } = useStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDate, setNewTournamentDate] = useState("");
  const [newTournamentLocation, setNewTournamentLocation] = useState("Pistas Municipales Villena");
  const [newTournamentDescription, setNewTournamentDescription] = useState("");
  const { toast } = useToast();

  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [editTournamentName, setEditTournamentName] = useState("");
  const [editTournamentDate, setEditTournamentDate] = useState("");
  const [editTournamentLocation, setEditTournamentLocation] = useState("");
  const [editTournamentDescription, setEditTournamentDescription] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);


  const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchPlayers(), fetchTournaments()])
      .finally(() => setIsLoading(false));
  }, []);

  const activeTournaments = tournaments.filter(t => t.status === 'active' || t.status === 'draft' || t.status === 'open');
  const pastTournaments = tournaments.filter(t => t.status === 'completed');

  const handleCreateTournament = async () => {
    if (!newTournamentName || !newTournamentDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nombre y fecha son requeridos",
      });
      return;
    }

    try {
      await createTournament({
        name: newTournamentName,
        date: newTournamentDate,
        location: newTournamentLocation || "Pistas Municipales Villena",
        description: newTournamentDescription || "Nuevo torneo de la liga",
        maxTeams: 8,
      });
      setNewTournamentName("");
      setNewTournamentDate("");
      setNewTournamentLocation("Pistas Municipales Villena");
      setNewTournamentDescription("");
      setIsCreateTournamentOpen(false);
      toast({ title: "Torneo Creado", description: "El torneo ha sido añadido al calendario." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al crear torneo",
      });
    }
  };

  const handleEditTournament = (tournament: typeof tournaments[0]) => {
    setEditingTournamentId(tournament.id);
    setEditTournamentName(tournament.name);
    setEditTournamentDate(tournament.date);
    setEditTournamentLocation(tournament.location);
    setEditTournamentDescription(tournament.description);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditTournament = async () => {
    if (!editingTournamentId) return;

    try {
      await updateTournament(editingTournamentId, {
        name: editTournamentName,
        date: editTournamentDate,
        location: editTournamentLocation,
        description: editTournamentDescription,
      });
      setIsEditDialogOpen(false);
      setEditingTournamentId(null);
      toast({ title: "Torneo Actualizado", description: "Los cambios han sido guardados." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al actualizar torneo",
      });
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este torneo?")) return;

    try {
      await deleteTournament(id);
      toast({ title: "Torneo Eliminado", description: "El torneo ha sido eliminado." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al eliminar torneo",
      });
    }
  };

  const handleStatusChange = async (tournamentId: string, newStatus: string) => {
    try {
      await tournamentsApi.update(tournamentId, { status: newStatus });
      await fetchTournaments();
      toast({ title: "Estado actualizado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleStartDraft = async (tournamentId: string) => {
    try {
      const existingState = await draftApi.getState(tournamentId);
      if (existingState?.draftState?.isActive === 'true') {
        toast({ title: "Draft ya activo", description: "Usa la vista del torneo para gestionar el draft." });
        return;
      }
    } catch {}
    
    try {
      await draftApi.start(tournamentId, 5);
      await fetchTournaments();
      toast({ title: "Draft iniciado", description: "Los capitanes pueden empezar a elegir jugadores." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al iniciar draft", description: error.message });
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm("¿Eliminar este jugador?")) return;
    try {
      await playersApi.delete(playerId);
      await fetchPlayers();
      toast({ title: "Jugador eliminado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

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
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex justify-center items-center">
          <p className="text-xl">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-display font-bold">PANEL DE ADMINISTRADOR</h1>
          <div className="flex gap-2">
            <Dialog open={isCreateTournamentOpen} onOpenChange={setIsCreateTournamentOpen}>
              <DialogTrigger asChild>
                <Button className="font-display cursor-pointer" data-testid="button-new-tournament">
                  + NUEVO TORNEO
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-white/10 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">Crear Nuevo Torneo</DialogTitle>
                  <p className="text-sm text-muted-foreground">Completa la informacion del torneo. Todos los campos son importantes para que los jugadores conozcan los detalles.</p>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nombre del Torneo *</label>
                    <Input 
                      placeholder="Ej: Torneo Verano 2026" 
                      value={newTournamentName}
                      onChange={(e) => setNewTournamentName(e.target.value)}
                      className="bg-black/20 h-12"
                      data-testid="input-tournament-name"
                    />
                    <p className="text-xs text-muted-foreground">Nombre descriptivo que identifique el torneo</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Fecha del Torneo *</label>
                    <Input 
                      type="date"
                      value={newTournamentDate}
                      onChange={(e) => setNewTournamentDate(e.target.value)}
                      className="bg-black/20 h-12"
                      data-testid="input-tournament-date"
                    />
                    <p className="text-xs text-muted-foreground">Selecciona la fecha oficial del torneo</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ubicacion</label>
                    <Input 
                      placeholder="Ej: Pistas Municipales Villena" 
                      value={newTournamentLocation}
                      onChange={(e) => setNewTournamentLocation(e.target.value)}
                      className="bg-black/20 h-12"
                      data-testid="input-tournament-location"
                    />
                    <p className="text-xs text-muted-foreground">Direccion o nombre del lugar donde se jugara</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Descripcion</label>
                    <textarea 
                      placeholder="Describe el formato del torneo, premios, horarios estimados, etc."
                      value={newTournamentDescription}
                      onChange={(e) => setNewTournamentDescription(e.target.value)}
                      className="w-full bg-black/20 border border-input rounded-md px-3 py-2 min-h-[100px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid="input-tournament-description"
                    />
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <Button onClick={handleCreateTournament} className="w-full h-12 font-display text-lg tracking-wider cursor-pointer" data-testid="button-create-tournament">
                      CREAR TORNEO
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">Una vez creado, podras editar estos datos en cualquier momento</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <Play className="w-6 h-6 text-primary" />
            TORNEOS ACTIVOS
          </h2>
          
          {activeTournaments.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No hay torneos activos. Crea uno nuevo.</p>
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
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Máx. {t.maxTeams} equipos</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/tournaments/${t.id}`}>
                        <Button size="sm" variant="outline" className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => handleEditTournament(t)}>
                        <Settings className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      
                      <Select value={t.status} onValueChange={(status) => handleStatusChange(t.id, status)}>
                        <SelectTrigger className="w-32 h-8 bg-transparent border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Abierto</SelectItem>
                          <SelectItem value="draft">En Draft</SelectItem>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="completed">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {t.status === 'draft' && (
                      <Button 
                        size="sm" 
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-display cursor-pointer"
                        onClick={() => handleStartDraft(t.id)}
                        data-testid={`button-start-draft-${t.id}`}
                      >
                        <Play className="w-4 h-4 mr-1" /> INICIAR DRAFT
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-muted-foreground" />
            TORNEOS PASADOS
          </h2>
          
          {pastTournaments.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No hay torneos finalizados.</p>
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
                    <p className="text-sm text-muted-foreground mb-3">{t.date}</p>
                    <div className="flex gap-2">
                      <Link href={`/tournaments/${t.id}`}>
                        <Button size="sm" variant="ghost" className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-500 cursor-pointer"
                        onClick={() => handleDeleteTournament(t.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6">GESTIÓN DE JUGADORES</h2>
          <p className="text-sm text-muted-foreground mb-4">Los capitanes se gestionan dentro de cada torneo.</p>
             <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="font-display">Gestión de Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead>Nombre</TableHead>
                        <TableHead>Móvil</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Media</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.filter(p => p.role !== 'admin').map((p) => (
                        <TableRow key={p.id} className="border-white/10 hover:bg-white/5" data-testid={`row-player-${p.id}`}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.mobile}</TableCell>
                          <TableCell>
                            <Badge 
                              className={p.role === 'captain' ? 'bg-primary text-black' : 'bg-white/10'}
                            >
                              {p.role === 'captain' ? 'CAPITÁN' : 'JUGADOR'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-primary">{p.overall}</TableCell>
                          <TableCell className="space-x-2">
                             <Button 
                               size="sm" 
                               variant="ghost" 
                               className="h-7 text-xs text-red-500 cursor-pointer"
                               onClick={() => handleDeletePlayer(p.id)}
                               data-testid={`button-delete-player-${p.id}`}
                             >
                               Eliminar
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
        </section>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Editar Torneo</DialogTitle>
            <p className="text-sm text-muted-foreground">Actualiza la informacion del torneo. Los cambios se reflejan al instante.</p>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nombre del Torneo *</label>
              <Input 
                placeholder="Nombre" 
                value={editTournamentName}
                onChange={(e) => setEditTournamentName(e.target.value)}
                className="bg-black/20 h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha del Torneo *</label>
              <Input 
                type="date"
                value={editTournamentDate}
                onChange={(e) => setEditTournamentDate(e.target.value)}
                className="bg-black/20 h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ubicacion</label>
              <Input 
                placeholder="Ubicacion" 
                value={editTournamentLocation}
                onChange={(e) => setEditTournamentLocation(e.target.value)}
                className="bg-black/20 h-12"
              />
              <p className="text-xs text-muted-foreground">Direccion o nombre del lugar</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Descripcion</label>
              <textarea 
                placeholder="Descripcion del torneo"
                value={editTournamentDescription}
                onChange={(e) => setEditTournamentDescription(e.target.value)}
                className="w-full bg-black/20 border border-input rounded-md px-3 py-2 min-h-[100px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="pt-2 border-t border-white/10">
              <Button onClick={handleSaveEditTournament} className="w-full h-12 font-display text-lg tracking-wider cursor-pointer">
                GUARDAR CAMBIOS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
