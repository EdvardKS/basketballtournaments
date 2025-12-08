import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-sm transform group-hover:rotate-45 transition-transform duration-300" />
            <span className="font-display text-2xl font-bold tracking-wider text-white">
              DRAFT<span className="text-primary">LEAGUE</span>
            </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/tournaments" className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">Tournaments</Link>
          <Link href="/players" className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">Players</Link>
          <Link href="/draft" className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">Draft Room</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              Admin
            </Button>
          </Link>
          <Link href="/register">
            <Button className="font-display tracking-wide" size="sm">
              Join League
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
