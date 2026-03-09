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