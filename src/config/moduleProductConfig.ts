import { TenantModule } from "@/hooks/useTenantModule";

export interface ProductCategory {
  value: string;
  label: string;
  icon: string; // lucide icon name
  color: string; // tailwind text color
}

export interface ProductType {
  value: string;
  label: string;
}

export interface ModuleProductConfig {
  pageTitle: string;
  pageSubtitle: string;
  newButtonLabel: string;
  dialogTitle: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  categories: ProductCategory[];
  types: ProductType[];
  statsCards: {
    key: "total" | "recurring" | string;
    label: string;
    icon: string;
    color: string;
  }[];
  showRecurring: boolean;
  showSetup: boolean;
  showUpsell: boolean;
}

const AGENCY_CONFIG: ModuleProductConfig = {
  pageTitle: "Gestão de Produtos",
  pageSubtitle: "Gerencie o catálogo de produtos e serviços",
  newButtonLabel: "Novo Produto",
  dialogTitle: "Novo Produto/Serviço",
  namePlaceholder: "Ex: Setup Marketing Digital",
  descriptionPlaceholder: "Descreva o produto/serviço...",
  categories: [
    { value: "marketing",  label: "Marketing Digital", icon: "Megaphone",   color: "text-purple-500" },
    { value: "automation", label: "Automação",          icon: "Bot",         color: "text-blue-500"   },
    { value: "consulting", label: "Consultorias",       icon: "Users",       color: "text-amber-500"  },
    { value: "addon",      label: "Add-ons/Integrações", icon: "Puzzle",     color: "text-green-500"  },
  ],
  types: [
    { value: "setup",     label: "Setup (uma vez)" },
    { value: "monthly",   label: "Mensalidade" },
    { value: "one_time",  label: "Pagamento único" },
    { value: "hourly",    label: "Por hora" },
  ],
  statsCards: [
    { key: "total",       label: "Total Produtos",      icon: "Package",    color: "text-primary"      },
    { key: "recurring",   label: "Serviços Recorrentes", icon: "RefreshCw", color: "text-green-500"   },
    { key: "marketing",   label: "Marketing",            icon: "Megaphone", color: "text-purple-500"   },
    { key: "automation",  label: "Automação",            icon: "Bot",       color: "text-blue-500"     },
  ],
  showRecurring: true,
  showSetup: true,
  showUpsell: true,
};

const CLINIC_DENTAL_CONFIG: ModuleProductConfig = {
  pageTitle: "Procedimentos",
  pageSubtitle: "Gerencie o catálogo de procedimentos odontológicos",
  newButtonLabel: "Novo Procedimento",
  dialogTitle: "Novo Procedimento",
  namePlaceholder: "Ex: Clareamento dental, Implante unitário...",
  descriptionPlaceholder: "Descreva o procedimento, indicações, etapas...",
  categories: [
    { value: "prevention",    label: "Prevenção",            icon: "ShieldCheck",  color: "text-green-500"   },
    { value: "esthetics",     label: "Dentística/Estética",  icon: "Sparkles",     color: "text-pink-500"    },
    { value: "orthodontics",  label: "Ortodontia",           icon: "GitMerge",     color: "text-blue-500"    },
    { value: "implants",      label: "Implantodontia",       icon: "Anchor",       color: "text-cyan-600"    },
    { value: "surgery",       label: "Cirurgia Oral",        icon: "Scissors",     color: "text-red-500"     },
    { value: "periodontics",  label: "Periodontia",          icon: "Leaf",         color: "text-emerald-500" },
    { value: "endodontics",   label: "Endodontia",           icon: "Activity",     color: "text-orange-500"  },
    { value: "prosthetics",   label: "Próteses",             icon: "Layers",       color: "text-violet-500"  },
    { value: "pediatrics",    label: "Odontopediatria",      icon: "Baby",         color: "text-yellow-500"  },
    { value: "other",         label: "Outros",               icon: "MoreHorizontal", color: "text-muted-foreground" },
  ],
  types: [
    { value: "single_session", label: "Sessão única" },
    { value: "per_session",    label: "Por sessão" },
    { value: "treatment",      label: "Tratamento (múltiplas sessões)" },
    { value: "evaluation",     label: "Avaliação / Consulta" },
  ],
  statsCards: [
    { key: "total",         label: "Total de Procedimentos", icon: "Stethoscope", color: "text-primary"      },
    { key: "esthetics",     label: "Estética",               icon: "Sparkles",    color: "text-pink-500"     },
    { key: "orthodontics",  label: "Ortodontia",             icon: "GitMerge",    color: "text-blue-500"     },
    { key: "implants",      label: "Implantodontia",         icon: "Anchor",      color: "text-cyan-600"     },
  ],
  showRecurring: false,
  showSetup: false,
  showUpsell: false,
};

export function getModuleProductConfig(module: TenantModule): ModuleProductConfig {
  if (module === "clinic_dental" || module === "clinic_aesthetics") {
    return CLINIC_DENTAL_CONFIG;
  }
  return AGENCY_CONFIG;
}
