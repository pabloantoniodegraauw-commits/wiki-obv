# 🔐 Sistema de Autenticação - Wiki OBV

## Guia Completo de Configuração

Este documento contém todas as instruções necessárias para configurar o sistema de autenticação com Google OAuth no Wiki-OBV.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Requisitos](#requisitos)
3. [Configuração do Google Cloud](#1-configuração-do-google-cloud)
4. [Configuração do Google Sheets](#2-configuração-do-google-sheets)
5. [Configuração do Apps Script](#3-configuração-do-apps-script)
6. [Configuração dos Arquivos](#4-configuração-dos-arquivos)
7. [Proteção das Páginas Existentes](#5-proteção-das-páginas-existentes)
8. [Testando o Sistema](#6-testando-o-sistema)
9. [Solução de Problemas](#solução-de-problemas)

---

## Visão Geral

O sistema implementado adiciona:

✅ Login via Google OAuth  
✅ Cadastro de novos membros  
✅ Aprovação manual por admin  
✅ Gerenciamento de cargos (membro/admin)  
✅ Header global em todas as páginas  
✅ Área administrativa  
✅ Logs de acesso e tempo online  
✅ Proteção de todas as páginas  

---

## Requisitos

- ✅ Conta Google
- ✅ Acesso ao Google Cloud Console
- ✅ Planilha do Google Sheets
- ✅ GitHub Pages (para hospedar o site)
- ✅ Imagens: `logo-obv.png` e `bg-login.jpg` na pasta `/assets`

---

## 1. Configuração do Google Cloud

### 1.1 Criar Projeto no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Clique em **"Criar Projeto"**
3. Nome do projeto: `Wiki-OBV`
4. Clique em **"Criar"**

### 1.2 Ativar Google Identity Services

1. No menu lateral, vá em **"APIs e Serviços"** > **"Biblioteca"**
2. Pesquise por **"Google Identity"**
3. Clique em **"Google Identity Services"**
4. Clique em **"Ativar"**

### 1.3 Criar Credenciais OAuth 2.0

1. Vá em **"APIs e Serviços"** > **"Credenciais"**
2. Clique em **"Criar Credenciais"** > **"ID do cliente OAuth"**
3. Tipo de aplicativo: **"Aplicativo da Web"**
4. Nome: `Wiki-OBV Login`
5. **Origens JavaScript autorizadas:**
   ```
   https://SEU_USUARIO.github.io
   http://localhost:5500 (para testes locais)
   ```
6. **URIs de redirecionamento autorizados:**
   ```
   https://SEU_USUARIO.github.io/WIKI-OBV/callback.html
   http://localhost:5500/callback.html (para testes locais)
   ```
7. Clique em **"Criar"**
8. **COPIE O CLIENT ID** que aparece (formato: `xxx.apps.googleusercontent.com`)

---

## 2. Configuração do Google Sheets

### 2.1 Estrutura das Abas

Sua planilha precisa ter 2 abas:

#### Aba: `usuarios`
```
email | nome | foto | nickname | level | tipoCla | tier | status | role | dataCadastro
```

#### Aba: `logs`
```
email | nickname | evento | dataHora
```

👉 Veja detalhes completos em: [INSTRUCOES-GOOGLE-SHEETS-AUTH.md](INSTRUCOES-GOOGLE-SHEETS-AUTH.md)

### 2.2 Criar Primeiro Admin

⚠️ **IMPORTANTE:** Adicione manualmente uma linha na aba `usuarios`:

```
seu-email@gmail.com | Seu Nome | https://... | SeuNick | 1 | TIME | 1 | aprovado | admin | 2026-02-02 10:00:00
```

---

## 3. Configuração do Apps Script

### 3.1 Implantar o Script

1. Abra sua planilha
2. Vá em **Extensões** > **Apps Script**
3. Delete o código padrão
4. Cole TODO o conteúdo do arquivo `google-apps-script.gs`
5. Clique em **"Implantar"** > **"Nova implantação"**
6. Tipo: **"Aplicativo da Web"**
7. Executar como: **"Eu"**
8. Quem tem acesso: **"Qualquer pessoa"**
9. Clique em **"Implantar"**
10. **COPIE A URL** que aparece (termina com `/exec`)

### 3.2 Autorizar Permissões

Na primeira execução, você precisará:
1. Clicar em **"Revisar permissões"**
2. Escolher sua conta Google
3. Clicar em **"Avançado"**
4. Clicar em **"Ir para Wiki-OBV (não seguro)"**
5. Clicar em **"Permitir"**

---

## 4. Configuração dos Arquivos

Agora você precisa atualizar 4 arquivos com suas credenciais:

### 4.1 Arquivo: `login.html`

Linha 20-21, substituir:
```html
data-client_id="SEU_CLIENT_ID_AQUI.apps.googleusercontent.com"
data-login_uri="https://SEU_USUARIO.github.io/WIKI-OBV/callback.html"
```

Por:
```html
data-client_id="1234567890-abc123.apps.googleusercontent.com"
data-login_uri="https://seu-usuario.github.io/WIKI-OBV/callback.html"
```

### 4.2 Arquivo: `callback.html`

Linha 18, substituir:
```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/SEU_SCRIPT_ID/exec';
```

Por:
```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/ABC123DEF456.../exec';
```

### 4.3 Arquivo: `cadastro.html`

Linha 41, substituir da mesma forma que `callback.html`.

### 4.4 Arquivo: `js/header.js`

Linha 63, substituir da mesma forma que `callback.html`.

### 4.5 Arquivo: `js/admin.js`

Linha 6, substituir da mesma forma que `callback.html`.

---

## 5. Proteção das Páginas Existentes

Para proteger todas as páginas em `/pages`, adicione no início do `<head>`:

```html
<!-- PROTEÇÃO DE LOGIN -->
<link rel="stylesheet" href="../css/global.css" />
<script src="../js/header.js"></script>
```

### Exemplo de arquivo protegido:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Pokédex - Wiki OBV</title>
  
  <!-- PROTEÇÃO DE LOGIN -->
  <link rel="stylesheet" href="../css/global.css" />
  <script src="../js/header.js"></script>
  
  <!-- Seus estilos existentes -->
  <link rel="stylesheet" href="../css/style.css" />
</head>
<body>
  <!-- O header será injetado automaticamente aqui -->
  
  <!-- Seu conteúdo existente -->
  ...
</body>
</html>
```

### Arquivos que precisam de proteção:

- ✅ `/pages/cla.html`
- ✅ `/pages/pokedex.html`
- ✅ `/pages/tasks.html`
- ✅ `/pages/tms.html`
- ✅ `/index.html` (página principal)

---

## 6. Testando o Sistema

### 6.1 Teste Local (Opcional)

Se quiser testar antes de fazer deploy:

1. Instale o Live Server no VS Code
2. Abra `index.html`
3. Clique com botão direito > **"Open with Live Server"**
4. Teste o fluxo completo

### 6.2 Teste no GitHub Pages

1. Faça commit e push dos arquivos
2. Acesse seu site: `https://seu-usuario.github.io/WIKI-OBV`
3. Você deve ser redirecionado para `/login.html`

### 6.3 Fluxo de Teste Completo

#### Teste 1: Novo Usuário

1. Acesse o site
2. Clique em **"Entrar com Google"**
3. Selecione sua conta
4. Deve ir para página de **cadastro**
5. Preencha os dados e envie
6. Deve ir para página **aguardando aprovação**

#### Teste 2: Aprovação de Usuário

1. Entre com a conta admin (configurada no passo 2.2)
2. Acesse `/admin/admin.html`
3. Você deve ver o usuário pendente
4. Clique em **"Aprovar"**
5. Status deve mudar para **aprovado**

#### Teste 3: Usuário Aprovado

1. Faça logout
2. Entre novamente com o usuário aprovado
3. Deve ser redirecionado para a página principal
4. O header deve aparecer com foto e nickname

#### Teste 4: Logs

1. Entre no admin
2. Clique na aba **"Logs"**
3. Deve mostrar os logs de login
4. Aguarde 5 minutos e veja o ping automático

---

## Solução de Problemas

### ❌ Erro: "Token não encontrado"

**Causa:** Configuração incorreta do Google OAuth  
**Solução:**
1. Verifique o CLIENT_ID em `login.html`
2. Confirme as URLs autorizadas no Google Cloud
3. Limpe o cache do navegador

### ❌ Erro: "Erro ao conectar com o servidor"

**Causa:** URL do Apps Script incorreta  
**Solução:**
1. Verifique a URL em todos os arquivos (callback, cadastro, header, admin)
2. Confirme que o Apps Script está implantado
3. Teste a URL diretamente no navegador

### ❌ Botão do Google não aparece

**Causa:** CLIENT_ID não configurado  
**Solução:**
1. Abra o console do navegador (F12)
2. Veja os erros
3. Corrija o CLIENT_ID em `login.html`

### ❌ Usuário fica em loop no login

**Causa:** Dados temporários corrompidos  
**Solução:**
1. Abra o console (F12)
2. Execute: `localStorage.clear()` e `sessionStorage.clear()`
3. Atualize a página

### ❌ Admin não consegue acessar /admin

**Causa:** Role incorreto no banco  
**Solução:**
1. Abra a planilha `usuarios`
2. Confirme que o campo `role` está como `admin` (minúsculo)
3. Faça logout e login novamente

---

## 📁 Arquivos Criados

Novos arquivos adicionados ao projeto:

```
/
├── login.html              ✅ Página de login
├── callback.html           ✅ Processamento do OAuth
├── cadastro.html           ✅ Formulário de cadastro
├── aguardando.html         ✅ Tela de aguardando aprovação
├── /css/
│   ├── login.css           ✅ Estilos das páginas de auth
│   └── global.css          ✅ Estilos globais + header
├── /js/
│   ├── header.js           ✅ Injeção automática do header
│   └── admin.js            ✅ Lógica da área admin
├── /admin/
│   └── admin.html          ✅ Área administrativa
├── /assets/
│   ├── logo-obv.png        ⚠️ VOCÊ PRECISA ADICIONAR
│   └── bg-login.jpg        ⚠️ VOCÊ PRECISA ADICIONAR
└── google-apps-script.gs   ✅ Atualizado com novas funções
```

---

## ✅ Checklist Final

Antes de considerar concluído, verifique:

- [ ] Google Cloud configurado com CLIENT_ID
- [ ] Abas `usuarios` e `logs` criadas no Sheets
- [ ] Primeiro admin cadastrado manualmente
- [ ] Apps Script implantado e URL copiada
- [ ] CLIENT_ID configurado em `login.html`
- [ ] APPS_SCRIPT_URL configurado em 4 arquivos
- [ ] Imagens `logo-obv.png` e `bg-login.jpg` adicionadas
- [ ] Páginas em `/pages` protegidas com header.js
- [ ] Sistema testado localmente ou no GitHub Pages
- [ ] Login funcional
- [ ] Cadastro funcional
- [ ] Aprovação funcional
- [ ] Logs sendo registrados

---

## 🎉 Conclusão

Parabéns! Seu sistema de autenticação está completo e funcional.

**Próximos passos sugeridos:**
- Personalizar as imagens em `/assets`
- Ajustar cores/design conforme necessário
- Adicionar mais funcionalidades ao admin
- Configurar notificações de novos cadastros

---

**Última atualização:** 02 de fevereiro de 2026  
**Versão:** 1.0.0
