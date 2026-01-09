import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { teamsApi, playersApi, tournamentsApi, type Team } from "@/lib/api";

export default function AdminDashboard() {
  const { 
    tournaments, 
    players, 
    createTournament, 
    updateTournament, 
    deleteTournament, 
    assignCaptain,
    fetchPlayers,
    fetchTournaments
  } = useStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDate, setNewTournamentDate] = useState("");
  const [newTournamentLocation, setNewTournamentLocation] = useState("Pistas Municipales Villena");
  const [newTournamentDescription, setNewTournamentDescription] = useState("");
  const [newTournamentMaxTeams, setNewTournamentMaxTeams] = useState("8");
  const { toast } = useToast();

  // For Captain Promotion
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [captainPassword, setCaptainPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // For Tournament Editing
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [editTournamentName, setEditTournamentName] = useState("");
  const [editTournamentDate, setEditTournamentDate] = useState("");
  const [editTournamentLocation, setEditTournamentLocation] = useState("");
  const [editTournamentDescription, setEditTournamentDescription] = useState("");
  const [editTournamentMaxTeams, setEditTournamentMaxTeams] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // For Teams Management
  const [selectedTournamentForTeams, setSelectedTournamentForTeams] = useState<string>("");
  const [teamsForTournament, setTeamsForTournament] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedCaptainId, setSelectedCaptainId] = useState("");

  // Fetch data on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchPlayers(), fetchTournaments()])
      .finally(() => setIsLoading(false));
  }, []);

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
        maxTeams: parseInt(newTournamentMaxTeams) || 8,
      });
      setNewTournamentName("");
      setNewTournamentDate("");
      setNewTournamentLocation("Pistas Municipales Villena");
      setNewTournamentDescription("");
      setNewTournamentMaxTeams("8");
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
    setEditTournamentMaxTeams(tournament.maxTeams.toString());
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
        maxTeams: parseInt(editTournamentMaxTeams) || 8,
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

  const handlePromoteCaptain = async () => {
    if (selectedPlayerId && captainPassword) {
      try {
        await assignCaptain(selectedPlayerId, captainPassword);
        setIsDialogOpen(false);
        setCaptainPassword("");
        setSelectedPlayerId(null);
        toast({ title: "Capitán Asignado", description: "El jugador ahora tiene rol de capitán." });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Error al asignar capitán",
        });
      }
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

  const loadTeams = async (tournamentId: string) => {
    if (!tournamentId) return;
    try {
      const { teams } = await teamsApi.getForTournament(tournamentId);
      setTeamsForTournament(teams);
    } catch {
      setTeamsForTournament([]);
    }
  };

  const handleCreateTeam = async () => {
    if (!selectedTournamentForTeams || !selectedCaptainId || !newTeamName) {
      toast({ variant: "destructive", title: "Completa todos los campos" });
      return;
    }
    try {
      await teamsApi.create({
        tournamentId: selectedTournamentForTeams,
        captainId: selectedCaptainId,
        name: newTeamName,
      });
      setNewTeamName("");
      setSelectedCaptainId("");
      await loadTeams(selectedTournamentForTeams);
      toast({ title: "Equipo creado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al crear equipo", description: error.message });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("¿Eliminar este equipo?")) return;
    try {
      await teamsApi.delete(teamId);
      await loadTeams(selectedTournamentForTeams);
      toast({ title: "Equipo eliminado" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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

  const captains = players.filter(p => p.role === 'captain');

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
        <h1 className="text-4xl font-display font-bold mb-8">PANEL DE ADMINISTRADOR</h1>
        
        <Tabs defaultValue="tournaments" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-8">
            <TabsTrigger value="tournaments" className="cursor-pointer">Torneos</TabsTrigger>
            <TabsTrigger value="teams" className="cursor-pointer">Equipos</TabsTrigger>
            <TabsTrigger value="players" className="cursor-pointer">Jugadores</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tournaments">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Create Tournament */}
              <Card className="bg-white/5 border-white/10 h-fit">
                <CardHeader>
                  <CardTitle className="font-display">Crear Torneo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input 
                    placeholder="Nombre del Torneo" 
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    className="bg-black/20"
                    data-testid="input-tournament-name"
                  />
                  <Input 
                    type="date"
                    value={newTournamentDate}
                    onChange={(e) => setNewTournamentDate(e.target.value)}
                    className="bg-black/20"
                    data-testid="input-tournament-date"
                  />
                  <Input 
                    placeholder="Ubicación" 
                    value={newTournamentLocation}
                    onChange={(e) => setNewTournamentLocation(e.target.value)}
                    className="bg-black/20"
                    data-testid="input-tournament-location"
                  />
                  <Input 
                    placeholder="Descripción" 
                    value={newTournamentDescription}
                    onChange={(e) => setNewTournamentDescription(e.target.value)}
                    className="bg-black/20"
                    data-testid="input-tournament-description"
                  />
                  <Input 
                    type="number"
                    placeholder="Equipos máximos" 
                    value={newTournamentMaxTeams}
                    onChange={(e) => setNewTournamentMaxTeams(e.target.value)}
                    className="bg-black/20"
                    data-testid="input-tournament-max-teams"
                  />
                  <Button onClick={handleCreateTournament} className="w-full font-display cursor-pointer" data-testid="button-create-tournament">
                    AÑADIR EVENTO
                  </Button>
                </CardContent>
              </Card>
              
              {/* Tournament List */}
              <Card className="md:col-span-2 bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="font-display">Torneos Existentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead>Nombre</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tournaments.map((t) => (
                        <TableRow key={t.id} className="border-white/10 hover:bg-white/5" data-testid={`row-tournament-${t.id}`}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.date}</TableCell>
                          <TableCell>
                            <Select 
                              value={t.status}
                              onValueChange={(status) => handleStatusChange(t.id, status)}
                            >
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
                          </TableCell>
                          <TableCell className="space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="cursor-pointer"
                              onClick={() => handleEditTournament(t)}
                              data-testid={`button-edit-tournament-${t.id}`}
                            >
                              Editar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="cursor-pointer text-red-500 hover:text-red-400"
                              onClick={() => handleDeleteTournament(t.id)}
                              data-testid={`button-delete-tournament-${t.id}`}
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
            </div>
          </TabsContent>

          <TabsContent value="teams">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-white/5 border-white/10 h-fit">
                <CardHeader>
                  <CardTitle className="font-display">Crear Equipo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select onValueChange={(v) => { setSelectedTournamentForTeams(v); loadTeams(v); }}>
                    <SelectTrigger className="bg-black/20">
                      <SelectValue placeholder="Selecciona torneo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournaments.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Input 
                    placeholder="Nombre del equipo" 
                    value={newTeamName} 
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="bg-black/20"
                    data-testid="input-team-name"
                  />
                  
                  <Select onValueChange={setSelectedCaptainId} value={selectedCaptainId}>
                    <SelectTrigger className="bg-black/20">
                      <SelectValue placeholder="Selecciona capitán" />
                    </SelectTrigger>
                    <SelectContent>
                      {captains.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={handleCreateTeam} 
                    className="w-full font-display cursor-pointer"
                    data-testid="button-create-team"
                  >
                    CREAR EQUIPO
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="font-display">Equipos del Torneo</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTournamentForTeams ? (
                    teamsForTournament.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No hay equipos creados</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10">
                            <TableHead>Nombre</TableHead>
                            <TableHead>Capitán</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamsForTournament.map(team => (
                            <TableRow key={team.id} className="border-white/10 hover:bg-white/5">
                              <TableCell className="font-medium">{team.name}</TableCell>
                              <TableCell>{players.find(p => p.id === team.captainId)?.name || 'N/A'}</TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-500 cursor-pointer"
                                  onClick={() => handleDeleteTeam(team.id)}
                                  data-testid={`button-delete-team-${team.id}`}
                                >
                                  Eliminar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Selecciona un torneo para ver sus equipos</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="players">
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
                             {p.role === 'player' && (
                               <Dialog open={isDialogOpen && selectedPlayerId === p.id} onOpenChange={(open) => {
                                 setIsDialogOpen(open);
                                 if (!open) {
                                   setSelectedPlayerId(null);
                                   setCaptainPassword("");
                                 }
                               }}>
                                 <DialogTrigger asChild>
                                   <Button 
                                     size="sm" 
                                     variant="outline" 
                                     className="h-7 text-xs cursor-pointer"
                                     onClick={() => setSelectedPlayerId(p.id)}
                                     data-testid={`button-promote-captain-${p.id}`}
                                   >
                                     Hacer Capitán
                                   </Button>
                                 </DialogTrigger>
                                 <DialogContent className="bg-card border-white/10">
                                   <DialogHeader>
                                     <DialogTitle>Asignar Capitán</DialogTitle>
                                   </DialogHeader>
                                   <div className="space-y-4 py-4">
                                     <p>Estás ascendiendo a <strong>{p.name}</strong> a Capitán.</p>
                                     <p className="text-sm text-muted-foreground">Establece una contraseña para que pueda acceder al panel de draft.</p>
                                     <Input 
                                       type="text" 
                                       placeholder="Contraseña de acceso" 
                                       value={captainPassword}
                                       onChange={(e) => setCaptainPassword(e.target.value)}
                                       data-testid="input-captain-password"
                                     />
                                     <Button onClick={handlePromoteCaptain} className="w-full cursor-pointer" data-testid="button-confirm-promote">Confirmar Ascenso</Button>
                                   </div>
                                 </DialogContent>
                               </Dialog>
                             )}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Tournament Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Editar Torneo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Nombre del Torneo" 
              value={editTournamentName}
              onChange={(e) => setEditTournamentName(e.target.value)}
              className="bg-black/20"
              data-testid="input-edit-tournament-name"
            />
            <Input 
              type="date"
              value={editTournamentDate}
              onChange={(e) => setEditTournamentDate(e.target.value)}
              className="bg-black/20"
              data-testid="input-edit-tournament-date"
            />
            <Input 
              placeholder="Ubicación" 
              value={editTournamentLocation}
              onChange={(e) => setEditTournamentLocation(e.target.value)}
              className="bg-black/20"
              data-testid="input-edit-tournament-location"
            />
            <Input 
              placeholder="Descripción" 
              value={editTournamentDescription}
              onChange={(e) => setEditTournamentDescription(e.target.value)}
              className="bg-black/20"
              data-testid="input-edit-tournament-description"
            />
            <Input 
              type="number"
              placeholder="Equipos máximos" 
              value={editTournamentMaxTeams}
              onChange={(e) => setEditTournamentMaxTeams(e.target.value)}
              className="bg-black/20"
              data-testid="input-edit-tournament-max-teams"
            />
            <Button onClick={handleSaveEditTournament} className="w-full cursor-pointer" data-testid="button-save-edit-tournament">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
