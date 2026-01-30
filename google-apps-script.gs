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
        const nomePlanilha = (todosOsDados[i][1] || '').toString().toLowerCase().trim(); // Coluna B (POKEMON)
        const evPlanilha = (todosOsDados[i][2] || '').toString().toLowerCase().trim();    // Coluna C (EV)
        
        if (nomePlanilha === nomeOriginal || evPlanilha === nomeOriginal) {
          linhaEncontrada = i + 1; // +1 porque o índice do array começa em 0, mas as linhas da planilha começam em 1
          break;
        }
      }
      
      if (linhaEncontrada > 0) {
        // Atualizar a linha encontrada
        // Estrutura da planilha (ajuste conforme sua planilha):
        // A: PS | B: POKEMON | C: EV | D: Type 1 | E: Type 2 | F: HP | G: Attack | H: Defense
        // I: Sp.Attack | J: Sp.Defense | K: Speed | L: LOCALIZAÇÃO | M: TM | N: Nome do TM | O: Categoria
        
        aba.getRange(linhaEncontrada, 1).setValue(dados.pokemon.numero);     // PS
        aba.getRange(linhaEncontrada, 2).setValue(dados.pokemon.nome);       // POKEMON
        aba.getRange(linhaEncontrada, 3).setValue(dados.pokemon.nome);       // EV
        aba.getRange(linhaEncontrada, 6).setValue(dados.pokemon.hp);         // HP
        aba.getRange(linhaEncontrada, 7).setValue(dados.pokemon.atk);        // Attack
        aba.getRange(linhaEncontrada, 8).setValue(dados.pokemon.def);        // Defense
        aba.getRange(linhaEncontrada, 9).setValue(dados.pokemon.spatk);      // Sp.Attack
        aba.getRange(linhaEncontrada, 10).setValue(dados.pokemon.spdef);     // Sp.Defense
        aba.getRange(linhaEncontrada, 11).setValue(dados.pokemon.speed);     // Speed
        aba.getRange(linhaEncontrada, 12).setValue(dados.pokemon.localizacao); // LOCALIZAÇÃO
        
        // TMs (dividir "TM02 - Dragon Claw" em duas colunas)
        const tmPartes = dados.pokemon.tms.split(' - ');
        if (tmPartes.length > 0) {
          aba.getRange(linhaEncontrada, 13).setValue(tmPartes[0].trim()); // TM
          if (tmPartes.length > 1) {
            aba.getRange(linhaEncontrada, 14).setValue(tmPartes[1].trim()); // Nome do TM
          }
        }
        
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
      
      // Estrutura: A: PS | B: POKEMON | C: EV | D: Type 1 | E: Type 2 | F: HP | etc.
      const tmPartes = dados.pokemon.tms.split(' - ');
      
      aba.getRange(novaLinha, 1).setValue(dados.pokemon.numero);
      aba.getRange(novaLinha, 2).setValue(dados.pokemon.nome);
      aba.getRange(novaLinha, 3).setValue(dados.pokemon.nome);
      aba.getRange(novaLinha, 4).setValue('Normal'); // Type 1 padrão
      aba.getRange(novaLinha, 5).setValue('');       // Type 2 vazio
      aba.getRange(novaLinha, 6).setValue(dados.pokemon.hp);
      aba.getRange(novaLinha, 7).setValue(dados.pokemon.atk);
      aba.getRange(novaLinha, 8).setValue(dados.pokemon.def);
      aba.getRange(novaLinha, 9).setValue(dados.pokemon.spatk);
      aba.getRange(novaLinha, 10).setValue(dados.pokemon.spdef);
      aba.getRange(novaLinha, 11).setValue(dados.pokemon.speed);
      aba.getRange(novaLinha, 12).setValue(dados.pokemon.localizacao);
      
      if (tmPartes.length > 0) {
        aba.getRange(novaLinha, 13).setValue(tmPartes[0].trim());
        if (tmPartes.length > 1) {
          aba.getRange(novaLinha, 14).setValue(tmPartes[1].trim());
        }
      }
      
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
