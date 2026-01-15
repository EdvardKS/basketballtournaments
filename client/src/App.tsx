import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { authApi } from "./lib/api";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import TournamentDetails from "@/pages/TournamentDetails";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminPlayerHistory from "@/pages/AdminPlayerHistory";
import CaptainDashboard from "@/pages/CaptainDashboard";
import PlayerDashboard from "@/pages/PlayerDashboard";
import MyHistory from "@/pages/MyHistory";
import PlayersPage from "@/pages/PlayersPage";
import Login from "@/pages/Login";
import Legal from "@/pages/Legal";

function Router() {
  const currentUser = useStore((state) => state.currentUser);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tournaments" component={Home} />
      <Route path="/tournaments/:id" component={TournamentDetails} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/legal" component={Legal} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        {currentUser?.role === 'admin' ? <AdminDashboard /> : <Redirect to="/login" />}
      </Route>
      <Route path="/admin/players">
        {currentUser?.role === 'admin' ? <AdminPlayerHistory /> : <Redirect to="/login" />}
      </Route>
      
      {/* Captain Routes */}
      <Route path="/captain">
        {currentUser?.role === 'captain' ? <CaptainDashboard /> : <Redirect to="/login" />}
      </Route>
      
      {/* Player Routes */}
      <Route path="/player">
        {currentUser?.role === 'player' ? <PlayerDashboard /> : <Redirect to="/login" />}
      </Route>
      
      {/* Shared Routes for logged-in users */}
      <Route path="/my-history">
        {currentUser ? <MyHistory /> : <Redirect to="/login" />}
      </Route>
      
      <Route path="/players" component={PlayersPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi.me().then((data) => {
      if (data?.player) {
        setCurrentUser(data.player);
      } else {
        setCurrentUser(null);
      }
    }).catch(() => {
      setCurrentUser(null);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [setCurrentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-display text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
