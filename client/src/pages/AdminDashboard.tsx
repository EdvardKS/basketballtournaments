import { useState } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { tournaments, players, createTournament, assignCaptain } = useStore();
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDate, setNewTournamentDate] = useState("");
  const { toast } = useToast();

  // For Captain Promotion
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [captainPassword, setCaptainPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateTournament = () => {
    if (!newTournamentName || !newTournamentDate) return;
    createTournament({
      name: newTournamentName,
      date: newTournamentDate,
      location: "Pistas Municipales Villena",
      description: "Nuevo torneo de la liga",
      maxTeams: 8,
      winnerId: undefined
    });
    setNewTournamentName("");
    setNewTournamentDate("");
    toast({ title: "Torneo Creado", description: "El torneo ha sido añadido al calendario." });
  };

  const handlePromoteCaptain = () => {
    if (selectedPlayerId && captainPassword) {
      assignCaptain(selectedPlayerId, captainPassword);
      setIsDialogOpen(false);
      setCaptainPassword("");
      setSelectedPlayerId(null);
      toast({ title: "Capitán Asignado", description: "El jugador ahora tiene rol de capitán." });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-display font-bold mb-8">PANEL DE ADMINISTRADOR</h1>
        
        <Tabs defaultValue="tournaments" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-8">
            <TabsTrigger value="tournaments">Gestión de Torneos</TabsTrigger>
            <TabsTrigger value="players">Jugadores y Capitanes</TabsTrigger>
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
                  />
                  <Input 
                    type="date"
                    value={newTournamentDate}
                    onChange={(e) => setNewTournamentDate(e.target.value)}
                    className="bg-black/20"
                  />
                  <Button onClick={handleCreateTournament} className="w-full font-display">
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
                        <TableRow key={t.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.status}</Badge>
                          </TableCell>
                          <TableCell>
                             <Button size="sm" variant="ghost">Editar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                      {players.map((p) => (
                        <TableRow key={p.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.mobile}</TableCell>
                          <TableCell>
                            <Badge 
                              className={p.role === 'captain' ? 'bg-primary text-black' : 'bg-white/10'}
                            >
                              {p.role === 'captain' ? 'CAPITÁN' : p.role === 'admin' ? 'ADMIN' : 'JUGADOR'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-primary">{p.overall}</TableCell>
                          <TableCell>
                             {p.role === 'player' && (
                               <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                 <DialogTrigger asChild>
                                   <Button 
                                     size="sm" 
                                     variant="outline" 
                                     className="h-7 text-xs"
                                     onClick={() => setSelectedPlayerId(p.id)}
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
                                     />
                                     <Button onClick={handlePromoteCaptain} className="w-full">Confirmar Ascenso</Button>
                                   </div>
                                 </DialogContent>
                               </Dialog>
                             )}
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
    </div>
  );
}
