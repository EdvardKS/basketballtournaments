import { Link } from "wouter";
import { Tournament } from "@/lib/store";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

interface TournamentCardProps {
  tournament: Tournament;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const statusColors = {
    open: "bg-green-500/20 text-green-500 hover:bg-green-500/30",
    draft: "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30",
    active: "bg-primary/20 text-primary hover:bg-primary/30",
    completed: "bg-white/10 text-white/60 hover:bg-white/20",
  };

  return (
    <Card className="group relative overflow-hidden border-white/10 bg-white/5 hover:border-primary/50 transition-all duration-300">
      <div className="absolute top-0 right-0 p-4">
        <Badge className={statusColors[tournament.status]} variant="outline">
          {tournament.status.toUpperCase()}
        </Badge>
      </div>
      
      <CardHeader>
        <CardTitle className="font-display text-2xl tracking-wide group-hover:text-primary transition-colors">
          {tournament.name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {tournament.description}
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{format(new Date(tournament.date), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{tournament.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>{tournament.playersRegistered.length} Registered</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button asChild className="w-full font-display tracking-wider bg-white/10 hover:bg-primary hover:text-black transition-colors">
          <Link href={`/tournaments/${tournament.id}`}>
            VIEW DETAILS
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
