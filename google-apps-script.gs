/**
 * 📋 GOOGLE APPS SCRIPT - WIKI OBV
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 
 * 1. Abra sua planilha: https://docs.google.com/spreadsheets/d/1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ
 * 2. Vá em: Extensões > Apps Script
 * 3. Cole TODO este código
 * 4. Clique em "Implantar" > "Nova implantação"
 * 5. Em "Tipo": selecione "Aplicativo da Web"
 * 6. Em "Executar como": escolha "Eu"
 * 7. Em "Quem tem acesso": escolha "Qualquer pessoa"
 * 8. Clique em "Implantar"
 * 9. COPIE a URL que aparece (ela termina com /exec)
 * 10. Cole essa URL no arquivo script.js na variável APPS_SCRIPT_URL
 * 
 * IMPORTANTE: Você precisará autorizar o script na primeira execução!
 */

// Recebe requisições POST do site
function doPost(e) {
  try {
    const planilha = SpreadsheetApp.openById('1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ');
    const aba = planilha.getSheets()[0]; // Primeira aba
    
    // Parse dos dados recebidos
    const dados = JSON.parse(e.postData.contents);
    
    // APENAS ATUALIZAR POKÉMON EXISTENTE (não adicionar novos)
    if (dados.acao === 'atualizar') {
      const nomeOriginal = dados.nomeOriginal.toLowerCase().trim();
      const todosOsDados = aba.getDataRange().getValues();
      
      // Procurar o Pokémon na planilha
      // LÓGICA: Busca primeiro na coluna D (EV), se não achar, busca na coluna C (POKEMON)
      let linhaEncontrada = -1;
      let logBusca = 'Buscando: "' + nomeOriginal + '"\n';
      
      for (let i = 1; i < todosOsDados.length; i++) {
        const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim(); // Coluna D (EV)
        const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim(); // Coluna C (POKEMON)
        
        // Se tem EV, compara com EV. Senão, compara com POKEMON
        const nomeParaComparar = nomeEV || nomePokemon;
        
        logBusca += 'Linha ' + (i+1) + ': Pokemon="' + nomePokemon + '", EV="' + nomeEV + '", Comparando="' + nomeParaComparar + '"\n';
        
        if (nomeParaComparar === nomeOriginal) {
          linhaEncontrada = i + 1;
          logBusca += '✅ ENCONTRADO na linha ' + linhaEncontrada + '\n';
          break;
        }
      }
      
      if (linhaEncontrada === -1) {
        logBusca += '❌ NÃO ENCONTRADO\n';
      }
      
      if (linhaEncontrada > 0) {
        // Verificar se é EV ou POKEMON normal
        const todosOsDadosLinha = aba.getRange(linhaEncontrada, 1, 1, 16).getValues()[0];
        const temEV = todosOsDadosLinha[3] && todosOsDadosLinha[3].toString().trim() !== ''; // Coluna D (índice 3)
        
        // Atualizar a linha encontrada
        // Estrutura REAL da planilha:
        // A: PS | B: GEN | C: POKEMON | D: EV | E: LOCALIZAÇÃO | F: TM | G: Nome do TM | H: Categoria
        // I: Type 1 | J: Type 2 | K: HP | L: Attack | M: Defense | N: Sp.Attack | O: Sp.Defense | P: Speed
        
        aba.getRange(linhaEncontrada, 1).setValue(dados.pokemon.numero);     // A: PS
        // Coluna B (GEN) não mexemos
        
        // Se tem EV, atualiza coluna D. Senão, atualiza coluna C
        if (temEV) {
          aba.getRange(linhaEncontrada, 4).setValue(dados.pokemon.nome);     // D: EV (evolução)
          // Coluna C (POKEMON base) não mexemos
        } else {
          aba.getRange(linhaEncontrada, 3).setValue(dados.pokemon.nome);     // C: POKEMON
          // Coluna D (EV) não mexemos
        }
        
        aba.getRange(linhaEncontrada, 5).setValue(dados.pokemon.localizacao); // E: LOCALIZAÇÃO
        
        // TMs (dividir "TM02 - Dragon Claw" em duas colunas)
        const tmPartes = dados.pokemon.tms.split(' - ');
        if (tmPartes.length > 0) {
          aba.getRange(linhaEncontrada, 6).setValue(tmPartes[0].trim()); // F: TM
          if (tmPartes.length > 1) {
            aba.getRange(linhaEncontrada, 7).setValue(tmPartes[1].trim()); // G: Nome do TM
          }
        }
        // Coluna H (Categoria) não mexemos
        
        // Stats
        aba.getRange(linhaEncontrada, 11).setValue(dados.pokemon.hp);        // K: HP
        aba.getRange(linhaEncontrada, 12).setValue(dados.pokemon.atk);       // L: Attack
        aba.getRange(linhaEncontrada, 13).setValue(dados.pokemon.def);       // M: Defense
        aba.getRange(linhaEncontrada, 14).setValue(dados.pokemon.spatk);     // N: Sp.Attack
        aba.getRange(linhaEncontrada, 15).setValue(dados.pokemon.spdef);     // O: Sp.Defense
        aba.getRange(linhaEncontrada, 16).setValue(dados.pokemon.speed);     // P: Speed
        
        return ContentService.createTextOutput(JSON.stringify({
          sucesso: true,
          mensagem: 'Pokémon atualizado com sucesso na planilha!',
          linha: linhaEncontrada
        })).setMimeType(ContentService.MimeType.JSON);
        
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          sucesso: false,
          mensagem: 'Pokémon não encontrado na planilha: ' + dados.nomeOriginal + '\n\nLog:\n' + logBusca
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Retornar erro se não for ação de atualizar
    return ContentService.createTextOutput(JSON.stringify({
      sucesso: false,
      mensagem: 'Ação não reconhecida. Use acao: "atualizar"'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({
      sucesso: false,
      mensagem: 'Erro no servidor: ' + erro.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Recebe requisições GET (ler dados da planilha)
function doGet(e) {
  try {
    const planilha = SpreadsheetApp.openById('1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ');
    const aba = planilha.getSheets()[0];
    
    // Pegar parâmetros da URL
    const acao = e.parameter.acao;
    
    // Se pedir todos os dados
    if (acao === 'obter_todos') {
      const dados = aba.getDataRange().getValues();
      const cabecalho = dados[0];
      const linhas = dados.slice(1);
      
      // Converter para array de objetos
      const pokemons = linhas.map(linha => {
        const obj = {};
        cabecalho.forEach((coluna, index) => {
          obj[coluna] = linha[index];
        });
        return obj;
      });
      
      return ContentService
        .createTextOutput(JSON.stringify(pokemons))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Resposta padrão
    return ContentService
      .createTextOutput(JSON.stringify({ 
        mensagem: 'Google Apps Script funcionando! Use ?acao=obter_todos para obter dados.' 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        erro: erro.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
