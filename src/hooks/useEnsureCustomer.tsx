import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentProfile } from "@/lib/tenant-utils";
import { documentKind, isFilled, isValidEmail, isValidPhone } from "@/lib/documents";
import { CompleteCustomerDialog, CustomerDraft, DraftField } from "@/components/customers/CompleteCustomerDialog";

// Tabelas e colunas novas ainda não estão em types.ts.
const db = supabase as any;

interface WinRef {
  dealId?: string | null;
  leadId?: string | null;
}

interface Ctx {
  deal: { id: string; title: string | null; customer_id: string | null; lead_id: string | null; recurring_value: number | null } | null;
  lead: { id: string; nome: string | null; company_name: string | null; contact_name: string | null; email: string | null; phone: string | null; telefone: string | null; cnpj: string | null } | null;
}

interface Pending {
  ctx: Ctx;
  draft: CustomerDraft;
  missing: DraftField[];
  resolve: (ok: boolean) => void;
}

const today = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso local
const digits = (v: string) => v.replace(/\D/g, "");

async function load(ref: WinRef): Promise<Ctx> {
  let deal: Ctx["deal"] = null;
  if (ref.dealId) {
    const { data } = await db.from("deals").select("id, title, customer_id, lead_id, recurring_value").eq("id", ref.dealId).single();
    deal = data ?? null;
  }
  const leadId = ref.leadId ?? deal?.lead_id ?? null;
  let lead: Ctx["lead"] = null;
  if (leadId) {
    const { data } = await db.from("leads").select("id, nome, company_name, contact_name, email, phone, telefone, cnpj").eq("id", leadId).single();
    lead = data ?? null;
  }
  return { deal, lead };
}

function draftFrom(ctx: Ctx): CustomerDraft {
  const l = ctx.lead;
  return {
    company_name: l?.company_name || l?.nome || "",
    contact_name: l?.contact_name || l?.nome || "",
    email: l?.email || "",
    phone: l?.phone || l?.telefone || "",
    documento: l?.cnpj || "",
  };
}

function missingFields(d: CustomerDraft): DraftField[] {
  const m: DraftField[] = [];
  if (!isFilled(d.company_name)) m.push("company_name");
  if (!isFilled(d.contact_name)) m.push("contact_name");
  if (!isValidEmail(d.email)) m.push("email");
  if (!isValidPhone(d.phone)) m.push("phone");
  if (d.documento.trim() && !documentKind(d.documento)) m.push("documento");
  return m;
}

// Procura um cliente que já represente esta proposta ou este lead (evita cadastro duplicado).
async function findExisting(ctx: Ctx, draft: CustomerDraft): Promise<{ id: string; monthly_value: number | null } | null> {
  const sel = "id, monthly_value";
  if (ctx.deal?.customer_id) {
    const { data } = await db.from("customers").select(sel).eq("id", ctx.deal.customer_id).maybeSingle();
    if (data) return data;
  }
  if (ctx.deal) {
    const { data } = await db.from("customers").select(sel).eq("deal_id", ctx.deal.id).is("deleted_at", null).limit(1).maybeSingle();
    if (data) return data;
  }
  if (ctx.lead) {
    const { data } = await db.from("customers").select(sel).eq("lead_id", ctx.lead.id).is("deleted_at", null).limit(1).maybeSingle();
    if (data) return data;
  }
  const doc = digits(draft.documento);
  if (documentKind(doc)) {
    const masked = doc.length === 14
      ? doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
      : doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    const { data } = await db.from("customers").select(sel).is("deleted_at", null)
      .or(`cnpj.eq.${doc},cnpj.eq.${masked},cpf.eq.${doc},cpf.eq.${masked}`).limit(1).maybeSingle();
    if (data) return data;
  }
  if (isValidEmail(draft.email)) {
    const { data } = await db.from("customers").select(sel).is("deleted_at", null).ilike("email", draft.email.trim()).limit(1).maybeSingle();
    if (data) return data;
  }
  return null;
}

async function linkExisting(customer: { id: string; monthly_value: number | null }, ctx: Ctx) {
  const recurring = Number(ctx.deal?.recurring_value) || 0;
  if (ctx.deal && ctx.deal.customer_id !== customer.id) {
    await db.from("deals").update({ customer_id: customer.id }).eq("id", ctx.deal.id);
    // mensalidade nova de um cliente que já existia soma ao que ele já paga
    if (recurring > 0) await db.from("customers").update({ monthly_value: (Number(customer.monthly_value) || 0) + recurring }).eq("id", customer.id);
  }
  if (ctx.lead) {
    await db.from("leads").update({ status: "ganho", converted_to_customer_at: new Date().toISOString() }).eq("id", ctx.lead.id);
    await db.from("contacts").update({ customer_id: customer.id }).eq("lead_id", ctx.lead.id);
  }
}

async function createAndLink(d: CustomerDraft, ctx: Ctx): Promise<string> {
  const profile = await getCurrentProfile();
  const doc = digits(d.documento);
  const kind = doc ? documentKind(doc) : null;
  const recurring = Number(ctx.deal?.recurring_value) || 0;
  const { data, error } = await db.from("customers").insert({
    tenant_id: profile.tenant_id,
    company_name: d.company_name.trim(),
    contact_name: d.contact_name.trim(),
    email: d.email.trim().toLowerCase(),
    phone: d.phone.trim(),
    cnpj: kind === "cnpj" ? doc : null,
    cpf: kind === "cpf" ? doc : null,
    status: "active",
    customer_since: today(),
    monthly_value: recurring > 0 ? recurring : null,
    lead_id: ctx.lead?.id ?? null,
    deal_id: ctx.deal?.id ?? null,
    created_by: profile.id,
    account_manager: profile.id,
  }).select("id").single();
  if (error) throw error;
  if (ctx.deal) await db.from("deals").update({ customer_id: data.id }).eq("id", ctx.deal.id);
  if (ctx.lead) {
    await db.from("leads").update({
      status: "ganho", converted_to_customer_at: new Date().toISOString(), converted_by: profile.id,
      // dados completados na janela voltam para o lead
      company_name: d.company_name.trim(), email: d.email.trim().toLowerCase(), phone: d.phone.trim(),
    }).eq("id", ctx.lead.id);
    // sócios e outros contatos do lead passam a pertencer ao cliente
    await db.from("contacts").update({ customer_id: data.id }).eq("lead_id", ctx.lead.id);
  }
  return data.id as string;
}

// Ao ganhar uma proposta (ou um lead): garante que o cliente exista.
// - já existe cliente ligado: só liga e segue;
// - dados completos: cria sozinho;
// - faltou algo: abre a janela para completar (cancelar devolve false e o ganho não é registrado).
export function useEnsureCustomer() {
  const [pending, setPending] = useState<Pending | null>(null);

  const ensureCustomerForWin = useCallback(async (ref: WinRef): Promise<boolean> => {
    try {
      const ctx = await load(ref);
      if (!ctx.deal && !ctx.lead) return true;
      const draft = draftFrom(ctx);

      const existing = await findExisting(ctx, draft);
      if (existing) {
        await linkExisting(existing, ctx);
        return true;
      }

      const missing = missingFields(draft);
      if (missing.length === 0) {
        await createAndLink(draft, ctx);
        toast.success("Cliente criado automaticamente", { description: draft.company_name });
        return true;
      }
      return await new Promise<boolean>((resolve) => setPending({ ctx, draft, missing, resolve }));
    } catch (e) {
      toast.error("Não foi possível criar o cliente", { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, []);

  const customerDialog = pending ? (
    <CompleteCustomerDialog
      open
      draft={pending.draft}
      missing={pending.missing}
      onCancel={() => { pending.resolve(false); setPending(null); }}
      onSubmit={async (values) => {
        try {
          // o cliente pode já existir com o documento ou e-mail informados agora
          const existing = await findExisting(pending.ctx, values);
          if (existing) await linkExisting(existing, pending.ctx);
          else await createAndLink(values, pending.ctx);
          toast.success(existing ? "Cliente existente vinculado" : "Cliente criado", { description: values.company_name });
          pending.resolve(true);
          setPending(null);
        } catch (e) {
          toast.error("Não foi possível criar o cliente", { description: e instanceof Error ? e.message : undefined });
        }
      }}
    />
  ) : null;

  return { ensureCustomerForWin, customerDialog };
}
