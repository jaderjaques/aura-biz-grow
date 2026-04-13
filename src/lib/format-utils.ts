/**
 * Format and mask utilities for sensitive PII data.
 */

/**
 * Masks a CPF leaving only the last 2 digits visible.
 * Input: "08517315626" or "085.173.156-26"
 * Output: "***.***.***-26"
 */
export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `***.***.***-${digits.slice(9)}`;
}

/**
 * Formats a raw CPF string as "000.000.000-00".
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Masks a phone number leaving only the last 4 digits visible.
 * Input: "31994770836"
 * Output: "(31) *****-0836"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return phone;
  const area = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `(${area}) *****-${last4}`;
}

/**
 * Formats a phone number as "(00) 00000-0000".
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
