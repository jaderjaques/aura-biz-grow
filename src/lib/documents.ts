// Validações de cadastro usadas ao transformar uma proposta ou um lead em cliente.

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function cpfOk(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

function cnpjOk(d: string): boolean {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * w[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

// "cpf", "cnpj" ou null quando o documento não é válido.
export function documentKind(value: string | null | undefined): "cpf" | "cnpj" | null {
  const d = onlyDigits(value ?? "");
  if (cpfOk(d)) return "cpf";
  if (cnpjOk(d)) return "cnpj";
  return null;
}

export function isValidEmail(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  return v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v) && !/^(teste|test|sem|naoinformado)@/i.test(v) && !/@(example|exemplo|teste|test)\./i.test(v);
}

export function isValidPhone(value: string | null | undefined): boolean {
  return onlyDigits(value ?? "").length >= 10;
}

// Texto vazio ou de enchimento ("—", "N/A", "teste") não conta como informação.
export function isFilled(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v.length >= 2 && !["—", "-", "--", "n/a", "na", "teste", "test", "xxx", "sem nome"].includes(v);
}
