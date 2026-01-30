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
    
    if (dados.acao === 'atualizar') {
      // ATUALIZAR POKÉMON EXISTENTE
      const nomeOriginal = dados.nomeOriginal.toLowerCase().trim();
      const todosOsDados = aba.getDataRange().getValues();
      
      // Procurar o Pokémon na planilha
      let linhaEncontrada = -1;
      for (let i = 1; i < todosOsDados.length; i++) {
        const nomePlanilha = (todosOsDados[i][2] || '').toString().toLowerCase().trim(); // Coluna C (POKEMON)
        
        if (nomePlanilha === nomeOriginal) {
          linhaEncontrada = i + 1; // +1 porque o índice do array começa em 0, mas as linhas da planilha começam em 1
          break;
        }
      }
      
      if (linhaEncontrada > 0) {
        // Atualizar a linha encontrada
        // Estrutura REAL da planilha:
        // A: PS | B: GEN | C: POKEMON | D: LOCALIZAÇÃO | E: TM | F: Nome do TM | G: Categoria
        // H: Type 1 | I: Type 2 | J: HP | K: Attack | L: Defense | M: Sp.Attack | N: Sp.Defense | O: Speed
        
        aba.getRange(linhaEncontrada, 1).setValue(dados.pokemon.numero);     // A: PS
        // Coluna B (GEN) não mexemos
        aba.getRange(linhaEncontrada, 3).setValue(dados.pokemon.nome);       // C: POKEMON
        aba.getRange(linhaEncontrada, 4).setValue(dados.pokemon.localizacao); // D: LOCALIZAÇÃO
        
        // TMs (dividir "TM02 - Dragon Claw" em duas colunas)
        const tmPartes = dados.pokemon.tms.split(' - ');
        if (tmPartes.length > 0) {
          aba.getRange(linhaEncontrada, 5).setValue(tmPartes[0].trim()); // E: TM
          if (tmPartes.length > 1) {
            aba.getRange(linhaEncontrada, 6).setValue(tmPartes[1].trim()); // F: Nome do TM
          }
        }
        // Coluna G (Categoria) não mexemos
        
        // Stats
        aba.getRange(linhaEncontrada, 10).setValue(dados.pokemon.hp);        // J: HP
        aba.getRange(linhaEncontrada, 11).setValue(dados.pokemon.atk);       // K: Attack
        aba.getRange(linhaEncontrada, 12).setValue(dados.pokemon.def);       // L: Defense
        aba.getRange(linhaEncontrada, 13).setValue(dados.pokemon.spatk);     // M: Sp.Attack
        aba.getRange(linhaEncontrada, 14).setValue(dados.pokemon.spdef);     // N: Sp.Defense
        aba.getRange(linhaEncontrada, 15).setValue(dados.pokemon.speed);     // O: Speed
        
        return ContentService.createTextOutput(JSON.stringify({
          sucesso: true,
          mensagem: 'Pokémon atualizado com sucesso na planilha!',
          linha: linhaEncontrada
        })).setMimeType(ContentService.MimeType.JSON);
        
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          sucesso: false,
          mensagem: 'Pokémon não encontrado na planilha.'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
    } else if (dados.acao === 'adicionar') {
      // ADICIONAR NOVO POKÉMON
      const ultimaLinha = aba.getLastRow();
      const novaLinha = ultimaLinha + 1;
      
      // Estrutura REAL: A: PS | B: GEN | C: POKEMON | D: LOCALIZAÇÃO | E: TM | F: Nome do TM | G: Categoria
      // H: Type 1 | I: Type 2 | J: HP | K: Attack | L: Defense | M: Sp.Attack | N: Sp.Defense | O: Speed
      const tmPartes = dados.pokemon.tms.split(' - ');
      
      aba.getRange(novaLinha, 1).setValue(dados.pokemon.numero);      // A: PS
      aba.getRange(novaLinha, 2).setValue(1);                         // B: GEN (padrão 1)
      aba.getRange(novaLinha, 3).setValue(dados.pokemon.nome);        // C: POKEMON
      aba.getRange(novaLinha, 4).setValue(dados.pokemon.localizacao); // D: LOCALIZAÇÃO
      
      if (tmPartes.length > 0) {
        aba.getRange(novaLinha, 5).setValue(tmPartes[0].trim());      // E: TM
        if (tmPartes.length > 1) {
          aba.getRange(novaLinha, 6).setValue(tmPartes[1].trim());    // F: Nome do TM
        }
      }
      
      aba.getRange(novaLinha, 7).setValue('');                        // G: Categoria (vazio)
      aba.getRange(novaLinha, 8).setValue('Normal');                  // H: Type 1 padrão
      aba.getRange(novaLinha, 9).setValue('');                        // I: Type 2 vazio
      aba.getRange(novaLinha, 10).setValue(dados.pokemon.hp);         // J: HP
      aba.getRange(novaLinha, 11).setValue(dados.pokemon.atk);        // K: Attack
      aba.getRange(novaLinha, 12).setValue(dados.pokemon.def);        // L: Defense
      aba.getRange(novaLinha, 13).setValue(dados.pokemon.spatk);      // M: Sp.Attack
      aba.getRange(novaLinha, 14).setValue(dados.pokemon.spdef);      // N: Sp.Defense
      aba.getRange(novaLinha, 15).setValue(dados.pokemon.speed);      // O: Speed
      
      return ContentService.createTextOutput(JSON.stringify({
        sucesso: true,
        mensagem: 'Novo Pokémon adicionado à planilha!',
        linha: novaLinha
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({
      sucesso: false,
      mensagem: 'Erro no servidor: ' + erro.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Recebe requisições GET (opcional, para testar)
function doGet(e) {
  return ContentService.createTextOutput('Google Apps Script funcionando! Use POST para enviar dados.');
}
