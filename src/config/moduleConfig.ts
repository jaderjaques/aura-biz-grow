import { useTenantModule, TenantModule } from "@/hooks/useTenantModule";

/**
 * Registro canônico do VERTICAL (o "seam").
 *
 * Princípio (ADR — ver PLANEJAMENTO.md): este arquivo é o lugar único para
 * traços DECLARATIVOS que variam por módulo e que JÁ provaram ser compartilhados
 * entre telas (hoje: terminologia do "cliente final" do tenant).
 *
 * REGRAS:
 * - Só DADO declarativo aqui. Nada de lógica (config não é uma 2ª linguagem).
 * - Telas/fluxos genuinamente diferentes (ClinicDashboard × AgencyDashboard,
 *   ClinicAgenda × Agenda) continuam EXPLÍCITOS via routers — não migrar pra cá.
 * - Crescer este registro só quando um traço novo se repetir (Regra de Três).
 * - Catálogo de produto/serviço fica em `moduleProductConfig.ts` (já existente);
 *   pode ser unificado aqui no futuro, se ganhar valor.
 */
export interface ModuleConfig {
  /** Termo do contato final do tenant (singular). Ex.: "Cliente" | "Paciente". */
  customerLabel: string;
  /** Termo no plural. Ex.: "Clientes" | "Pacientes". */
  customerLabelPlural: string;
  /** Rota da listagem desse contato. Ex.: "/clientes" | "/pacientes". */
  customerRoute: string;
}

const AGENCY_CONFIG: ModuleConfig = {
  customerLabel: "Cliente",
  customerLabelPlural: "Clientes",
  customerRoute: "/clientes",
};

const CLINIC_CONFIG: ModuleConfig = {
  customerLabel: "Paciente",
  customerLabelPlural: "Pacientes",
  customerRoute: "/pacientes",
};

/** Resolve a config do vertical a partir do módulo do tenant. */
export function getModuleConfig(module: TenantModule): ModuleConfig {
  if (module === "clinic_dental" || module === "clinic_aesthetics") {
    return CLINIC_CONFIG;
  }
  return AGENCY_CONFIG;
}

/** Hook de conveniência: config do vertical do tenant logado. */
export function useModuleConfig(): ModuleConfig {
  const { module } = useTenantModule();
  return getModuleConfig(module);
}
