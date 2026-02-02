# 🔄 Atualização do Google Apps Script

## ⚠️ AÇÃO NECESSÁRIA

O arquivo `google-apps-script.gs` foi atualizado com nova funcionalidade. Você precisa atualizar o código no Google Apps Script.

## 📋 Passos para Atualizar:

1. **Abra o Google Apps Script:**
   - Acesse: https://docs.google.com/spreadsheets/d/1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ
   - Clique em: **Extensões** → **Apps Script**

2. **Substitua o código:**
   - Copie TODO o conteúdo do arquivo `google-apps-script.gs` desta pasta
   - Cole no editor do Google Apps Script (sobrescrevendo o código antigo)
   - Clique em **Salvar** (ícone de disquete)

3. **Reimplante (se necessário):**
   - Se houver erro, clique em: **Implantar** → **Gerenciar implantações**
   - Clique no ícone de ✏️ (Editar) na implantação ativa
   - Altere a versão para "Nova versão"
   - Clique em **Implantar**

## ✨ O que foi adicionado:

### 1. Função `handleDeleteUser` (nova)
- Permite remover permanentemente um usuário da planilha
- Validação de permissão admin
- Impede que admin delete a si mesmo

### 2. Nova rota no `doPost`:
```javascript
case 'deleteUser':
  return handleDeleteUser(planilha, dados);
```

## 🎯 Funcionalidades Implementadas no Site:

### Painel Admin:
- ✅ **Botão "← Voltar"** - Retorna para página principal (index.html)
- ✅ **Botão "🗑️ Remover"** - Remove membro permanentemente da planilha
  - Aparece para todos os usuários (exceto o próprio admin logado)
  - Confirmação dupla antes de deletar
  - Validação de permissão no backend

## 🔒 Segurança:

- Backend valida token de autenticação
- Admin não pode deletar a si mesmo
- Apenas admins podem deletar outros usuários
- Ação é permanente e irreversível

---

**Após atualizar o Apps Script, aguarde 1-2 minutos e teste no site!**
