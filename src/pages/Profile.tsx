import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, User, Mail, Phone, Camera, Shield, Eye, EyeOff, KeyRound, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SecuritySection } from "@/components/security/SecuritySection";
import { PasswordStrengthIndicator } from "@/components/security/PasswordStrengthIndicator";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const profileSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    new_password: z.string().min(12, "Senha deve ter no mínimo 12 caracteres"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "As senhas não coincidem",
    path: ["confirm_password"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const newPasswordValue = passwordForm.watch("new_password");

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    const { error } = await updateProfile({
      full_name: data.full_name,
      phone: data.phone || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error("Erro ao atualizar perfil");
    } else {
      toast.success("Perfil atualizado com sucesso!");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setAvatarUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error("Erro ao enviar foto: " + uploadError.message);
      setAvatarUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the browser reloads the new image
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

    const { error: updateError } = await updateProfile({ avatar_url: avatarUrl });
    setAvatarUploading(false);

    if (updateError) {
      toast.error("Erro ao salvar foto no perfil");
    } else {
      toast.success("Foto atualizada!");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    if (!profile) return;
    setAvatarUploading(true);
    const { error } = await updateProfile({ avatar_url: null });
    setAvatarUploading(false);
    if (error) {
      toast.error("Erro ao remover foto");
    } else {
      toast.success("Foto removida!");
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: data.new_password });
    setIsChangingPassword(false);

    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      passwordForm.reset();
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e segurança</p>
        </div>

        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seus dados de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="gradient-bg text-primary-foreground text-xl">
                    {profile?.full_name ? getInitials(profile.full_name) : "U"}
                  </AvatarFallback>
                </Avatar>
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {avatarUploading ? "Enviando..." : "Alterar foto"}
                </Button>
                {profile?.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={avatarUploading}
                    className="text-destructive hover:text-destructive text-xs h-7"
                    onClick={handleRemoveAvatar}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remover foto
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP • Máx. 5MB</p>
              </div>
            </div>

            <Separator />

            {/* Profile Form */}
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Email</FormLabel>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={profile?.email || ""} className="pl-10 bg-muted" disabled />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p>
                </div>

                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="(11) 99999-9999" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Cargo</FormLabel>
                  <div className="mt-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">{profile?.role?.name || "Carregando..."}</Badge>
                    {profile?.role?.description && (
                      <span className="text-sm text-muted-foreground">
                        - {profile.role.description}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apenas administradores podem alterar cargos
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="gradient-cta hover:opacity-90 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar alterações"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Escolha uma senha forte para proteger sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Mínimo 12 caracteres"
                            className="pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowNewPassword((v) => !v)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {newPasswordValue && (
                  <PasswordStrengthIndicator
                    password={newPasswordValue}
                    onGeneratePassword={(pwd) => {
                      passwordForm.setValue("new_password", pwd);
                      passwordForm.setValue("confirm_password", pwd);
                    }}
                  />
                )}

                <FormField
                  control={passwordForm.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar nova senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Repita a nova senha"
                            className="pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar senha"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Segurança (2FA) */}
        <SecuritySection />
      </div>
    </AppLayout>
  );
}
