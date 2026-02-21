import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ==================== EXCEL ====================

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Dados') {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const maxWidth = 50;
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLen + 2, maxWidth) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportCashflowToExcel(transactions: any[], period: string) {
  const data = transactions.map(t => ({
    'Data': format(new Date(t.transaction_date), 'dd/MM/yyyy'),
    'Tipo': t.type === 'revenue' ? 'Receita' : 'Despesa',
    'Descrição': t.description,
    'Categoria': t.revenue_category?.name || t.expense_category?.name || '-',
    'Cliente': t.customer?.company_name || '-',
    'Forma Pagamento': getPaymentMethodLabel(t.payment_method),
    'Valor': t.type === 'revenue' ? t.amount : -t.amount,
    'Recorrente': t.is_recurring ? 'Sim' : 'Não',
  }));

  exportToExcel(data, `fluxo-caixa-${period}`, 'Fluxo de Caixa');
}

export function exportInvoicesToExcel(invoices: any[]) {
  const data = invoices.map(inv => ({
    'Número': inv.invoice_number || `#${inv.id.slice(0, 8)}`,
    'Cliente': inv.customer?.company_name || '-',
    'Tipo': getTypeLabel(inv.invoice_type),
    'Emissão': inv.issue_date ? format(new Date(inv.issue_date), 'dd/MM/yyyy') : '-',
    'Vencimento': format(new Date(inv.due_date), 'dd/MM/yyyy'),
    'Pagamento': inv.payment_date ? format(new Date(inv.payment_date), 'dd/MM/yyyy') : '-',
    'Valor': inv.total_amount,
    'Status': getStatusLabel(inv.status),
    'Forma Pagamento': inv.payment_method ? getPaymentMethodLabel(inv.payment_method) : '-',
  }));

  const filename = `faturas-${format(new Date(), 'yyyy-MM-dd')}`;
  exportToExcel(data, filename, 'Faturas');
}

// ==================== CSV ====================

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

// ==================== PDF ====================

export function exportCashflowToPDF(
  transactions: any[],
  stats: { totalRevenue: number; totalExpenses: number; netBalance: number },
  period: string
) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(139, 58, 139);
  doc.text('Responde uAI CRM', 14, 20);

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Relatório de Fluxo de Caixa', 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${period}`, 14, 37);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 42);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Resumo:', 14, 52);

  doc.setFontSize(10);
  doc.text(`Total Receitas: ${formatCurrency(stats.totalRevenue)}`, 14, 60);
  doc.text(`Total Despesas: ${formatCurrency(stats.totalExpenses)}`, 14, 66);

  doc.setFontSize(11);
  if (stats.netBalance >= 0) {
    doc.setTextColor(16, 185, 129);
  } else {
    doc.setTextColor(239, 68, 68);
  }
  doc.text(`Saldo Líquido: ${formatCurrency(stats.netBalance)}`, 14, 74);

  const tableData = transactions.map(t => [
    format(new Date(t.transaction_date), 'dd/MM/yy'),
    t.type === 'revenue' ? 'Receita' : 'Despesa',
    truncate(t.description, 30),
    t.revenue_category?.name || t.expense_category?.name || '-',
    formatCurrency(t.amount),
  ]);

  autoTable(doc, {
    startY: 82,
    head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor']],
    body: tableData,
    headStyles: { fillColor: [139, 58, 139] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  addPageNumbers(doc);
  doc.save(`fluxo-caixa-${period}.pdf`);
}

export function exportInvoicesToPDF(invoices: any[], stats: {
  pending: { count: number; value: number };
  overdue: { count: number; value: number };
  paid: { count: number; value: number };
  cancelled: { count: number; value: number };
}) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(139, 58, 139);
  doc.text('Responde uAI CRM', 14, 20);

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Relatório de Faturas', 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 37);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Resumo:', 14, 47);

  doc.setFontSize(10);
  doc.text(`Pendentes: ${stats.pending.count} (${formatCurrency(stats.pending.value)})`, 14, 55);
  doc.text(`Atrasadas: ${stats.overdue.count} (${formatCurrency(stats.overdue.value)})`, 14, 61);
  doc.text(`Pagas: ${stats.paid.count} (${formatCurrency(stats.paid.value)})`, 14, 67);
  doc.text(`Canceladas: ${stats.cancelled.count} (${formatCurrency(stats.cancelled.value)})`, 14, 73);

  const tableData = invoices.map(inv => [
    inv.invoice_number || `#${inv.id.slice(0, 8)}`,
    truncate(inv.customer?.company_name || '-', 25),
    format(new Date(inv.due_date), 'dd/MM/yy'),
    formatCurrency(inv.total_amount),
    getStatusLabel(inv.status),
  ]);

  autoTable(doc, {
    startY: 82,
    head: [['Número', 'Cliente', 'Vencimento', 'Valor', 'Status']],
    body: tableData,
    headStyles: { fillColor: [139, 58, 139] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  addPageNumbers(doc);
  doc.save(`faturas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportExpensesByCategoryPDF(data: any[], period: string) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(139, 58, 139);
  doc.text('Responde uAI CRM', 14, 20);

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Despesas por Categoria', 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${period}`, 14, 37);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 42);

  const total = data.reduce((sum, item) => sum + item.valor, 0);
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total de Despesas: ${formatCurrency(total)}`, 14, 52);

  const tableData = data.map(item => [
    item.categoria,
    formatCurrency(item.valor),
    `${((item.valor / total) * 100).toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['Categoria', 'Valor', '% do Total']],
    body: tableData,
    headStyles: { fillColor: [139, 58, 139] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  addPageNumbers(doc);
  doc.save(`despesas-categoria-${period}.pdf`);
}

// ==================== HELPERS ====================

function addPageNumbers(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function getPaymentMethodLabel(method: string | null): string {
  if (!method) return '-';
  const labels: Record<string, string> = {
    pix: 'PIX',
    transferencia: 'Transferência',
    cartao_credito: 'Cartão Crédito',
    cartao_debito: 'Cartão Débito',
    boleto: 'Boleto',
    dinheiro: 'Dinheiro',
  };
  return labels[method] || method;
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    setup: 'Setup',
    monthly: 'Mensalidade',
    one_time: 'Único',
    addon: 'Add-on',
    consulting: 'Consultoria',
    adjustment: 'Ajuste',
  };
  return labels[type] || type;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Paga',
    cancelled: 'Cancelada',
    overdue: 'Atrasada',
    sent: 'Enviada',
  };
  return labels[status] || status;
}

function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
}
