import { CheckCircle2, XCircle, Shield, RefreshCw } from "lucide-react";
import { validatePassword, getPasswordStrengthLabel, generateSecurePassword } from "@/lib/password-validation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthIndicatorProps {
  password: string;
  onGeneratePassword?: (password: string) => void;
}

export function PasswordStrengthIndicator({ 
  password, 
  onGeneratePassword 
}: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password);
  const strengthLabel = getPasswordStrengthLabel(validation.score);
  const progressValue = (validation.score / 6) * 100;

  const handleGeneratePassword = () => {
    if (onGeneratePassword) {
      const newPassword = generateSecurePassword(16);
      onGeneratePassword(newPassword);
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra de força */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Força da senha
          </span>
          <span className={strengthLabel.color}>{strengthLabel.label}</span>
        </div>
        <Progress 
          value={progressValue} 
          className="h-1.5"
        />
      </div>

      {/* Requisitos */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
        <RequirementItem
          met={validation.requirements.minLength}
          text="Mínimo 12 caracteres"
        />
        <RequirementItem
          met={validation.requirements.hasUppercase}
          text="Uma letra maiúscula (A-Z)"
        />
        <RequirementItem
          met={validation.requirements.hasLowercase}
          text="Uma letra minúscula (a-z)"
        />
        <RequirementItem
          met={validation.requirements.hasNumber}
          text="Um número (0-9)"
        />
        <RequirementItem
          met={validation.requirements.hasSpecialChar}
          text="Um caractere especial (!@#$%...)"
        />
        <RequirementItem
          met={validation.requirements.notCommon}
          text="Não é uma senha comum"
        />
      </div>

      {/* Botão para gerar senha */}
      {onGeneratePassword && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleGeneratePassword}
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          Gerar senha segura
        </Button>
      )}
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs transition-colors ${
        met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
      }`}
    >
      {met ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      {text}
    </div>
  );
}
