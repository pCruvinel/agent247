# Instruções para Atualização Manual do Workflow Router

## ⚠️ IMPORTANTE: O n8n MCP não está permitindo updates via API

Por favor, faça as seguintes alterações **manualmente** no n8n UI:

---

## 📝 Alteração 1: Node "DB: Upsert Paciente"

**ID do Node**: `b2860c4a-3820-4dd9-9070-b24bad547a10`

### Query SQL Atual (INCORRETA):
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
  nome = COALESCE(EXCLUDED.nome, pacientes.nome);
```

### Query SQL Corrigida (COPIAR E COLAR):
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

**🔑 Mudança**: Adicionada linha `RETURNING id, telefone, nome, user_id;` no final

---

## 📝 Alteração 2: Node "Consolidar Dados"

**ID do Node**: `a289c8c4-f475-4eaf-91a8-2af2b6e6c1c8`

### Código Atual (INCOMPLETO):
```javascript
const currentData = $input.item.json;
const tenantData = $('Buscar Tenant').item.json;
const extractData = $('Extrair Dados').item.json;
return {
  ...currentData,
  ...extractData,

  tenant_user_id: tenantData.tenant_user_id,

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

### Código Corrigido (COPIAR E COLAR):
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

**🔑 Mudanças**:
1. Adicionada linha `const pacienteData = $('DB: Upsert Paciente').item.json;`
2. Adicionada linha `paciente_id: pacienteData.id,` no objeto de retorno

---

## 📝 Alteração 3: Node "historico_mensagens"

**ID do Node**: `d4ed7854-555c-46fb-93e0-47be97262b1a`

### ⚠️ IMPORTANTE: Este node precisa ter os seguintes campos configurados

No n8n UI, edite o node **"historico_mensagens"** (Postgres Insert) e configure os campos:

| Campo | Valor |
|-------|-------|
| `user_id` | `={{ $('Buscar Tenant').item.json.tenant_user_id }}` |
| `paciente_id` | `={{ $('Consolidar Dados').item.json.paciente_id }}` |
| `instance_id` | `={{ $('Consolidar Dados').item.json.instance_name }}` |
| `telefone` | `={{ $('Consolidar Dados').item.json.user_phone }}` |
| `sender` | `user` (texto fixo, sem expressão) |
| `content` | `={{ $('Consolidar Dados').item.json.message_text }}` |
| `user_message` | `={{ $('Consolidar Dados').item.json.message_text }}` |
| `direcao` | `entrada` (texto fixo, sem expressão) |
| `message_type` | `={{ $('Consolidar Dados').item.json.message_type }}` |
| `was_transcribed` | `={{ $('Consolidar Dados').item.json.was_transcribed || false }}` |
| `tokens_usados` | `0` (número fixo) |
| `status` | `received` (texto fixo, sem expressão) |

### Campos que devem ser REMOVIDOS (se existirem):
- Remova qualquer campo que não esteja na lista acima

---

## 📝 Alteração 4: Novo Node "DB: Salvar Resposta Bot"

### Criar novo Postgres Insert node após "Chamar Brain1"

**Configurações do Node**:
- **Nome**: `DB: Salvar Resposta Bot`
- **Tipo**: Postgres Insert
- **Schema**: `public`
- **Table**: `historico_mensagens`
- **Credential**: Agostinho (mesmo dos outros nodes)

**Campos a configurar**:

| Campo | Valor |
|-------|-------|
| `user_id` | `={{ $('Buscar Tenant').item.json.tenant_user_id }}` |
| `paciente_id` | `={{ $('DB: Upsert Paciente').item.json.id }}` |
| `instance_id` | `={{ $('Consolidar Dados').item.json.instance_name }}` |
| `telefone` | `={{ $('Consolidar Dados').item.json.user_phone }}` |
| `sender` | `agent` (texto fixo) |
| `content` | `={{ $json.output || $json.response || $json.message }}` |
| `bot_message` | `={{ $json.output || $json.response || $json.message }}` |
| `direcao` | `saida` (texto fixo) |
| `message_type` | `text` (texto fixo) |
| `tokens_usados` | `={{ $json.tokens_used || 0 }}` |
| `modelo_usado` | `={{ $json.model_used || 'gemini-1.0' }}` |
| `tools_chamadas` | `={{ JSON.stringify($json.tools_used || []) }}` |
| `status` | `sent` (texto fixo) |

**Conexão**:
- Conectar "Chamar Brain1" → "DB: Salvar Resposta Bot"

---

## ✅ Checklist de Verificação

Após fazer as alterações:

1. [ ] Node "DB: Upsert Paciente" tem `RETURNING id, telefone, nome, user_id;`
2. [ ] Node "Consolidar Dados" referencia `pacienteData` e inclui `paciente_id`
3. [ ] Node "historico_mensagens" tem TODOS os campos listados acima
4. [ ] Novo node "DB: Salvar Resposta Bot" foi criado e conectado
5. [ ] Workflow foi salvo
6. [ ] Teste enviando uma mensagem real para verificar

---

## 🧪 Como Testar

1. Envie uma mensagem de teste via WhatsApp
2. Verifique no Supabase se o registro em `historico_mensagens` contém:
   - `user_id` preenchido
   - `paciente_id` preenchido
   - `direcao` = 'entrada'
   - `sender` = 'user'
3. Verifique se a resposta do bot também foi salva com:
   - `direcao` = 'saida'
   - `sender` = 'agent'
   - `bot_message` preenchido

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. Todas as expressões começam com `={{` e terminam com `}}`
2. Valores fixos (como "user", "entrada") NÃO têm `={{  }}`
3. As conexões entre nodes estão corretas
4. O credential "Agostinho" está configurado em todos os nodes Postgres
