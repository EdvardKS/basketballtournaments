import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export function Navbar() {
  const { currentUser, logout } = useStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-sm transform group-hover:rotate-45 transition-transform duration-300" />
            <span className="font-display text-2xl font-bold tracking-wider text-white">
              VILLENA<span className="text-primary">LEAGUE</span>
            </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/tournaments" className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">Torneos</Link>
          <Link href="/players" className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">Jugadores</Link>
          {(currentUser?.role === 'captain' || currentUser?.role === 'admin') && (
            <Link href="/draft" className="text-sm font-medium hover:text-primary transition-colors cursor-pointer text-accent">Sala Draft</Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-4">
              <span className="text-sm hidden sm:inline-block">Hola, {currentUser.name}</span>
              <Button onClick={() => logout()} variant="ghost" size="sm" className="hover:text-destructive">
                Salir
              </Button>
              {currentUser.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="hidden sm:flex border-primary text-primary hover:bg-primary hover:text-black">
                    Panel Admin
                  </Button>
                </Link>
              )}
            </div>
          ) : (
             <div className="flex items-center gap-4">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="hidden sm:flex">
                    Acceso
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="font-display tracking-wide" size="sm">
                    Inscribirse
                  </Button>
                </Link>
             </div>
          )}
        </div>
      </div>
    </nav>
  );
}
