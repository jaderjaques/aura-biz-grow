import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, User, Mail, Briefcase, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[a-zA-Z]/, "Senha deve conter pelo menos uma letra")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
    confirmPassword: z.string().min(8, "Confirmação de senha é obrigatória"),
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
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const watchPassword = form.watch("password");

  useEffect(() => {
    setPasswordRequirements({
      minLength: watchPassword.length >= 8,
      hasLetter: /[a-zA-Z]/.test(watchPassword),
      hasNumber: /[0-9]/.test(watchPassword),
    });
  }, [watchPassword]);

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

  const onSubmit = async (data: PasswordFormData) => {
    if (!inviteData || !token) return;

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
        console.error("Auth error:", authError);
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
        console.error("Accept invite error:", acceptError);
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
      console.error("Error:", error);
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
                          type="password"
                          placeholder="••••••••"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme sua senha *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password requirements */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                <div
                  className={`flex items-center gap-2 text-xs ${
                    passwordRequirements.minLength
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mínimo 8 caracteres
                </div>
                <div
                  className={`flex items-center gap-2 text-xs ${
                    passwordRequirements.hasLetter
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Pelo menos uma letra
                </div>
                <div
                  className={`flex items-center gap-2 text-xs ${
                    passwordRequirements.hasNumber
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Pelo menos um número
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-cta hover:opacity-90 text-white"
                disabled={isSubmitting}
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
