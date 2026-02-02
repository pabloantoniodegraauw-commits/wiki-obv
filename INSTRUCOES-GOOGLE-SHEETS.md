# 📋 COMO CONFIGURAR O SALVAMENTO NO GOOGLE SHEETS

## 🎯 O QUE FOI IMPLEMENTADO

Agora o sistema pode salvar edições **diretamente na planilha do Google Sheets**!

Quando você editar um Pokémon no site, as alterações serão enviadas automaticamente para sua planilha.

---

## 🔧 PASSO A PASSO COMPLETO

### **ETAPA 1: Implantar o Google Apps Script**

1. **Abra sua planilha do Google Sheets:**
   - Link: https://docs.google.com/spreadsheets/d/1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ

2. **Acesse o Editor de Scripts:**
   - No menu da planilha, clique em: **Extensões** > **Apps Script**
   - Uma nova aba vai abrir com o editor de código

3. **Cole o código:**
   - Abra o arquivo: `google-apps-script.gs` (na raiz do projeto)
   - **COPIE TODO O CÓDIGO** desse arquivo
   - **COLE** no editor do Apps Script (substitua qualquer código existente)

4. **Salve o projeto:**
   - Clique no ícone de **disquete** 💾 ou pressione `Ctrl+S`
   - Dê um nome para o projeto (ex: "WIKI OBV - API")

5. **Implante como Web App:**
   - Clique no botão **"Implantar"** (no canto superior direito)
   - Selecione **"Nova implantação"**
   - Em **"Selecione o tipo"**, clique na engrenagem ⚙️ e escolha **"Aplicativo da Web"**
   - Configure:
     - **Descrição:** "API WIKI OBV"
     - **Executar como:** "Eu"
     - **Quem tem acesso:** "Qualquer pessoa"
   - Clique em **"Implantar"**

6. **Autorize o script:**
   - Clique em **"Autorizar acesso"**
   - Escolha sua conta do Google
   - Clique em **"Avançado"** > **"Ir para [nome do projeto] (não seguro)"**
   - Clique em **"Permitir"**

7. **COPIE A URL:**
   - ⚠️ **IMPORTANTE:** Uma URL vai aparecer, parecida com:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
   - **COPIE ESSA URL COMPLETA!** Você vai precisar dela no próximo passo.

---

### **ETAPA 2: Configurar a URL no Site**

1. **Abra o arquivo JavaScript:**
   - Arquivo: `js/script.js`

2. **Localize a linha 5:**
   ```javascript
   const APPS_SCRIPT_URL = ''; // ⚠️ COLE A URL AQUI
   ```

3. **Cole a URL entre as aspas:**
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
   ```

4. **Salve o arquivo**

---

## ✅ PRONTO! AGORA FUNCIONA ASSIM:

### **Quando você editar um Pokémon:**

1. Clique no botão de editar ✏️
2. Modifique os dados
3. Clique em **"Salvar"**
4. O sistema vai:
   - ✅ Salvar localmente no navegador (localStorage)
   - ✅ Enviar os dados para o Google Sheets
   - ✅ Atualizar a planilha automaticamente
   - ✅ Mostrar uma mensagem de sucesso

### **Quando você adicionar um novo Pokémon:**

1. Clique no botão amarelo **"+"**
2. Preencha os campos
3. Clique em **"Salvar"**
4. O Pokémon será adicionado:
   - ✅ Na lista do site
   - ✅ Na planilha do Google Sheets (nova linha)

---

## 🔍 VERIFICANDO SE ESTÁ FUNCIONANDO

### **Teste rápido:**

1. Faça login no site como ADM
2. Edite qualquer Pokémon
3. Altere o HP para um valor diferente
4. Clique em **"Salvar"**
5. Abra sua planilha do Google Sheets
6. Procure o Pokémon que você editou
7. O HP deve estar atualizado! 🎉

---

## ⚠️ PROBLEMAS COMUNS

### **"Não consegui implantar o script"**
- Verifique se você está logado com a mesma conta da planilha
- Tente usar um navegador diferente (Chrome recomendado)

### **"Aparece mensagem de erro ao salvar"**
- Verifique se a URL do Apps Script está correta no `script.js`
- A URL deve terminar com `/exec` (não `/dev`)
- Verifique se você autorizou o script no Google

### **"O site funciona, mas a planilha não atualiza"**
- Abra o console do navegador (F12)
- Tente salvar novamente
- Veja se há erros no console
- Verifique se o script foi implantado como "Qualquer pessoa"

### **"Quero testar sem afetar minha planilha"**
- Faça uma cópia da planilha
- Use o ID da cópia no `PLANILHA_ID`
- Implante o Apps Script na planilha de teste

---

## 📊 ESTRUTURA DA PLANILHA

O script espera que sua planilha tenha estas colunas (ajuste se necessário):

| Coluna | Nome | Descrição |
|--------|------|-----------|
| A | PS | Número do Pokémon |
| B | POKEMON | Nome base |
| C | EV | Evolução |
| D | Type 1 | Tipo primário |
| E | Type 2 | Tipo secundário |
| F | HP | Pontos de vida |
| G | Attack | Ataque |
| H | Defense | Defesa |
| I | Sp.Attack | Ataque especial |
| J | Sp.Defense | Defesa especial |
| K | Speed | Velocidade |
| L | LOCALIZAÇÃO | Onde encontrar |
| M | TM | Número da TM |
| N | Nome do TM | Nome da técnica |
| O | Categoria | Categoria da TM |

Se sua planilha for diferente, ajuste as linhas no arquivo `google-apps-script.gs` (tem comentários explicando cada uma).

---

## 🎓 ENTENDENDO COMO FUNCIONA

1. **Site:** Quando você clica em "Salvar", o JavaScript envia os dados via POST para a URL do Apps Script
2. **Apps Script:** Recebe os dados, procura o Pokémon na planilha e atualiza a linha correspondente
3. **Planilha:** É atualizada automaticamente em tempo real
4. **localStorage:** Também salva localmente para backup e funcionamento offline

---

## 💾 ARQUIVOS CRIADOS/MODIFICADOS

✅ **google-apps-script.gs** - Código para implantar no Google Apps Script  
✅ **js/script.js** - Atualizado com nova função `salvarEdicao()`  
✅ **INSTRUCOES-GOOGLE-SHEETS.md** - Este arquivo com instruções completas

---

## 🆘 PRECISA DE AJUDA?

Se algo não funcionar:
1. Verifique o console do navegador (F12)
2. Verifique os logs do Apps Script (no editor, vá em "Execuções")
3. Teste a URL do Apps Script diretamente no navegador (deve mostrar "Google Apps Script funcionando!")

---

**Desenvolvido para WIKI OBV** 🐉
