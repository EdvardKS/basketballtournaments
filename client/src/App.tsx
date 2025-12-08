import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import TournamentDetails from "@/pages/TournamentDetails";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/AdminDashboard";
import CaptainDashboard from "@/pages/CaptainDashboard";
import Login from "@/pages/Login";

function Router() {
  const currentUser = useStore((state) => state.currentUser);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tournaments" component={Home} />
      <Route path="/tournaments/:id" component={TournamentDetails} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/admin">
        {currentUser?.role === 'admin' ? <AdminDashboard /> : <Redirect to="/login" />}
      </Route>
      
      <Route path="/draft">
        {currentUser?.role === 'captain' || currentUser?.role === 'admin' ? <CaptainDashboard /> : <Redirect to="/login" />}
      </Route>
      
      <Route path="/players">
         {/* Public can view players, but we might want to restrict details? For now open as per request "public view to see" */}
         <CaptainDashboard /> 
      </Route>

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
