import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Trophy, Users, BarChart3, Home, History } from "lucide-react";

export function Navbar() {
  const { currentUser, logout } = useStore();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-sm transform group-hover:rotate-45 transition-transform duration-300" />
            <span className="font-display text-2xl font-bold tracking-wider text-white">
              VILLENA<span className="text-primary">LEAGUE</span>
            </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {currentUser?.role === 'admin' ? (
            <>
              <Link 
                href="/admin" 
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer",
                  isActive('/admin') ? "text-primary" : "hover:text-primary"
                )}
              >
                <Home className="w-4 h-4" />
                Principal
              </Link>
              <Link 
                href="/admin/players" 
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer",
                  isActive('/admin/players') ? "text-primary" : "hover:text-primary"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                Histórico Jugadores
              </Link>
              <Link 
                href="/tournaments" 
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer",
                  isActive('/tournaments') ? "text-primary" : "hover:text-primary"
                )}
              >
                <Trophy className="w-4 h-4" />
                Torneos
              </Link>
            </>
          ) : currentUser?.role === 'captain' || currentUser?.role === 'player' ? (
            <>
              <Link 
                href={currentUser.role === 'captain' ? "/captain" : "/player"} 
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer",
                  (isActive('/captain') || isActive('/player')) ? "text-primary" : "hover:text-primary"
                )}
              >
                <Home className="w-4 h-4" />
                Mis Torneos
              </Link>
              <Link 
                href="/my-history" 
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer",
                  isActive('/my-history') ? "text-primary" : "hover:text-primary"
                )}
              >
                <History className="w-4 h-4" />
                Mi Historial
              </Link>
              {currentUser.role === 'captain' && (
                <Link 
                  href="/draft" 
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer text-accent",
                    isActive('/draft') ? "text-accent" : "hover:text-accent"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Sala Draft
                </Link>
              )}
            </>
          ) : (
            <>
              <Link 
                href="/tournaments" 
                className={cn(
                  "text-sm font-medium transition-colors cursor-pointer",
                  isActive('/tournaments') ? "text-primary" : "hover:text-primary"
                )}
              >
                Torneos
              </Link>
              <Link 
                href="/players" 
                className={cn(
                  "text-sm font-medium transition-colors cursor-pointer",
                  isActive('/players') ? "text-primary" : "hover:text-primary"
                )}
              >
                Jugadores
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 cursor-pointer" data-testid="button-user-menu">
                    <span className="text-sm">{currentUser.name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-muted-foreground text-xs">
                    {currentUser.role === 'admin' ? 'Administrador' : 
                     currentUser.role === 'captain' ? 'Capitán' : 'Jugador'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {currentUser.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer w-full">
                        Panel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(currentUser.role === 'captain' || currentUser.role === 'player') && (
                    <DropdownMenuItem asChild>
                      <Link href="/my-history" className="cursor-pointer w-full">
                        Mi Historial
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => logout()} 
                    className="text-destructive cursor-pointer"
                    data-testid="button-logout"
                  >
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
             <div className="flex items-center gap-4">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="hidden sm:flex cursor-pointer" data-testid="button-nav-login">
                    Acceso
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="font-display tracking-wide cursor-pointer" size="sm" data-testid="button-nav-register">
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
