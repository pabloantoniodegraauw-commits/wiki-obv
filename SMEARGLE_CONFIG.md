# 🎨 SMEARGLE BUILDER - CONFIGURAÇÃO FINAL

## ✅ Arquivos Criados

1. **pages/smeargle.html** - Página HTML com toda a estrutura
2. **js/modules/smeargle.js** - Lógica JavaScript completa
3. **css/style.css** - Estilos adicionados ao final do arquivo

## 🔧 Configuração do Google Sheets

### 1. Criar o Apps Script

1. Abra sua planilha Google Sheets
2. Vá em **Extensões → Apps Script**
3. Cole o seguinte código:

```javascript
function doGet() {
  const sheet = SpreadsheetApp
    .openById("SEU_SHEET_ID_AQUI")
    .getSheetByName("POKEMONS");

  const data = sheet.getDataRange().getValues();
  const header = data.shift();

  const result = data.map(row => {
    let obj = {};
    header.forEach((h,i) => obj[h] = row[i]);
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. **Substitua** `SEU_SHEET_ID_AQUI` pelo ID da sua planilha
5. Clique em **Implantar → Nova implantação**
6. Tipo: **Aplicativo da Web**
7. Executar como: **Eu**
8. Quem tem acesso: **Qualquer pessoa**
9. Clique em **Implantar**
10. **Copie a URL** que aparece

### 2. Configurar URL no Código

Abra o arquivo `js/modules/smeargle.js` e substitua a URL na linha 4:

```javascript
const SHEETS_URL = "COLE_AQUI_A_URL_DO_WEB_APP";
```

## 📋 Estrutura da Planilha (OBRIGATÓRIA)

### Aba: POKEMONS

| Coluna | Campo | Formato |
|--------|-------|---------|
| A | POKEMON | Nome do Pokémon |
| B | LOCALIZAÇÃO | Texto |
| R | M1 | `Giga Impact / pulo / Normal / Físico` |
| S | M2 | `Giga Impact / pulo / Normal / Físico` |
| T | M3 | `Giga Impact / pulo / Normal / Físico` |
| U | M4 | `Giga Impact / pulo / Normal / Físico` |
| V | M5 | `Giga Impact / pulo / Normal / Físico` |
| W | M6 | `Giga Impact / pulo / Normal / Físico` |
| X | M7 | `Giga Impact / pulo / Normal / Físico` |
| Y | M8 | `Giga Impact / pulo / Normal / Físico` |
| Z | M9 | `Giga Impact / pulo / Normal / Físico` |
| AA | M10 | `Giga Impact / pulo / Normal / Físico` |

### Formato dos Moves (M1 a M10)

Cada célula deve conter exatamente 4 partes separadas por ` / `:

```
Nome do Golpe / ação / Tipo / Categoria
```

**Exemplo:**
```
Giga Impact / pulo / Normal / Físico
Flamethrower / beam / Fire / Especial
Dark Pulse / dash / Dark / Especial
```

**Importante:**
- Use espaços ao redor das barras: ` / `
- **Apenas M1 aparece no seletor** (regra do sistema)
- Os outros M2-M10 são usados para verificar compatibilidade

## 🎨 Funcionalidades Implementadas

✅ Card do Smeargle com estilo dinâmico por tipo
✅ Seleção de até 9 golpes
✅ Filtros por: Nome, Tipo, Ação, Categoria
✅ Sistema de tipo dominante (cor do card muda)
✅ Lista de Pokémons compatíveis com a sequência
✅ Design 100% integrado ao OBV
✅ Responsivo para mobile
✅ Animações e efeitos visuais

## 🚀 Como Testar

1. Configure o Google Sheets conforme acima
2. Atualize a URL no `smeargle.js`
3. Abra o site OBV
4. Clique na aba **Smeargle** (ícone de paleta)
5. Selecione golpes e veja a mágica acontecer!

## 🐛 Troubleshooting

### Erro: "Erro ao carregar dados"
- Verifique se a URL do Apps Script está correta
- Confirme que o Web App está publicado com acesso "Qualquer pessoa"
- Verifique o console do navegador (F12) para mais detalhes

### Golpes não aparecem
- Confirme que existe pelo menos 1 Pokémon com golpes em M1
- Verifique o formato: `Nome / ação / Tipo / Categoria`
- Certifique-se de que os espaços ao redor das barras existem

### Card não muda de cor
- Selecione mais de um golpe do mesmo tipo
- O sistema conta a frequência dos tipos

## 📊 Lógica de Compatibilidade

O sistema busca Pokémons que possuem **TODOS** os golpes selecionados, **NA MESMA ORDEM**:

- Golpe 1 selecionado → deve estar em M1 do Pokémon
- Golpe 2 selecionado → deve estar em M2 do Pokémon
- Golpe 3 selecionado → deve estar em M3 do Pokémon
- E assim por diante...

## 🎯 Próximos Passos Opcionais

- [ ] Sistema de "Build Favoritos" (localStorage)
- [ ] Exportar build como imagem
- [ ] Compartilhar build via link
- [ ] Comparador de builds
- [ ] Calculadora de dano

---

**Sistema criado seguindo rigorosamente a arquitetura especificada.**
**Pronto para produção!** 🚀
