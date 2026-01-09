import { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { use2FA } from '@/hooks/use2FA';
import { TwoFactorSetupDialog } from './TwoFactorSetupDialog';
import { TwoFactorDisableDialog } from './TwoFactorDisableDialog';

export function SecuritySection() {
  const { is2FAEnabled } = use2FA();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança da Conta
          </CardTitle>
          <CardDescription>
            Gerencie as configurações de segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2FA Section */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Autenticação de Dois Fatores (2FA)</h4>
                  {is2FAEnabled ? (
                    <Badge variant="default" className="bg-green-600">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <ShieldOff className="mr-1 h-3 w-3" />
                      Inativo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Adicione uma camada extra de segurança usando um aplicativo autenticador.
                </p>
              </div>
              
              {is2FAEnabled ? (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Desativar
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => setShowSetupDialog(true)}
                >
                  Ativar 2FA
                </Button>
              )}
            </div>

            {!is2FAEnabled && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Recomendação de Segurança</AlertTitle>
                <AlertDescription>
                  Recomendamos ativar a autenticação de dois fatores para proteger sua conta 
                  contra acessos não autorizados. Mesmo que sua senha seja comprometida, 
                  sua conta permanecerá segura.
                </AlertDescription>
              </Alert>
            )}

            {is2FAEnabled && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Conta Protegida</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Sua conta está protegida com autenticação de dois fatores. Você precisará 
                  do código do seu aplicativo autenticador para fazer login.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Security Tips */}
          <div className="space-y-3">
            <h4 className="font-medium">Dicas de Segurança</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                Use uma senha forte e única para esta conta
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                Nunca compartilhe suas credenciais com outras pessoas
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                Mantenha seus códigos de backup em um local seguro
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                Saia da conta ao usar computadores públicos
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <TwoFactorSetupDialog 
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
      />

      <TwoFactorDisableDialog
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
      />
    </>
  );
}
