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
import { teamsApi, playersApi, tournamentsApi, draftApi, type Team } from "@/lib/api";
import { Link } from "wouter";
import { Calendar, MapPin, Users, Play, Eye, Settings, Trophy, Clock } from "lucide-react";

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

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [captainPassword, setCaptainPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [editTournamentName, setEditTournamentName] = useState("");
  const [editTournamentDate, setEditTournamentDate] = useState("");
  const [editTournamentLocation, setEditTournamentLocation] = useState("");
  const [editTournamentDescription, setEditTournamentDescription] = useState("");
  const [editTournamentMaxTeams, setEditTournamentMaxTeams] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [selectedTournamentForTeams, setSelectedTournamentForTeams] = useState<string>("");
  const [teamsForTournament, setTeamsForTournament] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedCaptainId, setSelectedCaptainId] = useState("");

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
        maxTeams: parseInt(newTournamentMaxTeams) || 8,
      });
      setNewTournamentName("");
      setNewTournamentDate("");
      setNewTournamentLocation("Pistas Municipales Villena");
      setNewTournamentDescription("");
      setNewTournamentMaxTeams("8");
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-display font-bold">PANEL DE ADMINISTRADOR</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="font-display cursor-pointer"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/seed-sample-data', { method: 'POST', credentials: 'include' });
                  const data = await res.json();
                  if (data.success) {
                    toast({ title: "Datos de ejemplo creados", description: "Se ha creado un torneo pasado con jugadores y equipos." });
                    fetchTournaments();
                    fetchPlayers();
                  } else {
                    toast({ variant: "destructive", title: "Error", description: data.error || data.message });
                  }
                } catch (e) {
                  toast({ variant: "destructive", title: "Error al generar datos" });
                }
              }}
              data-testid="button-seed-data"
            >
              Generar Demo
            </Button>
            <Dialog open={isCreateTournamentOpen} onOpenChange={setIsCreateTournamentOpen}>
              <DialogTrigger asChild>
                <Button className="font-display cursor-pointer" data-testid="button-new-tournament">
                  + NUEVO TORNEO
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-card border-white/10 max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Crear Nuevo Torneo</DialogTitle>
                <p className="text-sm text-muted-foreground">Completa la información del torneo. Todos los campos son importantes para que los jugadores conozcan los detalles.</p>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Fecha del Torneo *</label>
                    <Input 
                      type="date"
                      value={newTournamentDate}
                      onChange={(e) => setNewTournamentDate(e.target.value)}
                      className="bg-black/20 h-12"
                      data-testid="input-tournament-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nº Máximo de Equipos</label>
                    <Input 
                      type="number"
                      min="2"
                      max="16"
                      placeholder="8" 
                      value={newTournamentMaxTeams}
                      onChange={(e) => setNewTournamentMaxTeams(e.target.value)}
                      className="bg-black/20 h-12"
                      data-testid="input-tournament-max-teams"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Ubicación</label>
                  <Input 
                    placeholder="Ej: Pistas Municipales Villena" 
                    value={newTournamentLocation}
                    onChange={(e) => setNewTournamentLocation(e.target.value)}
                    className="bg-black/20 h-12"
                    data-testid="input-tournament-location"
                  />
                  <p className="text-xs text-muted-foreground">Dirección o nombre del lugar donde se jugará</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Descripción</label>
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
                  <p className="text-xs text-center text-muted-foreground mt-2">Una vez creado, podrás editar estos datos en cualquier momento</p>
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

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-8">
            <TabsTrigger value="teams" className="cursor-pointer">Equipos</TabsTrigger>
            <TabsTrigger value="players" className="cursor-pointer">Jugadores</TabsTrigger>
          </TabsList>

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
                      {tournaments.filter(t => t.status === 'draft' || t.status === 'open').map(t => (
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display">Editar Torneo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder="Nombre" 
              value={editTournamentName}
              onChange={(e) => setEditTournamentName(e.target.value)}
              className="bg-black/20"
            />
            <Input 
              type="date"
              value={editTournamentDate}
              onChange={(e) => setEditTournamentDate(e.target.value)}
              className="bg-black/20"
            />
            <Input 
              placeholder="Ubicación" 
              value={editTournamentLocation}
              onChange={(e) => setEditTournamentLocation(e.target.value)}
              className="bg-black/20"
            />
            <Input 
              placeholder="Descripción" 
              value={editTournamentDescription}
              onChange={(e) => setEditTournamentDescription(e.target.value)}
              className="bg-black/20"
            />
            <Input 
              type="number"
              placeholder="Equipos máximos" 
              value={editTournamentMaxTeams}
              onChange={(e) => setEditTournamentMaxTeams(e.target.value)}
              className="bg-black/20"
            />
            <Button onClick={handleSaveEditTournament} className="w-full font-display cursor-pointer">
              GUARDAR CAMBIOS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
