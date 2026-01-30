# 🚀 ATUALIZAÇÃO DO APPS SCRIPT

## O que mudou?

Agora o site usa **Apps Script direto** ao invés do OpenSheet, tornando tudo **muito mais rápido**!

---

## ⚙️ VOCÊ PRECISA ATUALIZAR O APPS SCRIPT

### Passo 1: Abra o Apps Script

1. Vá em: https://docs.google.com/spreadsheets/d/1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ
2. Clique em: **Extensões > Apps Script**
3. Você vai ver o código atual

### Passo 2: Substitua TODO o código

1. **Selecione TUDO** (Ctrl+A)
2. **Delete tudo**
3. **Copie** o código do arquivo `google-apps-script.gs`
4. **Cole** no Apps Script
5. Clique em **Salvar** (ícone de disquete)

### Passo 3: Atualize a implantação

**IMPORTANTE:** Você precisa criar uma NOVA implantação, não editar a antiga!

1. Clique em **"Implantar"** (canto superior direito)
2. Clique em **"Nova implantação"**
3. Clique no ícone de **engrenagem** ⚙️
4. Selecione: **"Aplicativo da Web"**
5. Configure:
   - **Descrição:** "WIKI OBV - API v2"
   - **Executar como:** "Eu"
   - **Quem tem acesso:** "Qualquer pessoa"
6. Clique em **"Implantar"**
7. **COPIE a nova URL** que aparecer

### Passo 4: NÃO PRECISA FAZER NADA NO SITE!

A URL já está no código, mas se precisar, ela está em: `js/script.js` linha 4.

---

## ✅ Benefícios da atualização:

- ⚡ **3-5x mais rápido** para carregar
- ⚡ **Resposta instantânea** ao salvar
- 📊 **Loading indicators** visuais
- 🐛 **Menos erros** de conexão
- 📈 **Console mostra tempo** de cada operação

---

## 🧪 Como testar:

1. Após atualizar o Apps Script
2. Abra o site: https://pabloantoniodegraauw-commits.github.io/wiki-obv/
3. Pressione **Ctrl+Shift+R** (hard refresh)
4. Pressione **F12** e vá na aba **Console**
5. Veja o log: `📥 Pokémons carregados em XXXms`
6. Deve ser menos de 2 segundos!

---

## ❓ Problemas?

Se der erro, verifique:

1. ✅ Copiou TODO o código do `google-apps-script.gs`?
2. ✅ Criou "Nova implantação" (não "Nova versão")?
3. ✅ Configurou "Quem tem acesso" como "Qualquer pessoa"?
4. ✅ Salvou o script antes de implantar?

---

**Data da atualização:** 30/01/2026
**Versão:** 2.0 - Apps Script Direct
