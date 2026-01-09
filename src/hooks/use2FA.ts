import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  generateTOTPSecret, 
  generateQRCode, 
  verifyTOTP, 
  generateBackupCodes,
  hashBackupCodes 
} from '@/lib/totp';

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export function use2FA() {
  const { user, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is2FAEnabled = profile?.totp_enabled ?? false;

  /**
   * Start 2FA setup - generates secret and QR code
   */
  const startSetup = useCallback(async (): Promise<TwoFactorSetup | null> => {
    if (!user?.email) {
      setError('Usuário não autenticado');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const secret = generateTOTPSecret();
      const qrCode = await generateQRCode(secret, user.email);
      const backupCodes = generateBackupCodes(10);

      return { secret, qrCode, backupCodes };
    } catch (err) {
      setError('Erro ao gerar configuração 2FA');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  /**
   * Verify TOTP token and enable 2FA
   */
  const enableTwoFactor = useCallback(async (
    secret: string, 
    token: string,
    backupCodes: string[]
  ): Promise<boolean> => {
    if (!user?.id || !user?.email) {
      setError('Usuário não autenticado');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify the token first
      const isValid = verifyTOTP(secret, token, user.email);
      if (!isValid) {
        setError('Código inválido. Verifique e tente novamente.');
        return false;
      }

      // Hash backup codes before storing
      const hashedCodes = await hashBackupCodes(backupCodes);

      // Enable 2FA in database using direct update (RPC functions may not be typed)
      const { error: enableError } = await supabase
        .from('profiles')
        .update({
          totp_secret: secret,
          totp_enabled: true,
          totp_verified_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (enableError) {
        throw enableError;
      }

      // Save backup codes
      const { error: codesError } = await supabase
        .from('profiles')
        .update({ backup_codes: hashedCodes })
        .eq('id', user.id);

      if (codesError) {
        throw codesError;
      }

      // Log security event
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: '2fa_enabled',
        severity: 'info',
      });

      if (codesError) {
        throw codesError;
      }

      await refreshProfile();
      return true;
    } catch (err) {
      setError('Erro ao ativar autenticação de dois fatores');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email, refreshProfile]);

  /**
   * Disable 2FA
   */
  const disableTwoFactor = useCallback(async (token: string): Promise<boolean> => {
    if (!user?.id || !user?.email) {
      setError('Usuário não autenticado');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // SECURITY: Get current secret via RPC to avoid exposing it in client responses
      // Using explicit typing since RPC function may not be in auto-generated types yet
      const { data: secretData, error: fetchError } = await supabase
        .rpc('get_own_totp_secret' as never) as { data: { totp_secret: string }[] | null; error: Error | null };

      if (fetchError || !secretData || secretData.length === 0 || !secretData[0]?.totp_secret) {
        setError('Erro ao verificar configuração 2FA');
        return false;
      }

      // Verify the token
      const isValid = verifyTOTP(secretData[0].totp_secret, token, user.email);
      if (!isValid) {
        setError('Código inválido');
        return false;
      }

      // Disable 2FA using direct update
      const { error: disableError } = await supabase
        .from('profiles')
        .update({
          totp_secret: null,
          totp_enabled: false,
          totp_verified_at: null,
          backup_codes: null,
        })
        .eq('id', user.id);

      if (disableError) {
        throw disableError;
      }

      // Log security event
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: '2fa_disabled',
        severity: 'warning',
      });

      await refreshProfile();
      return true;
    } catch (err) {
      setError('Erro ao desativar autenticação de dois fatores');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email, refreshProfile]);

  /**
   * Verify TOTP during login
   */
  const verifyLoginTOTP = useCallback(async (
    userId: string,
    userEmail: string,
    token: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // SECURITY: Get TOTP secret via RPC to avoid exposing sensitive data in client
      // Using explicit typing since RPC function may not be in auto-generated types yet
      const { data: secretData, error: fetchError } = await supabase
        .rpc('get_totp_secret_for_login' as never, { p_user_id: userId } as never) as { 
          data: { totp_secret: string; backup_codes: string[] }[] | null; 
          error: Error | null 
        };

      if (fetchError || !secretData || secretData.length === 0 || !secretData[0]?.totp_secret) {
        setError('Erro ao verificar 2FA');
        return false;
      }

      const profileData = secretData[0];

      // First try TOTP verification
      const isValid = verifyTOTP(profileData.totp_secret, token, userEmail);
      if (isValid) {
        // Reset failed login attempts on successful 2FA
        await supabase
          .from('profiles')
          .update({ failed_login_attempts: 0, locked_until: null })
          .eq('id', userId);
        return true;
      }

      // If TOTP failed, try backup code (format: XXXX-XXXX)
      if (token.includes('-') || token.length === 8 || token.length === 9) {
        const hashedCode = await import('@/lib/totp').then(m => m.hashBackupCode(token));
        const backupCodes = profileData.backup_codes as string[] | null;
        
        if (backupCodes && backupCodes.includes(hashedCode)) {
          // Remove used backup code
          const newCodes = backupCodes.filter(c => c !== hashedCode);
          await supabase
            .from('profiles')
            .update({ 
              backup_codes: newCodes,
              failed_login_attempts: 0,
              locked_until: null 
            })
            .eq('id', userId);

          // Log security event
          await supabase.from('security_events').insert({
            user_id: userId,
            event_type: 'backup_code_used',
            details: { remaining_codes: newCodes.length },
            severity: 'warning',
          });

          return true;
        }
      }

      setError('Código inválido');
      return false;
    } catch (err) {
      setError('Erro ao verificar código');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if user needs 2FA verification
   */
  const check2FARequired = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('totp_enabled')
        .eq('id', userId)
        .single();

      if (error) return false;
      return data?.totp_enabled ?? false;
    } catch {
      return false;
    }
  }, []);

  return {
    is2FAEnabled,
    isLoading,
    error,
    startSetup,
    enableTwoFactor,
    disableTwoFactor,
    verifyLoginTOTP,
    check2FARequired,
    clearError: () => setError(null),
  };
}
