import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  mobile: z.string().min(10, "Mobile number must be valid."),
  pace: z.number().min(0).max(99),
  shooting: z.number().min(0).max(99),
  passing: z.number().min(0).max(99),
  dribbling: z.number().min(0).max(99),
  defense: z.number().min(0).max(99),
  physical: z.number().min(0).max(99),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const registerPlayer = useStore((state) => state.registerPlayer);
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      pace: 50,
      shooting: 50,
      passing: 50,
      dribbling: 50,
      defense: 50,
      physical: 50,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newPlayer = {
      name: values.name,
      mobile: values.mobile,
      stats: {
        pace: values.pace,
        shooting: values.shooting,
        passing: values.passing,
        dribbling: values.dribbling,
        defense: values.defense,
        physical: values.physical,
      },
    };
    
    registerPlayer(newPlayer);
    
    // Simulate logging in as the new player
    // In a real app we'd get the ID back or handle auth
    // For now, find the player we just added (simulated)
    // setCurrentUser({...newPlayer, id: 'temp', role: 'player', overall: 75, registeredTournaments: []}); 
    
    setLocation("/tournaments");
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Card className="w-full max-w-2xl bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="font-display text-4xl">PLAYER REGISTRATION</CardTitle>
            <CardDescription>
              Create your player profile. Rate your skills honestly - inaccurate ratings may lead to disqualification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Michael Jordan" {...field} className="bg-white/5 border-white/10" />
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
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="555-0123" {...field} className="bg-white/5 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-6">
                  <h3 className="font-display text-2xl">SKILL SELF-ASSESSMENT (0-99)</h3>
                  
                  {['pace', 'shooting', 'passing', 'dribbling', 'defense', 'physical'].map((stat) => (
                    <FormField
                      key={stat}
                      control={form.control}
                      name={stat as any}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between mb-2">
                            <FormLabel className="uppercase">{stat}</FormLabel>
                            <span className="font-mono text-primary font-bold">{field.value}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={99}
                              step={1}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="py-2"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <Button type="submit" size="lg" className="w-full font-display text-xl h-14 bg-primary text-black hover:bg-white hover:scale-[1.01] transition-all">
                  COMPLETE REGISTRATION
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
