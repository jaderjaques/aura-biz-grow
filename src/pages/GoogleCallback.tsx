import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state"); // user_id
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        toast.error("Autorização cancelada");
        setTimeout(() => navigate("/google-calendar"), 2000);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        toast.error("Erro na autorização");
        setTimeout(() => navigate("/google-calendar"), 2000);
        return;
      }

      try {
        const { error: funcError } = await supabase.functions.invoke(
          "google-oauth-callback",
          { body: { action: "exchange_code", code, user_id: state } }
        );
        if (funcError) throw funcError;

        setStatus("success");
        toast.success("Google Calendar conectado com sucesso!");
        setTimeout(() => navigate("/google-calendar"), 1500);
      } catch (err) {
        console.error("Callback error:", err);
        setStatus("error");
        toast.error("Erro ao conectar Google Calendar");
        setTimeout(() => navigate("/google-calendar"), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Conectando Google Calendar...</h2>
            <p className="text-muted-foreground">Por favor, aguarde</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-semibold text-green-600">Conectado com sucesso!</h2>
            <p className="text-muted-foreground">Redirecionando...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-destructive">Erro na conexão</h2>
            <p className="text-muted-foreground">Redirecionando...</p>
          </>
        )}
      </div>
    </div>
  );
}
