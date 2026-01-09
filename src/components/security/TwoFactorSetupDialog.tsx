import { useState, useEffect } from 'react';
import { Shield, Copy, Check, Loader2, AlertTriangle, Smartphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { use2FA } from '@/hooks/use2FA';
import { toast } from 'sonner';

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SetupStep = 'intro' | 'qrcode' | 'verify' | 'backup' | 'complete';

export function TwoFactorSetupDialog({ open, onOpenChange }: TwoFactorSetupDialogProps) {
  const { startSetup, enableTwoFactor, isLoading, error, clearError } = use2FA();
  const [step, setStep] = useState<SetupStep>('intro');
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedCodes, setSavedCodes] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setSetupData(null);
      setVerificationCode('');
      setCopiedSecret(false);
      setCopiedCodes(false);
      setSavedCodes(false);
      clearError();
    }
  }, [open, clearError]);

  const handleStart = async () => {
    const data = await startSetup();
    if (data) {
      setSetupData(data);
      setStep('qrcode');
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast.success('Chave copiada!');
    }
  };

  const handleCopyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
      toast.success('Códigos copiados!');
    }
  };

  const handleVerify = async () => {
    if (!setupData || verificationCode.length !== 6) return;

    const success = await enableTwoFactor(
      setupData.secret,
      verificationCode,
      setupData.backupCodes
    );

    if (success) {
      setStep('backup');
    }
  };

  const handleComplete = () => {
    if (!savedCodes) {
      toast.error('Por favor, confirme que salvou os códigos de backup');
      return;
    }
    setStep('complete');
    toast.success('Autenticação de dois fatores ativada!');
  };

  const handleClose = () => {
    if (step === 'complete') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={step !== 'complete' ? onOpenChange : handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configurar Autenticação de Dois Fatores
          </DialogTitle>
          <DialogDescription>
            Adicione uma camada extra de segurança à sua conta
          </DialogDescription>
        </DialogHeader>

        {step === 'intro' && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <Smartphone className="h-10 w-10 text-primary mt-1" />
              <div className="space-y-2">
                <h4 className="font-medium">Como funciona?</h4>
                <p className="text-sm text-muted-foreground">
                  Use um aplicativo autenticador para gerar códigos de verificação.
                  Você precisará deste código sempre que fizer login.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Aplicativos compatíveis:</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Google Authenticator</Badge>
                <Badge variant="outline">Microsoft Authenticator</Badge>
                <Badge variant="outline">Authy</Badge>
                <Badge variant="outline">Duo Mobile</Badge>
                <Badge variant="outline">1Password</Badge>
              </div>
            </div>

            <Button onClick={handleStart} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Começar configuração'
              )}
            </Button>
          </div>
        )}

        {step === 'qrcode' && setupData && (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR code com seu aplicativo autenticador:
              </p>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg border">
                  <img 
                    src={setupData.qrCode} 
                    alt="QR Code para 2FA" 
                    className="w-48 h-48"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Ou insira a chave manualmente:</Label>
              <div className="flex gap-2">
                <Input 
                  value={setupData.secret} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopySecret}
                >
                  {copiedSecret ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button onClick={() => setStep('verify')} className="w-full">
              Continuar
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Digite o código de 6 dígitos do seu aplicativo autenticador:
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
                onClick={() => setStep('qrcode')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'backup' && setupData && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante!</strong> Salve estes códigos de backup em um local seguro. 
                Você pode usá-los para acessar sua conta se perder acesso ao seu aplicativo autenticador.
              </AlertDescription>
            </Alert>

            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, index) => (
                    <code 
                      key={index}
                      className="text-sm font-mono p-2 bg-muted rounded text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button 
              variant="outline" 
              onClick={handleCopyBackupCodes}
              className="w-full"
            >
              {copiedCodes ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar códigos
                </>
              )}
            </Button>

            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={savedCodes}
                onChange={(e) => setSavedCodes(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">
                Eu salvei meus códigos de backup em um local seguro
              </span>
            </label>

            <Button 
              onClick={handleComplete}
              disabled={!savedCodes}
              className="w-full"
            >
              Concluir configuração
            </Button>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-4 py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Configuração concluída!</h3>
              <p className="text-sm text-muted-foreground">
                Sua conta agora está protegida com autenticação de dois fatores.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
