# PLANEJAMENTO — Projeto CRM (Responde uAI)

> Documento de referência do projeto. Atualizar a cada fase concluída.
> Última atualização: 2026-05-23

---

## Visão geral

CRM multi-tenant, multi-vertical (agência, clínica odontológica, clínica de estética).
Operação em dois mercados: **Brasil** (produto completo) e **Europa** (modelo lean de automação).

### Roadmap macro (BR)
```
1º  Fundação (Fase 0)        → blindagem multi-tenant
2º  CRM da AGÊNCIA 100%       → provar um vertical ponta a ponta
3º  Módulo CLÍNICA            → multi-tenant + IA clínica + clínicas-modelo
```

---

## Princípios de arquitetura (travados)

- **Tenant e Vertical = DADO, não CÓDIGO.** Onboarding = inserir config; nunca fork/clone por cliente. Região = alvo de deploy.
- **Uma camada de tools, dois papéis de IA** com permissões diferentes:
  - IA Atendimento (`mavie-chat`) = subconjunto seguro (qualifica, cria lead, agenda).
  - IA Interna (gestão) = conjunto completo (propostas, disparo, analytics).
- **Isolamento por design:** capacidade nova = função separada e isolada; nunca mexer invasivamente no cérebro compartilhado (`mavie-chat`).
- **Sender único e plugável** (AvisaAPI hoje → Meta depois = troca num ponto só).
- **Lógica concentrada em edge functions; n8n fino** (só transporte de WhatsApp).
- **Aprovação humana + consentimento + auditoria** em disparo/proposta. Toda escrita de IA em `audit_logs`.

---

## Status atual

### ✅ Fase 0 — Fundação multi-tenant (concluída para a fase agência)
Migrations aplicadas:
- **Item 1:** isolamento de `tags`, `sla_configs`, `task_templates` (policies "tenant_isolation" eram `true` = vazavam leitura e escrita).
- **Item 2:** isolamento de `bank_accounts`, `revenue_categories`, `expense_categories`, `ticket_categories` (vazavam leitura).
- **Item 3:** `pipeline_stages` isolada + `tenant_id` (backfill `responde-uai`).
- **Item 4:** removidos `produtos` (tabela legada PT) + função `buscar_produtos`.

Padrão de policy adotado: `service_role` (código) = total · leitura = tenant · **escrita = só admin** (`is_tenant_admin()`).
Decisão: **sem limite fixo de admins** (usar papéis + limite por plano no futuro).

---

## Plano de ação por fase

### FASE 1 — Agência 100% operacional (FOCO ATUAL)
| # | Passo | Depende de |
|---|---|---|
| 1.1 | Auditoria do vertical agência (código + banco) → punch list | — |
| 1.2 | Corrigir o operacional core (Inbox, Propostas, Financeiro, Relatórios) | 1.1 |
| 1.3 | IA cria/atualiza lead (BANT) + tags — função isolada que lê a conversa | Fase 0 |
| 1.4 | IA interna: resumo BANT diário (cron, leitura) + ações de funil | 1.3 |

**DoD:** lead chega no WhatsApp → vira lead com BANT/tags → funil → proposta → fechamento, tudo medível, sem buraco.

### FASE 2 — Portão multi-tenant (habilita 2º tenant)
| # | Passo | Por quê |
|---|---|---|
| 2.1 | Item 5 — tirar default `'responde-uai'`, derivar de `get_my_tenant_id()`/explícito (NOT NULL) | esquecer tenant_id estoura alto, não vaza |
| 2.2 | n8n tenant-agnóstico — resolver tenant pelo WhatsApp; token/prompt/tenant dinâmicos | sem isso, 2º tenant não tem IA |
| 2.3 | Fechar RLS clínico — `procedure_prices`, `treatment_plan_items`, `odontogram` (via pai) | dado de paciente isolado |
| 2.4 | Framework de vertical — registro `módulo → {menus, entidades, etapas, tools IA, prompt}`; remover `if isClinic` espalhados | adicionar vertical = config |
| 2.5 | Onboarding config-driven (novo tenant = config + seed por vertical) | escala sem código |

### FASE 3 — Módulo Clínica + clínicas-modelo
| # | Passo |
|---|---|
| 3.1 | IA clínica — prompt + tools por vertical (agenda consulta/paciente) |
| 3.2 | Reconciliar `products` × `procedures` (modelo de extensão) — ativar catálogo clínico |
| 3.3 | Onboard das 2 clínicas-modelo como cockpit (gestão); depois ligar WhatsApp/IA |
| 3.4 | Contrato LGPD de tratamento (dado de saúde sensível) — *humano* |

---

## TRILHA EU — automação lean (paralela)
| # | Passo | Observação |
|---|---|---|
| E.1 | Template único de automação (1 blueprint n8n, instanciar por cliente) | evita sprawl |
| E.2 | DPA/contrato padrão | *humano* — sócio espanhol + counsel local |
| E.3 | Onboard salões/estética (só agendamento + WhatsApp; sem dado de saúde) | cliente é dono do dado |
| E.4 | Padronizar pro CRM completo quando houver recorrência | futuro |

Contexto EU: DB hoje em `sa-east-1` (São Paulo). UE = GDPR + residência de dados → modelo lean não leva o CRM completo no início. Disparo só com consentimento.

---

## Transversais
- **Sender único** (`send-message`) — antes de Disparo / migração Meta.
- **Módulo Disparo** — segmento por tag → campanha → envio. Só com opt-in + aprovação humana + sender pronto.
- **`audit_logs`** em toda escrita de IA — desde a Fase 1.

## Pendências humanas (não-código)
- DPA/contratos: clínicas BR (LGPD saúde) + clientes EU.
- LLM GDPR-compliant se/quando a UE usar IA pesada.

---

## products × procedures (decisão)
- `products` = catálogo único canônico (usado pelo código). Produto e serviço distinguidos por `type`; rótulo por vertical via `moduleProductConfig.ts`.
- `procedures` (+ `procedure_prices`, `treatment_plan_items`) = módulo clínico **dormente** (sessões, convênio, plano de tratamento).
- Regra: vendável/agendável → `products`. Procedimento clínico → `procedures` (quando o módulo clínico ativar).
- Fusão real (modelo de extensão: `products` base + `procedure_details` 1:1) só na Fase 3.

---

## Riscos mapeados (do pivô multi-vertical)
- **R1** n8n hardcoded em `responde-uai` (TENANT_ID, token, webhook) → Fase 2.2
- **R2** defaults `'responde-uai'` em ~60 tabelas → Fase 2.1
- **R3** isolamento RLS → Fase 0 (núcleo) + 2.3 (clínico)
- **R4** `if isClinic` espalhado na UI → Fase 2.4
- **R5** IA não-ciente do vertical no nível de tool → Fase 3.1
- **R6** chave tenant (`subdomain` vs `tenant_id`) → verificar na Fase 2
- **R7** drift de schema (colunas duplicadas em `leads`) → Fase 1.1 (auditoria)

---

## Backlog de correções (UX/produto)
- **Mavie envia "textão"** — respostas muito longas num único balão de WhatsApp. Pouco natural. Corrigir com: (a) prompt mais conciso e/ou (b) quebrar a resposta em mensagens menores antes de enviar. O workflow `ATTO - Mavie` já faz isso (Parser Chain → SPLIT → Loop com `DIGITANDO`/Wait); replicar no `ATTO - Mavie CRM`. Prioridade: média. _(reportado 2026-05-24)_

## Diário de bordo

> Atualizado por mim (Claude) ao fim das sessões + por job automático diário (~20:51) a partir do git.
> Mudanças de banco (migrations via MCP) não aparecem no git → registradas manualmente aqui.

### 2026-05-24
- **O que mudou (commit `3a38bb4`):** Fase 1.2 fechada.
  - G1 Relatórios: religado à página real `Reports`; removidos os dados mock (receita, crescimento %, MRR, CAC) — reais onde há fonte, zero honesto onde não há.
  - G3 Tarefas: criado `TaskDetailsSheet` (detalhe + checklist + status + excluir).
  - G2 Configurações: removidas abas "Em breve" (Equipe redundante c/ Usuários; Notificações sem motor).
  - G4 Fiscal: senha do certificado não é mais retornada ao navegador (write-only).
- **Por quê:** tornar a agência operacional e honesta (nada de "operacional falso"), conforme diretriz de vitrine.
- **Decisões registradas:**
  - **G4 camada 2** (criptografia at-rest da senha) → **gated**: fazer junto com a ativação da NFS-e (precisa do assinador + chave no Vault).
  - **Relatórios Salvos** (criar/rodar/duplicar/editar/agendar) → **feature dedicada futura**, não micro-fix. Hoje só favoritar/deletar funcionam.
  - `Integracoes.tsx` (/google-calendar) vs `Integrations.tsx` (/configuracoes/integracoes) → **não é drift**; páginas distintas, nomes confusos. Renome opcional, baixa prioridade.
- **Fase 1.3 — IA cadastra/atualiza lead (CONCLUÍDA):**
  - Nova edge function **`extract-lead`** (isolada; `mavie-chat` intocada) — lê a conversa, faz upsert do lead por `chat_id` (merge, nunca apaga com null), BANT **progressivo** (score recalculado), tags sugeridas pela IA, auditoria (`Mavie IA`). Deploy v1 + testada (criou lead real `a9eb990d`).
  - n8n: nó **`EXTRAIR_LEAD`** após `ENVIAR_WHATSAPP` (fire-and-forget). Workflow `ATTO - Mavie CRM` publicado (versão `4ccab499`).
  - **Pendência:** roda só no caminho `ai_mode=auto`; capturar lead no caminho operador é melhoria futura. Custo: +1 chamada LLM por rajada.
  - **Mudança de n8n NÃO está no git** (registro manual aqui).

### 2026-05-23
- **O que mudou:**
  - Fase 0 — blindagem multi-tenant (4 migrations aplicadas no banco):
    - Isolado `tags`, `sla_configs`, `task_templates` (policies "tenant_isolation" eram `true`).
    - Isolado `bank_accounts`, `revenue/expense/ticket_categories` (vazavam leitura).
    - Isolado `pipeline_stages` (+ `tenant_id`, backfill `responde-uai`).
    - Removido `produtos` (tabela legada PT) + função `buscar_produtos`.
  - Criado este `PLANEJAMENTO.md`.
  - Feita auditoria do vertical agência (punch list — ver Fase 1).
  - Agendado job diário de resumo (`resumo-diario-crm`).
- **Por quê:**
  - As policies/tabelas vazavam dados entre tenants — bloqueador de lançamento multi-tenant (e crítico antes de entrar dado de paciente das clínicas-modelo).
  - Padronizar a base limpa antes de replicar/escalar (e antes da trilha EU).
- **Áreas/arquivos:** banco (RLS/policies), `PLANEJAMENTO.md`, scheduled-tasks.
- **Achados da auditoria (Agência):** `Relatorios` (/relatorios) é stub; `Reports.tsx` pronto mas não roteado; abas "Em breve" em Configurações; Tarefas sem modal de detalhe; senha de certificado fiscal sem criptografia; páginas duplicadas (`Relatorios`/`Reports`, `Integracoes`/`Integrations`).
