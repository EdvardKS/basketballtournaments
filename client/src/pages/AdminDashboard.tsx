import { useState } from "react";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { tournaments, players, createTournament, assignCaptain } = useStore();
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDate, setNewTournamentDate] = useState("");

  const handleCreateTournament = () => {
    createTournament({
      name: newTournamentName,
      date: newTournamentDate,
      location: "TBD",
      description: "New Tournament",
      maxTeams: 8,
      winnerId: undefined
    });
    setNewTournamentName("");
    setNewTournamentDate("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-display font-bold mb-8">ADMIN DASHBOARD</h1>
        
        <Tabs defaultValue="tournaments" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-8">
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="players">Players & Captains</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tournaments">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Create Tournament */}
              <Card className="bg-white/5 border-white/10 h-fit">
                <CardHeader>
                  <CardTitle className="font-display">Create Tournament</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input 
                    placeholder="Tournament Name" 
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
                    CREATE EVENT
                  </Button>
                </CardContent>
              </Card>
              
              {/* Tournament List */}
              <Card className="md:col-span-2 bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="font-display">Manage Tournaments</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead>Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
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
                             <Button size="sm" variant="ghost">Edit</Button>
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
                  <CardTitle className="font-display">User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>OVR</TableHead>
                        <TableHead>Actions</TableHead>
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
                              {p.role.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-primary">{p.overall}</TableCell>
                          <TableCell>
                             {p.role === 'player' && (
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="h-7 text-xs"
                                 onClick={() => assignCaptain(p.id, 'global')}
                               >
                                 Promote to Captain
                               </Button>
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
