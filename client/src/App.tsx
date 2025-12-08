import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import TournamentDetails from "@/pages/TournamentDetails";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/AdminDashboard";
import CaptainDashboard from "@/pages/CaptainDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tournaments" component={Home} /> {/* Reuse Home for now as it lists tournaments */}
      <Route path="/tournaments/:id" component={TournamentDetails} />
      <Route path="/register" component={Register} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/draft" component={CaptainDashboard} />
      <Route path="/players" component={CaptainDashboard} /> {/* Reuse Draft view for players list for now */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
