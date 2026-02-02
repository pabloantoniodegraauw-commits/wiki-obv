/**
 * ÁREA ADMINISTRATIVA - WIKI-OBV
 * Gerenciamento de membros e logs de atividade
 */

// URL do Google Apps Script (CONFIGURAR)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUakDr5kqR07LFGCzPjVkKGeBJl7pGmvEuY0UQpDHPtpcF7e4r5mFNWcdyksyjdgxifw/exec';

// Obter usuário (já validado pelo admin.html)
const adminUser = JSON.parse(localStorage.getItem('user'));

// Sistema de tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Desativar todos os tabs
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Ativar tab clicado
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(`tab-${tabId}`).classList.add('active');

    // Carregar dados da tab
    if (tabId === 'membros') {
      loadMembers();
    } else if (tabId === 'logs') {
      loadLogs();
    }
  });
});

// Carregar membros ao iniciar
loadMembers();

/**
 * CARREGAR MEMBROS
 */
async function loadMembers() {
  const tbody = document.getElementById('membersTable');
  tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Carregando...</td></tr>';

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getUsers`);
    const data = await response.json();

    if (!data.success || !data.users || data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhum membro encontrado.</td></tr>';
      return;
    }

    // Renderizar tabela
    tbody.innerHTML = data.users.map(member => `
      <tr data-email="${member.email}">
        <td>${member.nickname}</td>
        <td>${member.email}</td>
        <td>${member.level || '-'}</td>
        <td>${member.tipoCla || '-'}</td>
        <td>${member.tier || '-'}</td>
        <td>
          <span class="status-badge status-${member.status}">
            ${member.status.toUpperCase()}
          </span>
        </td>
        <td>
          <span class="role-badge ${member.role === 'admin' ? 'role-admin' : ''}">
            ${member.role.toUpperCase()}
          </span>
        </td>
        <td>
          ${renderActions(member)}
        </td>
      </tr>
    `).join('');

    // Adicionar eventos aos botões
    attachMemberActions();

  } catch (error) {
    console.error('Erro ao carregar membros:', error);
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Erro ao carregar membros.</td></tr>';
  }
}

/**
 * RENDERIZAR BOTÕES DE AÇÃO
 */
function renderActions(member) {
  let actions = [];

  // Botões de aprovação (apenas para pendentes)
  if (member.status === 'pendente') {
    actions.push(`
      <button class="action-btn btn-approve" data-action="approve" data-email="${member.email}">
        Aprovar
      </button>
      <button class="action-btn btn-reject" data-action="reject" data-email="${member.email}">
        Rejeitar
      </button>
    `);
  }

  // Botões de cargo (apenas para aprovados)
  if (member.status === 'aprovado') {
    if (member.role === 'membro') {
      actions.push(`
        <button class="action-btn btn-admin" data-action="makeAdmin" data-email="${member.email}">
          Tornar Admin
        </button>
      `);
    } else if (member.role === 'admin') {
      actions.push(`
        <button class="action-btn btn-remove-admin" data-action="removeAdmin" data-email="${member.email}">
          Remover Admin
        </button>
      `);
    }
  }

  // Botão de remover membro (para todos exceto admin atual)
  if (member.email !== adminUser.email) {
    actions.push(`
      <button class="action-btn btn-reject" data-action="deleteMember" data-email="${member.email}" style="background: #9e9e9e;">
        🗑️ Remover
      </button>
    `);
  }

  return actions.join('');
}

/**
 * ADICIONAR EVENTOS AOS BOTÕES
 */
function attachMemberActions() {
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const action = btn.getAttribute('data-action');
      const email = btn.getAttribute('data-email');

      if (action === 'approve') {
        await approveMember(email);
      } else if (action === 'reject') {
        await rejectMember(email);
      } else if (action === 'makeAdmin') {
        await makeAdmin(email);
      } else if (action === 'removeAdmin') {
        await removeAdmin(email);
      } else if (action === 'deleteMember') {
        await deleteMember(email);
      }
    });
  });
}

/**
 * APROVAR MEMBRO
 */
async function approveMember(email) {
  if (!confirm('Deseja aprovar este membro?')) return;

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'approveUser',
        email: email,
        authToken: adminUser.authToken, // Token validado no backend
        adminEmail: adminUser.email // Fallback (backend prefere o token)
      })
    });

    alert('Membro aprovado com sucesso!');
    loadMembers();
  } catch (error) {
    console.error('Erro ao aprovar:', error);
    alert('Erro ao aprovar membro.');
  }
}

/**
 * REJEITAR MEMBRO
 */
async function rejectMember(email) {
  if (!confirm('Deseja rejeitar este cadastro?')) return;

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'rejectUser',
        email: email,
        authToken: adminUser.authToken, // Token validado no backend
        adminEmail: adminUser.email // Fallback
      })
    });

    alert('Cadastro rejeitado.');
    loadMembers();
  } catch (error) {
    console.error('Erro ao rejeitar:', error);
    alert('Erro ao rejeitar cadastro.');
  }
}

/**
 * TORNAR ADMIN
 */
async function makeAdmin(email) {
  if (!confirm('Deseja tornar este membro um administrador?')) return;

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'setRole',
        email: email,
        role: 'admin',
        authToken: adminUser.authToken, // Token validado no backend
        adminEmail: adminUser.email // Fallback
      })
    });

    alert('Membro promovido a administrador!');
    loadMembers();
  } catch (error) {
    console.error('Erro ao promover:', error);
    alert('Erro ao promover membro.');
  }
}

/**
 * REMOVER ADMIN
 */
async function removeAdmin(email) {
  if (!confirm('Deseja remover os privilégios de administrador?')) return;

  try {
    // Não precisa verificar no front, o backend já valida
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'setRole',
        email: email,
        role: 'membro',
        authToken: adminUser.authToken, // Token validado no backend
        adminEmail: adminUser.email // Fallback
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      alert(data.message || 'Erro ao remover privilégios.');
      return;
    }

    alert('Privilégios removidos.');
    loadMembers();
  } catch (error) {
    console.error('Erro ao remover admin:', error);
    alert('Erro ao remover privilégios.');
  }
}

/**
 * DELETAR MEMBRO (REMOVER DA PLANILHA)
 */
async function deleteMember(email) {
  if (!confirm('⚠️ ATENÇÃO: Deseja REMOVER PERMANENTEMENTE este membro?\n\nEsta ação não pode ser desfeita!')) return;

  try {
    // Enviar requisição (modo no-cors porque Apps Script tem CORS limitado)
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'deleteUser',
        email: email,
        authToken: adminUser.authToken, // Token validado no backend
        adminEmail: adminUser.email // Fallback
      })
    }).catch(err => console.log('Fetch error (expected with no-cors):', err));

    // Aguardar 1 segundo e recarregar
    alert('Membro removido com sucesso!');
    setTimeout(() => {
      loadMembers();
    }, 1000);
    
  } catch (error) {
    console.error('Erro ao deletar membro:', error);
    alert('Erro ao remover membro. Tente recarregar a página.');
  }
}

/**
 * CARREGAR LOGS
 */
async function loadLogs() {
  const tbody = document.getElementById('logsTable');
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Carregando...</td></tr>';

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getLogs`);
    const data = await response.json();

    if (!data.success || !data.logs || data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum log encontrado.</td></tr>';
      return;
    }

    // Agrupar logs por usuário e calcular tempo online
    const userLogs = calculateUserActivity(data.logs);

    // Renderizar tabela
    tbody.innerHTML = Object.values(userLogs).map(log => `
      <tr>
        <td>${log.nickname}</td>
        <td>${log.email}</td>
        <td>${log.firstLogin}</td>
        <td>${log.lastActivity}</td>
        <td>${log.totalTime}</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Erro ao carregar logs:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Erro ao carregar logs.</td></tr>';
  }
}

/**
 * CALCULAR ATIVIDADE DOS USUÁRIOS
 */
function calculateUserActivity(logs) {
  const userActivity = {};

  logs.forEach(log => {
    if (!userActivity[log.email]) {
      userActivity[log.email] = {
        email: log.email,
        nickname: log.nickname,
        firstLogin: null,
        lastActivity: null,
        totalMinutes: 0,
        sessions: []
      };
    }

    const user = userActivity[log.email];
    const timestamp = new Date(log.dataHora);

    // Registrar primeira atividade
    if (!user.firstLogin || timestamp < new Date(user.firstLogin)) {
      user.firstLogin = log.dataHora;
    }

    // Registrar última atividade
    if (!user.lastActivity || timestamp > new Date(user.lastActivity)) {
      user.lastActivity = log.dataHora;
    }

    // Calcular tempo entre eventos
    if (log.evento === 'login') {
      user.sessions.push({ start: timestamp, end: null });
    } else if (log.evento === 'logout' && user.sessions.length > 0) {
      const lastSession = user.sessions[user.sessions.length - 1];
      if (!lastSession.end) {
        lastSession.end = timestamp;
      }
    } else if (log.evento === 'ping' && user.sessions.length > 0) {
      const lastSession = user.sessions[user.sessions.length - 1];
      lastSession.end = timestamp;
    }
  });

  // Calcular tempo total para cada usuário
  Object.values(userActivity).forEach(user => {
    user.sessions.forEach(session => {
      if (session.start && session.end) {
        const minutes = (session.end - session.start) / (1000 * 60);
        user.totalMinutes += minutes;
      }
    });

    // Formatar tempo total
    user.totalTime = formatDuration(user.totalMinutes);
    user.firstLogin = formatDateTime(user.firstLogin);
    user.lastActivity = formatDateTime(user.lastActivity);
  });

  return userActivity;
}

/**
 * FORMATAR DURAÇÃO
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

/**
 * FORMATAR DATA/HORA
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR');
}

/**
 * FILTROS DE LOGS
 */
document.getElementById('filterDate').addEventListener('change', loadLogs);
document.getElementById('filterUser').addEventListener('input', loadLogs);
