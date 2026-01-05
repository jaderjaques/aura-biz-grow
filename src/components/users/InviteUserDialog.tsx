import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const inviteSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  roleId: z.string().min(1, "Selecione um cargo"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface Role {
  id: string;
  name: string;
}

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteUserDialogProps) {
  const { profile } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      roleId: "",
    },
  });

  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name")
        .order("name");

      if (!error && data) {
        setRoles(data);
      }
    };

    if (open) {
      fetchRoles();
    }
  }, [open]);

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      if (existingUser) {
        toast.error("Este email já está cadastrado");
        setIsSubmitting(false);
        return;
      }

      // Generate invite token
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create pending profile
      const { error } = await supabase.from("profiles").insert({
        id: crypto.randomUUID(),
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || null,
        role_id: data.roleId,
        invited_by: profile?.id,
        invite_token: inviteToken,
        invite_sent_at: new Date().toISOString(),
        invite_expires_at: expiresAt.toISOString(),
        status: "pending",
        is_active: false,
      });

      if (error) {
        console.error("Error creating invite:", error);
        toast.error("Erro ao enviar convite");
      } else {
        const inviteLink = `${window.location.origin}/aceitar-convite?token=${inviteToken}`;
        
        toast.success("Convite criado!", {
          description: `Copie e envie o link para ${data.email}`,
          duration: 10000,
        });
        
        // Copy link to clipboard
        navigator.clipboard.writeText(inviteLink).then(() => {
          toast.info("Link copiado para a área de transferência!");
        });

        form.reset();
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao enviar convite");
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Novo Usuário</DialogTitle>
          <DialogDescription>
            Envie um convite por email para adicionar um novo membro à equipe.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@empresa.com.br"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    O convite será enviado para este email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cargo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gradient-cta hover:opacity-90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Convite"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
