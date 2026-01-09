import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorVerifyDialog } from "@/components/security/TwoFactorVerifyDialog";
import { use2FA } from "@/hooks/use2FA";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const { check2FARequired, verifyLoginTOTP, isLoading: is2FALoading, error: twoFAError, clearError } = use2FA();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ id: string; email: string } | null>(null);

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !show2FADialog) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error, data: authData } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha inválidos");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Por favor, confirme seu email antes de fazer login");
        } else {
          toast.error(error.message);
        }
        setIsSubmitting(false);
        return;
      }

      // Check if 2FA is required
      if (authData.user) {
        const requires2FA = await check2FARequired(authData.user.id);
        
        if (requires2FA) {
          // Sign out temporarily and show 2FA dialog
          await supabase.auth.signOut();
          setPendingUser({ id: authData.user.id, email: authData.user.email || data.email });
          setShow2FADialog(true);
          setIsSubmitting(false);
          return;
        }
        
        // No 2FA required, login successful
        toast.success("Login realizado com sucesso!");
      }
    } catch (err) {
      toast.error("Erro ao fazer login");
    }
    
    setIsSubmitting(false);
  };

  const handle2FAVerify = async (code: string): Promise<boolean> => {
    if (!pendingUser) return false;
    
    const isValid = await verifyLoginTOTP(pendingUser.id, pendingUser.email, code);
    
    if (isValid) {
      // Re-authenticate the user
      const formData = form.getValues();
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      
      if (!error) {
        setShow2FADialog(false);
        setPendingUser(null);
        toast.success("Login realizado com sucesso!");
        return true;
      }
    }
    
    return false;
  };

  const handle2FACancel = async () => {
    setShow2FADialog(false);
    setPendingUser(null);
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full bg-gradient-to-br from-primary/10 via-accent/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full bg-gradient-to-tr from-secondary/10 via-accent/5 to-transparent blur-3xl" />
      </div>

      <Card className="w-full max-w-md animate-fade-in shadow-xl border-border/50">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div>
            <CardTitle className="text-2xl">Bem-vindo ao CRM</CardTitle>
            <CardDescription className="mt-2">
              Gerencie seus leads e clientes de forma inteligente
            </CardDescription>
          </div>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleLogin)}>
            <CardContent className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                variant="link"
                type="button"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-primary"
              >
                Esqueci minha senha
              </Button>
            </CardContent>

            <CardFooter className="flex-col gap-4">
              <Button
                type="submit"
                className="w-full gradient-cta hover:opacity-90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Acesso restrito - Apenas membros convidados
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* 2FA Verification Dialog */}
      <TwoFactorVerifyDialog
        open={show2FADialog}
        onVerify={handle2FAVerify}
        onCancel={handle2FACancel}
        isLoading={is2FALoading}
        error={twoFAError}
      />
    </div>
  );
}
