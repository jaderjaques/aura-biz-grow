import { useState, useEffect } from 'react';
import { Shield, Loader2, AlertTriangle, Key } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TwoFactorVerifyDialogProps {
  open: boolean;
  onVerify: (code: string) => Promise<boolean>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function TwoFactorVerifyDialog({ 
  open, 
  onVerify, 
  onCancel,
  isLoading = false,
  error = null
}: TwoFactorVerifyDialogProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [activeTab, setActiveTab] = useState('totp');

  useEffect(() => {
    if (!open) {
      setVerificationCode('');
      setBackupCode('');
      setActiveTab('totp');
    }
  }, [open]);

  const handleVerify = async () => {
    const code = activeTab === 'totp' ? verificationCode : backupCode;
    if (!code) return;
    await onVerify(code);
  };

  const isValidCode = activeTab === 'totp' 
    ? verificationCode.length === 6 
    : backupCode.length >= 8;

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[400px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verificação em Duas Etapas
          </DialogTitle>
          <DialogDescription>
            Sua conta está protegida com autenticação de dois fatores
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp">
              <Shield className="mr-2 h-4 w-4" />
              Código
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Key className="mr-2 h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4">
            <div className="text-center space-y-2 pt-2">
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
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="text-center space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">
                Digite um dos seus códigos de backup:
              </p>
            </div>

            <Input
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="font-mono text-center text-lg tracking-widest"
              maxLength={9}
            />

            <p className="text-xs text-muted-foreground text-center">
              Cada código de backup só pode ser usado uma vez
            </p>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleVerify} 
            disabled={isLoading || !isValidCode}
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
      </DialogContent>
    </Dialog>
  );
}
