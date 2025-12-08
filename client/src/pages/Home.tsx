import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { TournamentCard } from "@/components/TournamentCard";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroBg from "@assets/generated_images/dark_abstract_basketball_background.png";
import { Link } from "wouter";

export default function Home() {
  const { tournaments, players } = useStore();
  const activeTournaments = tournaments.filter(t => t.status === 'open' || t.status === 'active');
  const pastTournaments = tournaments.filter(t => t.status === 'completed');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Basketball Court" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-linear-to-b from-background/80 via-transparent to-background" />
        </div>
        
        <div className="container relative z-10 px-4 text-center">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-display text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-white via-white to-white/50 mb-6"
          >
            RISE TO THE <br/> <span className="text-primary">CHALLENGE</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8 font-light"
          >
            The premier draft league platform. Register, get rated, get drafted, and dominate the court.
          </motion.p>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="h-14 px-8 text-lg font-display tracking-widest bg-primary text-black hover:bg-white hover:scale-105 transition-all">
              <Link href="/register">
                REGISTER AS PLAYER
              </Link>
            </Button>
            
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg font-display tracking-widest border-white/20 hover:bg-white/10">
              <Link href="/tournaments">
                VIEW TOURNAMENTS
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Featured Players Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-display font-bold">TOP RATED PLAYERS</h2>
            <Button asChild variant="link" className="text-primary">
              <Link href="/players">View All Leaders</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
            {players.slice(0, 4).map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <PlayerCard player={player} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Tournaments */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-display font-bold mb-12">ACTIVE TOURNAMENTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </div>
      </section>

       {/* Past Tournaments */}
       <section className="py-20 border-t border-white/5">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-display font-bold mb-12 opacity-60">HALL OF FAME</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
