import { useRoute, Link } from "wouter";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Trophy, Crown, AlertCircle, UserPlus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect, useCallback, useMemo } from "react";
import { tournamentsApi, teamsApi, draftApi, tradesApi, playersApi, registrationsApi, type Player, type Tournament, type Team, type TeamRoster, type TradeOffer, type DraftStateResponse, type TournamentRegistration } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { SkillRadarChart } from "@/components/SkillRadarChart";
import { TournamentGroupsView } from "@/components/TournamentGroupsView";
import { PlayerCard } from "@/components/PlayerCard";
import { PackReveal } from "@/components/PackReveal";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";

type PlayerWithRegistration = Player & { isCaptain: boolean };
type RevealItem = { player: Player; teamName?: string };

const DEFAULT_TOURNAMENT_RULES = [
  "Formato 5v5 Cancha Completa",
  "Eliminacion Doble",
  "Dos partes de 20 minutos",
  "Seleccion por Draft de Capitanes",
  "Reglas FIBA",
];
const DEFAULT_TOURNAMENT_RULES_TEXT = DEFAULT_TOURNAMENT_RULES.join("\n");
const POSITION_OPTIONS = [
  { value: "base", label: "Base" },
  { value: "alero-base", label: "Alero-Base" },
  { value: "escolta", label: "Escolta" },
  { value: "alero", label: "Alero" },
  { value: "ala-pivot", label: "Ala-Pivot" },
  { value: "pivot", label: "Pivot" },
  { value: "alero-escolta", label: "Alero-Escolta" },
];

export default function TournamentDetails() {
  const [match, params] = useRoute("/tournaments/:id");
  const { currentUser } = useStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registeredPlayers, setRegisteredPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamRosters, setTeamRosters] = useState<TeamRoster[]>([]);
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([]);
  const [draftState, setDraftState] = useState<DraftStateResponse | null>(null);
  const [draftedPlayerIds, setDraftedPlayerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isStartingDraft, setIsStartingDraft] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isMovingPlayerId, setIsMovingPlayerId] = useState<string | null>(null);
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [tradeTarget, setTradeTarget] = useState<{ player: Player; team: Team } | null>(null);
  const [tradeOfferPlayers, setTradeOfferPlayers] = useState<string[]>([]);
  const [isSendingTrade, setIsSendingTrade] = useState(false);
  const [isResolvingTrade, setIsResolvingTrade] = useState(false);
  const [revealQueue, setRevealQueue] = useState<RevealItem[]>([]);
  const [activeReveal, setActiveReveal] = useState<RevealItem | null>(null);
  const { toast } = useToast();

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerUsername, setNewPlayerUsername] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerMobile, setNewPlayerMobile] = useState("");
  const [newPlayerPassword, setNewPlayerPassword] = useState("");
  const [newPlayerConfirmPassword, setNewPlayerConfirmPassword] = useState("");
  const [newPlayerIsPublic, setNewPlayerIsPublic] = useState(false);
  const [newPlayerPosition, setNewPlayerPosition] = useState("base");
  const [newPlayerStats, setNewPlayerStats] = useState({
    pace: 50, shooting: 50, passing: 50, dribbling: 50, defense: 50, physical: 50
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [teamWhatsappName, setTeamWhatsappName] = useState("");
  const [teamWhatsappLink, setTeamWhatsappLink] = useState("");
  const [isSavingTeamInfo, setIsSavingTeamInfo] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "player" | "captain">("all");
  const [minOverall, setMinOverall] = useState(0);
  const [statFilter, setStatFilter] = useState<"overall" | "pace" | "shooting" | "passing" | "dribbling" | "defense" | "physical">("overall");
  const [minStat, setMinStat] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [rulesDraft, setRulesDraft] = useState(DEFAULT_TOURNAMENT_RULES_TEXT);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [activeTab, setActiveTab] = useState("rules");
  
  const loadTournament = useCallback(async (id: string) => {
    try {
      const data = await tournamentsApi.getById(id);
      setTournament(data.tournament);

      const registrationsRes = await registrationsApi.getForTournament(id);
      setRegistrations(registrationsRes.registrations);
      setRegisteredPlayers(registrationsRes.registrations.map(r => r.player));

      let rosterData: { rosters: TeamRoster[] } = { rosters: [] };
      try {
        rosterData = await teamsApi.getRosters(id);
      } catch (error) {
        console.error("Failed to load rosters:", error);
      }

      if (rosterData.rosters.length > 0) {
        const rostersWithCaptains = rosterData.rosters.map((roster) => {
          const filteredPlayers = roster.players.filter((player) => player.role !== 'admin');
          const hasCaptain = filteredPlayers.some((player) => player.id === roster.team.captainId);
          if (!hasCaptain) {
            const captain = registrationsRes.registrations.find(r => r.playerId === roster.team.captainId)?.player;
            if (captain && captain.role !== 'admin') {
              return { ...roster, players: [...filteredPlayers, captain] };
            }
          }
          return { ...roster, players: filteredPlayers };
        });
        setTeamRosters(rostersWithCaptains);
        setTeams(rostersWithCaptains.map(r => r.team));
        setDraftedPlayerIds(rostersWithCaptains.flatMap(r => r.players.map(p => p.id)));
      } else {
        const { teams: tournamentTeams } = await teamsApi.getForTournament(id);
        setTeams(tournamentTeams);
        setTeamRosters(tournamentTeams.map(team => ({ team, players: [] })));
        setDraftedPlayerIds([]);
      }

      try {
        const tradeRes = await tradesApi.getForTournament(id);
        setTradeOffers(tradeRes.offers);
      } catch (error) {
        console.error("Failed to load trade offers:", error);
        setTradeOffers([]);
      }

      if (data.tournament.status === 'draft') {
        try {
          const state = await draftApi.getState(id);
          setDraftState(state);
        } catch {
          setDraftState(null);
        }
      } else {
        setDraftState(null);
      }
    } catch (error) {
      console.error("Failed to load tournament:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el torneo",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (match && params?.id) {
      setIsLoading(true);
      loadTournament(params.id).finally(() => setIsLoading(false));
    }
  }, [match, params?.id, loadTournament]);

  useEffect(() => {
    if (!params?.id) return;
    const interval = setInterval(() => {
      loadTournament(params.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [params?.id, loadTournament]);

  useEffect(() => {
    if (!currentUser) return;
    const myTeam = teams.find(t => t.captainId === currentUser.id);
    if (!myTeam) return;
    setTeamNameInput(myTeam.name);
    setTeamWhatsappName(myTeam.whatsappGroupName || "");
    setTeamWhatsappLink(myTeam.whatsappGroupLink || "");
  }, [teams, currentUser]);

  useEffect(() => {
    if (!activeReveal && revealQueue.length > 0) {
      setActiveReveal(revealQueue[0]);
    }
  }, [activeReveal, revealQueue]);

  const enqueueReveal = useCallback((items: RevealItem[]) => {
    if (items.length === 0) return;
    setRevealQueue((queue) => [...queue, ...items]);
  }, []);

  const handleRevealClose = useCallback(() => {
    setRevealQueue((queue) => queue.slice(1));
    setActiveReveal(null);
  }, []);

  const handleRefresh = async () => {
    if (params?.id) {
      await loadTournament(params.id);
      toast({ title: "Actualizado" });
    }
  };

  const handleDraftPlayer = async (playerId: string) => {
    if (!currentUser || !draftState?.currentTeam) return;

    const myTeam = teams.find(t => t.captainId === currentUser.id);
    const teamToDraft = currentUser.role === 'admin' ? draftState.currentTeam : myTeam;

    if (!teamToDraft) {
      toast({ variant: "destructive", title: "No tienes equipo asignado" });
      return;
    }

    setIsDrafting(true);
    try {
      const result = await draftApi.draftPlayer(teamToDraft.id, playerId);
      
      if (result.draftComplete) {
        toast({ title: "Draft completado", description: result.message });
      } else {
        toast({ title: "Jugador drafteado" });
      }

      const draftedPlayer = playersById.get(playerId);
      if (draftedPlayer) {
        enqueueReveal([{ player: draftedPlayer, teamName: teamToDraft.name }]);
      }

      if (params?.id) {
        await loadTournament(params.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al draftear", description: error.message });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleStartDraft = async () => {
    if (!params?.id) return;
    setIsStartingDraft(true);
    try {
      const result = await draftApi.start(params.id, 0);
      await loadTournament(params.id);
      if (!result.draftState) {
        toast({
          title: "Draft no iniciado",
          description: result.message || "No hay jugadores para draftear.",
        });
        return;
      }
      toast({ title: "Draft iniciado", description: "Los capitanes pueden empezar a elegir jugadores." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al iniciar draft", description: error.message });
    } finally {
      setIsStartingDraft(false);
    }
  };

  const handleMovePlayer = async (playerId: string, toTeamId: string) => {
    if (!params?.id) return;
    setIsMovingPlayerId(playerId);
    try {
      await teamsApi.movePlayer(playerId, toTeamId);
      const movedPlayer = playersById.get(playerId);
      const targetTeam = teamById.get(toTeamId);
      if (movedPlayer) {
        enqueueReveal([{ player: movedPlayer, teamName: targetTeam?.name }]);
      }
      await loadTournament(params.id);
      toast({ title: "Jugador movido" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al mover jugador", description: error.message });
    } finally {
      setIsMovingPlayerId(null);
    }
  };

  const openTradeDialog = (player: Player, team: Team) => {
    setTradeTarget({ player, team });
    setTradeOfferPlayers([]);
    setIsTradeDialogOpen(true);
  };

  const toggleTradeOfferPlayer = (playerId: string) => {
    setTradeOfferPlayers((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }
      if (current.length >= 3) {
        toast({ variant: "destructive", title: "Maximo 3 jugadores por oferta" });
        return current;
      }
      return [...current, playerId];
    });
  };

  const handleSendTradeOffer = async () => {
    if (!tradeTarget || !tournament) return;
    if (!myTeam) {
      toast({ variant: "destructive", title: "No tienes equipo asignado" });
      return;
    }
    if (!tradeWindowOpen) {
      toast({ variant: "destructive", title: "El periodo de intercambios termino" });
      return;
    }
    if (tradeOfferPlayers.length === 0) {
      toast({ variant: "destructive", title: "Selecciona al menos un jugador" });
      return;
    }
    setIsSendingTrade(true);
    try {
      await tradesApi.createOffer({
        tournamentId: tournament.id,
        targetPlayerId: tradeTarget.player.id,
        offeredPlayerIds: tradeOfferPlayers,
      });
      toast({ title: "Oferta enviada" });
      setIsTradeDialogOpen(false);
      setTradeOfferPlayers([]);
      if (params?.id) {
        await loadTournament(params.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al enviar oferta", description: error.message });
    } finally {
      setIsSendingTrade(false);
    }
  };

  const handleResolveTradeOffer = async (offerId: string, action: 'accept' | 'reject') => {
    if (!params?.id) return;
    setIsResolvingTrade(true);
    try {
      const { offer } = await tradesApi.resolveOffer(offerId, action);

      if (action === 'accept') {
        const revealItems: RevealItem[] = [];
        const requestingTeam = teamById.get(offer.requestingTeamId);
        const targetTeam = teamById.get(offer.targetTeamId);

        if (currentUser?.role === 'admin') {
          const targetPlayer = playersById.get(offer.targetPlayerId);
          if (targetPlayer && requestingTeam) {
            revealItems.push({ player: targetPlayer, teamName: requestingTeam.name });
          }
          offer.offeredPlayerIds.forEach((playerId) => {
            const player = playersById.get(playerId);
            if (player && targetTeam) {
              revealItems.push({ player, teamName: targetTeam.name });
            }
          });
        } else if (myTeam && myTeam.id === offer.targetTeamId) {
          offer.offeredPlayerIds.forEach((playerId) => {
            const player = playersById.get(playerId);
            if (player) {
              revealItems.push({ player, teamName: myTeam.name });
            }
          });
        }

        enqueueReveal(revealItems);
        toast({ title: "Intercambio aceptado" });
      } else {
        toast({ title: "Oferta rechazada" });
      }

      await loadTournament(params.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al resolver oferta", description: error.message });
    } finally {
      setIsResolvingTrade(false);
    }
  };

  const handleRegisterNewPlayer = async () => {
    if (!newPlayerName || !newPlayerUsername || !newPlayerEmail || !newPlayerMobile || !newPlayerPassword) {
      toast({ variant: "destructive", title: "Nombre, usuario, email y movil son requeridos" });
      return;
    }
    if (newPlayerPassword !== newPlayerConfirmPassword) {
      toast({ variant: "destructive", title: "Las contrasenas no coinciden" });
      return;
    }

    setIsRegistering(true);
    try {
      await playersApi.register({
        name: newPlayerName,
        username: newPlayerUsername,
        email: newPlayerEmail,
        password: newPlayerPassword,
        position: newPlayerPosition,
        isPublic: newPlayerIsPublic,
        mobile: newPlayerMobile,
        ...newPlayerStats,
        tournamentId: params?.id,
      });

      toast({ title: "Jugador inscrito", description: `${newPlayerName} ha sido anadido al torneo` });
      setIsRegisterOpen(false);
      setNewPlayerName("");
      setNewPlayerUsername("");
      setNewPlayerEmail("");
      setNewPlayerMobile("");
      setNewPlayerPassword("");
      setNewPlayerConfirmPassword("");
      setNewPlayerIsPublic(false);
      setNewPlayerPosition("base");
      setNewPlayerStats({ pace: 50, shooting: 50, passing: 50, dribbling: 50, defense: 50, physical: 50 });

      if (params?.id) {
        await loadTournament(params.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al inscribir", description: error.message });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleJoinTournament = async () => {
    if (!currentUser || !params?.id) return;
    setIsJoining(true);
    try {
      await tournamentsApi.register(params.id, currentUser.id);
      toast({ title: "Inscripcion completada", description: "Ya estas inscrito en el torneo" });
      await loadTournament(params.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al inscribirse", description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  const handleToggleCaptain = async (playerId: string, isCaptain: boolean) => {
    if (!params?.id) return;
    try {
      await registrationsApi.setCaptain(params.id, playerId, isCaptain);
      toast({ title: isCaptain ? "Capitan asignado" : "Capitan removido" });
      await loadTournament(params.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleSaveTeamInfo = async (teamId: string) => {
    if (!teamNameInput.trim()) {
      toast({ variant: "destructive", title: "Nombre requerido" });
      return;
    }
    if (!teamWhatsappName.trim() || !teamWhatsappLink.trim()) {
      toast({ variant: "destructive", title: "WhatsApp requerido", description: "Completa nombre y enlace del grupo" });
      return;
    }

    setIsSavingTeamInfo(true);
    try {
      const result = await teamsApi.updateName(teamId, {
        name: teamNameInput.trim(),
        whatsappGroupName: teamWhatsappName.trim(),
        whatsappGroupLink: teamWhatsappLink.trim(),
      });
      const readyMessage = result.allReady ? "Todos los equipos listos" : "Datos guardados";
      const detail = result.groupsGenerated ? "Grupos generados automaticamente" : undefined;
      toast({ title: readyMessage, description: detail });
      if (params?.id) {
        await loadTournament(params.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSavingTeamInfo(false);
    }
  };

  const handleOpenRules = () => {
    const currentRules = tournament?.rules?.trim() || DEFAULT_TOURNAMENT_RULES_TEXT;
    setRulesDraft(currentRules);
    setIsRulesOpen(true);
  };

  const handleSaveRules = async () => {
    if (!tournament) return;
    const cleaned = rulesDraft
      .split("\n")
      .map((rule) => rule.trim())
      .filter(Boolean)
      .join("\n");

    setIsSavingRules(true);
    try {
      await tournamentsApi.update(tournament.id, {
        rules: cleaned || DEFAULT_TOURNAMENT_RULES_TEXT,
      });
      await loadTournament(tournament.id);
      setIsRulesOpen(false);
      toast({ title: "Reglas actualizadas" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSavingRules(false);
    }
  };

  const captainIds = useMemo(() => new Set(registrations.filter(r => r.isCaptain).map(r => r.playerId)), [registrations]);

  const playersWithRole = useMemo<PlayerWithRegistration[]>(() => {
    return registrations
      .filter((registration) => registration.player.role !== 'admin')
      .map((registration) => ({
        ...registration.player,
        isCaptain: registration.isCaptain,
      }));
  }, [registrations]);

  const playersById = useMemo(() => {
    return new Map(registrations.map((registration) => [registration.playerId, registration.player]));
  }, [registrations]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const rosterByTeamId = useMemo(() => {
    return new Map(teamRosters.map((roster) => [roster.team.id, roster]));
  }, [teamRosters]);

  const assignedPlayerIds = useMemo(() => {
    return new Set(teamRosters.flatMap((roster) => roster.players.map((player) => player.id)));
  }, [teamRosters]);

  const unassignedPlayers = useMemo(() => {
    return playersWithRole.filter((player) => !player.isCaptain && !assignedPlayerIds.has(player.id));
  }, [playersWithRole, assignedPlayerIds]);

  const tradeCountByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    tradeOffers.forEach((offer) => {
      const count = map.get(offer.targetPlayerId) || 0;
      map.set(offer.targetPlayerId, count + 1);
    });
    return map;
  }, [tradeOffers]);

  const tradeWindowOpen = useMemo(() => {
    if (!tournament?.date) return false;
    const startDate = new Date(`${tournament.date}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return false;
    return Date.now() < startDate.getTime();
  }, [tournament?.date]);

  const filteredPlayers = useMemo(() => {
    const list = playersWithRole.filter((player) => {
      if (roleFilter === "captain" && !player.isCaptain) return false;
      if (roleFilter === "player" && player.isCaptain) return false;
      if ((player.overall || 0) < minOverall) return false;
      const statValueMap = {
        overall: player.overall,
        pace: player.pace,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defense: player.defense,
        physical: player.physical,
      };
      const statValue = statValueMap[statFilter];
      if ((statValue || 0) < minStat) return false;
      return true;
    });

    return list.sort((a, b) => (b.overall || 0) - (a.overall || 0));
  }, [playersWithRole, roleFilter, minOverall, statFilter, minStat]);

  const rulesList = useMemo(() => {
    const source = tournament?.rules?.trim() || DEFAULT_TOURNAMENT_RULES_TEXT;
    return source
      .split("\n")
      .map((rule) => rule.trim())
      .filter(Boolean);
  }, [tournament?.rules]);

  const pendingWhatsappTeams = useMemo(() => {
    return teams.filter(team => !team.whatsappGroupName || !team.whatsappGroupLink);
  }, [teams]);

  const requiresWhatsappSetup = useMemo(() => {
    return tournament?.status === "setup" && pendingWhatsappTeams.length > 0;
  }, [tournament?.status, pendingWhatsappTeams.length]);

  const tabItems = useMemo(() => {
    if (!tournament) return [];
    const items = [
      { value: "rules", label: "Reglamento", show: true },
      { value: "draft", label: "Draft", show: tournament.status === "draft" },
      { value: "teams", label: requiresWhatsappSetup ? "WhatsApp" : "Equipos", show: teams.length > 0 || tournament.status !== "open" },
      { value: "players", label: "Jugadores", show: true },
      { value: "competition", label: "Partidos y tabla", show: ["scheduled", "active", "completed"].includes(tournament.status) },
    ];
    const visible = items.filter(item => item.show);
    if (requiresWhatsappSetup) {
      return visible.filter(item => item.value === "teams");
    }
    return visible;
  }, [tournament, teams.length, requiresWhatsappSetup]);

  const defaultTab = useMemo(() => {
    if (!tournament) return "rules";
    if (requiresWhatsappSetup) return "teams";
    if (tournament.status === "draft") return "draft";
    if (tournament.status === "open") return "players";
    if (["scheduled", "active", "completed"].includes(tournament.status)) return "competition";
    return "rules";
  }, [tournament?.status, requiresWhatsappSetup]);

  useEffect(() => {
    if (!tournament) return;
    if (!tabItems.some(tab => tab.value === activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [tournament, tabItems, activeTab, defaultTab]);

  const isRegistered = !!currentUser && registrations.some(r => r.playerId === currentUser.id);
  const isAdmin = currentUser?.role === 'admin';
  const isCaptain = !!currentUser && registrations.some(r => r.playerId === currentUser.id && r.isCaptain);
  const tournamentStatus = tournament?.status;
  const isDraftActive = tournamentStatus === 'draft' && draftState?.draftState?.isActive === 'true';
  const isDraftPhase = tournamentStatus === 'draft';
  const isSetupPhase = tournamentStatus === 'setup';
  const isDraftView = activeTab === "draft";
  const canManageCaptains = tournamentStatus === "open" || (tournamentStatus === "draft" && !isDraftActive);
  const showDraftControls = isDraftActive && isDraftView;
  
  const myTeam = isCaptain ? teams.find(t => t.captainId === currentUser?.id) : null;
  const myTeamRoster = myTeam ? rosterByTeamId.get(myTeam.id) : null;
  const isMyTurn = isDraftActive && isDraftView && draftState?.currentTeam?.id === myTeam?.id;
  const canRequestTrades = Boolean(isCaptain && myTeam && tradeWindowOpen);
  const getOffersRemaining = useCallback((playerId: string) => {
    const count = tradeCountByPlayer.get(playerId) || 0;
    return Math.max(0, 2 - count);
  }, [tradeCountByPlayer]);

  const rosterList = useMemo(() => {
    if (teamRosters.length > 0) return teamRosters;
    return teams.map((team) => ({ team, players: [] }));
  }, [teamRosters, teams]);

  const myTradePlayers = useMemo(() => {
    if (!myTeamRoster) return [];
    return myTeamRoster.players.filter((player) => player.id !== myTeam?.captainId);
  }, [myTeamRoster, myTeam?.captainId]);

  const tourKey = useMemo(() => {
    if (!tournament || !currentUser) return "";
    return `tour:${tournament.id}:${currentUser.role}:v2`;
  }, [tournament?.id, currentUser?.role]);

  const tourSteps = useMemo<TourStep[]>(() => {
    if (!tournament || !currentUser) return [];
    const steps: TourStep[] = [];

    if (tournament.status === "draft") {
      steps.push({
        id: "tab-draft",
        selector: '[data-tour="tab-draft"]',
        title: "Pestana Draft",
        body: "Entra aqui para seguir turnos, rondas y jugadores disponibles.",
        durationMs: 5000,
      });
      if (isAdmin && !isDraftActive) {
        steps.push({
          id: "start-draft",
          selector: '[data-tour="start-draft"]',
          title: "Iniciar draft",
          body: "Activa el draft para que los capitanes empiecen a elegir.",
          durationMs: 5500,
        });
      }
      if (isDraftActive) {
        steps.push({
          id: "draft-turn",
          selector: '[data-tour="draft-turn"]',
          title: "Turno actual",
          body: "Aqui ves quien elige ahora y el orden de la ronda.",
          durationMs: 5500,
        });
      }
    }

    steps.push({
      id: "tab-teams",
      selector: '[data-tour="tab-teams"]',
      title: "Equipos",
      body: "Plantillas, WhatsApp e intercambios se gestionan aqui.",
      durationMs: 5000,
    });

    if (isAdmin) {
      steps.push({
        id: "admin-roster",
        selector: '[data-tour="admin-roster"]',
        title: "Mover jugadores",
        body: "Como admin puedes mover jugadores entre equipos en tiempo real.",
        durationMs: 5500,
      });
    }

    if (isCaptain) {
      steps.push({
        id: "trade-request",
        selector: '[data-tour="trade-request"]',
        title: "Solicitar intercambio",
        body: "Desde otro equipo puedes pedir un jugador y ofrecer hasta 3.",
        durationMs: 5500,
      });
      steps.push({
        id: "trade-inbox",
        selector: '[data-tour="trade-inbox"]',
        title: "Ofertas recibidas",
        body: "Aqui aceptas o rechazas ofertas pendientes.",
        durationMs: 5500,
      });
    }

    if (tradeOffers.length > 0) {
      steps.push({
        id: "trade-history",
        selector: '[data-tour="trade-history"]',
        title: "Historial de intercambios",
        body: "Todas las ofertas quedan registradas para los participantes.",
        durationMs: 5000,
      });
    }

    return steps;
  }, [currentUser, isAdmin, isCaptain, isDraftActive, tradeOffers.length, tournament]);

  if (!match || !params) return null;
  
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

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display mb-4">Torneo no encontrado</h1>
          <Link href="/">
            <Button className="cursor-pointer">Volver a Inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  const availablePlayers = playersWithRole.filter(p => 
    !p.isCaptain && !draftedPlayerIds.includes(p.id)
  );

  const statusLabels: Record<Tournament["status"], string> = {
    open: "Inscripciones Abiertas",
    draft: "En Draft",
    setup: "Config. WhatsApp",
    scheduled: "En Espera",
    active: "En Curso",
    completed: "Finalizado",
  };

  const statusBadge = statusLabels[tournament.status];

  const renderPlayerFilters = () => (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Rol</Label>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | "player" | "captain")}>
          <SelectTrigger className="bg-black/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="player">Jugadores</SelectItem>
            <SelectItem value="captain">Capitanes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Min overall: {minOverall}</Label>
        <Slider
          min={0}
          max={99}
          step={1}
          value={[minOverall]}
          onValueChange={([value]) => setMinOverall(value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Filtro de habilidad: {statFilter.toUpperCase()} {minStat}</Label>
        <Select value={statFilter} onValueChange={(value) => setStatFilter(value as typeof statFilter)}>
          <SelectTrigger className="bg-black/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">Overall</SelectItem>
            <SelectItem value="pace">Velocidad</SelectItem>
            <SelectItem value="shooting">Tiro</SelectItem>
            <SelectItem value="passing">Pase</SelectItem>
            <SelectItem value="dribbling">Regate</SelectItem>
            <SelectItem value="defense">Defensa</SelectItem>
            <SelectItem value="physical">Fisico</SelectItem>
          </SelectContent>
        </Select>
        <Slider
          min={0}
          max={99}
          step={1}
          value={[minStat]}
          onValueChange={([value]) => setMinStat(value)}
        />
      </div>
    </div>
  );

  const renderPlayersGrid = (playersList: PlayerWithRegistration[], draftMode: boolean) => {
    if (playersList.length === 0) {
      return (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-lg">
          <p className="text-muted-foreground text-xl">
            {draftMode && isDraftActive ? "No quedan jugadores disponibles" : "Aun no hay jugadores inscritos. Se el primero!"}
          </p>
        </div>
      );
    }

    const isDraftMode = draftMode && isDraftActive;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-tour={draftMode ? "draft-players" : undefined}>
        {playersList.map((player) => {
          const isDrafted = draftedPlayerIds.includes(player.id);
          const isCaptainRole = player.isCaptain;
          const isSelectable = !isDrafted && !isCaptainRole;
          const cardPlayer = { ...player, role: isCaptainRole ? "captain" : player.role };

          return (
            <div key={player.id} className="space-y-3" data-testid={`player-card-${player.id}`}>
              <div className="relative">
                <PlayerCard
                  player={cardPlayer}
                  showSensitive={isAdmin}
                />
                {isDraftMode && isDrafted && (
                  <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center text-xs font-display tracking-widest text-white">
                    SELECCIONADO
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                {isCaptainRole ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                    Capitan
                  </Badge>
                ) : isDrafted ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                    Seleccionado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                    Disponible
                  </Badge>
                )}
              </div>
              {isDraftMode && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 flex items-center justify-center">
                  <SkillRadarChart
                    pace={player.pace || 50}
                    shooting={player.shooting || 50}
                    passing={player.passing || 50}
                    dribbling={player.dribbling || 50}
                    defense={player.defense || 50}
                    physical={player.physical || 50}
                    size={120}
                    showLabels={false}
                  />
                </div>
              )}
              {isDraftMode && showDraftControls && (isMyTurn || isAdmin) && isSelectable && (
                <Button
                  size="sm"
                  className="w-full font-display bg-primary text-black hover:bg-white cursor-pointer"
                  onClick={() => handleDraftPlayer(player.id)}
                  disabled={isDrafting}
                  data-testid={`button-draft-${player.id}`}
                >
                  DRAFT
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="mb-8">
          <Link href={isAdmin ? "/admin" : isCaptain ? "/captain" : "/"}>
            <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary cursor-pointer">
              {"<- Volver"}
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white uppercase tracking-tighter">
                  {tournament.name}
                </h1>
                <Badge variant="outline" className="text-lg px-4 py-1 border-primary text-primary">
                  {statusBadge}
                </Badge>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl">
                {tournament.description}
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleRefresh} className="cursor-pointer">
                <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
              </Button>
              
              {!isRegistered && tournament.status === 'open' && (
                currentUser ? (
                  <Button 
                    size="lg" 
                    className="font-display text-xl px-8 h-14 bg-primary text-black hover:bg-white transition-all cursor-pointer"
                    onClick={handleJoinTournament}
                    disabled={isJoining}
                    data-testid="button-register-tournament"
                  >
                    {isJoining ? "INSCRIBIENDO..." : "INSCRIBIRME"}
                  </Button>
                ) : (
                  <Link href={`/register?tournamentId=${tournament.id}`}>
                    <Button 
                      size="lg" 
                      className="font-display text-xl px-8 h-14 bg-primary text-black hover:bg-white transition-all cursor-pointer"
                      data-testid="button-register-tournament"
                    >
                      INSCRIBIRSE AHORA
                    </Button>
                  </Link>
                )
              )}
              {isRegistered && (
                 <Button disabled size="lg" className="font-display text-xl px-8 h-14 bg-green-500/20 text-green-500 border border-green-500/50">
                   YA INSCRITO
                 </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <Card className="bg-white/5 border-white/10 lg:col-span-3">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3 text-lg">
                <Calendar className="w-6 h-6 text-primary" />
                <span>{format(new Date(tournament.date), "d MMMM yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <MapPin className="w-6 h-6 text-primary" />
                <span>{tournament.location}</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <Users className="w-6 h-6 text-primary" />
                <span>{registeredPlayers.length} jugadores inscritos</span>
              </div>
              <div className="flex items-center gap-3 text-lg">
                <Trophy className="w-6 h-6 text-primary" />
                <span>{teams.length} equipos creados</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/5 border-white/10 flex flex-wrap">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-black"
                data-tour={tab.value === "draft" ? "tab-draft" : tab.value === "teams" ? "tab-teams" : undefined}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="rules">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="font-display text-2xl">Reglas y Formato</CardTitle>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={handleOpenRules}
                  >
                    Editar reglas
                  </Button>
                )}
              </CardHeader>
              <CardContent className="text-muted-foreground">
                <ul className="list-disc space-y-2 pl-5">
                  {rulesList.map((rule, index) => (
                    <li key={`${rule}-${index}`}>{rule}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="draft">
            <div className="space-y-8">
              {!isDraftActive && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Draft pendiente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      El admin debe iniciar el draft para habilitar los turnos de seleccion.
                    </p>
                    {isAdmin ? (
                      <Button
                        className="font-display cursor-pointer"
                        onClick={handleStartDraft}
                        disabled={isStartingDraft}
                        data-tour="start-draft"
                      >
                        {isStartingDraft ? "INICIANDO..." : "INICIAR DRAFT"}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                        Esperando al administrador
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}

              {isDraftActive && draftState && (
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl flex items-center gap-2">
                      <Crown className="w-6 h-6 text-amber-400" />
                      DRAFT EN CURSO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-black/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">Ronda Actual</p>
                        <p className="text-3xl font-display text-amber-400">
                          {draftState.draftState.currentRound} / {draftState.draftState.maxRounds}
                        </p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">Jugadores Disponibles</p>
                        <p className="text-3xl font-display text-primary">
                          {availablePlayers.length}
                        </p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">Equipos en ronda</p>
                        <p className="text-3xl font-display text-white">
                          {draftState.teamOrder.length}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/20 rounded-lg border border-primary/30" data-tour="draft-turn">
                      <p className="text-sm text-muted-foreground mb-1">TURNO DE:</p>
                      <p className="text-2xl font-display text-primary">
                        {draftState.currentTeam?.name || "Cargando..."}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Capitan: {draftState.currentCaptain?.name || "N/A"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {draftState.teamOrder.map((teamId, index) => {
                        const team = draftState.teams.find(t => t.id === teamId);
                        const isCurrent = team?.id === draftState.currentTeam?.id;
                        return (
                          <Badge
                            key={`${teamId}-${index}`}
                            variant="outline"
                            className={isCurrent ? "bg-primary/20 text-primary border-primary/40" : "bg-white/10 text-white/70 border-white/20"}
                          >
                            {index + 1}. {team?.name || "Equipo"}
                          </Badge>
                        );
                      })}
                    </div>

                    {isMyTurn && (
                      <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-green-400" />
                        <p className="font-display text-green-400">ES TU TURNO! Selecciona un jugador</p>
                      </div>
                    )}

                    {isAdmin && isDraftPhase && (
                      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-blue-500 hover:bg-blue-400 text-white font-display cursor-pointer">
                            <UserPlus className="w-4 h-4 mr-2" /> INSCRIBIR NUEVO JUGADOR
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-white/10 max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-display">Inscribir Jugador al Draft</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Nombre</Label>
                              <Input
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                placeholder="Nombre del jugador"
                                className="bg-black/20"
                              />
                            </div>
                            <div>
                              <Label>Usuario</Label>
                              <Input
                                value={newPlayerUsername}
                                onChange={(e) => setNewPlayerUsername(e.target.value)}
                                placeholder="usuario"
                                className="bg-black/20"
                              />
                            </div>
                            <div>
                              <Label>Email</Label>
                              <Input
                                value={newPlayerEmail}
                                onChange={(e) => setNewPlayerEmail(e.target.value)}
                                placeholder="email@ejemplo.com"
                                className="bg-black/20"
                              />
                            </div>
                            <div>
                              <Label>Movil</Label>
                              <Input
                                value={newPlayerMobile}
                                onChange={(e) => setNewPlayerMobile(e.target.value)}
                                placeholder="Numero de movil"
                                className="bg-black/20"
                              />
                            </div>
                            <div>
                              <Label>Posicion</Label>
                              <Select value={newPlayerPosition} onValueChange={setNewPlayerPosition}>
                                <SelectTrigger className="bg-black/20">
                                  <SelectValue placeholder="Selecciona una posicion" />
                                </SelectTrigger>
                                <SelectContent>
                                  {POSITION_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Contrasena</Label>
                              <Input
                                type="password"
                                value={newPlayerPassword}
                                onChange={(e) => setNewPlayerPassword(e.target.value)}
                                placeholder="********"
                                className="bg-black/20"
                              />
                            </div>
                            <div>
                              <Label>Confirmar Contrasena</Label>
                              <Input
                                type="password"
                                value={newPlayerConfirmPassword}
                                onChange={(e) => setNewPlayerConfirmPassword(e.target.value)}
                                placeholder="********"
                                className="bg-black/20"
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
                              <div>
                                <Label className="text-sm">Perfil publico</Label>
                                <p className="text-xs text-muted-foreground">Visible para usuarios no registrados.</p>
                              </div>
                              <Switch
                                checked={newPlayerIsPublic}
                                onCheckedChange={setNewPlayerIsPublic}
                              />
                            </div>

                            <div className="space-y-3">
                              {Object.entries(newPlayerStats).map(([stat, value]) => (
                                <div key={stat} className="space-y-1">
                                  <div className="flex justify-between">
                                    <Label className="capitalize">{stat}</Label>
                                    <span className="text-primary font-bold">{value}</span>
                                  </div>
                                  <Slider
                                    min={1}
                                    max={99}
                                    value={[value]}
                                    onValueChange={([v]) => setNewPlayerStats(prev => ({ ...prev, [stat]: v }))}
                                  />
                                </div>
                              ))}
                            </div>

                            <Button
                              onClick={handleRegisterNewPlayer}
                              className="w-full font-display cursor-pointer"
                              disabled={isRegistering}
                            >
                              {isRegistering ? "Inscribiendo..." : "INSCRIBIR JUGADOR"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              )}

              {teams.length > 0 && (
                <div>
                  <h2 className="text-3xl font-display font-bold mb-6">EQUIPOS ({teams.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {teams.map(team => {
                      const captain = registeredPlayers.find(p => p.id === team.captainId);
                      const isCurrentTurn = isDraftActive && draftState?.currentTeam?.id === team.id;
                      return (
                        <Card
                          key={team.id}
                          className={`bg-white/5 border-white/10 ${isCurrentTurn ? "border-primary ring-2 ring-primary/50" : ""}`}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              {isCurrentTurn && <Crown className="w-5 h-5 text-primary animate-pulse" />}
                              <h3 className="font-display text-lg">{team.name}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Capitan: {captain?.name || "N/A"}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {isDraftActive && (
                <div>
                  <h2 className="text-4xl font-display font-bold mb-8">
                    JUGADORES DISPONIBLES ({availablePlayers.length})
                  </h2>
                  {renderPlayerFilters()}
                  {renderPlayersGrid(filteredPlayers, true)}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="teams">
            <div className="space-y-8">
              {isSetupPhase && (
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl flex items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-amber-400" />
                      WhatsApp obligatorio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      El torneo esta en pausa hasta que todos los capitanes indiquen el nombre y enlace del grupo.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Faltan {pendingWhatsappTeams.length} equipos por completar.
                    </p>
                    {pendingWhatsappTeams.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pendingWhatsappTeams.map(team => (
                          <Badge key={team.id} variant="outline" className="bg-white/10 text-white/70 border-white/20">
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {isCaptain && myTeam && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Configura tu equipo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Completa estos datos para desbloquear el torneo.
                    </p>
                    <div className="space-y-2">
                      <Label>Nombre del equipo</Label>
                      <Input
                        value={teamNameInput}
                        onChange={(e) => setTeamNameInput(e.target.value)}
                        placeholder="Nombre del equipo"
                        className="bg-black/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre del grupo de WhatsApp</Label>
                      <Input
                        value={teamWhatsappName}
                        onChange={(e) => setTeamWhatsappName(e.target.value)}
                        placeholder="Grupo WhatsApp"
                        className="bg-black/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Enlace del grupo</Label>
                      <Input
                        value={teamWhatsappLink}
                        onChange={(e) => setTeamWhatsappLink(e.target.value)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="bg-black/20"
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveTeamInfo(myTeam.id)}
                      className="font-display cursor-pointer"
                      disabled={isSavingTeamInfo}
                    >
                      {isSavingTeamInfo ? "GUARDANDO..." : "GUARDAR INFORMACION"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {rosterList.length > 0 ? (
                <div data-tour="admin-roster">
                  <h2 className="text-3xl font-display font-bold mb-6">PLANTILLAS ({rosterList.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rosterList.map(({ team, players }) => {
                      const captain = registeredPlayers.find(p => p.id === team.captainId);
                      const isReady = Boolean(team.whatsappGroupName && team.whatsappGroupLink);
                      const isCurrentTurn = isDraftActive && draftState?.currentTeam?.id === team.id;
                      const rosterPlayers = [...players].sort((a, b) => (b.overall || 0) - (a.overall || 0));

                      return (
                        <Card
                          key={team.id}
                          className={`bg-white/5 border-white/10 ${isCurrentTurn ? "border-primary ring-2 ring-primary/40" : ""}`}
                        >
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-display text-lg">{team.name}</h3>
                              <Badge
                                variant="outline"
                                className={isReady ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}
                              >
                                {isReady ? "WhatsApp listo" : "Pendiente"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Capitan: {captain?.name || "N/A"}
                            </p>
                            {team.whatsappGroupName && (
                              <p className="text-xs text-muted-foreground">Grupo: {team.whatsappGroupName}</p>
                            )}
                            {team.whatsappGroupLink && (
                              <a
                                href={team.whatsappGroupLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary underline"
                              >
                                Abrir grupo
                              </a>
                            )}

                            <div className="space-y-2 pt-2">
                              {rosterPlayers.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Sin jugadores asignados.</p>
                              ) : (
                                rosterPlayers.map((player) => {
                                  const isCaptainPlayer = player.id === team.captainId;
                                  const offersRemaining = getOffersRemaining(player.id);
                                  const canOfferForPlayer = canRequestTrades && myTeam?.id !== team.id && !isCaptainPlayer && offersRemaining > 0;

                                  return (
                                    <div
                                      key={player.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                                    >
                                      <div>
                                        <p className="text-sm font-medium">{player.name}</p>
                                        <p className="text-xs text-muted-foreground">OVR {player.overall}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isCaptainPlayer && (
                                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                                            Capitan
                                          </Badge>
                                        )}
                                        {isAdmin && !isCaptainPlayer && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="cursor-pointer"
                                                disabled={isMovingPlayerId === player.id || teams.length === 0}
                                              >
                                                {isMovingPlayerId === player.id ? "Moviendo..." : "Mover"}
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                              {teams.filter(t => t.id !== team.id).map((option) => (
                                                <DropdownMenuItem
                                                  key={option.id}
                                                  onSelect={() => handleMovePlayer(player.id, option.id)}
                                                >
                                                  Mover a {option.name}
                                                </DropdownMenuItem>
                                              ))}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                        {canRequestTrades && myTeam?.id !== team.id && !isCaptainPlayer && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="cursor-pointer"
                                            onClick={() => openTradeDialog(player, team)}
                                            disabled={!canOfferForPlayer}
                                            data-tour="trade-request"
                                          >
                                            {offersRemaining <= 0 ? "Sin ofertas" : "Solicitar"}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Aun no hay equipos creados.</p>
                  </CardContent>
                </Card>
              )}

              {isAdmin && unassignedPlayers.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Jugadores sin equipo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {unassignedPlayers.map((player) => (
                      <div key={player.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{player.name}</p>
                          <p className="text-xs text-muted-foreground">OVR {player.overall}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="cursor-pointer" disabled={isMovingPlayerId === player.id}>
                              {isMovingPlayerId === player.id ? "Asignando..." : "Asignar"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {teams.map((option) => (
                              <DropdownMenuItem key={option.id} onSelect={() => handleMovePlayer(player.id, option.id)}>
                                Asignar a {option.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {tradeOffers.length > 0 && (
                <Card className="bg-white/5 border-white/10" data-tour="trade-history">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Historial de intercambios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tradeOffers.map((offer) => {
                      const targetPlayer = playersById.get(offer.targetPlayerId);
                      const offeredPlayers = offer.offeredPlayerIds.map((id) => playersById.get(id)).filter(Boolean) as Player[];
                      const requestingTeam = teamById.get(offer.requestingTeamId);
                      const targetTeam = teamById.get(offer.targetTeamId);
                      const isPending = offer.status === "pending";
                      const isMineToResolve = isAdmin || (isCaptain && myTeam?.id === offer.targetTeamId);

                      const statusStyles: Record<string, string> = {
                        pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                        accepted: "bg-green-500/10 text-green-400 border-green-500/30",
                        rejected: "bg-red-500/10 text-red-400 border-red-500/30",
                      };

                      return (
                        <div key={offer.id} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm">
                              <p className="font-medium">
                                {requestingTeam?.name || "Equipo"} pide a {targetPlayer?.name || "Jugador"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Objetivo en {targetTeam?.name || "equipo destino"}
                              </p>
                            </div>
                            <Badge variant="outline" className={statusStyles[offer.status] || "bg-white/10 text-white/60 border-white/20"}>
                              {offer.status === "pending" ? "Pendiente" : offer.status === "accepted" ? "Aceptada" : "Rechazada"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Ofrece: {offeredPlayers.length > 0 ? offeredPlayers.map(p => p.name).join(", ") : "N/A"}
                          </div>
                          {isPending && isMineToResolve && (
                            <div className="flex gap-2" data-tour="trade-inbox">
                              <Button
                                size="sm"
                                className="font-display bg-green-500/20 text-green-300 hover:bg-green-500/30"
                                onClick={() => handleResolveTradeOffer(offer.id, "accept")}
                                disabled={isResolvingTrade || (!tradeWindowOpen && !isAdmin)}
                              >
                                Aceptar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="font-display"
                                onClick={() => handleResolveTradeOffer(offer.id, "reject")}
                                disabled={isResolvingTrade}
                              >
                                Rechazar
                              </Button>
                              {!tradeWindowOpen && !isAdmin && (
                                <p className="text-xs text-muted-foreground self-center">Periodo cerrado</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="players">
            <div className="space-y-8">
              {isAdmin && registrations.length > 0 && (
                <div>
                  <h2 className="text-3xl font-display font-bold mb-6">GESTION DE CAPITANES</h2>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="py-6 space-y-3">
                      {registrations.map((registration) => (
                        <div key={registration.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                          <div>
                            <p className="font-medium">{registration.player.name}</p>
                            <p className="text-xs text-muted-foreground">Overall {registration.player.overall}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={registration.isCaptain ? "bg-amber-500/20 text-amber-400 border-amber-500/50" : "bg-white/10 text-white/60 border-white/20"}>
                              {registration.isCaptain ? "CAPITAN" : "JUGADOR"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              disabled={!canManageCaptains}
                              onClick={() => handleToggleCaptain(registration.playerId, !registration.isCaptain)}
                            >
                              {registration.isCaptain ? "Quitar capitan" : "Hacer capitan"}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!canManageCaptains && (
                        <p className="text-xs text-muted-foreground">Los capitanes solo pueden modificarse antes de iniciar el draft.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              <div>
                <h2 className="text-4xl font-display font-bold mb-8">
                  JUGADORES INSCRITOS ({filteredPlayers.length})
                </h2>
                {renderPlayerFilters()}
                {renderPlayersGrid(filteredPlayers, false)}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="competition">
            <div className="space-y-6">
              <TournamentGroupsView tournamentId={tournament.id} isAdmin={isAdmin} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog
        open={isTradeDialogOpen}
        onOpenChange={(open) => {
          setIsTradeDialogOpen(open);
          if (!open) {
            setTradeOfferPlayers([]);
          }
        }}
      >
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Solicitar intercambio</DialogTitle>
          </DialogHeader>
          {tradeTarget ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-1">
                <p className="text-sm text-muted-foreground">Jugador objetivo</p>
                <p className="text-lg font-display">{tradeTarget.player.name}</p>
                <p className="text-xs text-muted-foreground">Equipo: {tradeTarget.team.name}</p>
                <p className="text-xs text-muted-foreground">Ofertas restantes: {getOffersRemaining(tradeTarget.player.id)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selecciona hasta 3 jugadores de tu equipo</p>
                {myTradePlayers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tu equipo no tiene jugadores disponibles para ofrecer.</p>
                ) : (
                  <div className="space-y-2">
                    {myTradePlayers.map((player) => (
                      <label key={player.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                        <Checkbox
                          checked={tradeOfferPlayers.includes(player.id)}
                          onCheckedChange={() => toggleTradeOfferPlayer(player.id)}
                        />
                        <span className="flex-1">{player.name}</span>
                        <span className="text-xs text-muted-foreground">OVR {player.overall}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {!tradeWindowOpen && (
                <p className="text-xs text-muted-foreground">
                  El periodo de intercambios ya termino.
                </p>
              )}

              <Button
                onClick={handleSendTradeOffer}
                className="w-full font-display cursor-pointer"
                disabled={isSendingTrade || tradeOfferPlayers.length === 0 || !tradeWindowOpen}
              >
                {isSendingTrade ? "ENVIANDO..." : "ENVIAR OFERTA"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Selecciona un jugador para continuar.</p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isRulesOpen} onOpenChange={setIsRulesOpen}>
        <DialogContent className="bg-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Editar reglas y formato</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Escribe una regla por linea. Se mostraran en el apartado publico del torneo.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={rulesDraft}
              onChange={(e) => setRulesDraft(e.target.value)}
              className="w-full bg-black/20 border border-input rounded-md px-3 py-2 min-h-[140px] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={handleSaveRules}
              className="w-full font-display cursor-pointer"
              disabled={isSavingRules}
            >
              {isSavingRules ? "Guardando..." : "Guardar reglas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {activeReveal && (
        <PackReveal player={activeReveal.player} teamName={activeReveal.teamName} onClose={handleRevealClose} />
      )}
      {tourKey && (
        <GuidedTour
          steps={tourSteps}
          storageKey={tourKey}
          enabled={Boolean(currentUser && tournament)}
        />
      )}
    </div>
  );
}
