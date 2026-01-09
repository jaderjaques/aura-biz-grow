import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const APP_NAME = 'CRM Responde uAI';

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Create a TOTP instance from a secret
 */
export function createTOTP(secret: string, userEmail: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/**
 * Generate OTP Auth URI for QR code
 */
export function generateOTPAuthURI(secret: string, userEmail: string): string {
  const totp = createTOTP(secret, userEmail);
  return totp.toString();
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(secret: string, userEmail: string): Promise<string> {
  const uri = generateOTPAuthURI(secret, userEmail);
  return await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Verify a TOTP token
 */
export function verifyTOTP(secret: string, token: string, userEmail: string): boolean {
  try {
    const totp = createTOTP(secret, userEmail);
    // Allow 1 step before and after current time (30 seconds window)
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
      if (j === 3) code += '-';
    }
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hash a backup code for storage
 */
export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.toUpperCase().replace(/-/g, ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash all backup codes for storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => hashBackupCode(code)));
}
