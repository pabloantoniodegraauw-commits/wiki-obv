/**
 * 📋 GOOGLE APPS SCRIPT - WIKI OBV - VERSÃO ALTERNATIVA SEM ENCADEAMENTO
 * Sistema de Autenticação e Gerenciamento de Membros
 * 
 * ⚠️ ESTA VERSÃO USA UMA ABORDAGEM DIFERENTE PARA CORS
 */

// ID da planilha
const SPREADSHEET_ID = '1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ';

/**
 * Responder requisições OPTIONS (preflight CORS)
 * CORS é automaticamente permitido pelo Google Apps Script
 */
function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Validar e extrair email do token de autenticação
 */
function validateTokenAndGetEmail(dados) {
  if (dados.authToken) {
    try {
      const parts = dados.authToken.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(
        Utilities.newBlob(
          Utilities.base64Decode(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        ).getDataAsString()
      );
      
      return payload.email || null;
    } catch (e) {
      Logger.log('Erro ao validar token: ' + e.toString());
      return null;
    }
  }
  
  return dados.adminEmail || dados.email || null;
}

/**
 * Criar resposta JSON com CORS automático
 * Google Apps Script permite CORS quando configurado como "Qualquer pessoa"
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Recebe requisições POST do site
function doPost(e) {
  try {
    const planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dados = JSON.parse(e.postData.contents);
    const action = dados.action;
    
    Logger.log('=== doPost: ' + action + ' ===');

    let result;
    switch (action) {
      case 'login':
        result = checkUser(planilha, dados.email);
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
      default:
        result = handlePokemonUpdate(planilha, dados);
        break;
    }
    
    return jsonResponse(result);
    
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.toString()
    });
  }
}

// Recebe requisições GET do site
function doGet(e) {
  try {
    const planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = e.parameter.action;
    const acao = e.parameter.acao;

    switch (action) {
      case 'checkUser':
        return jsonResponse(checkUser(planilha, e.parameter.email));
      case 'getUsers':
        return jsonResponse(getUsers(planilha));
      case 'getLogs':
        return jsonResponse(getLogs(planilha));
      case 'countAdmins':
        return jsonResponse(countAdmins(planilha));
    }
    
    // Sistema de Pokémon
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
      
      return jsonResponse({
        data: paginados,
        page: page,
        limit: limit,
        total: total,
        hasMore: hasMore
      });
    }
    
    return jsonResponse({
      success: false,
      message: 'Ação não reconhecida'
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.toString()
    });
  }
}

/* === FUNÇÕES DE AUTENTICAÇÃO === */

function checkUser(planilha, email) {
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const dados = abaUsuarios.getDataRange().getValues();
  
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0].toLowerCase() === email.toLowerCase()) {
      return {
        success: true,
        status: dados[i][7],
        email: dados[i][0],
        nome: dados[i][1],
        foto: dados[i][2],
        nickname: dados[i][3],
        role: dados[i][8]
      };
    }
  }
  
  return {
    success: true,
    status: 'nao_cadastrado'
  };
}

function handleCadastro(planilha, dados) {
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      return {
        success: false,
        message: 'Usuário já cadastrado'
      };
    }
  }
  
  abaUsuarios.appendRow([
    dados.email,
    dados.nome,
    dados.foto,
    dados.nickname,
    dados.level,
    dados.tipoCla,
    dados.tier,
    'pendente',
    'membro',
    new Date()
  ]);
  
  return {
    success: true,
    message: 'Cadastro enviado com sucesso'
  };
}

function handleLog(planilha, dados) {
  const abaLogs = getOrCreateSheet(planilha, 'logs');
  
  abaLogs.appendRow([
    dados.email,
    dados.nickname,
    dados.evento,
    new Date()
  ]);
  
  return { success: true };
}

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
  
  return { success: true, logs: logs };
}

/* === FUNÇÕES ADMINISTRATIVAS === */

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
  
  return { success: true, users: users };
}

function handleApproveUser(planilha, dados) {
  const adminEmail = validateTokenAndGetEmail(dados);
  if (!adminEmail) {
    return { success: false, message: 'Token inválido' };
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') isAdmin = true;
      break;
    }
  }
  
  if (!isAdmin) {
    return { success: false, message: 'Sem permissão' };
  }
  
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      abaUsuarios.getRange(i + 1, 8).setValue('aprovado');
      return { success: true };
    }
  }
  
  return { success: false, message: 'Usuário não encontrado' };
}

function handleRejectUser(planilha, dados) {
  const adminEmail = validateTokenAndGetEmail(dados);
  if (!adminEmail) {
    return { success: false, message: 'Token inválido' };
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') isAdmin = true;
      break;
    }
  }
  
  if (!isAdmin) {
    return { success: false, message: 'Sem permissão' };
  }
  
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      abaUsuarios.getRange(i + 1, 8).setValue('rejeitado');
      return { success: true };
    }
  }
  
  return { success: false, message: 'Usuário não encontrado' };
}

function handleSetRole(planilha, dados) {
  const adminEmail = validateTokenAndGetEmail(dados);
  if (!adminEmail) {
    return { success: false, message: 'Token inválido' };
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') isAdmin = true;
      break;
    }
  }
  
  if (!isAdmin) {
    return { success: false, message: 'Sem permissão' };
  }
  
  if (dados.role === 'membro') {
    let totalAdmins = 0;
    for (let i = 1; i < todosOsDados.length; i++) {
      if (todosOsDados[i][8] === 'admin') totalAdmins++;
    }
    if (totalAdmins <= 1) {
      return { success: false, message: 'Não é possível remover o último administrador' };
    }
  }
  
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      abaUsuarios.getRange(i + 1, 9).setValue(dados.role);
      return { success: true };
    }
  }
  
  return { success: false, message: 'Usuário não encontrado' };
}

function countAdmins(planilha) {
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const dados = abaUsuarios.getDataRange().getValues();
  
  let count = 0;
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][8] === 'admin') count++;
  }
  
  return { success: true, count: count };
}

function handleDeleteUser(planilha, dados) {
  const adminEmail = validateTokenAndGetEmail(dados);
  if (!adminEmail) {
    return { success: false, message: 'Token inválido' };
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') isAdmin = true;
      break;
    }
  }
  
  if (!isAdmin) {
    return { success: false, message: 'Sem permissão' };
  }
  
  if (adminEmail.toLowerCase() === dados.email.toLowerCase()) {
    return { success: false, message: 'Você não pode remover sua própria conta' };
  }
  
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      abaUsuarios.deleteRow(i + 1);
      return { success: true, message: 'Usuário removido com sucesso' };
    }
  }
  
  return { success: false, message: 'Usuário não encontrado' };
}

function handleUpdateUser(planilha, dados) {
  const adminEmail = validateTokenAndGetEmail(dados);
  if (!adminEmail) {
    return { success: false, message: 'Token inválido' };
  }
  
  const abaUsuarios = getOrCreateSheet(planilha, 'usuarios');
  const todosOsDados = abaUsuarios.getDataRange().getValues();
  
  let isAdmin = false;
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      if (todosOsDados[i][8] === 'admin') isAdmin = true;
      break;
    }
  }
  
  if (!isAdmin) {
    return { success: false, message: 'Sem permissão' };
  }
  
  for (let i = 1; i < todosOsDados.length; i++) {
    if (todosOsDados[i][0].toLowerCase() === dados.email.toLowerCase()) {
      if (dados.level !== undefined) {
        abaUsuarios.getRange(i + 1, 5).setValue(dados.level);
      }
      if (dados.tipoCla !== undefined) {
        abaUsuarios.getRange(i + 1, 6).setValue(dados.tipoCla);
      }
      if (dados.tier !== undefined) {
        abaUsuarios.getRange(i + 1, 7).setValue(dados.tier);
      }
      return { success: true, message: 'Dados atualizados' };
    }
  }
  
  return { success: false, message: 'Usuário não encontrado' };
}

/* === FUNÇÕES AUXILIARES === */

function getOrCreateSheet(planilha, nome) {
  let aba = planilha.getSheetByName(nome);
  
  if (!aba) {
    aba = planilha.insertSheet(nome);
    
    if (nome === 'usuarios') {
      aba.appendRow(['email', 'nome', 'foto', 'nickname', 'level', 'tipoCla', 'tier', 'status', 'role', 'dataCadastro']);
    } else if (nome === 'logs') {
      aba.appendRow(['email', 'nickname', 'evento', 'dataHora']);
    }
  }
  
  return aba;
}

/* === FUNÇÕES DE POKÉMON === */

function handleAtualizarSugestao(planilha, dados) {
  try {
    const aba = planilha.getSheets()[0];
    const nomeOriginal = dados.nomePokemon.toLowerCase().trim();
    const novaSugestao = dados.sugestao || '';
    const todosOsDados = aba.getDataRange().getValues();
    
    for (let i = 1; i < todosOsDados.length; i++) {
      const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
      const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
      const nomeParaComparar = nomeEV || nomePokemon;
      
      if (nomeParaComparar === nomeOriginal) {
        aba.getRange(i + 1, 6).setValue(novaSugestao);
        return { sucesso: true, mensagem: 'Sugestão atualizada!' };
      }
    }
    
    return { sucesso: false, mensagem: 'Pokémon não encontrado' };
    
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro: ' + erro.toString() };
  }
}

function handlePokemonUpdate(planilha, dados) {
  try {
    const aba = planilha.getSheets()[0];
    
    if (dados.acao === 'atualizar') {
      const nomeOriginal = dados.nomeOriginal.toLowerCase().trim();
      const todosOsDados = aba.getDataRange().getValues();
      let linhaEncontrada = -1;
      
      for (let i = 1; i < todosOsDados.length; i++) {
        const nomeEV = (todosOsDados[i][3] || '').toString().toLowerCase().trim();
        const nomePokemon = (todosOsDados[i][2] || '').toString().toLowerCase().trim();
        const nomeParaComparar = nomeEV || nomePokemon;
        
        if (nomeParaComparar === nomeOriginal) {
          linhaEncontrada = i + 1;
          break;
        }
      }
      
      if (linhaEncontrada > 0) {
        const todosOsDadosLinha = aba.getRange(linhaEncontrada, 1, 1, 16).getValues()[0];
        const temEV = todosOsDadosLinha[3] && todosOsDadosLinha[3].toString().trim() !== '';
        
        aba.getRange(linhaEncontrada, 1).setValue(dados.pokemon.numero);
        
        if (temEV) {
          aba.getRange(linhaEncontrada, 4).setValue(dados.pokemon.nome);
        } else {
          aba.getRange(linhaEncontrada, 3).setValue(dados.pokemon.nome);
        }
        
        aba.getRange(linhaEncontrada, 5).setValue(dados.pokemon.localizacao);
        
        const tmPartes = dados.pokemon.tms.split(' - ');
        if (tmPartes.length > 0) {
          aba.getRange(linhaEncontrada, 7).setValue(tmPartes[0].trim());
          if (tmPartes.length > 1) {
            aba.getRange(linhaEncontrada, 8).setValue(tmPartes[1].trim());
          }
        }
        
        aba.getRange(linhaEncontrada, 12).setValue(dados.pokemon.hp);
        aba.getRange(linhaEncontrada, 13).setValue(dados.pokemon.atk);
        aba.getRange(linhaEncontrada, 14).setValue(dados.pokemon.def);
        aba.getRange(linhaEncontrada, 15).setValue(dados.pokemon.spatk);
        aba.getRange(linhaEncontrada, 16).setValue(dados.pokemon.spdef);
        aba.getRange(linhaEncontrada, 17).setValue(dados.pokemon.speed);
        
        return { sucesso: true, mensagem: 'Pokémon atualizado!', linha: linhaEncontrada };
      } else {
        return { sucesso: false, mensagem: 'Pokémon não encontrado: ' + dados.nomeOriginal };
      }
    }
    
    return { sucesso: false, mensagem: 'Ação não reconhecida' };
    
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro: ' + erro.toString() };
  }
}
