# Plano de Correção: Fluxo Router (14ku1Qsi10lc9EtS)

## Resumo
O fluxo Router está **parcialmente configurado** para multi-tenant, mas possui **problemas críticos** no salvamento de dados que impedem o funcionamento correto do sistema de análise IA.

---

## Problemas Identificados

### 1. ❌ CRÍTICO: Node `historico_mensagens` não salva campos obrigatórios

**Localização**: Node ID `d4ed7854-555c-46fb-93e0-47be97262b1a`

**Problema**: Está salvando apenas 5 campos, faltando campos obrigatórios para multi-tenant e análise IA.

**Campos Atuais (INCOMPLETO)**:
```json
{
  "was_transcribed": false,
  "tokens_usados": 0,
  "telefone": "={{ $('Consolidar Dados').item.json.user_phone }}",
  "sender": "={{ $('Consolidar Dados').item.json.user_name }}",
  "user_message": "={{ $('Consolidar Dados').item.json.message_text }}"
}
```

**Campos FALTANDO**:
- `user_id` ⚠️ **OBRIGATÓRIO** para RLS e multi-tenant
- `paciente_id` ⚠️ **OBRIGATÓRIO** para agrupamento na view
- `instance_id` - Identificação da instância WhatsApp
- `direcao` - 'entrada' ou 'saida'
- `message_type` - 'text', 'audio', 'image', etc.
- `content` - Conteúdo unificado da mensagem

---

### 2. ❌ CRÍTICO: Não salva respostas do bot

**Problema**: O workflow termina após chamar "Chamar Brain1" sem salvar a resposta do bot no histórico.

**Fluxo Atual**:
```
[Chamar Brain1] → (FIM)
```

**Fluxo Correto**:
```
[Chamar Brain1] → [Salvar Resposta Bot] → (FIM)
```

---

### 3. ⚠️ Falta `paciente_id` na entrada

**Problema**: O node `historico_mensagens` não consegue referenciar o `paciente_id` porque não está disponível em `Consolidar Dados`.

**Solução**: Adicionar query para buscar/criar `paciente_id` antes do INSERT.

---

## Correções Necessárias

### Correção 1: Atualizar node `historico_mensagens`

**Nova configuração de campos**:
```json
{
  "user_id": "={{ $('Buscar Tenant').item.json.tenant_user_id }}",
  "paciente_id": "={{ $('DB: Upsert Paciente').item.json.id || $('DB: Upsert Paciente').first().json.id }}",
  "instance_id": "={{ $('Consolidar Dados').item.json.instance_name }}",
  "telefone": "={{ $('Consolidar Dados').item.json.user_phone }}",
  "sender": "user",
  "content": "={{ $('Consolidar Dados').item.json.message_text }}",
  "user_message": "={{ $('Consolidar Dados').item.json.message_text }}",
  "direcao": "entrada",
  "message_type": "={{ $('Consolidar Dados').item.json.message_type }}",
  "was_transcribed": "={{ $('Consolidar Dados').item.json.was_transcribed || false }}",
  "tokens_usados": 0,
  "status": "received"
}
```

---

### Correção 2: Modificar `DB: Upsert Paciente` para retornar o ID

**Query Atual**:
```sql
INSERT INTO pacientes (user_id, telefone, nome, last_message, last_message_at, unread_count)
VALUES (...)
ON CONFLICT (telefone, user_id)
DO UPDATE SET ...
```

**Query CORRIGIDA** (com RETURNING):
```sql
INSERT INTO pacientes (user_id, telefone, nome, last_message, last_message_at, unread_count)
VALUES (
  '{{ $('Buscar Tenant').item.json.tenant_user_id }}',
  '{{ $('Extrair Dados').item.json.user_phone }}',
  '{{ $('Extrair Dados').item.json.user_name }}',
  '{{ $('Extrair Dados').item.json.message_text }}',
  NOW(),
  1
)
ON CONFLICT (telefone, user_id)
DO UPDATE SET
  last_message = EXCLUDED.last_message,
  last_message_at = EXCLUDED.last_message_at,
  unread_count = pacientes.unread_count + 1,
  nome = COALESCE(EXCLUDED.nome, pacientes.nome)
RETURNING id, telefone, nome, user_id;
```

**Importante**: O `RETURNING` permite que o próximo node acesse o `paciente_id` via `$json.id`.

---

### Correção 3: Adicionar node para salvar resposta do bot

**Novo Node**: `DB: Salvar Resposta Bot`
**Tipo**: Postgres Insert
**Posição**: Após `Chamar Brain1`

**Configuração**:
```json
{
  "schema": "public",
  "table": "historico_mensagens",
  "columns": {
    "user_id": "={{ $('Buscar Tenant').item.json.tenant_user_id }}",
    "paciente_id": "={{ $('DB: Upsert Paciente').item.json.id }}",
    "instance_id": "={{ $('Consolidar Dados').item.json.instance_name }}",
    "telefone": "={{ $('Consolidar Dados').item.json.user_phone }}",
    "sender": "agent",
    "content": "={{ $json.output || $json.response || $json.message }}",
    "bot_message": "={{ $json.output || $json.response || $json.message }}",
    "direcao": "saida",
    "message_type": "text",
    "tokens_usados": "={{ $json.tokens_used || 0 }}",
    "modelo_usado": "={{ $json.model_used || 'gemini-1.0' }}",
    "tools_chamadas": "={{ JSON.stringify($json.tools_used || []) }}",
    "status": "sent"
  }
}
```

---

### Correção 4: Consolidar Dados - Adicionar paciente_id

**Node ID**: `a289c8c4-f475-4eaf-91a8-2af2b6e6c1c8`

**Código Atual** (truncado):
```javascript
return {
  ...currentData,
  ...extractData,
  tenant_user_id: tenantData.tenant_user_id,
  tenant_config: { ... }
};
```

**Código CORRIGIDO** (adicionar após DB: Upsert Paciente):
```javascript
const currentData = $input.item.json;
const tenantData = $('Buscar Tenant').item.json;
const extractData = $('Extrair Dados').item.json;
const pacienteData = $('DB: Upsert Paciente').item.json;

return {
  ...currentData,
  ...extractData,

  // Multi-tenant
  tenant_user_id: tenantData.tenant_user_id,

  // Paciente ID (NOVO)
  paciente_id: pacienteData.id,

  // Configuration
  tenant_config: {
    nome_clinica: tenantData.nome_clinica,
    feegow_token: tenantData.feegow_token,
    feegow_unidade: tenantData.feegow_unidade_padrao,
    google_store_id: tenantData.google_store_id,
    bot_nome: tenantData.bot_nome,
    bot_personalidade: tenantData.bot_personalidade,
    horario_funcionamento: tenantData.horario_funcionamento,
    debounce_segundos: tenantData.debounce_segundos
  }
};
```

---

## Estrutura do Workflow Corrigida

### Fluxo Atual (INCORRETO):
```
[Webhook]
  → [Extrair Dados]
  → [Buscar Tenant]
  → [Filter]
  → [É Msg Minha?]
  → [Redis: Check Bloqueio]
  → [Bot Liberado?]
  → [É Áudio?]
  → [Feegow]
  → [Consolidar Dados]
  → [DB: Upsert Paciente]
  → [historico_mensagens] ❌ (INCOMPLETO)
  → [Redis: Buffer Add]
  → [Debounce]
  → [Redis: Get Buffer]
  → [Preparar Payload]
  → [Chamar Brain]
  → (FIM) ❌ (NÃO SALVA RESPOSTA)
```

### Fluxo Correto (FIXO):
```
[Webhook]
  → [Extrair Dados]
  → [Buscar Tenant]
  → [Filter]
  → [É Msg Minha?]
  → [Redis: Check Bloqueio]
  → [Bot Liberado?]
  → [É Áudio?]
  → [Feegow]
  → [DB: Upsert Paciente] ✅ (com RETURNING)
  → [Consolidar Dados] ✅ (com paciente_id)
  → [historico_mensagens] ✅ (COMPLETO)
  → [Redis: Buffer Add]
  → [Debounce]
  → [Redis: Get Buffer]
  → [Preparar Payload]
  → [Chamar Brain]
  → [DB: Salvar Resposta Bot] ✅ (NOVO)
  → (FIM)
```

---

## Checklist de Implementação

### Fase 1: Preparação ✅
- [x] Analisar workflow atual
- [x] Identificar problemas
- [x] Documentar correções

### Fase 2: Correções Críticas (PENDENTE)
- [ ] Modificar `DB: Upsert Paciente` para incluir `RETURNING id, telefone, nome, user_id`
- [ ] Atualizar node `Consolidar Dados` para incluir `paciente_id`
- [ ] Atualizar node `historico_mensagens` com todos os campos obrigatórios
- [ ] Adicionar novo node `DB: Salvar Resposta Bot` após `Chamar Brain1`
- [ ] Reconectar os nodes na ordem correta

### Fase 3: Testes (PENDENTE)
- [ ] Testar envio de mensagem de entrada
- [ ] Verificar se `user_id` está sendo salvo corretamente
- [ ] Verificar se `paciente_id` está sendo preenchido
- [ ] Verificar se resposta do bot é salva
- [ ] Validar dados na tabela `historico_mensagens`
- [ ] Verificar se workflow de análise IA consegue ler os dados

---

## Impacto das Correções

### Antes (ATUAL):
- ❌ Mensagens de entrada sem `user_id` → **Bloqueadas por RLS**
- ❌ Mensagens de entrada sem `paciente_id` → **Não agrupam na view**
- ❌ Respostas do bot **não são salvas**
- ❌ Workflow de análise IA **não funciona**

### Depois (CORRIGIDO):
- ✅ Mensagens de entrada com `user_id` → **RLS OK**
- ✅ Mensagens de entrada com `paciente_id` → **Agrupamento OK**
- ✅ Respostas do bot salvas → **Histórico completo**
- ✅ Workflow de análise IA **funcionará corretamente**

---

## Recursos

| Recurso | ID/Valor |
|---------|----------|
| Router Workflow | 14ku1Qsi10lc9EtS |
| Supabase Project | llpadqbwhidvubyfxgig |
| Postgres Credential | pEnjq0sr2NA9chEq |
| Workflow de Análise | 2ZQTxBCaaFNMpTb3 |

---

## Notas Técnicas

### RLS (Row Level Security)
A tabela `historico_mensagens` deve ter políticas RLS ativas que requerem o `user_id`:
```sql
CREATE POLICY "Users can view their own messages"
ON historico_mensagens FOR SELECT
USING (auth.uid() = user_id);
```

Sem o `user_id`, os INSERTs **falharão** devido à política RLS.

### View `vw_conversas_para_analise`
A view agrupa mensagens por `paciente_id`:
```sql
SELECT
  paciente_id,
  COUNT(*) as total_mensagens,
  ...
FROM historico_mensagens
WHERE user_id = auth.uid()
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY paciente_id
HAVING COUNT(*) > 2;
```

Sem o `paciente_id`, **não há agrupamento possível**.

### Workflow de Análise IA
O workflow precisa de:
1. `user_id` - Para filtrar mensagens do tenant
2. `paciente_id` - Para agrupar conversas
3. `user_message` E `bot_message` - Para análise de qualidade
4. `direcao` - Para distinguir entrada/saída

**Todos esses campos são CRÍTICOS** e devem estar preenchidos.
