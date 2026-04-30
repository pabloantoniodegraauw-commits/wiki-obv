// ============================================================
//  QUESTS & TASKS HANDLERS
// ============================================================

/**
 * Seed inicial de quests — chamado automaticamente pelo frontend quando
 * a aba QUESTS existe mas está vazia. Insere todas as quests de uma vez.
 */
function handleSeedQuests(planilha, dados) {
  try {
    var aba = planilha.getSheetByName('QUESTS');
    if (!aba) {
      aba = planilha.insertSheet('QUESTS');
      aba.getRange(1, 1, 1, 7).setValues([['NOME', 'ACESSO', 'NIVEL', 'DESCRICAO', 'RECOMPENSAS', 'DIFICULDADE', 'LINK_VIDEO']]);
    }
    var existentes = aba.getLastRow();
    if (existentes > 1) {
      // Já tem dados, não sobrescrever
      return { success: true, message: 'Aba já populada, seed ignorado.' };
    }
    var quests = dados.quests || [];
    if (!quests.length) return { success: false, message: 'Nenhuma quest enviada.' };
    var rows = quests.map(function(q) {
      return [q.nome || '', q.acesso || 'Free', q.nivel || 0, q.descricao || '', q.recompensas || '', q.dificuldade || 1, q.link_video || ''];
    });
    aba.getRange(2, 1, rows.length, 7).setValues(rows);
    return { success: true, message: rows.length + ' quests inseridas.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Adiciona uma nova quest na aba QUESTS.
 */
function handleAdicionarQuest(planilha, dados) {
  try {
    var aba = planilha.getSheetByName('QUESTS');
    if (!aba) {
      aba = planilha.insertSheet('QUESTS');
      aba.getRange(1, 1, 1, 7).setValues([['NOME', 'ACESSO', 'NIVEL', 'DESCRICAO', 'RECOMPENSAS', 'DIFICULDADE', 'LINK_VIDEO']]);
    }
    if (!dados.nome) return { success: false, message: 'Nome obrigatório.' };
    aba.appendRow([dados.nome, dados.acesso || 'Free', dados.nivel || 0, dados.descricao || '', dados.recompensas || '', dados.dificuldade || 1, dados.link_video || '']);
    return { success: true, message: 'Quest adicionada.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Edita uma quest existente na aba QUESTS (busca por NOME original).
 */
function handleEditarQuest(planilha, dados) {
  try {
    var aba = planilha.getSheetByName('QUESTS');
    if (!aba) return { success: false, message: 'Aba QUESTS não encontrada.' };
    var nomeOriginal = (dados.nomeOriginal || dados.nome || '').toString().trim().toLowerCase();
    var rows = aba.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim().toLowerCase() === nomeOriginal) {
        aba.getRange(i + 1, 1, 1, 7).setValues([[
          dados.nome || rows[i][0],
          dados.acesso || rows[i][1],
          dados.nivel !== undefined ? dados.nivel : rows[i][2],
          dados.descricao !== undefined ? dados.descricao : rows[i][3],
          dados.recompensas !== undefined ? dados.recompensas : rows[i][4],
          dados.dificuldade !== undefined ? dados.dificuldade : rows[i][5],
          dados.link_video !== undefined ? dados.link_video : rows[i][6]
        ]]);
        return { success: true, message: 'Quest atualizada.' };
      }
    }
    return { success: false, message: 'Quest não encontrada: ' + nomeOriginal };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Seed inicial de tasks — insere as 100 tasks base na aba TASKS quando está vazia.
 */
function handleSeedTasks(planilha, dados) {
  try {
    var aba = planilha.getSheetByName('TASKS');
    if (!aba) {
      aba = planilha.insertSheet('TASKS');
      aba.getRange(1, 1, 1, 5).setValues([['ID', 'MISSAO', 'POKEMON', 'LOCAL', 'PREMIOS']]);
    }
    var tasks = dados.tasks || [];
    if (!tasks.length) return { success: false, message: 'Nenhuma task enviada.' };

    // Coletar IDs já existentes na aba para evitar duplicatas
    var idsExistentes = new Set();
    var lastRow = aba.getLastRow();
    if (lastRow > 1) {
      var colIds = aba.getRange(2, 1, lastRow - 1, 1).getValues();
      colIds.forEach(function(r) { if (r[0] !== undefined && r[0] !== null && r[0] !== '') idsExistentes.add(Number(r[0])); });
    }

    // Filtrar apenas tasks com IDs novos (comparar numericamente)
    var novas = tasks.filter(function(t) { return t.id && !idsExistentes.has(Number(t.id)); });
    if (!novas.length) return { success: true, message: 'Nenhuma task nova para inserir.' };

    var rows = novas.map(function(t) {
      return [t.id || '', t.missao || '', t.pokemon || '', t.local || '', JSON.stringify(t.premios || [])];
    });
    aba.getRange(lastRow + 1, 1, rows.length, 5).setValues(rows);
    return { success: true, message: rows.length + ' tasks inseridas.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Adiciona uma task na aba TASKS (cria a aba se necessário).
 */
function handleAdicionarTask(planilha, dados) {
  try {
    var aba = planilha.getSheetByName('TASKS');
    if (!aba) {
      aba = planilha.insertSheet('TASKS');
      aba.getRange(1, 1, 1, 5).setValues([['ID', 'MISSAO', 'POKEMON', 'LOCAL', 'PREMIOS']]);
    }
    aba.appendRow([dados.id || '', dados.missao || '', dados.pokemon || '', dados.local || '', JSON.stringify(dados.premios || [])]);
    return { success: true, message: 'Task adicionada.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Edita uma task existente na aba TASKS (busca por ID original).
 * Se não encontrar, faz upsert (insere como nova linha).
 */
function handleEditarTask(planilha, dados) {
  try {
    var aba = planilha.getSheetByName('TASKS');
    if (!aba) {
      aba = planilha.insertSheet('TASKS');
      aba.getRange(1, 1, 1, 5).setValues([['ID', 'MISSAO', 'POKEMON', 'LOCAL', 'PREMIOS']]);
    }
    var idOriginal = (dados.idOriginal || dados.id || '').toString().trim();
    var rows = aba.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim() === idOriginal) {
        aba.getRange(i + 1, 1, 1, 5).setValues([[
          dados.id || rows[i][0],
          dados.missao || rows[i][1],
          dados.pokemon || rows[i][2],
          dados.local !== undefined ? dados.local : (rows[i][3] || ''),
          JSON.stringify(dados.premios || [])
        ]]);
        return { success: true, message: 'Task atualizada.' };
      }
    }
    // Não encontrada — inserir como nova linha (upsert)
    aba.appendRow([dados.id || '', dados.missao || '', dados.pokemon || '', dados.local || '', JSON.stringify(dados.premios || [])]);
    return { success: true, message: 'Task inserida (não existia).' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
//  END QUESTS & TASKS HANDLERS
// ============================================================

/**
 * Atualizar ataque de um Pokémon na aba STAGE
 * Similar à handleAtualizarAtack, mas atua na aba STAGE
 */
function handleAtualizarAtackStage(planilha, dados) {
  try {
    let abaStage = planilha.getSheetByName('STAGE');
    if (!abaStage) {
      return { success: false, message: 'Aba STAGE não encontrada.' };
    }
    // Log raw payload for debugging (enabled only when DEBUG=true)
    if (typeof DEBUG !== 'undefined' && DEBUG) { try { Logger.log('handleAtualizarAtackStage chamado. dados raw: ' + JSON.stringify(dados)); } catch(e) {} }
    // Aceitar vários nomes de campo enviados pelo frontend (form ou JSON)
    const getField = (keys) => {
      for (const k of keys) {
        if (dados[k] !== undefined && dados[k] !== null) return dados[k];
      }
      return '';
    };

    // Normalizar parâmetros possíveis
    const nomeOriginalRaw = getField(['nomeAtack','nomeAtack','nomeAtaque','nomeAtaque','atack','atackName','atackNome','atackname','nome','pokemon']);
    const slotRaw = getField(['slot','coluna','field','acao','action']);
    const valor = getField(['valor','value','novoValor','newValue','nomeAtack','nomeAtaque']);

    const nomeOriginal = (nomeOriginalRaw || '').toString().trim().toLowerCase();
    const slot = (slotRaw || '').toString().trim().toLowerCase();
    if (typeof DEBUG !== 'undefined' && DEBUG) { try { Logger.log('handleAtualizarAtackStage campos normalizados: nomeOriginal="' + nomeOriginal + '", slot="' + slot + '", valor="' + valor + '"'); } catch(e) {} }
    const todosOsDados = abaStage.getDataRange().getValues();
    const cabecalho = todosOsDados[0];
    // Encontrar índice da coluna do slot (se slot fornecido)
    let colIndex = -1;
    if (slot) {
      colIndex = cabecalho.findIndex(function(col) {
        return (col || '').toString().toLowerCase().trim() === slot;
      });
    }
    if (colIndex === -1) {
      return { success: false, message: 'Coluna ' + slot + ' não encontrada na aba STAGE. Colunas disponíveis: ' + cabecalho.join(', ') };
    }
    // Buscar ataque pelo nome normalizado na primeira coluna
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeLinha = (todosOsDados[i][0] || '').toString().trim().toLowerCase();
      if (nomeOriginal && nomeLinha === nomeOriginal) {
        // Se coluna (slot) foi encontrada, atualizar coluna específica
        if (colIndex !== -1) {
          abaStage.getRange(i + 1, colIndex + 1).setValue(valor);
          return { success: true, message: 'Ataque "' + nomeOriginal + '" atualizado no slot "' + slot + '" com valor: ' + valor };
        } else {
          // Se não foi informado slot, atualizar segunda coluna (ex.: valor geral)
          abaStage.getRange(i + 1, 2).setValue(valor);
          return { success: true, message: 'Ataque "' + nomeOriginal + '" atualizado na coluna 2 com valor: ' + valor };
        }
      }
    }
    return { success: false, message: 'Ataque não encontrado na aba STAGE: ' + nomeOriginal };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}
/**
 * 📋 GOOGLE APPS SCRIPT - WIKI OBV
 * Sistema de Autenticação e Gerenciamento de Membros
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 
 * 1. Abra sua planilha: https://docs.google.com/spreadsheets/d/1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ
 * 2. Certifique-se de ter as abas: 'usuarios' e 'logs'
 * 3. Vá em: Extensões > Apps Script
 * 4. Cole TODO este código
 * 5. Clique em "Implantar" > "Nova implantação"
 * 6. Em "Tipo": selecione "Aplicativo da Web"
 * 7. Em "Executar como": escolha "Eu"
 * 8. Em "Quem tem acesso": escolha "Qualquer pessoa"
 * 9. Clique em "Implantar"
 * 10. COPIE a URL que aparece (ela termina com /exec)
 * 11. Cole essa URL nos arquivos: callback.html, cadastro.html, header.js e admin.js
 * 
 * IMPORTANTE: Você precisará autorizar o script na primeira execução!
 */

// ID da planilha
const SPREADSHEET_ID = '1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ';

// Tempo de expiração da sessão (8 horas em milissegundos)
const SESSION_EXPIRATION = 8 * 60 * 60 * 1000;
// Debug flag para controlar logs no Apps Script
const DEBUG = false;

/**
 * Responder requisições OPTIONS (preflight CORS)
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Validar e extrair email do token de autenticação
 * SEGURANÇA: Não confia no email enviado pelo front, valida o token
 */
function validateTokenAndGetEmail(dados) {
  // Se tiver token de autenticação, validar e extrair email
  if (dados.authToken) {
    try {
      // Decodificar JWT do Google (formato: header.payload.signature)
      const parts = dados.authToken.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      // Decodificar payload (parte do meio)
      const payload = JSON.parse(
        Utilities.newBlob(
          Utilities.base64Decode(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        ).getDataAsString()
      );
      
      // Retornar email do token (fonte confiável)
      return payload.email || null;
    } catch (e) {
      if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Erro ao validar token: ' + e.toString());
      return null;
    }
  }
  
  // Fallback: usar email enviado (menos seguro, mas mantém compatibilidade)
  return dados.adminEmail || dados.email || null;
}

// Recebe requisições POST do site
function doPost(e) {
  try {
    const planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Parse dos dados recebidos (aceita JSON ou form data)
    let dados;
    try {
      // Tentar parsear como JSON primeiro
      dados = JSON.parse(e.postData.contents);
    } catch (erro) {
      // Se falhar, assumir que é form data
      dados = {};
      if (e.parameter) {
        dados = e.parameter;
        // Se moves veio como string, fazer parse
        if (dados.moves && typeof dados.moves === 'string') {
          try {
            dados.moves = JSON.parse(dados.moves);
          } catch (e) {
            if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Erro ao parsear moves: ' + e.toString());
          }
        }
        // Se premios veio como string JSON (enviado via URLSearchParams), fazer parse
        if (dados.premios && typeof dados.premios === 'string') {
          try { dados.premios = JSON.parse(dados.premios); } catch (e) { dados.premios = []; }
        }
        // Se quests veio como string JSON, fazer parse
        if (dados.quests && typeof dados.quests === 'string') {
          try { dados.quests = JSON.parse(dados.quests); } catch (e) { dados.quests = []; }
        }
        // Se tasks veio como string JSON, fazer parse
        if (dados.tasks && typeof dados.tasks === 'string') {
          try { dados.tasks = JSON.parse(dados.tasks); } catch (e) { dados.tasks = []; }
        }
      }
    }
    
    const action = (dados.action || dados.acao || '').toString();

    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('=== doPost CHAMADO ===');
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Action recebida: "' + action + '"  (dados.acao fallback usado se presente)');
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Dados completos: ' + JSON.stringify(dados));

    // ROUTER - Redirecionar para função apropriada
    let result;
    switch (action) {
      case 'login':
        result = handleLogin(planilha, dados);
        break;
      case 'cadastrar':
        result = handleCadastro(planilha, dados);
        break;
      case 'log':
        result = handleLog(planilha, dados);
        break;
      case 'approveUser':
        result = handleApproveUser(planilha, dados);
        break;
      case 'rejectUser':
        result = handleRejectUser(planilha, dados);
        break;
      case 'setRole':
        result = handleSetRole(planilha, dados);
        break;
      case 'deleteUser':
        result = handleDeleteUser(planilha, dados);
        break;
      case 'updateUser':
        result = handleUpdateUser(planilha, dados);
        break;
      case 'atualizarSugestao':
        result = handleAtualizarSugestao(planilha, dados);
        break;
      case 'limparSugestaoLoc':
        result = handleLimparSugestaoLoc(planilha, dados);
        break;
      case 'salvarSugestaoAtack':
        result = handleSalvarSugestaoAtack(planilha, dados);
        break;
      case 'limparSugestaoAtack':
        result = handleLimparSugestaoAtack(planilha, dados);
        break;
      case 'atualizarSugestaoTM':
        result = handleAtualizarSugestaoTM(planilha, dados);
        break;
      case 'limparSugestaoTM':
        result = handleLimparSugestaoTM(planilha, dados);
        break;
      case 'atualizarOrigemTM':
        result = handleAtualizarOrigemTM(planilha, dados);
        break;
      case 'atualizarAtack':
        result = handleAtualizarAtack(planilha, dados);
        break;
      case 'atualizar':
        // Compatibilidade: 'acao=atualizar' usado por frontend antigo. Decidir handler pelo payload
        if (typeof DEBUG !== 'undefined' && DEBUG) { try { Logger.log('Rota genérica atualizar chamada. Inspecting payload...'); } catch(e) {} }
        // Priorizar edição de definição de ataque (ATACKS) quando campos de definição estão presentes
        if (dados && (dados.efeito || dados.tipo || dados.categoria || dados.pp || dados.power || dados.accuracy || dados.gen || dados.acaoAtack)) {
          result = handleAtualizarAtackDef(planilha, dados);
        } else if (dados && (dados.nomeAtack || dados.atack || dados.atackName) && !dados.acaoAtack) {
          // Caso seja atualização específica de STAGE (nome do ataque + slot)
          result = handleAtualizarAtackStage(planilha, dados);
        } else if (dados && dados.nomePokemon && dados.slot) {
          result = handleAtualizarAtack(planilha, dados);
        } else {
          result = handlePokemonUpdate(planilha, dados);
        }
        break;
      case 'atualizarAtackStage':
        result = handleAtualizarAtackStage(planilha, dados);
        break;
      case 'adicionarAtack':
        result = handleAdicionarAtack(planilha, dados);
        break;
      case 'adicionarTM':
        result = handleAdicionarTM(planilha, dados);
        break;
      case 'savePokedexMoves':
        result = handleSavePokedexMoves(planilha, dados);
        break;
      case 'salvarPokedexMoves':
        // alias em pt-br
        result = handleSavePokedexMoves(planilha, dados);
        break;
      case 'salvarBuild':
        result = handleSalvarBuild(planilha, dados);
        break;
      case 'excluirBuild':
        result = handleExcluirBuild(planilha, dados);
        break;
      case 'salvarVenda':
        result = handleSalvarVenda(planilha, dados);
        break;
      case 'excluirVenda':
        result = handleExcluirVenda(planilha, dados);
        break;
      case 'atualizarAbility':
        result = handleAtualizarAbility(planilha, dados);
        break;
      case 'salvarSugestaoAbility':
        result = handleSalvarSugestaoAbility(planilha, dados);
        break;
      case 'aprovarSugestaoAbility':
        result = handleAprovarSugestaoAbility(planilha, dados);
        break;
      case 'editarTMDef':
        result = handleEditarTMDef(planilha, dados);
        break;
      case 'sugerirEdicaoTM':
        result = handleSugerirEdicaoTM(planilha, dados);
        break;
      case 'seedQuests':
        result = handleSeedQuests(planilha, dados);
        break;
      case 'seedTasks':
        result = handleSeedTasks(planilha, dados);
        break;
      case 'adicionarQuest':
        result = handleAdicionarQuest(planilha, dados);
        break;
      case 'editarQuest':
        result = handleEditarQuest(planilha, dados);
        break;
      case 'adicionarTask':
        result = handleAdicionarTask(planilha, dados);
        break;
      case 'editarTask':
        result = handleEditarTask(planilha, dados);
        break;
      default:
        // Manter código existente de Pokémon
        result = handlePokemonUpdate(planilha, dados);
        break;
    }
    
    // Converter resultado para ContentService
    // Se result já é ContentService, retornar como está
    if (result && typeof result.getContent === 'function') {
      return result;
    }
    
    // Se é objeto simples, converter para ContentService
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

// Recebe requisições GET do site
function doGet(e) {
  try {
    const planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = e.parameter.action;
    const acao = e.parameter.acao; // Para compatibilidade com código existente de Pokémon

    // Sistema de autenticação
    switch (action) {
      case 'checkUser':
        return createCorsResponse(checkUser(planilha, e.parameter.email));
      case 'getUsers':
        return createCorsResponse(getUsers(planilha));
      case 'getLogs':
        return createCorsResponse(getLogs(planilha));
      case 'countAdmins':
        return createCorsResponse(countAdmins(planilha));
      case 'carregarBuilds':
        return createCorsResponse(handleCarregarBuilds(planilha));
      case 'carregarStage':
        return createCorsResponse(handleCarregarStage(planilha));
      case 'ping':
        return createCorsResponse({ success: true, message: 'pong', ts: new Date().toISOString() });
    }
    
    // Sistema de Pokémon (código existente)
    if (acao === 'obter_todos') {
      const aba = planilha.getSheets()[0];
      const page = parseInt(e.parameter.page || '1');
      const limit = parseInt(e.parameter.limit || '100');
      
      const dados = aba.getDataRange().getValues();
      const cabecalho = dados[0];
      const linhas = dados.slice(1);
      
      const pokemons = linhas.map(linha => {
        const obj = {};
        cabecalho.forEach((coluna, index) => {
          obj[coluna] = linha[index];
        });
        // SEMPRE mapear chaves com nomes ASCII limpos para evitar encoding issues
        obj['PS'] = (linha[0] !== undefined && linha[0] !== null && linha[0] !== '') ? linha[0].toString() : '';
        // Coluna F (índice 5) = Sugestão de localização
        obj['SUGESTAO_LOC'] = (linha[5] || '').toString();
        // Coluna Y (índice 24) = Sugestão de atacks
        obj['SUGESTAO_ATACKS'] = (linha[24] || '').toString();
        return obj;
      });
      
      const total = pokemons.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginados = pokemons.slice(startIndex, endIndex);
      const hasMore = endIndex < total;
      
      return ContentService.createTextOutput(JSON.stringify({
        data: paginados,
        page: page,
        limit: limit,
        total: total,
        hasMore: hasMore
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // Handler para carregar dados da aba STAGE via GET?action=carregarStage
    function handleCarregarStage(planilha) {
      try {
        const aba = planilha.getSheetByName('STAGE');
        if (!aba) return { success: false, message: 'Aba STAGE não encontrada' };
        const dados = aba.getDataRange().getValues();
        if (!dados || dados.length <= 1) return { data: [] };
        const cabecalho = dados[0];
        const linhas = dados.slice(1);
        const rows = linhas.map(linha => {
          const obj = {};
          cabecalho.forEach((col, i) => { obj[col] = linha[i]; });
          return obj;
        });
        return { data: rows };
      } catch (e) {
        return { success: false, message: e.toString() };
      }
    }
    
    // Obter TMs da aba "TMs"
    if (acao === 'obter_tms') {
      const abaTMs = planilha.getSheetByName('TMs');
      if (!abaTMs) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'Aba TMs não encontrada'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const dados = abaTMs.getDataRange().getValues();
      const cabecalho = dados[0];
      const linhas = dados.slice(1);
      
      const tms = linhas.map(linha => {
        const obj = {};
        cabecalho.forEach((coluna, index) => {
          obj[coluna] = linha[index];
        });
        return obj;
      }).filter(tm => tm['NUMERO DO TM'] && tm['NOME DO TM']); // Filtrar linhas vazias
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: tms,
        total: tms.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Obter Atacks da aba "ATACKS"
    if (acao === 'obter_atacks') {
      const abaAtacks = planilha.getSheetByName('ATACKS');
      if (!abaAtacks) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'Aba ATACKS não encontrada'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const dados = abaAtacks.getDataRange().getValues();
      const cabecalho = dados[0];
      const linhas = dados.slice(1);
      
      const atacks = linhas.map(linha => {
        const obj = {};
        cabecalho.forEach((coluna, index) => {
          obj[coluna] = linha[index];
        });
        return obj;
      }).filter(a => a['ATACK']);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: atacks,
        total: atacks.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Obter Abilities da aba "ABILITYS"
    if (acao === 'obter_abilities') {
      const abaAbilities = planilha.getSheetByName('ABILITYS');
      if (!abaAbilities) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'Aba ABILITYS não encontrada'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const dados = abaAbilities.getDataRange().getValues();
      const cabecalho = dados[0];
      const linhas = dados.slice(1);

      const abilities = linhas.map(linha => {
        const obj = {};
        cabecalho.forEach((coluna, index) => {
          obj[coluna] = linha[index];
        });
        return obj;
      }).filter(a => a['ABILITY']);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: abilities,
        total: abilities.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Obter Itens da aba "ITENS"
    if (acao === 'obter_itens') {
      const abaItens = planilha.getSheetByName('ITENS');
      if (!abaItens) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'Aba ITENS não encontrada'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const dados = abaItens.getDataRange().getValues();
      const cabecalho = dados[0];
      const linhas = dados.slice(1);
      
      const itens = linhas.map(linha => {
        const obj = {};
        cabecalho.forEach((coluna, index) => {
          obj[coluna] = linha[index];
        });
        return obj;
      }).filter(item => item['NOME']);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: itens,
        total: itens.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Obter Natures da aba "NATURES"
    if (acao === 'obter_natures') {
      const abaNatures = planilha.getSheetByName('NATURES');
      if (!abaNatures) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'Aba NATURES não encontrada'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const dados = abaNatures.getDataRange().getValues();
      const cabecalho = dados[0];
      const linhas = dados.slice(1);
      
      const natures = linhas.map(linha => {
        const obj = {};
        cabecalho.forEach((coluna, index) => {
          obj[coluna] = linha[index];
        });
        return obj;
      }).filter(n => {
        // Aceitar qualquer coluna que tenha dados
        return Object.values(n).some(v => v && v.toString().trim() !== '');
      });
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: natures,
        total: natures.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Obter Quests da aba "QUESTS" (cria a aba automaticamente se não existir)
    if (acao === 'obter_quests') {
      var abaQuests = planilha.getSheetByName('QUESTS');
      var cabecalhoQuests = [['NOME', 'ACESSO', 'NIVEL', 'DESCRICAO', 'RECOMPENSAS', 'DIFICULDADE', 'LINK_VIDEO']];
      if (!abaQuests) {
        abaQuests = planilha.insertSheet('QUESTS');
        abaQuests.getRange(1, 1, 1, 7).setValues(cabecalhoQuests);
      }

      var dadosQ = abaQuests.getDataRange().getValues();
      // Se aba vazia (só cabeçalho), seed com quests iniciais
      if (dadosQ.length <= 1) {
        var questsSeed = [
          ['First Stone','Free',25,'Escolha uma entre as 3 principais pedras de evolução','firestone/waterstone/leafstone',1,'https://www.youtube.com/watch?v=gL3Fj7EUIj4'],
          ['Second Stone','Free',45,'Escolha uma entre as 3 principais pedras de evolução e ganha um patins para melhorar sua velocidade','firestone/waterstone/leafstone/patins',1,'https://www.youtube.com/watch?v=Ub6uQqOw1MQ'],
          ['Thunder Stone','Free',50,'Vasculhe as casas elétricas pelo mapa','thunderstone',1,'https://www.youtube.com/watch?v=QJujvuvKuQo'],
          ['Enigma Stone','Free',50,'Vasculhe as ilhas psychic pelo mapa','enigmastone',1,'https://www.youtube.com/watch?v=CF3n9sYPa28'],
          ['Heart Stone','Free',50,'Vasculhe os pidgeot pelo mapa','heartstone',1,'https://www.youtube.com/watch?v=_BwCI_NGBk4'],
          ['Earth Stone','Free',50,'Vasculhe as caverna terrestre pelo mapa','earthstone',1,'https://www.youtube.com/watch?v=7O-nlfhdGCU'],
          ['Punch Stone','Free',50,'Vasculhe as ilhas lutadoras pelo mapa','punchstone',1,''],
          ['Ice Stone','Free',50,'Vasculhe as ilhas de gelo em kalos','icestone',1,''],
          ['Fairy Stone','Free',50,'Vasculhe as ilhas de fadas em kalos','fairystone',1,'https://www.youtube.com/watch?v=p2Zwt6gDBwE'],
          ['Rock Stone','Free',50,'Vasculhe as cavernas pelo mapa','rockstone',1,'https://www.youtube.com/watch?v=a6xpnbVUUro'],
          ['Darkness Stone','Free',50,'Vasculhe a torre de lavender','darknessstone',1,'https://www.youtube.com/watch?v=KjXOmgDx7Uc'],
          ['Dragon Stone','Free',100,'Vasculhe uma ilha de dragões e consiga uma stone','dragonstone',1,'https://www.youtube.com/watch?v=9oB6YrTVDfU'],
          ['100 Hds','Free',100,'Vasculhe as cavernas proximo a cerulean e encontre 100 hds','100hds',1,'https://www.youtube.com/watch?v=wPmGkdwnvbA'],
          ['100 Ultraball','Free',100,'Explore, encontre e então capture!','ultraball',1,'https://www.youtube.com/watch?v=Qd66prG1T9o'],
          ['Jungle','Free',50,'Capture o pokémon Bonsly e troque por um shiny vileplume','shinyvileplume',2,'https://www.youtube.com/watch?v=iXMWtaXJsPg'],
          ['Milotic','Free',130,'Passe pela piramide em Lavaridge e procure um báu onde você encontra um feebas, e em seguida evolua para uma milotic','milotic',2,'https://www.youtube.com/watch?v=qI1fAeYnOW8'],
          ['Farol','Free',150,'Farme os itens e leve até a chefe do fárol','addonboxsuper',2,'https://www.youtube.com/watch?v=bBuSA5IvrAQ'],
          ['Conquest','Free',150,'Junte 3 amigos e enfrente os poderosos Guardian Magmar','addonbox',2,'https://www.youtube.com/watch?v=J0M1rQcie2o'],
          ['Boost Ice','VIP',250,'Consiga uma boost stone no final da quest','booststone',2,'https://www.youtube.com/watch?v=zwxll39GOV4'],
          ['Boost Hell','Free',250,'Consiga uma boost stone no final da quest','booststone',2,'https://www.youtube.com/watch?v=ZWF9zkucgfY'],
          ['Boost Leaf','Free',250,'Consiga uma boost stone no final da quest','booststone',2,'https://www.youtube.com/watch?v=X81s6EsEDJs'],
          ['Metagross','Free',0,'Consiga 3 itens dos lendarios Regice, Regirock e Registeel e complete a quest Metagross','metagross/absol',2,'https://www.youtube.com/watch?v=2kUq-l847MM'],
          ['Drapion','VIP',400,'Consiga um Shiny de graça e uma boost stone','shinydrapion/booststone',2,'https://www.youtube.com/watch?v=UCjqQv0GT54'],
          ['Fire Gale','Free',500,'Enfrente diversos pokemon do tipo fire e no final ganhe uma outfit','charizardoutfit',2,'https://www.youtube.com/watch?v=DPV4GK_3YWc'],
          ['Leaf Gale','VIP',500,'Enfrente diversos pokemon do tipo leaf e no final ganhe uma outfit','venusauroutfit',2,'https://www.youtube.com/watch?v=EShnZdGadwQ'],
          ['Punch Gale','Free',500,'Enfrente diversos pokemon do tipo punch e no final ganhe uma outfit','punchoutfit',2,'https://www.youtube.com/watch?v=t2BI5QkN2sI'],
          ['Water Gale','Free',500,'Enfrente diversos pokemon do tipo water e no final ganhe uma outfit','blastoiseoutfit',2,'https://www.youtube.com/watch?v=VNMZHxROxns'],
          ['Fly Gale','Free',500,'Enfrente diversos pokemon do tipo fly e no final ganhe uma outfit','flyoutfit',2,'https://www.youtube.com/watch?v=Bvzp7l2itTI'],
          ['Psych Gale','Free',500,'Enfrente diversos pokemon do tipo psychic e no final ganhe uma outfit','psychicoutfit',2,'https://www.youtube.com/watch?v=WToosf6vvaA'],
          ['Electric Gale','Free',500,'Enfrente diversos pokemon do tipo electric e no final ganhe uma outfit','electricgale',2,'https://www.youtube.com/watch?v=BD-pBsWjF9I'],
          ['Fairy Gale','Free',500,'Enfrente diversos pokemon do tipo fairy e no final ganhe uma outfit','fairyoutfit',2,'https://www.youtube.com/watch?v=p2Zwt6gDBwE'],
          ['Dragon Gale','Free',500,'Enfrente diversos pokemon do tipo dragon e no final ganhe uma outfit','dragongale',2,'https://www.youtube.com/watch?v=qi-T7TzU9wQ'],
          ['Fossil','Free',0,'Reviva um fossil e consiga um pokemon super raro','aerodactyl/omastar/armaldo/kabutops/bastiodon',3,'https://www.youtube.com/watch?v=Pkzcc49KtZQ'],
          ['Magnetic','Free',250,'Tudo parecia normal, até elas se mexerem. Enfrente os Guardian Probopass','probopass',3,'https://www.youtube.com/watch?v=GrIfCtLO4hY'],
          ['Aegislash','VIP',250,'Consiga TMS unicos investigando um antigo palacio','aegislash',3,'https://www.youtube.com/watch?v=JAwzrewN7l0'],
          ['Mamoswine','Free',250,'Complete todas missões e enfrete o poderoso Guardian Mamoswine','mamoswine',3,'https://www.youtube.com/watch?v=kEJ2IRSP0pU'],
          ['Haunted House','VIP',666,'Complete os enigmas da Haunted House e consiga um otimo pokemon','golurk',3,'https://www.youtube.com/watch?v=0bMI6ZUZ13Q'],
          ['Crystal Quest','Free',0,'Consiga uma Crystal Tail e troque por acesso e tente capturar um crystal onix','shiny onix',3,'https://www.youtube.com/watch?v=DxVLdBXr2XQ'],
          ['Mega Ring','Free',300,'Consiga uma bateria e 10x forge material para o professor sycamore, e consiga desbloquear a mega evolução','',4,''],
          ['Korrina','Free',250,'Você entende de Mega evolução? prove e enfrente a lendaria Korrina e seus Mega Lucarios','',3,'https://www.youtube.com/watch?v=YrOT6oZ0CPM'],
          ['Steve Stone','Free',250,'Ajude steve stone a desvendar o misterio da Rogue Evolução','',3,'https://www.youtube.com/watch?v=tJs-TOY0HiM'],
          ['Burned','Free',400,'Junte 600 itens raros, 200x scarab, 200x brooch, 200x strange e complete uma das quests mais cara do jogo','lickilicky/rhyperior',4,'https://www.youtube.com/watch?v=IgnOPhZe_4o'],
          ['Celebi','Free',400,'Viaje para Ilex Forest e devenda o misterio de Celebi, você vai precisar de ajuda','tangrowth',4,'https://www.youtube.com/watch?v=2UIMqhyyTwo'],
          ['Genesect','Free',0,'Enfrente o lendario Genesect em uma missão em unova. Ao finalizar, você ganha uma outfit exclusiva e também libera acesso exclusivo a um npc que te oferece mel para captura de Volcarona','genesectoutfit/volcarona',4,'https://www.youtube.com/watch?v=U3iAG7Y43fI'],
          ['Pesadelo','Free',200,'Você sonha? então enfrente seus pesadelo. Você vai precisar de amigos para conseguir enfrentar os darkrais','lucario/togekiss/spiritomb',4,'https://www.youtube.com/shorts/LD0o2Y7olHI'],
          ['Iris','Free',300,'Consiga todos pokémon dragão para iris, desbloqueando acesso a Iris Dungeons para conseguir o Mega Dragonite','',4,'https://www.youtube.com/watch?v=cDgI4upI_L0'],
          ['Jurassic','Free',300,'Enfrente os ancient de kalos revividos e ecolha entre Amaura e Tyrunt','amaura/tyrunt',4,'https://www.youtube.com/watch?v=AAqKNTG0zcI'],
          ['Vale dos Gengar','Free',600,'Primeira aparição de um dos vilão de pokememories, Z, cuidado nessa jornada','mimikyu/alolanmarowak',5,'https://www.youtube.com/watch?v=TEtoG-xVYNo'],
          ['Memories Quest','Free',600,'Segunda aparição de Z, Aqui você precisara de ajuda de um Celebi para viajar ao passado','roaringmoon/alolanvulpix',5,'https://www.youtube.com/watch?v=kBme51Qt_AA']
        ];
        abaQuests.getRange(2, 1, questsSeed.length, 7).setValues(questsSeed);

        var questsRetorno = questsSeed.map(function(row) {
          return { nome: row[0], acesso: row[1], nivel: row[2], descricao: row[3], recompensas: row[4], dificuldade: row[5], link_video: row[6] };
        });
        return ContentService.createTextOutput(JSON.stringify({
          success: true, data: questsRetorno, total: questsRetorno.length
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var cabQ = dadosQ[0];
      var linhasQ = dadosQ.slice(1);
      var quests = linhasQ.map(function(linha) {
        var obj = {};
        cabQ.forEach(function(col, i) { obj[col] = linha[i]; });
        return {
          nome: obj['NOME'] || '',
          acesso: obj['ACESSO'] || 'Free',
          nivel: parseInt(obj['NIVEL']) || 0,
          descricao: obj['DESCRICAO'] || '',
          recompensas: obj['RECOMPENSAS'] || '',
          dificuldade: parseInt(obj['DIFICULDADE']) || 1,
          link_video: obj['LINK_VIDEO'] || ''
        };
      }).filter(function(q) { return q.nome; });

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: quests,
        total: quests.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Criar/obter aba TASKS (dados vêm do frontend hardcoded, aba só para POSTs)
    if (acao === 'obter_tasks') {
      var abaTasks = planilha.getSheetByName('TASKS');
      if (!abaTasks) {
        abaTasks = planilha.insertSheet('TASKS');
        abaTasks.getRange(1, 1, 1, 5).setValues([['ID', 'MISSAO', 'POKEMON', 'LOCAL', 'PREMIOS']]);
      }
      var dadosTasks = abaTasks.getDataRange().getValues();
      if (dadosTasks.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true, data: [], total: 0
        })).setMimeType(ContentService.MimeType.JSON);
      }
      var cabTasks = dadosTasks[0];
      var taskRows = dadosTasks.slice(1).map(function(linha) {
        var obj = {};
        cabTasks.forEach(function(col, i) { obj[col] = linha[i]; });
        return {
          id: obj['ID'] || '',
          missao: obj['MISSAO'] || '',
          pokemon: obj['POKEMON'] || '',
          local: obj['LOCAL'] || '',
          premios: obj['PREMIOS'] ? JSON.parse(obj['PREMIOS']) : []
        };
      }).filter(function(t) { return t.id; });
      return ContentService.createTextOutput(JSON.stringify({
        success: true, data: taskRows, total: taskRows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Obter Vendas da aba "VENDAS"
    if (acao === 'obter_vendas') {
      const abaVendas = planilha.getSheetByName('VENDAS');
      if (!abaVendas) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: [],
          total: 0
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const dados = abaVendas.getDataRange().getValues();
      if (dados.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: [],
          total: 0
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const vendas = dados.slice(1).map((linha, index) => ({
        id: index,
        textoVenda: linha[0],
        dadosJSON: linha[1],
        usuarioEmail: linha[2],
        usuarioNickname: linha[3],
        telefone: linha[4],
        timestamp: linha[5],
        status: linha[6] || 'ativa'
      })).filter(v => v.status === 'ativa');
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: vendas,
        total: vendas.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Resposta padrão
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Ação não reconhecida'
    }))
    .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ============================================
   FUNÇÕES DE AUTENTICAÇÃO
   ============================================ */

/**
 * Verificar status do usuário
 */
function checkUser(planilha, email) {
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const dados = abaUsuarios.getDataRange().getValues();
  
  // Buscar usuário
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0].toLowerCase() === email.toLowerCase()) {
      return {
        success: true,
        status: dados[i][7], // status
        email: dados[i][0],
        nome: dados[i][1],
        foto: dados[i][2],
        nickname: dados[i][3],
        role: dados[i][8] // role
      };
    }
  }
  
  // Usuário não encontrado
  return {
    success: true,
    status: 'nao_cadastrado'
  };
}

/**
 * Processar login
 */
function handleLogin(planilha, dados) {
  // Validar token com Google (opcional - por ora apenas verificar se existe)
  const email = dados.email;
  
  const result = checkUser(planilha, email);
  return result;
}

/**
 * Processar cadastro
 */
function handleCadastro(planilha, dados) {
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  
  // Verificar se já existe
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      return {
        success: false,
        message: 'Usuário já cadastrado'
      };
    }
  }
  
  // Adicionar novo usuário
  abaUsuarios.appendRow([
    dados.email,
    dados.nome,
    dados.foto,
    dados.nickname,
    dados.level,
    dados.tipoCla,
    dados.tier,
    'pendente', // status
    'membro', // role
    new Date() // dataCadastro
  ]);
  
  return {
    success: true,
    message: 'Cadastro enviado com sucesso'
  };
}

/* ============================================
   FUNÇÕES DE LOGS
   ============================================ */

/**
 * Registrar log de atividade
 */
function handleLog(planilha, dados) {
  const abaLogs = getOrCreateSheet(planilha, 'logs');
  
  abaLogs.appendRow([
    dados.email,
    dados.nickname,
    dados.evento, // login, ping, logout
    new Date()
  ]);
  
  return {
    success: true
  };
}

/**
 * Obter logs
 */
function getLogs(planilha) {
  const abaLogs = getOrCreateSheet(planilha, 'logs');
  const dados = abaLogs.getDataRange().getValues();
  
  const logs = [];
  for (let i = 1; i < dados.length; i++) {
    logs.push({
      email: dados[i][0],
      nickname: dados[i][1],
      evento: dados[i][2],
      dataHora: dados[i][3]
    });
  }
  
  return {
    success: true,
    logs: logs
  };
}

/* ============================================
   FUNÇÕES ADMINISTRATIVAS
   ============================================ */

/**
 * Obter todos os usuários
 */
function getUsers(planilha) {
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const dados = abaUsuarios.getDataRange().getValues();
  
  const users = [];
  for (let i = 1; i < dados.length; i++) {
    users.push({
      email: dados[i][0],
      nome: dados[i][1],
      foto: dados[i][2],
      nickname: dados[i][3],
      level: dados[i][4],
      tipoCla: dados[i][5],
      tier: dados[i][6],
      status: dados[i][7],
      role: dados[i][8]
    });
  }
  
  return {
    success: true,
    users: users
  };
}

/**
 * Aprovar usuário
 */
function handleApproveUser(planilha, dados) {
  // SEGURANÇA: Extrair email do token, não confiar no adminEmail do front
  const adminEmail = validateTokenAndGetEmail(dados);
  
  if (!adminEmail) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Token de autenticação inválido ou ausente'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Verificar se quem está fazendo a ação é realmente admin
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') {
        isAdmin = true;
      }
      break;
    }
  }
  
  if (!isAdmin) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Sem permissão: apenas administradores podem aprovar'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Aprovar usuário
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      abaUsuarios.getRange(i + 1, 8).setValue('aprovado'); // coluna status
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Usuário não encontrado'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Rejeitar usuário
 */
function handleRejectUser(planilha, dados) {
  // SEGURANÇA: Extrair email do token, não confiar no adminEmail do front
  const adminEmail = validateTokenAndGetEmail(dados);
  
  if (!adminEmail) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Token de autenticação inválido ou ausente'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  // Verificar se é admin
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') {
        isAdmin = true;
      }
      break;
    }
  }
  
  if (!isAdmin) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Sem permissão: apenas administradores podem rejeitar'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Rejeitar usuário
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      abaUsuarios.getRange(i + 1, 8).setValue('rejeitado'); // coluna status
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Usuário não encontrado'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Alterar cargo (role) do usuário
 */
function handleSetRole(planilha, dados) {
  // SEGURANÇA: Extrair email do token, não confiar no adminEmail do front
  const adminEmail = validateTokenAndGetEmail(dados);
  
  if (!adminEmail) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Token de autenticação inválido ou ausente'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  // Verificar se quem está fazendo a ação é admin
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') {
        isAdmin = true;
      }
      break;
    }
  }
  
  if (!isAdmin) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Sem permissão: apenas administradores podem alterar cargos'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Se está removendo admin, verificar se não é o último
  if (dados.role === 'membro') {
    let totalAdmins = 0;
    for (let i = 1; i < todosOsDados.length; i++) {
      if (todosOsDados[i][8] === 'admin') {
        totalAdmins++;
      }
    }
    
    if (totalAdmins <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Não é possível remover o último administrador'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Alterar role
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      abaUsuarios.getRange(i + 1, 9).setValue(dados.role); // coluna role
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Usuário não encontrado'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Contar admins
 */
function countAdmins(planilha) {
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const dados = abaUsuarios.getDataRange().getValues();
  
  let count = 0;
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][8] === 'admin') {
      count++;
    }
  }
  
  return {
    success: true,
    count: count
  };
}

/**
 * Deletar usuário (remover da planilha)
 */
function handleDeleteUser(planilha, dados) {
  // SEGURANÇA: Extrair email do token, não confiar no adminEmail do front
  const adminEmail = validateTokenAndGetEmail(dados);
  
  if (!adminEmail) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Token de autenticação inválido ou ausente'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  // Verificar se quem está fazendo a ação é admin
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') {
        isAdmin = true;
      }
      break;
    }
  }
  
  if (!isAdmin) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Sem permissão: apenas administradores podem deletar usuários'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Impedir que admin delete a si mesmo
  if (adminEmail.toLowerCase() === dados.email.toLowerCase()) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Você não pode remover sua própria conta'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Encontrar e deletar o usuário
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      abaUsuarios.deleteRow(i + 1);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Usuário removido com sucesso'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Usuário não encontrado'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Atualizar dados do usuário (level, tier, tipoCla)
 */
function handleUpdateUser(planilha, dados) {
  // SEGURANÇA: Extrair email do token, não confiar no adminEmail do front
  const adminEmail = validateTokenAndGetEmail(dados);
  
  if (!adminEmail) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Token de autenticação inválido ou ausente'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  // Verificar se quem está fazendo a ação é admin
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') {
        isAdmin = true;
      }
      break;
    }
  }
  
  if (!isAdmin) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Sem permissão: apenas administradores podem atualizar dados'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Atualizar dados do usuário
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      // Atualizar colunas: level (5), tipoCla (6), tier (7)
      if (dados.level !== undefined) {
        abaUsuarios.getRange(i + 1, 5).setValue(dados.level);
      }
      if (dados.tipoCla !== undefined) {
        abaUsuarios.getRange(i + 1, 6).setValue(dados.tipoCla);
      }
      if (dados.tier !== undefined) {
        abaUsuarios.getRange(i + 1, 7).setValue(dados.tier);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Dados atualizados com sucesso'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: 'Usuário não encontrado'
  })).setMimeType(ContentService.MimeType.JSON);
}

/* ============================================
   FUNÇÕES AUXILIARES
   ============================================ */

/**
 * Obter ou criar aba
 */
function getOrCreateSheet(planilha, nome) {
  let aba = planilha.getSheetByName(nome);
  
  if (!aba) {
    aba = planilha.insertSheet(nome);
    
    // Criar cabeçalhos apropriados
    if (nome === 'usuarios') {
      aba.appendRow(['email', 'nome', 'foto', 'nickname', 'level', 'tipoCla', 'tier', 'status', 'role', 'dataCadastro']);
    } else if (nome === 'logs') {
      aba.appendRow(['email', 'nickname', 'evento', 'dataHora']);
    }
  }
  
  return aba;
}

/**
 * Criar resposta JSON padrão
 */
function createCorsResponse(content) {
  return ContentService
    .createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================
   FUNÇÕES DE POKÉMON
   ============================================ */

/**
 * Atualizar sugestão de localização de um Pokémon
 * PERMITE que qualquer membro autenticado contribua
 */
function handleAtualizarSugestao(planilha, dados) {
  try {
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('=== INICIANDO handleAtualizarSugestao ===');
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Dados recebidos: ' + JSON.stringify(dados));
    
    const aba = planilha.getSheets()[0];
    const nomeOriginal = dados.nomePokemon.toLowerCase().trim();
    const novaSugestao = dados.sugestao || '';
    
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Nome procurado: ' + nomeOriginal);
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Nova sugestão: ' + novaSugestao);
    
    const todosOsDados = aba.getDataRange().getValues();
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Total de linhas na planilha: ' + todosOsDados.length);
    
    // Buscar Pokémon
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
      const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
      const nomeParaComparar = nomeEV || nomePokemon;
      
      if (nomeParaComparar === nomeOriginal) {
        if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('POKEMON ENCONTRADO na linha ' + (i + 1));
        if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Coluna F (índice 5): ' + todosOsDados[i][5]);
        
        // COLUNA F = índice 5 (contando de 0: A=0, B=1, C=2, D=3, E=4, F=5)
        // APPEND: se já existir sugestão, concatenar com " / "
        var valorAtual = (todosOsDados[i][5] || '').toString().trim();
        var novoValor = valorAtual ? valorAtual + ' / ' + novaSugestao : novaSugestao;
        aba.getRange(i + 1, 6).setValue(novoValor);
        
        if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Sugestão salva com sucesso! Valor final: ' + novoValor);
        
        return {
          sucesso: true,
          mensagem: 'Sugestão atualizada com sucesso!'
        };
      }
    }
    
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('ERRO: Pokemon não encontrado: ' + nomeOriginal);
    
    return {
      sucesso: false,
      mensagem: 'Pokémon não encontrado'
    };
    
  } catch (erro) {
    return {
      sucesso: false,
      mensagem: 'Erro: ' + erro.toString()
    };
  }
}

/**
 * Limpar sugestão de localização de um Pokémon (setar coluna F como vazia)
 * Apenas admin pode limpar
 */
function handleLimparSugestaoLoc(planilha, dados) {
  try {
    const adminEmail = validateTokenAndGetEmail(dados);
    if (!adminEmail) {
      return { sucesso: false, mensagem: 'Token de autenticação inválido ou ausente' };
    }
    
    // Verificar se é admin
    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') isAdmin = true;
        break;
      }
    }
    if (!isAdmin) {
      return { sucesso: false, mensagem: 'Sem permissão: apenas administradores podem limpar sugestões' };
    }
    
    const aba = planilha.getSheets()[0];
    const nomeOriginal = dados.nomePokemon.toLowerCase().trim();
    const todosOsDados = aba.getDataRange().getValues();
    
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
      const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
      const nomeParaComparar = nomeEV || nomePokemon;
      
      if (nomeParaComparar === nomeOriginal) {
        // Coluna F (6) = sugestão de localização — LIMPAR
        aba.getRange(i + 1, 6).setValue('');
        return { sucesso: true, mensagem: 'Sugestão de localização limpa com sucesso!' };
      }
    }
    
    return { sucesso: false, mensagem: 'Pokémon não encontrado' };
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro: ' + erro.toString() };
  }
}

/**
 * Salvar sugestão de atack na coluna Y (índice 24) - APPEND
 * Formato: M2 / Night Slash / dash / Dark / Físico - M3 / Dive / pulo / Water / Físico
 */
function handleSalvarSugestaoAtack(planilha, dados) {
  try {
    const aba = planilha.getSheets()[0];
    const nomeOriginal = dados.nomePokemon.toLowerCase().trim();
    const novaSugestao = dados.sugestao || '';
    
    if (!novaSugestao) {
      return { sucesso: false, mensagem: 'Sugestão vazia' };
    }
    
    const todosOsDados = aba.getDataRange().getValues();
    
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
      const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
      const nomeParaComparar = nomeEV || nomePokemon;
      
      if (nomeParaComparar === nomeOriginal) {
        // Coluna Y (25) = sugestão de atacks
        var valorAtual = (todosOsDados[i][24] || '').toString().trim();
        var novoValor = valorAtual ? valorAtual + ' - ' + novaSugestao : novaSugestao;
        aba.getRange(i + 1, 25).setValue(novoValor);
        return { sucesso: true, mensagem: 'Sugestão de atack salva com sucesso!' };
      }
    }
    
    return { sucesso: false, mensagem: 'Pokémon não encontrado' };
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro: ' + erro.toString() };
  }
}

/**
 * Limpar sugestão(ões) de atack da coluna Y
 * Se dados.slot informado, remove apenas aquela entrada; senão, limpa tudo
 */
function handleLimparSugestaoAtack(planilha, dados) {
  try {
    const adminEmail = validateTokenAndGetEmail(dados);
    if (!adminEmail) {
      return { sucesso: false, mensagem: 'Token de autenticação inválido ou ausente' };
    }
    
    // Verificar se é admin
    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') isAdmin = true;
        break;
      }
    }
    if (!isAdmin) {
      return { sucesso: false, mensagem: 'Sem permissão: apenas administradores podem limpar sugestões' };
    }
    
    const aba = planilha.getSheets()[0];
    const nomeOriginal = dados.nomePokemon.toLowerCase().trim();
    const slotRemover = (dados.slot || '').toUpperCase().trim(); // ex: "M2"
    const todosOsDados = aba.getDataRange().getValues();
    
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
      const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
      const nomeParaComparar = nomeEV || nomePokemon;
      
      if (nomeParaComparar === nomeOriginal) {
        if (!slotRemover) {
          // Limpar TUDO
          aba.getRange(i + 1, 25).setValue('');
          return { sucesso: true, mensagem: 'Todas as sugestões de atack limpas!' };
        } else {
          // Remover apenas a entrada do slot específico
          var valorAtual = (todosOsDados[i][24] || '').toString().trim();
          if (!valorAtual) {
            return { sucesso: true, mensagem: 'Nenhuma sugestão para remover' };
          }
          var entradas = valorAtual.split(' - ').filter(function(e) {
            return !e.trim().toUpperCase().startsWith(slotRemover + ' /');
          });
          aba.getRange(i + 1, 25).setValue(entradas.join(' - '));
          return { sucesso: true, mensagem: 'Sugestão do ' + slotRemover + ' removida!' };
        }
      }
    }
    
    return { sucesso: false, mensagem: 'Pokémon não encontrado' };
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro: ' + erro.toString() };
  }
}

/**
 * Editar definição de um TM na aba TMs (ADM)
 * Campos: TIPO DE ITEM, NUMERO DO TM, NOME DO TM, TIPAGEM DO TM, ORIGEM DO TM, TIPO DE DROP
 */
function handleEditarTMDef(planilha, dados) {
  try {
    const adminEmail = validateTokenAndGetEmail(dados);
    if (!adminEmail) return { success: false, message: 'Token inválido.' };
    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') isAdmin = true;
        break;
      }
    }
    if (!isAdmin) return { success: false, message: 'Sem permissão: apenas ADM pode editar TMs.' };

    const abaTMs = planilha.getSheetByName('TMs');
    if (!abaTMs) return { success: false, message: 'Aba TMs não encontrada.' };

    const todosOsDados = abaTMs.getDataRange().getValues();
    const cabecalho = todosOsDados[0];
    const colNumero = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === 'NUMERO DO TM');
    if (colNumero === -1) return { success: false, message: 'Coluna NUMERO DO TM não encontrada.' };

    const tmNumeroOriginal = String(dados.tmNumeroOriginal || dados.tmNumero || '').trim();
    if (!tmNumeroOriginal) return { success: false, message: 'Número do TM não informado.' };

    let linhaIndex = -1;
    for (let i = 1; i < todosOsDados.length; i++) {
      if (String(todosOsDados[i][colNumero]).trim() === tmNumeroOriginal) {
        linhaIndex = i;
        break;
      }
    }
    if (linhaIndex === -1) return { success: false, message: 'TM não encontrado: ' + tmNumeroOriginal };

    const camposMap = {
      'tipoItem': ['TIPO DE ITEM'],
      'numero': ['NUMERO DO TM'],
      'nome': ['NOME DO TM'],
      'tipagem': ['TIPAGEM DO TM'],
      'origem': ['ORIGEM DO TM'],
      'tipoDrop': ['TIPO DE DROP']
    };

    const setIfExists = (fieldNames, value) => {
      for (const nomeCol of fieldNames) {
        const idx = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === nomeCol.toUpperCase().trim());
        if (idx !== -1) {
          abaTMs.getRange(linhaIndex + 1, idx + 1).setValue(value);
          return true;
        }
      }
      return false;
    };

    for (const key in camposMap) {
      if (dados[key] !== undefined && dados[key] !== null) {
        setIfExists(camposMap[key], dados[key]);
      }
    }

    return { success: true, message: 'TM atualizado com sucesso!' };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Sugerir edição de TM (usuário comum)
 * Salva texto livre na coluna SUGESTÃO DE POKEMON
 */
function handleSugerirEdicaoTM(planilha, dados) {
  try {
    const abaTMs = planilha.getSheetByName('TMs');
    if (!abaTMs) return { success: false, message: 'Aba TMs não encontrada.' };

    const todosOsDados = abaTMs.getDataRange().getValues();
    const cabecalho = todosOsDados[0];
    const colNumero = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === 'NUMERO DO TM');
    let colSugestao = cabecalho.findIndex(h => {
      const upper = (h || '').toString().toUpperCase().trim();
      return upper === 'SUGESTÃO DE POKEMON' || upper === 'SUGESTÃO DE TM/POKEMON';
    });
    if (colSugestao === -1) {
      colSugestao = cabecalho.length;
      abaTMs.getRange(1, colSugestao + 1).setValue('SUGESTÃO DE POKEMON');
    }
    if (colNumero === -1) return { success: false, message: 'Coluna NUMERO DO TM não encontrada.' };

    const tmNumero = String(dados.tmNumero || '').trim();
    const sugestao = (dados.sugestao || '').trim();
    const email = (dados.email || '').trim();
    if (!tmNumero) return { success: false, message: 'Número do TM não informado.' };
    if (!sugestao) return { success: false, message: 'Sugestão vazia.' };

    for (let i = 1; i < todosOsDados.length; i++) {
      if (String(todosOsDados[i][colNumero]).trim() === tmNumero) {
        const valorAtual = (todosOsDados[i][colSugestao] || '').toString().trim();
        const textoSugestao = email ? (email + ': ' + sugestao) : sugestao;
        const novoValor = valorAtual ? valorAtual + ' | ' + textoSugestao : textoSugestao;
        abaTMs.getRange(i + 1, colSugestao + 1).setValue(novoValor);
        return { success: true, message: 'Sugestão salva com sucesso!' };
      }
    }

    return { success: false, message: 'TM não encontrado: ' + tmNumero };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Atualizar sugestão de TM/Pokémon na aba TMs
 */
function handleAtualizarSugestaoTM(planilha, dados) {
  try {
    const abaTMs = planilha.getSheetByName('TMs');
    if (!abaTMs) {
      return { success: false, message: 'Aba TMs não encontrada' };
    }
    
    const todosOsDados = abaTMs.getDataRange().getValues();
    const cabecalho = todosOsDados[0];
    
    const colNumero = cabecalho.indexOf('NUMERO DO TM');
    const colSugestao = cabecalho.indexOf('SUGESTÃO DE POKEMON') !== -1 
      ? cabecalho.indexOf('SUGESTÃO DE POKEMON') 
      : cabecalho.indexOf('SUGESTÃO DE TM/POKEMON');
    
    if (colNumero === -1 || colSugestao === -1) {
      return { success: false, message: 'Colunas não encontradas na aba TMs' };
    }
    
    const tmNumero = String(dados.tmNumero).trim();
    
    for (let i = 1; i < todosOsDados.length; i++) {
      if (String(todosOsDados[i][colNumero]).trim() === tmNumero) {
        const sugestaoExistente = (todosOsDados[i][colSugestao] || '').toString();
        const novaSugestao = sugestaoExistente 
          ? sugestaoExistente + ' | ' + dados.sugestao + ' (' + (dados.nomePokemon || '') + ')'
          : dados.sugestao + ' (' + (dados.nomePokemon || '') + ')';
        
        abaTMs.getRange(i + 1, colSugestao + 1).setValue(novaSugestao);
        
        return { success: true, message: 'Sugestão de TM salva com sucesso!' };
      }
    }
    
    return { success: false, message: 'TM não encontrado: TM' + tmNumero };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Limpar sugestão de TM (apenas admin)
 */
function handleLimparSugestaoTM(planilha, dados) {
  try {
    // SEGURANÇA: Verificar se é admin
    const adminEmail = validateTokenAndGetEmail(dados);
    if (!adminEmail) {
      return { success: false, message: 'Token de autenticação inválido ou ausente' };
    }

    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') isAdmin = true;
        break;
      }
    }
    if (!isAdmin) {
      return { success: false, message: 'Sem permissão: apenas administradores podem limpar sugestões' };
    }

    const abaTMs = planilha.getSheetByName('TMs');
    if (!abaTMs) {
      return { success: false, message: 'Aba TMs não encontrada' };
    }

    const todosOsDados = abaTMs.getDataRange().getValues();
    const cabecalho = todosOsDados[0];

    const colNumero = cabecalho.indexOf('NUMERO DO TM');
    const colSugestao = cabecalho.indexOf('SUGESTÃO DE POKEMON') !== -1 
      ? cabecalho.indexOf('SUGESTÃO DE POKEMON') 
      : cabecalho.indexOf('SUGESTÃO DE TM/POKEMON');

    if (colNumero === -1 || colSugestao === -1) {
      return { success: false, message: 'Colunas não encontradas na aba TMs' };
    }

    const tmNumero = String(dados.tmNumero).trim();

    for (let i = 1; i < todosOsDados.length; i++) {
      if (String(todosOsDados[i][colNumero]).trim() === tmNumero) {
        abaTMs.getRange(i + 1, colSugestao + 1).setValue('');
        return { success: true, message: 'Sugestão do TM' + tmNumero + ' limpa com sucesso!' };
      }
    }

    return { success: false, message: 'TM não encontrado: TM' + tmNumero };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Atualizar ORIGEM DO TM (associar/desassociar Pokémon a um TM)
 */
function handleAtualizarOrigemTM(planilha, dados) {
  try {
    // SEGURANÇA: Verificar se é admin
    const adminEmail = validateTokenAndGetEmail(dados);
    if (!adminEmail) {
      return { success: false, message: 'Token de autenticação inválido ou ausente' };
    }

    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') isAdmin = true;
        break;
      }
    }
    if (!isAdmin) {
      return { success: false, message: 'Sem permissão: apenas administradores podem alterar TMs' };
    }

    const abaTMs = planilha.getSheetByName('TMs');
    if (!abaTMs) {
      return { success: false, message: 'Aba TMs não encontrada' };
    }

    const todosOsDados = abaTMs.getDataRange().getValues();
    const cabecalho = todosOsDados[0];

    const colNumero = cabecalho.indexOf('NUMERO DO TM');
    const colOrigem = cabecalho.indexOf('ORIGEM DO TM');

    if (colNumero === -1 || colOrigem === -1) {
      return { success: false, message: 'Colunas não encontradas na aba TMs' };
    }

    const tmNumero = String(dados.tmNumero).trim();
    const nomePokemon = (dados.nomePokemon || '').trim();

    for (let i = 1; i < todosOsDados.length; i++) {
      if (String(todosOsDados[i][colNumero]).trim() === tmNumero) {
        const origemAtual = (todosOsDados[i][colOrigem] || '').toString().trim();
        
        if (nomePokemon === '') {
          // Remover este Pokémon da origem
          const nomeRemover = (dados.nomePokemonRemover || '').trim().toLowerCase();
          if (nomeRemover && origemAtual) {
            const origens = origemAtual.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.toLowerCase() !== nomeRemover; });
            abaTMs.getRange(i + 1, colOrigem + 1).setValue(origens.join(', '));
          } else {
            // Se não tem nome específico para remover, limpar toda a origem
            abaTMs.getRange(i + 1, colOrigem + 1).setValue('');
          }
        } else {
          // Adicionar Pokémon à origem
          if (origemAtual && !origemAtual.toLowerCase().includes(nomePokemon.toLowerCase())) {
            abaTMs.getRange(i + 1, colOrigem + 1).setValue(origemAtual + ', ' + nomePokemon);
          } else if (!origemAtual) {
            abaTMs.getRange(i + 1, colOrigem + 1).setValue(nomePokemon);
          }
        }
        
        return { success: true, message: 'TM' + tmNumero + ' atualizado com sucesso!' };
      }
    }

    return { success: false, message: 'TM não encontrado: TM' + tmNumero };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Atualizar atack de um Pokémon (slot m1-m10) na aba POKEDEX
 */
function handleAtualizarAtack(planilha, dados) {
  try {
    const aba = planilha.getSheets()[0]; // Aba POKEDEX
    const nomeOriginal = dados.nomePokemon.toLowerCase().trim();
    const slot = (dados.slot || '').toLowerCase().trim(); // m1, m2, ... m10
    const nomeAtack = dados.nomeAtack || '';
    
    const todosOsDados = aba.getDataRange().getValues();
    const cabecalho = todosOsDados[0];
    
    // Encontrar índice da coluna do slot (m1, m2, etc.)
    const colIndex = cabecalho.findIndex(function(col) {
      return col.toString().toLowerCase().trim() === slot;
    });
    
    if (colIndex === -1) {
      return { success: false, message: 'Coluna ' + slot + ' não encontrada na planilha. Colunas disponíveis: ' + cabecalho.join(', ') };
    }
    
    // Buscar Pokémon
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
      const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
      const nomeParaComparar = nomeEV || nomePokemon;
      
      if (nomeParaComparar === nomeOriginal) {
        aba.getRange(i + 1, colIndex + 1).setValue(nomeAtack);
        return { success: true, message: 'Atack ' + slot.toUpperCase() + ' atualizado para ' + nomeAtack };
      }
    }
    
    return { success: false, message: 'Pokémon não encontrado: ' + dados.nomePokemon };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Salvar moves parseados na aba POKEDEX (colunas M1..M10 -> O..X)
 * Espera: dados.nomePokemon | dados.pokemonName e dados.moves (array de objetos com .nome)
 */
function handleSavePokedexMoves(planilha, dados) {
  try {
    if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('handleSavePokedexMoves chamado. payload: ' + JSON.stringify(dados));
    const aba = planilha.getSheets()[0]; // POKEDEX
    // aceitar vários nomes de campo do frontend: 'nomePokemon', 'pokemonName', 'nome' ou 'pokemon'
    const rawNome = (dados.nomePokemon || dados.pokemonName || dados.nome || dados.pokemon || '').toString().trim();
    const nomeOriginal = rawNome.toLowerCase().trim();
    if (!nomeOriginal) {
      if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('handleSavePokedexMoves payload keys: ' + Object.keys(dados).join(', '));
      return { success: false, message: 'nomePokemon não informado (campos esperados: nomePokemon|pokemonName|nome|pokemon)' };
    }

    const todosOsDados = aba.getDataRange().getValues();
    const cabecalho = todosOsDados[0];

    // Encontrar linha do Pokémon (usar EV ou POKEMON como nas outras funções)
    let linhaEncontrada = -1;
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
      const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
      const nomeParaComparar = nomeEV || nomePokemon;
      if (nomeParaComparar === nomeOriginal) { linhaEncontrada = i + 1; break; }
    }
    // (Se não encontrado, vamos criar após normalizar `moves` e `stats`)

    // Normalizar moves
    let moves = dados.moves || [];
    if (typeof moves === 'string') {
      try { moves = JSON.parse(moves); } catch (e) { moves = []; }
    }
    if (!Array.isArray(moves)) moves = [];

    // Normalizar stats enviados pelo frontend (opcional)
    let stats = dados.stats || {};
    if (typeof stats === 'string') {
      try { stats = JSON.parse(stats); } catch (e) { stats = {}; }
    }
    if (!stats || typeof stats !== 'object') stats = {};

    // Extrair possíveis tipos enviados (aceitar vários formatos)
    let tipos = [];
    try {
      if (Array.isArray(stats.tipos)) tipos = stats.tipos;
      else if (Array.isArray(stats.types)) tipos = stats.types;
      else if (typeof stats.tipos === 'string' && stats.tipos.trim()) tipos = stats.tipos.replace(/[()]/g,'').split(/[\/;,|]+/).map(s=>s.trim()).filter(Boolean);
      else if (typeof dados.tipos === 'string' && dados.tipos.trim()) tipos = dados.tipos.replace(/[()]/g,'').split(/[\/;,|]+/).map(s=>s.trim()).filter(Boolean);
      else if (Array.isArray(dados.tipos)) tipos = dados.tipos;
      else if (dados.meta && Array.isArray(dados.meta.tipos)) tipos = dados.meta.tipos;
    } catch(e){ tipos = []; }

    // Se não encontrou a linha, criar uma nova linha antes de gravar (incluir EV e tipos e stats)
    if (linhaEncontrada === -1) {
      try {
        // função auxiliar: separar EV(s) e nome base
        const splitEvBase = (raw) => {
          if (!raw) return { base: '', ev: '' };
          let s = raw.toString().trim();
          // remover caracteres extras
          s = s.replace(/\s+-\s+/g,' ').trim();
          // extrair parenteses
          const par = /\(([^)]+)\)/.exec(s);
          if (par && par[1]) {
            const ev = par[1].trim();
            const base = s.replace(par[0],'').trim();
            return { base: base, ev: ev };
          }
          // split por espaços e detectar qualifiers
          const quals = ['shiny','mega','alolan','galarian','hisui','crowned','shadow','female','male','alpha','beta'];
          let parts = s.split(/\s+/).filter(Boolean);
          if (parts.length>1) {
            // coletar qualifiers do início
            let startQuals = [];
            while(parts.length>1 && quals.indexOf(parts[0].toLowerCase())!==-1){ startQuals.push(parts.shift()); }
            // coletar qualifiers do fim
            let endQuals = [];
            while(parts.length>1 && quals.indexOf(parts[parts.length-1].toLowerCase())!==-1){ endQuals.unshift(parts.pop()); }
            const ev = [...startQuals, ...endQuals].join(' ').trim();
            const base = parts.join(' ').trim();
            if (ev) return { base: base, ev: ev };
          }
          // fallback: nenhum qualifier detectado
          return { base: s, ev: '' };
        };

        const parsed = splitEvBase(rawNome);
        const baseName = parsed.base || rawNome;
        const evName = parsed.ev || '';

        

        // montar uma linha em branco e preencher campos conhecidos
        const novaLinha = new Array(cabecalho.length).fill('');
        // Coluna C (índice 2) = POKEMON (nome base)
        novaLinha[2] = baseName;
        // Coluna D (índice 3) = EV (quando aplicável) — gravar EV completo (ex: "Mega Shiny Scizor")
        if (evName) novaLinha[3] = rawNome;
        // Tipos: colunas G(7)->index6 e H(8)->index7
        if (tipos && tipos.length) {
          if (tipos[0]) novaLinha[6] = tipos[0];
          if (tipos[1]) novaLinha[7] = tipos[1];
        }
        // Tentar localizar o Pokémon base existente para copiar número (col A) e geração (col B)
        try {
          const baseLower = (baseName || '').toString().toLowerCase().trim();
          if (baseLower) {
            for (let j = 1; j < todosOsDados.length; j++) {
              const existing = (todosOsDados[j][2] || '').toString().toLowerCase().trim(); // Coluna C (POKEMON)
              if (existing === baseLower) {
                // copiar número (A) e geração (B)
                const numero = todosOsDados[j][0];
                const ger = todosOsDados[j][1];
                if (numero !== undefined && numero !== null && String(numero).trim() !== '') novaLinha[0] = numero;
                if (ger !== undefined && ger !== null && String(ger).trim() !== '') novaLinha[1] = ger;
                break;
              }
            }
          }
        } catch(e){ if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Erro buscando base para número/ger: ' + e.toString()); }
        // Stats: I(9)=index8, J(10)=9, K(11)=10, L(12)=11, M(13)=12, N(14)=13
        const valOrEmpty = v => (v === undefined || v === null || v === '') ? '' : v;
        if (stats && Object.keys(stats).length) {
          novaLinha[8] = valOrEmpty(stats.hp || stats.HP || stats.Hp || stats.Hp);
          novaLinha[9] = valOrEmpty(stats.atk || stats.attack || stats.Attack || stats.ATK);
          novaLinha[10] = valOrEmpty(stats.def || stats.defense || stats.Defense);
          novaLinha[11] = valOrEmpty(stats.spatk || stats['sp.atk'] || stats['sp.attack'] || stats['Sp. Attack'] || stats['Sp.Attack']);
          novaLinha[12] = valOrEmpty(stats.spdef || stats['sp.def'] || stats['sp.defense'] || stats['Sp. Defense'] || stats['Sp.Defense']);
          novaLinha[13] = valOrEmpty(stats.speed || stats.Speed || stats.SPEED);
        }
        // Preencher colunas O(15) .. X(24) com M1..M10 (caso existam)
        for (let i = 0; i < 10; i++) {
          const valor = (moves[i] && (moves[i].nome || moves[i].name)) ? (moves[i].nome || moves[i].name) : '';
          const colunaIndex = 14 + i;
          if (colunaIndex < novaLinha.length) novaLinha[colunaIndex] = valor;
        }

        const appended = aba.appendRow(novaLinha);
        // obter linha criada
        try { linhaEncontrada = appended.getRow(); } catch(e){ linhaEncontrada = aba.getLastRow(); }
      } catch (e) {
        if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Erro ao criar nova linha: ' + e.toString());
        return { success: false, message: 'Erro ao criar Pokémon: ' + e.toString() };
      }
    }

    // Colunas O(15) .. X(24) correspondem a M1..M10 na estrutura existente
    for (let i = 0; i < 10; i++) {
      const valor = (moves[i] && (moves[i].nome || moves[i].name)) ? (moves[i].nome || moves[i].name) : '';
      aba.getRange(linhaEncontrada, 15 + i).setValue(valor);
    }

    // Gravar stats se existirem — colunas: I(9)=HP, J(10)=Attack, K(11)=Defense, L(12)=Sp.Attack, M(13)=Sp.Defense, N(14)=Speed
    try {
      if (stats && Object.keys(stats).length) {
        const valOrEmpty = v => (v === undefined || v === null || v === '') ? '' : v;
        aba.getRange(linhaEncontrada, 9).setValue(valOrEmpty(stats.hp || stats.HP || stats.HP));
        aba.getRange(linhaEncontrada, 10).setValue(valOrEmpty(stats.atk || stats.attack || stats.Attack || stats.ATK));
        aba.getRange(linhaEncontrada, 11).setValue(valOrEmpty(stats.def || stats.defense || stats.Defense));
        aba.getRange(linhaEncontrada, 12).setValue(valOrEmpty(stats.spatk || stats['sp.atk'] || stats['sp.attack'] || stats['Sp. Attack'] || stats['Sp.Attack']));
        aba.getRange(linhaEncontrada, 13).setValue(valOrEmpty(stats.spdef || stats['sp.def'] || stats['sp.defense'] || stats['Sp. Defense'] || stats['Sp.Defense']));
        aba.getRange(linhaEncontrada, 14).setValue(valOrEmpty(stats.speed || stats.Speed));
      }
    } catch (e) { if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Erro gravando stats: ' + e.toString()); }

    // Gravar tipos se foram enviados (colunas G(7) e H(8))
    try {
      let tiposToWrite = [];
      if (Array.isArray(stats.tipos)) tiposToWrite = stats.tipos;
      else if (Array.isArray(stats.types)) tiposToWrite = stats.types;
      else if (Array.isArray(dados.tipos)) tiposToWrite = dados.tipos;
      else if (dados.meta && Array.isArray(dados.meta.tipos)) tiposToWrite = dados.meta.tipos;
      else if (typeof dados.tipos === 'string' && dados.tipos.trim()) tiposToWrite = dados.tipos.replace(/[()]/g,'').split(/[\/;,|]+/).map(s=>s.trim()).filter(Boolean);

      if (tiposToWrite && tiposToWrite.length) {
        if (tiposToWrite[0]) aba.getRange(linhaEncontrada, 7).setValue(tiposToWrite[0]);
        if (tiposToWrite[1]) aba.getRange(linhaEncontrada, 8).setValue(tiposToWrite[1]);
      }
    } catch(e){ if (typeof DEBUG !== 'undefined' && DEBUG) Logger.log('Erro gravando tipos: ' + e.toString()); }

    return { success: true, message: 'Moves salvos na POKEDEX (M1..M10) para ' + nomeOriginal };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

// =============================================
// HANDLERS ABILITIES (ABILITYS sheet)
// =============================================

/**
 * Atualizar ability na aba ABILITYS (ADM)
 * Campos editáveis: DESCRIÇÃO, POKEMON QUE APRENDE, EXTRA, ORIGEM POKEMON
 */
function handleAtualizarAbility(planilha, dados) {
  try {
    // Validar admin
    const adminEmail = validateTokenAndGetEmail(dados);
    if (!adminEmail) {
      return { success: false, message: 'Token de autenticação inválido ou ausente' };
    }
    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') isAdmin = true;
        break;
      }
    }
    if (!isAdmin) {
      return { success: false, message: 'Sem permissão: apenas administradores podem editar abilities' };
    }

    const aba = planilha.getSheetByName('ABILITYS');
    if (!aba) return { success: false, message: 'Aba ABILITYS não encontrada.' };

    const todosOsDados = aba.getDataRange().getValues();
    if (!todosOsDados || todosOsDados.length === 0) return { success: false, message: 'Aba ABILITYS vazia.' };
    const cabecalho = todosOsDados[0];

    const nomeAbility = (dados.ability || '').toString().trim();
    if (!nomeAbility) return { success: false, message: 'Nome da ability não informado.' };

    // Encontrar linha
    const colAbility = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === 'ABILITY');
    if (colAbility === -1) return { success: false, message: 'Coluna ABILITY não encontrada no cabeçalho.' };

    let linhaIndex = -1;
    for (let i = 1; i < todosOsDados.length; i++) {
      if ((todosOsDados[i][colAbility] || '').toString().trim() === nomeAbility) {
        linhaIndex = i;
        break;
      }
    }
    if (linhaIndex === -1) return { success: false, message: 'Ability não encontrada: ' + nomeAbility };

    // Mapeamento campo frontend -> nome(s) de coluna no cabeçalho
    const camposMap = {
      'descricao': ['DESCRIÇÃO', 'DESCRICAO'],
      'pokemonQueAprende': ['POKEMON QUE APRENDE'],
      'extra': ['EXTRA'],
      'origemPokemon': ['ORIGEM POKEMON']
    };

    const setIfExists = (fieldNames, value) => {
      for (const nomeCol of fieldNames) {
        const idx = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === nomeCol.toUpperCase().trim());
        if (idx !== -1) {
          aba.getRange(linhaIndex + 1, idx + 1).setValue(value);
          return true;
        }
      }
      return false;
    };

    for (const key in camposMap) {
      if (dados[key] !== undefined) {
        setIfExists(camposMap[key], dados[key]);
      }
    }

    return { success: true, message: 'Ability atualizada com sucesso: ' + nomeAbility };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Salvar sugestão de edição de ability (usuário comum)
 * Salva na coluna SUGESTAO da aba ABILITYS
 */
function handleSalvarSugestaoAbility(planilha, dados) {
  try {
    const aba = planilha.getSheetByName('ABILITYS');
    if (!aba) return { sucesso: false, mensagem: 'Aba ABILITYS não encontrada.' };

    const nomeAbility = (dados.ability || '').toString().trim();
    const sugestao = (dados.sugestao || '').toString().trim();
    const emailUser = (dados.email || '').toString().trim();
    if (!nomeAbility) return { sucesso: false, mensagem: 'Nome da ability não informado.' };
    if (!sugestao) return { sucesso: false, mensagem: 'Sugestão vazia.' };

    const todosOsDados = aba.getDataRange().getValues();
    const cabecalho = todosOsDados[0];

    // Encontrar coluna ABILITY
    const colAbility = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === 'ABILITY');
    if (colAbility === -1) return { sucesso: false, mensagem: 'Coluna ABILITY não encontrada.' };

    // Encontrar ou criar coluna SUGESTAO
    let colSugestao = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === 'SUGESTAO');
    if (colSugestao === -1) {
      // Criar coluna SUGESTAO ao final
      colSugestao = cabecalho.length;
      aba.getRange(1, colSugestao + 1).setValue('SUGESTAO');
    }

    // Encontrar linha
    for (let i = 1; i < todosOsDados.length; i++) {
      if ((todosOsDados[i][colAbility] || '').toString().trim() === nomeAbility) {
        const valorAtual = (todosOsDados[i][colSugestao] || '').toString().trim();
        const textoSugestao = emailUser ? (emailUser + ': ' + sugestao) : sugestao;
        const novoValor = valorAtual ? valorAtual + ' - ' + textoSugestao : textoSugestao;
        aba.getRange(i + 1, colSugestao + 1).setValue(novoValor);
        return { sucesso: true, mensagem: 'Sugestão salva com sucesso!' };
      }
    }

    return { sucesso: false, mensagem: 'Ability não encontrada: ' + nomeAbility };
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro: ' + erro.toString() };
  }
}

/**
 * Aprovar sugestão de ability (ADM) — remove a sugestão da coluna SUGESTAO
 */
function handleAprovarSugestaoAbility(planilha, dados) {
  try {
    const adminEmail = validateTokenAndGetEmail(dados);
    if (!adminEmail) return { sucesso: false, mensagem: 'Token inválido.' };

    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') isAdmin = true;
        break;
      }
    }
    if (!isAdmin) return { sucesso: false, mensagem: 'Sem permissão.' };

    const aba = planilha.getSheetByName('ABILITYS');
    if (!aba) return { sucesso: false, mensagem: 'Aba ABILITYS não encontrada.' };

    const todosOsDados = aba.getDataRange().getValues();
    const cabecalho = todosOsDados[0];
    const colAbility = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === 'ABILITY');
    const colSugestao = cabecalho.findIndex(h => (h || '').toString().toUpperCase().trim() === 'SUGESTAO');
    if (colAbility === -1 || colSugestao === -1) return { sucesso: false, mensagem: 'Colunas não encontradas.' };

    const nomeAbility = (dados.ability || '').toString().trim();
    const idxSugestao = parseInt(dados.idx, 10);

    for (let i = 1; i < todosOsDados.length; i++) {
      if ((todosOsDados[i][colAbility] || '').toString().trim() === nomeAbility) {
        const valorAtual = (todosOsDados[i][colSugestao] || '').toString().trim();
        if (!valorAtual) return { sucesso: true, mensagem: 'Nenhuma sugestão para aprovar.' };
        const arr = valorAtual.split(' - ');
        arr.splice(idxSugestao, 1);
        aba.getRange(i + 1, colSugestao + 1).setValue(arr.join(' - '));
        return { sucesso: true, mensagem: 'Sugestão aprovada e removida!' };
      }
    }

    return { sucesso: false, mensagem: 'Ability não encontrada.' };
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro: ' + erro.toString() };
  }
}

/**
 * Atualizar definição de um ataque na aba ATACKS
 */
function handleAtualizarAtackDef(planilha, dados) {
  try {
    if (typeof DEBUG !== 'undefined' && DEBUG) { try { Logger.log('handleAtualizarAtackDef chamado. dados: ' + JSON.stringify(dados)); } catch(e) {} }
    let abaAtacks = planilha.getSheetByName('ATACKS');
    if (!abaAtacks) {
      return { success: false, message: 'Aba ATACKS não encontrada.' };
    }

    const todosOsDados = abaAtacks.getDataRange().getValues();
    if (!todosOsDados || todosOsDados.length === 0) {
      return { success: false, message: 'Aba ATACKS vazia.' };
    }
    const cabecalho = todosOsDados[0];

    const nomeAtack = (dados.atack || dados.atackName || dados.atackNome || dados.nomeAtack || '').toString().trim();
    if (!nomeAtack) {
      return { success: false, message: 'Nome do ataque não informado.' };
    }

    // Encontrar linha do ataque
    let linhaIndex = -1;
    const colAtack = cabecalho.findIndex(h => (h || '').toString().toLowerCase().trim() === 'atack' || (h || '').toString().toLowerCase().trim() === 'attack');
    for (let i = 1; i < todosOsDados.length; i++) {
      const val = (todosOsDados[i][colAtack] || '').toString().trim();
      if (val === nomeAtack) { linhaIndex = i; break; }
    }
    if (linhaIndex === -1) {
      if (typeof DEBUG !== 'undefined' && DEBUG) { try { Logger.log('Atack não encontrado: ' + nomeAtack); } catch(e) {} }
      return { success: false, message: 'Atack não encontrado: ' + nomeAtack };
    }

    // Mapeamento de campos -> cabeçalho esperado
    const camposMap = {
      'acaoAtack': ['ação','ação','acao','ação'],
      'efeito': ['efeito'],
      'tipo': ['type','type'],
      'categoria': ['categoria'],
      'pp': ['pp'],
      'power': ['power'],
      'accuracy': ['accuracy'],
      'gen': ['gen']
    };

    const setIfExists = (fieldNames, value) => {
      for (const nomeCol of fieldNames) {
        const idx = cabecalho.findIndex(h => (h || '').toString().toLowerCase().trim() === nomeCol.toString().toLowerCase().trim());
        if (idx !== -1) {
          abaAtacks.getRange(linhaIndex + 1, idx + 1).setValue(value);
          return true;
        }
      }
      return false;
    };

    // Atualizar campos disponíveis no payload
    for (const key in camposMap) {
      const payloadKey = key;
      const value = dados[payloadKey] !== undefined ? dados[payloadKey] : (dados[key] !== undefined ? dados[key] : undefined);
      if (value !== undefined) {
        setIfExists(camposMap[key], value);
      }
    }

    if (typeof DEBUG !== 'undefined' && DEBUG) { try { Logger.log('Atack atualizado: ' + nomeAtack + ' na linha ' + (linhaIndex+1)); } catch(e) {} }
    return { success: true, message: 'Definição do ataque atualizada com sucesso: ' + nomeAtack };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Adicionar novo atack à aba ATACKS
 */
function handleAdicionarAtack(planilha, dados) {
  try {
    let abaAtacks = planilha.getSheetByName('ATACKS');
    if (!abaAtacks) {
      abaAtacks = planilha.insertSheet('ATACKS');
      abaAtacks.appendRow(['ATACK', 'TYPE', 'CATEGORIA', 'PP', 'POWER', 'ACCURACY', 'GEN']);
    }
    
    // Verificar se o atack já existe
    const todosOsDados = abaAtacks.getDataRange().getValues();
    for (let i = 1; i < todosOsDados.length; i++) {
      if ((todosOsDados[i][0] || '').toString().toLowerCase().trim() === (dados.atack || '').toLowerCase().trim()) {
        return { success: false, message: 'Atack já existe: ' + dados.atack };
      }
    }
    
    abaAtacks.appendRow([
      dados.atack || '',
      dados.type || '',
      dados.categoria || '',
      dados.pp || '',
      dados.power || '',
      dados.accuracy || '',
      dados.gen || ''
    ]);
    
    return { success: true, message: 'Atack adicionado com sucesso!' };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

/**
 * Adicionar novo TM à aba TMs
 */
function handleAdicionarTM(planilha, dados) {
  try {
    let abaTMs = planilha.getSheetByName('TMs');
    if (!abaTMs) {
      abaTMs = planilha.insertSheet('TMs');
      abaTMs.appendRow(['TIPO DE ITEM', 'NUMERO DO TM', 'NOME DO TM', 'TIPAGEM DO TM', 'ORIGEM DO TM', 'TIPO DE DROP', 'SUGESTÃO DE POKEMON']);
    }
    
    // Verificar se TM com mesmo número já existe
    const todosOsDados = abaTMs.getDataRange().getValues();
    const cabecalho = todosOsDados[0];
    const colNumero = cabecalho.indexOf('NUMERO DO TM');
    
    if (colNumero !== -1) {
      for (let i = 1; i < todosOsDados.length; i++) {
        if (String(todosOsDados[i][colNumero]).trim() === String(dados.numero).trim()) {
          return { success: false, message: 'TM com número ' + dados.numero + ' já existe' };
        }
      }
    }
    
    abaTMs.appendRow([
      dados.tipoItem || 'TM',
      dados.numero || '',
      dados.nome || '',
      dados.tipagem || '',
      dados.origem || '',
      dados.tipoDrop || '',
      dados.sugestao || ''
    ]);
    
    return { success: true, message: 'TM adicionado com sucesso!' };
  } catch (erro) {
    return { success: false, message: 'Erro: ' + erro.toString() };
  }
}

function handlePokemonUpdate(planilha, dados) {
  try {
    const aba = planilha.getSheets()[0]; // Primeira aba
    
    // APENAS ATUALIZAR POKÉMON EXISTENTE (não adicionar novos)
    if (dados.acao === 'atualizar') {
      // SEGURANÇA: Apenas administradores podem editar dados de Pokémon
      const adminEmail = validateTokenAndGetEmail(dados);
      if (!adminEmail) {
        return {
          sucesso: false,
          mensagem: 'Token de autenticação inválido ou ausente'
        };
      }

      // Verificar se o usuário é admin na aba 'usuarios'
      const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
      const usuarios = abaUsuarios.getDataRange().getValues();
      let isAdmin = false;
      for (let i = 1; i < usuarios.length; i++) {
        if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
          if (usuarios[i][8] === 'admin') {
            isAdmin = true;
          }
          break;
        }
      }

      if (!isAdmin) {
        return {
          sucesso: false,
          mensagem: 'Sem permissão: apenas administradores podem editar pokémons'
        };
      }

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
        // Estrutura REAL da planilha POKEDEX:
        // A(1): PS | B(2): GEN | C(3): POKEMON | D(4): EV | E(5): LOCALIZAÇÃO | F(6): SUGESTÃO LOCALIZAÇÃO
        // G(7): Type 1 | H(8): Type 2 | I(9): HP | J(10): Attack | K(11): Defense
        // L(12): Sp.Attack | M(13): Sp.Defense | N(14): Speed
        // O(15)-X(24): M1-M10
        
        // A: PS — só atualizar se veio com valor (proteger contra apagar acidentalmente)
        if (dados.pokemon.numero !== undefined && dados.pokemon.numero !== null && String(dados.pokemon.numero).trim() !== '') {
          aba.getRange(linhaEncontrada, 1).setValue(dados.pokemon.numero);
        }
        // Coluna B (GEN) não mexemos
        
        // Se tem EV, atualiza coluna D. Senão, atualiza coluna C
        if (temEV) {
          aba.getRange(linhaEncontrada, 4).setValue(dados.pokemon.nome);     // D: EV (evolução)
        } else {
          aba.getRange(linhaEncontrada, 3).setValue(dados.pokemon.nome);     // C: POKEMON
        }
        
        aba.getRange(linhaEncontrada, 5).setValue(dados.pokemon.localizacao); // E: LOCALIZAÇÃO
        // Coluna F (SUGESTÃO LOCALIZAÇÃO) não mexemos aqui - tem função própria
        // Colunas G e H (Type 1, Type 2) não são editáveis pelo front por enquanto
        
        // Stats - COLUNAS CORRETAS
        aba.getRange(linhaEncontrada, 9).setValue(dados.pokemon.hp);         // I: HP
        aba.getRange(linhaEncontrada, 10).setValue(dados.pokemon.atk);       // J: Attack
        aba.getRange(linhaEncontrada, 11).setValue(dados.pokemon.def);       // K: Defense
        aba.getRange(linhaEncontrada, 12).setValue(dados.pokemon.spatk);     // L: Sp.Attack
        aba.getRange(linhaEncontrada, 13).setValue(dados.pokemon.spdef);     // M: Sp.Defense
        aba.getRange(linhaEncontrada, 14).setValue(dados.pokemon.speed);     // N: Speed
        
        return {
          sucesso: true,
          mensagem: 'Pokémon atualizado com sucesso na planilha!',
          linha: linhaEncontrada
        };
        
      } else {
        return {
          sucesso: false,
          mensagem: 'Pokémon não encontrado na planilha: ' + dados.nomeOriginal + '\n\nLog:\n' + logBusca
        };
      }
    }
    
    // Retornar erro se não for ação de atualizar
    return {
      sucesso: false,
      mensagem: 'Ação não reconhecida. Use acao: "atualizar"'
    };
    
  } catch (erro) {
    return {
      sucesso: false,
      mensagem: 'Erro no servidor: ' + erro.toString()
    };
  }
}

/* ============================================
   FUNÇÕES DE BUILDS SMEARGLE
   ============================================ */

/**
 * Salvar uma build do Smeargle
 */
function handleSalvarBuild(planilha, dados) {
  try {
    const abaBuilds = getOrCreateSheet(planilha, 'BUILDS SMEARGLE');
    
    // Verificar se é a primeira vez (criar cabeçalho)
    const dadosAba = abaBuilds.getDataRange().getValues();
    if (dadosAba.length === 0 || dadosAba[0][0] !== 'NOME DA BUILD') {
      abaBuilds.clear();
      abaBuilds.appendRow(['NOME DA BUILD', 'BUILD COMPLETA', 'DATA', 'USUARIO']);
    }
    
    // Formatar a build no formato: m1 - Move - Pokemon / m2 - Move - Pokemon ...
    const buildFormatada = dados.moves.map((move, index) => {
      return `m${index + 1} - ${move.nome} - ${move.origem}`;
    }).join(' / ');
    
    const nomeBuild = dados.nomeBuild || 'Build sem nome';
    const usuario = dados.usuario || 'Anônimo';
    
    // Adicionar a build
    abaBuilds.appendRow([
      nomeBuild,
      buildFormatada,
      new Date(),
      usuario
    ]);
    
    return {
      success: true,
      message: 'Build salva com sucesso!'
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao salvar build: ' + error.toString()
    };
  }
}

/**
 * Carregar todas as builds salvas
 */
function handleCarregarBuilds(planilha) {
  try {
    const abaBuilds = getOrCreateSheet(planilha, 'BUILDS SMEARGLE');
    const dados = abaBuilds.getDataRange().getValues();
    
    // Se não tem dados ou só tem cabeçalho
    if (dados.length <= 1) {
      return {
        success: true,
        builds: []
      };
    }
    
    // Converter para array de objetos (pular cabeçalho)
    const builds = dados.slice(1).map((linha, index) => ({
      id: index,
      nome: linha[0],
      buildCompleta: linha[1],
      data: linha[2],
      usuario: linha[3]
    }));
    
    return {
      success: true,
      builds: builds
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao carregar builds: ' + error.toString(),
      builds: []
    };
  }
}

/**
 * Excluir uma build do Smeargle (apenas admin)
 */
function handleExcluirBuild(planilha, dados) {
  try {
    // SEGURANÇA: Verificar se é admin
    const adminEmail = validateTokenAndGetEmail(dados);
    
    if (!adminEmail) {
      return {
        success: false,
        message: 'Token de autenticação inválido ou ausente'
      };
    }
    
    // Verificar se o usuário é admin
    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === adminEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') {
          isAdmin = true;
        }
        break;
      }
    }
    
    if (!isAdmin) {
      return {
        success: false,
        message: 'Sem permissão: apenas administradores podem excluir builds'
      };
    }
    
    // Excluir a build
    const abaBuilds = getOrCreateSheet(planilha, 'BUILDS SMEARGLE');
    const buildIndex = parseInt(dados.buildIndex);
    
    // +2 porque: +1 para cabeçalho, +1 para índice baseado em 0
    const linhaParaExcluir = buildIndex + 2;
    
    abaBuilds.deleteRow(linhaParaExcluir);
    
    return {
      success: true,
      message: 'Build excluída com sucesso!'
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao excluir build: ' + error.toString()
    };
  }
}

/* ============================================
   FUNÇÕES DO MARKET / VENDAS
   ============================================ */

/**
 * Salvar uma venda no Market
 * Qualquer membro autenticado pode criar vendas
 */
function handleSalvarVenda(planilha, dados) {
  try {
    let abaVendas = planilha.getSheetByName('VENDAS');
    if (!abaVendas) {
      abaVendas = planilha.insertSheet('VENDAS');
      abaVendas.appendRow(['TEXTO_VENDA', 'DADOS_JSON', 'USUARIO_EMAIL', 'USUARIO_NICKNAME', 'TELEFONE', 'TIMESTAMP', 'STATUS']);
    }
    
    // Verificar se tem cabeçalho correto
    const dadosAba = abaVendas.getDataRange().getValues();
    if (dadosAba.length === 0 || dadosAba[0][0] !== 'TEXTO_VENDA') {
      abaVendas.clear();
      abaVendas.appendRow(['TEXTO_VENDA', 'DADOS_JSON', 'USUARIO_EMAIL', 'USUARIO_NICKNAME', 'TELEFONE', 'TIMESTAMP', 'STATUS']);
    }
    
    const textoVenda = dados.textoVenda || '';
    const dadosJSON = dados.dadosJSON || '{}';
    const email = dados.email || '';
    const nickname = dados.nickname || 'Anônimo';
    const telefone = dados.telefone || '';
    
    abaVendas.appendRow([
      textoVenda,
      dadosJSON,
      email,
      nickname,
      telefone,
      new Date(),
      'ativa'
    ]);
    
    return {
      success: true,
      message: 'Venda salva com sucesso!'
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao salvar venda: ' + error.toString()
    };
  }
}

/**
 * Excluir uma venda (admin ou dono da venda)
 */
function handleExcluirVenda(planilha, dados) {
  try {
    const userEmail = validateTokenAndGetEmail(dados);
    
    if (!userEmail) {
      return {
        success: false,
        message: 'Token de autenticação inválido ou ausente'
      };
    }
    
    const abaVendas = planilha.getSheetByName('VENDAS');
    if (!abaVendas) {
      return { success: false, message: 'Aba VENDAS não encontrada' };
    }
    
    const vendaIndex = parseInt(dados.vendaIndex);
    const linhaParaExcluir = vendaIndex + 2; // +1 cabeçalho, +1 índice 0
    
    const todosOsDados = abaVendas.getDataRange().getValues();
    
    if (linhaParaExcluir > todosOsDados.length || linhaParaExcluir < 2) {
      return { success: false, message: 'Venda não encontrada' };
    }
    
    // Verificar se é admin ou dono da venda
    const emailDono = (todosOsDados[vendaIndex + 1][2] || '').toString().toLowerCase();
    
    // Verificar se é admin
    const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
    const usuarios = abaUsuarios.getDataRange().getValues();
    let isAdmin = false;
    
    for (let i = 1; i < usuarios.length; i++) {
      if ((usuarios[i][0] || '').toString().toLowerCase() === userEmail.toLowerCase()) {
        if (usuarios[i][8] === 'admin') {
          isAdmin = true;
        }
        break;
      }
    }
    
    // Permitir exclusão se for admin OU se for o dono
    if (!isAdmin && userEmail.toLowerCase() !== emailDono) {
      return {
        success: false,
        message: 'Sem permissão: apenas administradores ou o dono podem excluir esta venda'
      };
    }
    
    abaVendas.deleteRow(linhaParaExcluir);
    
    return {
      success: true,
      message: 'Venda excluída com sucesso!'
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao excluir venda: ' + error.toString()
    };
  }
  }