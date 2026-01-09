import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { Camera } from "lucide-react";

// Max file size 2MB
const MAX_FILE_SIZE = 2000000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  mobile: z.string().min(9, "Introduce un móvil válido."),
  tournamentId: z.string().min(1, "Debes seleccionar un torneo."),
  pace: z.number().min(0).max(99),
  shooting: z.number().min(0).max(99),
  passing: z.number().min(0).max(99),
  dribbling: z.number().min(0).max(99),
  defense: z.number().min(0).max(99),
  physical: z.number().min(0).max(99),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preSelectedTournamentId = params.get("tournamentId");

  const { registerPlayer, tournaments, fetchTournaments } = useStore();
  const { toast } = useToast();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch tournaments on mount
  useEffect(() => {
    fetchTournaments();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      tournamentId: preSelectedTournamentId || "",
      pace: 50,
      shooting: 50,
      passing: 50,
      dribbling: 50,
      defense: 50,
      physical: 50,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "Archivo demasiado grande",
          description: "La imagen no debe superar los 2MB.",
        });
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Formato no válido",
          description: "Solo se aceptan .jpg, .jpeg, .png y .webp",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!previewImage) {
      toast({
        variant: "destructive",
        title: "Foto requerida",
        description: "Debes subir una foto para completar el registro.",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const playerData = {
        name: values.name,
        mobile: values.mobile,
        avatar: previewImage || undefined,
        pace: values.pace,
        shooting: values.shooting,
        passing: values.passing,
        dribbling: values.dribbling,
        defense: values.defense,
        physical: values.physical,
        tournamentId: values.tournamentId,
      };
      
      await registerPlayer(playerData);
      
      toast({
        title: "Registro Completado",
        description: "Tu perfil ha sido creado y enviado a la bolsa de jugadores.",
      });

      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error en el registro",
        description: error.message || "No se pudo completar el registro",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Card className="w-full max-w-3xl bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-4xl">REGISTRO DE JUGADOR</CardTitle>
            <CardDescription>
              Crea tu perfil para la Liga de Villena. Valora tus habilidades con sinceridad (0-99). 
              <br/><span className="text-red-400">¡Aviso! Las valoraciones falsas pueden llevar a la descalificación.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Photo Upload Section */}
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-lg bg-black/20">
                  <div 
                    className="w-32 h-32 rounded-full overflow-hidden bg-white/10 mb-4 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-2 border-primary/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Subir Foto de Ficha
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <p className="text-xs text-muted-foreground mt-2">Max 2MB. JPG/PNG. <span className="text-red-400">*Obligatorio</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Juan Martínez" {...field} className="bg-white/5 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono Móvil (ID Único)</FormLabel>
                        <FormControl>
                          <Input placeholder="600 000 000" {...field} className="bg-white/5 border-white/10" />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Usaremos esto para tu historial en la liga.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tournamentId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Torneo a Inscribirse</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/10">
                              <SelectValue placeholder="Selecciona un torneo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tournaments.filter(t => t.status === 'open').map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-6">
                  <h3 className="font-display text-2xl text-primary">AUTO-EVALUACIÓN DE HABILIDADES</h3>
                  <p className="text-sm text-muted-foreground">Sé honesto. Los capitanes verán esto en el draft.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    <FormField
                      control={form.control}
                      name="pace"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between mb-2">
                            <FormLabel className="uppercase font-bold">Ritmo (PAC)</FormLabel>
                            <span className="font-mono text-primary font-bold">{field.value}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0} max={99} step={1}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shooting"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between mb-2">
                            <FormLabel className="uppercase font-bold">Tiro (SHO)</FormLabel>
                            <span className="font-mono text-primary font-bold">{field.value}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0} max={99} step={1}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="passing"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between mb-2">
                            <FormLabel className="uppercase font-bold">Pase (PAS)</FormLabel>
                            <span className="font-mono text-primary font-bold">{field.value}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0} max={99} step={1}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dribbling"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between mb-2">
                            <FormLabel className="uppercase font-bold">Regate (DRI)</FormLabel>
                            <span className="font-mono text-primary font-bold">{field.value}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0} max={99} step={1}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defense"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between mb-2">
                            <FormLabel className="uppercase font-bold">Defensa (DEF)</FormLabel>
                            <span className="font-mono text-primary font-bold">{field.value}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0} max={99} step={1}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="physical"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between mb-2">
                            <FormLabel className="uppercase font-bold">Físico (PHY)</FormLabel>
                            <span className="font-mono text-primary font-bold">{field.value}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0} max={99} step={1}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full font-display text-xl h-14 bg-primary text-black hover:bg-white hover:scale-[1.01] transition-all cursor-pointer"
                  disabled={isSubmitting}
                  data-testid="button-submit-registration"
                >
                  {isSubmitting ? 'REGISTRANDO...' : 'COMPLETAR REGISTRO'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
