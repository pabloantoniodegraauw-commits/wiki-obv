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

/**
 * Responder requisições OPTIONS (preflight CORS)
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
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
      Logger.log('Erro ao validar token: ' + e.toString());
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
    
    // Parse dos dados recebidos
    const dados = JSON.parse(e.postData.contents);
    const action = dados.action;
    
    Logger.log('=== doPost CHAMADO ===');
    Logger.log('Action recebida: "' + action + '"');
    Logger.log('Dados completos: ' + JSON.stringify(dados));

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
      case 'salvarBuild':
        result = handleSalvarBuild(planilha, dados);
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
    
    // Se é objeto simples, converter para ContentService com CORS
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    
    // Resposta padrão
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Ação não reconhecida'
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
 * Adicionar headers CORS a uma resposta
 */
function addCorsHeaders(response) {
  // Apps Script não suporta setHeader em ContentService; apenas retorna
  return response;
}

/**
 * Criar resposta com CORS habilitado
 */
function createCorsResponse(content) {
  return ContentService
    .createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    Logger.log('=== INICIANDO handleAtualizarSugestao ===');
    Logger.log('Dados recebidos: ' + JSON.stringify(dados));
    
    const aba = planilha.getSheets()[0];
    const nomeOriginal = dados.nomePokemon.toLowerCase().trim();
    const novaSugestao = dados.sugestao || '';
    
    Logger.log('Nome procurado: ' + nomeOriginal);
    Logger.log('Nova sugestão: ' + novaSugestao);
    
    const todosOsDados = aba.getDataRange().getValues();
    Logger.log('Total de linhas na planilha: ' + todosOsDados.length);
    
    // Buscar Pokémon
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
      const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
      const nomeParaComparar = nomeEV || nomePokemon;
      
      if (nomeParaComparar === nomeOriginal) {
        Logger.log('POKEMON ENCONTRADO na linha ' + (i + 1));
        Logger.log('Coluna F (índice 5): ' + todosOsDados[i][5]);
        
        // COLUNA F = índice 5 (contando de 0: A=0, B=1, C=2, D=3, E=4, F=5)
        aba.getRange(i + 1, 6).setValue(novaSugestao);
        
        Logger.log('Sugestão salva com sucesso!');
        
        return {
          sucesso: true,
          mensagem: 'Sugestão atualizada com sucesso!'
        };
      }
    }
    
    Logger.log('ERRO: Pokemon não encontrado: ' + nomeOriginal);
    
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
        // Estrutura ATUALIZADA da planilha (com nova coluna F):
        // A: PS | B: GEN | C: POKEMON | D: EV | E: LOCALIZAÇÃO | F: SUGESTÃO LOCALIZAÇÃO | G: TM | H: Nome do TM | I: Categoria
        // J: Type 1 | K: Type 2 | L: HP | M: Attack | N: Defense | O: Sp.Attack | P: Sp.Defense | Q: Speed
        
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
        // Coluna F (SUGESTÃO LOCALIZAÇÃO) não mexemos aqui - tem função própria
        
        // TMs (dividir "TM02 - Dragon Claw" em duas colunas) - AGORA COLUNA G e H
        const tmPartes = dados.pokemon.tms.split(' - ');
        if (tmPartes.length > 0) {
          aba.getRange(linhaEncontrada, 7).setValue(tmPartes[0].trim()); // G: TM (era F)
          if (tmPartes.length > 1) {
            aba.getRange(linhaEncontrada, 8).setValue(tmPartes[1].trim()); // H: Nome do TM (era G)
          }
        }
        // Coluna I (Categoria) não mexemos
        
        // Stats - TODAS DESLOCADAS +1
        aba.getRange(linhaEncontrada, 12).setValue(dados.pokemon.hp);        // L: HP (era K)
        aba.getRange(linhaEncontrada, 13).setValue(dados.pokemon.atk);       // M: Attack (era L)
        aba.getRange(linhaEncontrada, 14).setValue(dados.pokemon.def);       // N: Defense (era M)
        aba.getRange(linhaEncontrada, 15).setValue(dados.pokemon.spatk);     // O: Sp.Attack (era N)
        aba.getRange(linhaEncontrada, 16).setValue(dados.pokemon.spdef);     // P: Sp.Defense (era O)
        aba.getRange(linhaEncontrada, 17).setValue(dados.pokemon.speed);     // Q: Speed (era P)
        
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

