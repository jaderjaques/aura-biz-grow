import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, User, Mail, Briefcase, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { validatePassword } from "@/lib/password-validation";
import { PasswordStrengthIndicator } from "@/components/security/PasswordStrengthIndicator";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Senha deve ter no mínimo 12 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número")
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, "Senha deve conter pelo menos um caractere especial")
      .refine((password) => {
        const validation = validatePassword(password);
        return validation.requirements.notCommon;
      }, "Esta senha é muito comum. Escolha uma senha mais segura"),
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface InviteData {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
  invite_expires_at: string;
  status: string;
}

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const watchPassword = form.watch("password");

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError("Link de convite inválido");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_invite_by_token", {
        token_value: token,
      });

      if (error || !data || data.length === 0) {
        setError("Convite inválido ou expirado");
        setLoading(false);
        return;
      }

      setInviteData(data[0] as InviteData);
      setLoading(false);
    };

    fetchInvite();
  }, [token]);

  const handleGeneratePassword = (generatedPassword: string) => {
    form.setValue("password", generatedPassword, { shouldValidate: true });
    form.setValue("confirmPassword", generatedPassword, { shouldValidate: true });
    setShowPassword(true);
    setShowConfirmPassword(true);
    toast.success("Senha gerada! Copie e guarde em local seguro.");
  };

  const onSubmit = async (data: PasswordFormData) => {
    if (!inviteData || !token) return;

    // Validação extra de segurança
    const validation = validatePassword(data.password);
    if (!validation.isValid) {
      validation.errors.forEach((err) => toast.error(err));
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: data.password,
        options: {
          data: {
            full_name: inviteData.full_name,
          },
        },
      });

      if (authError) {
        toast.error(authError.message);
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao criar conta");
        setIsSubmitting(false);
        return;
      }

      // 2. Accept invite (update profile with new auth user id)
      const { data: acceptResult, error: acceptError } = await supabase.rpc(
        "accept_invite",
        {
          token_value: token,
          auth_user_id: authData.user.id,
        }
      );

      if (acceptError || !acceptResult) {
        toast.error("Erro ao ativar conta. O convite pode ter expirado.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Conta ativada com sucesso!", {
        description: "Bem-vindo ao Responde uAI CRM!",
      });

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error) {
      toast.error("Erro ao ativar conta");
    }

    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => navigate("/login")}>
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">Bem-vindo ao Responde uAI CRM! 👋</CardTitle>
            <CardDescription className="mt-2">
              Complete seu cadastro para acessar o sistema
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invite info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{inviteData?.full_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{inviteData?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{inviteData?.role_name}</span>
            </div>
          </div>

          {/* Password form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Defina sua senha *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••••"
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme sua senha *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
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

              {/* Password strength indicator */}
              <PasswordStrengthIndicator 
                password={watchPassword} 
                onGeneratePassword={handleGeneratePassword}
              />

              <Button
                type="submit"
                className="w-full gradient-cta hover:opacity-90 text-white"
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ativando conta...
                  </>
                ) : (
                  "Ativar Minha Conta"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
