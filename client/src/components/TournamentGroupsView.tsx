import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Medal, Check, X } from "lucide-react";
import { groupsApi, matchesApi, teamsApi, type TournamentGroup, type Match, type Team } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface TournamentGroupsViewProps {
  tournamentId: string;
  isAdmin: boolean;
}

interface TeamLookup {
  [key: string]: Team;
}

export function TournamentGroupsView({ tournamentId, isAdmin }: TournamentGroupsViewProps) {
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamLookup, setTeamLookup] = useState<TeamLookup>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<{ home: string; away: string }>({ home: "", away: "" });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const [groupsRes, matchesRes, teamsRes] = await Promise.all([
        groupsApi.getForTournament(tournamentId),
        matchesApi.getForTournament(tournamentId),
        teamsApi.getForTournament(tournamentId)
      ]);
      
      setGroups(groupsRes.groups);
      setMatches(matchesRes.matches);
      setTeams(teamsRes.teams);
      
      const lookup: TeamLookup = {};
      teamsRes.teams.forEach(team => {
        lookup[team.id] = team;
      });
      setTeamLookup(lookup);
    } catch (error) {
      console.error("Failed to load tournament data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos del torneo"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match.id);
    setEditScores({
      home: match.homeScore?.toString() || "",
      away: match.awayScore?.toString() || ""
    });
  };

  const handleSaveMatch = async (match: Match) => {
    const homeScore = parseInt(editScores.home);
    const awayScore = parseInt(editScores.away);
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      toast({ variant: "destructive", title: "Puntuaciones inválidas" });
      return;
    }
    
    setIsSaving(true);
    try {
      await matchesApi.updateResult(
        match.id,
        homeScore,
        awayScore,
        match.homeTeamId || "",
        match.awayTeamId || ""
      );
      
      toast({ title: "Resultado guardado" });
      setEditingMatch(null);
      await loadData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMatch(null);
    setEditScores({ home: "", away: "" });
  };

  const groupMatches = matches.filter(m => m.stage === "group");
  const knockoutMatches = matches.filter(m => m.stage !== "group");
  const semifinals = knockoutMatches.filter(m => m.stage === "semifinal");
  const finals = knockoutMatches.filter(m => m.stage === "final" || m.stage === "third_place");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">Cargando grupos...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            Los grupos aún no han sido generados
          </p>
          {isAdmin && (
            <p className="text-sm text-muted-foreground mt-2">
              Ve al panel de administración para generar los grupos
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const getSortedMembers = (group: TournamentGroup) => {
    if (!group.members) return [];
    return [...group.members].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.pointsFor - a.pointsAgainst;
      const diffB = b.pointsFor - b.pointsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.pointsFor - a.pointsFor;
    });
  };

  const getMatchesForGroup = (groupId: string) => {
    return groupMatches.filter(m => m.groupId === groupId);
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "TBD";
    return teamLookup[teamId]?.name || "Equipo";
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="groups" className="data-[state=active]:bg-primary data-[state=active]:text-black">
            Fase de Grupos
          </TabsTrigger>
          <TabsTrigger value="matches" className="data-[state=active]:bg-primary data-[state=active]:text-black">
            Partidos
          </TabsTrigger>
          <TabsTrigger value="knockout" className="data-[state=active]:bg-primary data-[state=active]:text-black">
            Eliminatorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {groups.map(group => {
              const sortedMembers = getSortedMembers(group);
              
              return (
                <Card key={group.id} className="bg-white/5 border-white/10" data-testid={`group-${group.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-xl flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      {group.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-muted-foreground">
                            <th className="text-left py-2 px-1">#</th>
                            <th className="text-left py-2 px-1">Equipo</th>
                            <th className="text-center py-2 px-1">P</th>
                            <th className="text-center py-2 px-1">W</th>
                            <th className="text-center py-2 px-1">L</th>
                            <th className="text-center py-2 px-1">PF</th>
                            <th className="text-center py-2 px-1">PA</th>
                            <th className="text-center py-2 px-1">DIF</th>
                            <th className="text-center py-2 px-1 text-primary font-bold">PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMembers.map((member, index) => {
                            const isQualifying = index < 2;
                            const diff = member.pointsFor - member.pointsAgainst;
                            
                            return (
                              <tr 
                                key={member.id} 
                                className={`border-b border-white/5 ${isQualifying ? 'bg-primary/10' : ''}`}
                                data-testid={`standings-row-${member.teamId}`}
                              >
                                <td className="py-2 px-1">
                                  {isQualifying ? (
                                    <Medal className="w-4 h-4 text-primary" />
                                  ) : (
                                    <span className="text-muted-foreground">{index + 1}</span>
                                  )}
                                </td>
                                <td className="py-2 px-1 font-medium">
                                  {member.team?.name || getTeamName(member.teamId)}
                                  {isQualifying && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-primary/20 text-primary border-primary/30">
                                      Clasifica
                                    </Badge>
                                  )}
                                </td>
                                <td className="text-center py-2 px-1 text-muted-foreground">{member.gamesPlayed}</td>
                                <td className="text-center py-2 px-1 text-green-400">{member.gamesWon}</td>
                                <td className="text-center py-2 px-1 text-red-400">{member.gamesLost}</td>
                                <td className="text-center py-2 px-1">{member.pointsFor}</td>
                                <td className="text-center py-2 px-1">{member.pointsAgainst}</td>
                                <td className={`text-center py-2 px-1 ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                  {diff > 0 ? '+' : ''}{diff}
                                </td>
                                <td className="text-center py-2 px-1 font-bold text-primary">{member.points}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Medal className="w-3 h-3 text-primary" />
                        Top 2 equipos clasifican a eliminatorias
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <div className="space-y-6">
            {groups.map(group => {
              const groupMatchList = getMatchesForGroup(group.id);
              
              return (
                <Card key={group.id} className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg">{group.name} - Partidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {groupMatchList.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No hay partidos programados</p>
                    ) : (
                      <div className="space-y-3">
                        {groupMatchList.map(match => {
                          const isEditing = editingMatch === match.id;
                          const isCompleted = match.status === "completed";
                          
                          return (
                            <div 
                              key={match.id} 
                              className={`flex items-center justify-between p-3 rounded-lg ${isCompleted ? 'bg-white/5' : 'bg-amber-500/10'}`}
                              data-testid={`match-${match.id}`}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <span className="font-medium text-sm min-w-[100px] text-right">
                                  {getTeamName(match.homeTeamId)}
                                </span>
                                
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={editScores.home}
                                      onChange={(e) => setEditScores(prev => ({ ...prev, home: e.target.value }))}
                                      className="w-14 h-8 text-center bg-black/20"
                                      data-testid={`input-home-score-${match.id}`}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={editScores.away}
                                      onChange={(e) => setEditScores(prev => ({ ...prev, away: e.target.value }))}
                                      className="w-14 h-8 text-center bg-black/20"
                                      data-testid={`input-away-score-${match.id}`}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xl font-display font-bold ${isCompleted ? 'text-white' : 'text-muted-foreground'}`}>
                                      {match.homeScore ?? "-"}
                                    </span>
                                    <span className="text-muted-foreground">:</span>
                                    <span className={`text-xl font-display font-bold ${isCompleted ? 'text-white' : 'text-muted-foreground'}`}>
                                      {match.awayScore ?? "-"}
                                    </span>
                                  </div>
                                )}
                                
                                <span className="font-medium text-sm min-w-[100px]">
                                  {getTeamName(match.awayTeamId)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isCompleted && !isEditing && (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                                    Finalizado
                                  </Badge>
                                )}
                                {!isCompleted && !isEditing && (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                                    Pendiente
                                  </Badge>
                                )}
                                
                                {isAdmin && (
                                  <>
                                    {isEditing ? (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleSaveMatch(match)}
                                          disabled={isSaving}
                                          className="h-8 w-8 p-0 text-green-400 hover:bg-green-500/20"
                                          data-testid={`button-save-${match.id}`}
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={handleCancelEdit}
                                          className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"
                                          data-testid={`button-cancel-${match.id}`}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditMatch(match)}
                                        className="text-primary hover:bg-primary/20"
                                        data-testid={`button-edit-${match.id}`}
                                      >
                                        Editar
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="knockout" className="mt-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Cuadro de Eliminatorias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {knockoutMatches.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Las eliminatorias comenzarán cuando termine la fase de grupos
                  </p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row justify-center items-center gap-8">
                  <div className="space-y-4">
                    <h3 className="font-display text-lg text-center text-muted-foreground">Semifinales</h3>
                    {semifinals.length > 0 ? (
                      semifinals.map(match => (
                        <KnockoutMatchCard
                          key={match.id}
                          match={match}
                          getTeamName={getTeamName}
                          isAdmin={isAdmin}
                          isEditing={editingMatch === match.id}
                          editScores={editScores}
                          setEditScores={setEditScores}
                          onEdit={() => handleEditMatch(match)}
                          onSave={() => handleSaveMatch(match)}
                          onCancel={handleCancelEdit}
                          isSaving={isSaving}
                        />
                      ))
                    ) : (
                      <div className="space-y-4">
                        <PlaceholderMatch label="Semifinal 1" />
                        <PlaceholderMatch label="Semifinal 2" />
                      </div>
                    )}
                  </div>

                  <div className="hidden lg:block w-16 h-px bg-white/20" />

                  <div className="space-y-4">
                    <h3 className="font-display text-lg text-center text-primary">Final</h3>
                    {finals.filter(m => m.stage === "final").length > 0 ? (
                      finals.filter(m => m.stage === "final").map(match => (
                        <KnockoutMatchCard
                          key={match.id}
                          match={match}
                          getTeamName={getTeamName}
                          isAdmin={isAdmin}
                          isEditing={editingMatch === match.id}
                          editScores={editScores}
                          setEditScores={setEditScores}
                          onEdit={() => handleEditMatch(match)}
                          onSave={() => handleSaveMatch(match)}
                          onCancel={handleCancelEdit}
                          isSaving={isSaving}
                          isFinal
                        />
                      ))
                    ) : (
                      <PlaceholderMatch label="Final" isFinal />
                    )}
                    
                    <h3 className="font-display text-sm text-center text-muted-foreground mt-8">Tercer Puesto</h3>
                    {finals.filter(m => m.stage === "third_place").length > 0 ? (
                      finals.filter(m => m.stage === "third_place").map(match => (
                        <KnockoutMatchCard
                          key={match.id}
                          match={match}
                          getTeamName={getTeamName}
                          isAdmin={isAdmin}
                          isEditing={editingMatch === match.id}
                          editScores={editScores}
                          setEditScores={setEditScores}
                          onEdit={() => handleEditMatch(match)}
                          onSave={() => handleSaveMatch(match)}
                          onCancel={handleCancelEdit}
                          isSaving={isSaving}
                        />
                      ))
                    ) : (
                      <PlaceholderMatch label="3er Puesto" />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface KnockoutMatchCardProps {
  match: Match;
  getTeamName: (id: string | null) => string;
  isAdmin: boolean;
  isEditing: boolean;
  editScores: { home: string; away: string };
  setEditScores: React.Dispatch<React.SetStateAction<{ home: string; away: string }>>;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isFinal?: boolean;
}

function KnockoutMatchCard({ 
  match, 
  getTeamName, 
  isAdmin, 
  isEditing, 
  editScores, 
  setEditScores, 
  onEdit, 
  onSave, 
  onCancel, 
  isSaving,
  isFinal 
}: KnockoutMatchCardProps) {
  const isCompleted = match.status === "completed";
  
  return (
    <div 
      className={`p-4 rounded-lg border ${isFinal ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-white/5'}`}
      data-testid={`knockout-match-${match.id}`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-between w-full gap-2">
          <span className={`font-medium text-sm ${match.winnerId === match.homeTeamId ? 'text-primary' : ''}`}>
            {getTeamName(match.homeTeamId)}
          </span>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              value={editScores.home}
              onChange={(e) => setEditScores(prev => ({ ...prev, home: e.target.value }))}
              className="w-12 h-7 text-center bg-black/20 text-sm"
            />
          ) : (
            <span className={`font-display font-bold ${isCompleted ? 'text-white' : 'text-muted-foreground'}`}>
              {match.homeScore ?? "-"}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between w-full gap-2">
          <span className={`font-medium text-sm ${match.winnerId === match.awayTeamId ? 'text-primary' : ''}`}>
            {getTeamName(match.awayTeamId)}
          </span>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              value={editScores.away}
              onChange={(e) => setEditScores(prev => ({ ...prev, away: e.target.value }))}
              className="w-12 h-7 text-center bg-black/20 text-sm"
            />
          ) : (
            <span className={`font-display font-bold ${isCompleted ? 'text-white' : 'text-muted-foreground'}`}>
              {match.awayScore ?? "-"}
            </span>
          )}
        </div>
        
        {isAdmin && (
          <div className="flex gap-1 mt-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSave}
                  disabled={isSaving}
                  className="h-7 text-xs text-green-400 hover:bg-green-500/20"
                >
                  <Check className="w-3 h-3 mr-1" /> Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancel}
                  className="h-7 text-xs text-red-400 hover:bg-red-500/20"
                >
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                className="h-7 text-xs text-primary hover:bg-primary/20"
              >
                Editar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderMatch({ label, isFinal }: { label: string; isFinal?: boolean }) {
  return (
    <div className={`p-4 rounded-lg border border-dashed ${isFinal ? 'border-primary/30' : 'border-white/20'} min-w-[200px]`}>
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <p className="text-sm">{label}</p>
        <div className="flex items-center justify-between w-full">
          <span className="text-xs">Por definir</span>
          <span>-</span>
        </div>
        <div className="flex items-center justify-between w-full">
          <span className="text-xs">Por definir</span>
          <span>-</span>
        </div>
      </div>
    </div>
  );
}
