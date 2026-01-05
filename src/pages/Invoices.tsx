import { AppLayout } from "@/components/layout/AppLayout";
import { InvoicesTable } from "@/components/financial/InvoicesTable";

export default function Invoices() {
  return (
    <AppLayout>
      <InvoicesTable />
    </AppLayout>
  );
}
