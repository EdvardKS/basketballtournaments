import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const login = useStore((state) => state.login);
  const currentUser = useStore((state) => state.currentUser);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await login(identifier, password);
      if (success) {
        const user = useStore.getState().currentUser;
        toast({
          title: "Sesión iniciada",
          description: `Bienvenido de nuevo, ${user?.name}`,
        });
        if (user?.role === 'admin') {
          setLocation("/admin");
        } else if (user?.role === 'captain') {
          setLocation("/captain");
        } else {
          setLocation("/player");
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error de acceso",
          description: "Credenciales incorrectas",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: "Credenciales incorrectas",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-4 py-20 flex justify-center items-center h-[80vh]">
        <Card className="w-full max-w-md bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-3xl text-center">ACCESO PRIVADO</CardTitle>
            <CardDescription className="text-center">
              Administradores, capitanes y jugadores de Villena League
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="identifier">Usuario / Email / Movil</Label>
                <Input 
                  id="identifier" 
                  placeholder="Usuario, email o movil" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="bg-black/20 border-white/10"
                  data-testid="input-identifier"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="********" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/20 border-white/10"
                  data-testid="input-password"
                  disabled={isLoading}
                />
                </div>
              <Button 
                type="submit" 
                className="w-full font-display text-lg bg-primary text-black hover:bg-white transition-colors cursor-pointer"
                data-testid="button-login"
                disabled={isLoading}
              >
                {isLoading ? 'ENTRANDO...' : 'ENTRAR'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
