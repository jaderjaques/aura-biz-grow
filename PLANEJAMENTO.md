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

## Onde estamos (RETOMAR POR AQUI) — 2026-05-24
- **Fases 0 (fundação/RLS), 1 (Agência 100%) e 2 (portão multi-tenant): TODAS concluídas.** Detalhes no Diário de bordo (fim do arquivo).
- **No ar:** edge functions `mavie-chat` v9, `extract-lead`, `bant-daily-summary`; workflow n8n `ATTO - Mavie CRM` (ID `LXSbJkuL4PDyUZ1E`) publicado — resolve tenant pelo dispositivo, ignora grupo/`from_me`, converte LID, buffer 15s, responde (Mavie), envia, captura/atualiza lead (BANT) e tem resumo diário (cron 11:03 UTC).
- **Dados de teste do `responde-uai` zerados** (chats/mensagens/leads/resumos) para teste do zero. Config/produtos/usuários mantidos.
- **PRÓXIMO:** testar o fluxo do zero no WhatsApp → depois **Fase 3 (Módulo Clínica + clínicas-modelo como cockpit)**.
- **Backlog ativo (ver seções abaixo):** tags inflando na `extract-lead`; "textão" da Mavie; filtrar `status@broadcast` no n8n; resiliência Gemini 503; inbox em tempo real; **drift `mavie-chat` repo (tools on) × deployado (v9 simples)**.

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

## ADRs (decisões de arquitetura)

### ADR-001 — Configuração de vertical: incremental, não plataforma (2026-05-24)
- **Contexto:** sistema multi-vertical (agência, clínicas) com forks por módulo espalhados (`isClinic ? ...`). Opções: (a) plataforma de config "pra tudo" (estilo metadata da Salesforce) vs (b) consolidação incremental.
- **Decisão:** **incremental.** Criado `src/config/moduleConfig.ts` como **seam canônico do vertical**, começando pela terminologia (Cliente/Paciente, rota). Telas genuinamente diferentes (`ClinicDashboard`×`AgencyDashboard`, `ClinicAgenda`×`Agenda`) seguem **explícitas via routers**. Catálogo em `moduleProductConfig.ts`.
- **Por quê:** estágio "provar o modelo" (2 verticais + UE lean). Abstração prematura custa mais que duplicação (Sandi Metz / AHA). Salesforce/Shopify construíram a plataforma de metadado **incrementalmente**, não em big-bang. Investir na plataforma só com estratégia + recursos pra muitos verticais.
- **Gatilho de promoção:** reavaliar migrar mais traços (menus, etapas de funil) pro registro — ou construir uma plataforma de config — **quando: (1) entrar o 3º vertical, OU (2) a UE virar produto recorrente.** Decisão por evidência, não aposta.
- **Regra:** `moduleConfig` é só **dado declarativo** (não vira 2ª linguagem). Comportamento fica no código. Crescer pela Regra de Três.
- **Feito (v1):** `moduleConfig.ts` + `useModuleConfig()`; refatorados `FinancialDashboard`, `GoalsTab`, `FinancialAlerts` (terminologia).

## Backlog de correções (UX/produto)
- **Mavie envia "textão"** — respostas muito longas num único balão de WhatsApp. Pouco natural. Corrigir com: (a) prompt mais conciso e/ou (b) quebrar a resposta em mensagens menores antes de enviar. O workflow `ATTO - Mavie` já faz isso (Parser Chain → SPLIT → Loop com `DIGITANDO`/Wait); replicar no `ATTO - Mavie CRM`. Prioridade: média. _(reportado 2026-05-24)_

## Diário de bordo

> Atualizado por mim (Claude) ao fim das sessões + por job automático diário (~20:51) a partir do git.
> Mudanças de banco (migrations via MCP) não aparecem no git → registradas manualmente aqui.

### 2026-09-01
- **O que mudou:** Sem atividade de dev entre 24/05 e hoje (job automático de diário também parou de rodar nesse período). Retomado com uma sessão grande:
  - **Pivô de produto — "CRM puro":** ocultados do menu Financeiro, Mavie IA, Inbox e Integrações (código/rotas mantidos, só saíram da navegação). Sidebar "Produtos" virou "Serviços"; categorias fixas de serviço (Marketing Digital/Automação/Consultorias/Add-ons) viraram campo livre por tenant, com sugestão do que já foi cadastrado.
  - **Leads:** novo seletor Pessoa Jurídica/Pessoa Física (troca CNPJ↔Nome Completo) + campo "Origem do cliente" (Tráfego Pago/Orgânico/Prospecção Ativa/Indicação/Outro), gravado em `how_found_us` (coluna já existia, sem uso). Migration `person_type` em `leads` (default `pj`).
  - **Dashboard:** removidos MRR, "Resumo da Mavie IA" e "Receita Mensal" (financeiro/IA fora da fase atual); removido "Tickets abertos" (página órfã, sem entrada no menu). "Leads por Origem" agora usa `how_found_us` em vez do `source` técnico.
  - **Primeiro tenant de teste criado:** `ulisses-teste` (agency, isolado), usuário `ulisseslopes1993@gmail.com` — acesso manual via SQL direto (signup + `accept_invite`), não pelo fluxo padrão de convite por e-mail.
  - **🔴 Achado e corrigido em produção (crítico):** 12 views (`patient_summary`, `customer_360_view`, `financial_summary_view`, `whatsapp_devices_safe` etc.) eram `SECURITY DEFINER` com grant de leitura pro papel `anon` — qualquer pessoa sem login lia dado de todos os tenants (CPF de paciente real da Oddom incluso). Corrigido com `security_invoker=on` + revoke de `anon`; testado e confirmado fechado. Também travadas 2 funções de limpeza (`cleanup_old_messages_balanced`, `cleanup_chat_webhook_logs`) que `anon` podia disparar pra apagar dado de todos os tenants.
  - **Pendência de segurança, não urgente:** 51 funções RPC ainda chamáveis por `anon`/`authenticated` (maioria inofensiva, tenant-scoped) e 66 funções sem `search_path` fixo — merece varredura dedicada depois, não bloqueia lançamento.
- **Por quê:** primeiro cliente possível se aproximando; simplificar o produto pro essencial de CRM e fechar o buraco de segurança antes de qualquer onboarding real.
- **Áreas/arquivos:** `AppSidebar.tsx`, `moduleProductConfig.ts`, `NewProductDialog.tsx`, `ProductSelectorDialog.tsx`, `Products.tsx`, `NewLeadDialog.tsx`, `Dashboard.tsx`, `AppHeader.tsx`, `useProducts.ts`; banco (migration `person_type`, views/funções de segurança — não estão no git).

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
- **Fase 1.4 — IA interna: resumo BANT diário (CONCLUÍDA):**
  - Tabela `ai_daily_summaries` (RLS: leitura por tenant, escrita service_role). _(migration — não está no git)_
  - Edge function **`bant-daily-summary`**: lê leads, calcula funil (por etapa, qualificados, quente/morno/frio, parados >7d), IA gera resumo + ações, grava por tenant/dia. Deploy v1 + testada (resumo real gerado).
  - **pg_cron** `bant-daily-summary` diário às **11:03 UTC (08:03 BRT)** chamando a função. _(migration — não está no git)_
  - Card **"Resumo da Mavie IA"** no Dashboard da agência (`Dashboard.tsx`).
  - Decisão: aprovado A+A (card + pg_cron). WhatsApp pro gestor = incremento futuro.
- **Fase 2 — portão multi-tenant (início):**
  - **2.3 RLS clínico → VERIFICADO (sem migration):** `odontogram`, `procedure_prices`, `treatment_plan_items` já estavam isolados por subquery na tabela-pai (patients/procedures/treatment_plans + `get_my_tenant_id()`). Dado de paciente protegido.
  - **`role_permissions` isolado:** `rp_select`/`rp_write` escopados pela tabela `roles` (leitura inclui cargos globais `tenant_id IS NULL`; escrita só do próprio tenant + `is_tenant_admin()`). _(migration — não está no git)_
  - **2.1 (default `responde-uai`, 60 colunas) → ADIADO e ACOPLADO ao 2.2.** Trocar o default agora quebraria o `SALVAR_MENSAGEM` do n8n (insere em `chat_messages` sem `tenant_id`, depende do default). Será feito junto de tornar o n8n tenant-agnóstico (setar `tenant_id` explícito). É o próximo passo do portão multi-tenant.
  - **2.2 n8n tenant-agnóstico → FEITO** (versão ativa `3b586302`): nós `RESOLVE_DEVICE` (lookup em `whatsapp_devices` por `api_token = body.token` do webhook) + `TENANT` (tenant_id/api_token resolvidos, fallback `responde-uai`). `CRIAR_CHAT`/`SALVAR_MENSAGEM` setam `tenant_id`; `Converte_LID`/`ENVIAR_WHATSAPP` usam o token do tenant. _(n8n não está no git)_
  - **2.1 ainda pendente:** falta confirmar que TODO insert `service_role` nas 60 tabelas seta `tenant_id` (ex.: o insert da resposta do assistente em `chat_messages` feito pela `mavie-chat`) antes de virar os defaults. Verificar antes de aplicar.
  - **Backlog:** o webhook traz `SenderAlt` (número real, ex. `553194770836@s.whatsapp.net`) mesmo em `@lid` → poderia substituir a chamada `Converte_LID`. Otimização futura.
  - **Filtro `from_me` → FEITO** (versão ativa `6b535aaf`): `GRUPO1` agora ignora `is_group` **OU** `from_me`. Sem isso, mensagens enviadas pela IA/negócio viravam chat-fantasma + resposta-a-si-mesmo. Descoberto pela execução 755 (processava o nº do negócio `553196402610`).
  - **Limpeza:** removidos 2 chats-fantasma do "Jader" (nº do negócio `553196402610` e LID `154734887473310`); mantido o real `b33019fa` (553194770836, 61 msgs).
  - **Backlog (n8n):** filtrar também `status@broadcast` (status do WhatsApp viram chat). Resiliência no Gemini 503 (retry). Inbox em tempo real (salvar antes do buffer de 15s). Limpar fantasmas antigos restantes (Renan/Santiago/Cliente com número `@lid`, chat `status@broadcast`).
  - **Fase 2.1 → FEITO (portão multi-tenant COMPLETO):**
    - `mavie-chat` v9: passou a gravar `tenant_id` na **coluna** de `chat_messages` (antes só no `metadata`, dependia do default).
    - Virados os **60 defaults** `tenant_id` de `'responde-uai'` → `get_my_tenant_id()` (loop). Confirmado: 0 com `'responde-uai'`, 69 com `get_my_tenant_id()`. _(migration — não está no git)_
    - Efeito: autenticado que esquecer tenant_id pega o próprio tenant; `service_role` que esquecer **estoura alto** (não vaza). Pipeline ativo todo (n8n + edge functions) seta explícito.
    - **Fase 2 fechada:** 2.1 ✅ · 2.2 ✅ · 2.3 ✅ · 2.4 ✅ · role_permissions ✅. Sistema pronto, em isolamento, pra entrar o 2º tenant (clínicas-modelo).
    - **⚠️ RISCO/DRIFT descoberto:** o `supabase/functions/mavie-chat/index.ts` do **repo** é uma versão DIFERENTE da **deployada**. Repo = tools ATIVAS (insere em `leads/appointments/tasks/escalation_logs`); deployado (v9) = simples (tools off). **Não fazer `supabase functions deploy mavie-chat` do repo sem reconciliar** — mudaria o comportamento do cérebro compartilhado E os inserts da versão do repo precisam setar `tenant_id` (agora obrigatório). Reconciliar deliberadamente: decidir a fonte de verdade + garantir `tenant_id` nos inserts.

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
