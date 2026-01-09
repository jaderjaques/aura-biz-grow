import { useState, useEffect } from 'react';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { use2FA } from '@/hooks/use2FA';
import { toast } from 'sonner';

interface TwoFactorDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TwoFactorDisableDialog({ open, onOpenChange }: TwoFactorDisableDialogProps) {
  const { disableTwoFactor, isLoading, error, clearError } = use2FA();
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    if (!open) {
      setVerificationCode('');
      clearError();
    }
  }, [open, clearError]);

  const handleDisable = async () => {
    if (verificationCode.length !== 6) return;

    const success = await disableTwoFactor(verificationCode);
    if (success) {
      toast.success('Autenticação de dois fatores desativada');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            Desativar 2FA
          </DialogTitle>
          <DialogDescription>
            Isso removerá a proteção extra da sua conta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Desativar a autenticação de dois fatores torna sua conta mais vulnerável.
              Certifique-se de que realmente deseja prosseguir.
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Digite o código do seu aplicativo autenticador para confirmar:
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDisable} 
              disabled={isLoading || verificationCode.length !== 6}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desativando...
                </>
              ) : (
                'Desativar 2FA'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
