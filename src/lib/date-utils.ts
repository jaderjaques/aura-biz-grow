// Datas sem hora ("2023-05-15", como vêm de colunas `date` do banco) valem o DIA, não um instante.
// `new Date("2023-05-15")` as lê como meia-noite UTC e, no horário de Brasília, mostra 14/05.
// Use parseDateOnly antes de formatar para exibir o dia certo.
export function parseDateOnly(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Máscara de exibição para CPF (11 dígitos) e CNPJ (14); outros valores voltam como estão.
export function formatDocument(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}
