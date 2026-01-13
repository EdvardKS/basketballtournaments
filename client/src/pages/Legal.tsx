import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Legal() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Legal | Villena League";

    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const hadMeta = !!meta;
    const previousContent = meta?.getAttribute("content") ?? null;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }

    meta.setAttribute("content", "noindex, nofollow");

    return () => {
      document.title = previousTitle;
      if (meta) {
        if (hadMeta) {
          if (previousContent === null) {
            meta.removeAttribute("content");
          } else {
            meta.setAttribute("content", previousContent);
          }
        } else {
          meta.remove();
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-20 space-y-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Aviso Legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Esta plataforma gestiona inscripciones y resultados de torneos de baloncesto. El uso esta
              reservado a usuarios registrados y a publico general para la consulta de informacion.
            </p>
            <p>
              Queda prohibido publicar datos falsos, ofensivos o que vulneren derechos de terceros. El
              incumplimiento puede conllevar sanciones y la exclusion del torneo.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Politica de Privacidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Tratamos los datos personales para gestionar tu participacion en torneos, mostrar tu
              perfil de jugador y mantener el historial deportivo.
            </p>
            <p>
              Puedes solicitar acceso, rectificacion o eliminacion de tus datos escribiendo al
              administrador de la liga.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Politica de Cookies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Usamos cookies tecnicas de sesion para mantener tu acceso y tus preferencias. No usamos
              cookies publicitarias ni de terceros.
            </p>
            <p>
              Puedes eliminar las cookies desde tu navegador, aunque algunas funciones pueden dejar de
              estar disponibles.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
