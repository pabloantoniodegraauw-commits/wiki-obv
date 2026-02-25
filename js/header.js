/**
 * HEADER GLOBAL DO WIKI-OBV
 * 
 * Este script injeta automaticamente o header em qualquer página que o inclua.
 * Verifica autenticação, exibe informações do usuário e controla acesso admin.
 */

(function () {
  // Constantes de configuração
  const SESSION_EXPIRATION = 8 * 60 * 60 * 1000; // 8 horas em milissegundos
  
  // Verificar se usuário está logado
  const userStr = localStorage.getItem("user");
  
  // Detectar se estamos na página principal ou admin
  const isIndexPage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/wiki-obv/');
  const loginPath = isIndexPage ? './login.html' : '../login.html';
  const adminPath = isIndexPage ? './admin/admin.html' : '../admin/admin.html';
  
  if (!userStr) {
    // Não está logado - redirecionar para login
    window.location.href = loginPath;
    return;
  }

  const user = JSON.parse(userStr);

  // SEGURANÇA: Verificar expiração da sessão
  if (user.loginAt) {
    const sessionAge = Date.now() - user.loginAt;
    
    if (sessionAge > SESSION_EXPIRATION) {
      // Sessão expirada
      console.warn('Sessão expirada após 8 horas');
      alert('Sua sessão expirou. Por favor, faça login novamente.');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = loginPath;
      return;
    }
  }

  // Criar elemento do header
  const header = document.createElement("header");
  header.className = "obv-header";

  // Variável para o badge de pendentes
  let badgeHTML = '';
  
  // Se for admin, buscar quantidade de pendentes
  if (user.role === 'admin') {
    fetchPendingCount().then(count => {
      if (count > 0) {
        const badge = document.querySelector('.admin-badge');
        if (badge) {
          badge.textContent = count;
          badge.style.display = 'flex';
        }
      }
    });
  }

  header.innerHTML = `
    <div class="left">
      <img src="${isIndexPage ? './assets/logo-obv.png' : '../assets/logo-obv.png'}" alt="OBV" onerror="this.style.display='none'" />
      <span>Wiki-OBV</span>
    </div>

    <div class="right">
      ${!isIndexPage
        ? `<a href="../index.html" style="margin-right: 12px; color: #9bbcff;">← Voltar</a>`
        : ""}
      ${user.role === "admin"
        ? `<a href="${adminPath}" style="position: relative; display: inline-flex; align-items: center;">
            Admin
            <span class="admin-badge" style="display: none; position: absolute; top: -8px; right: -12px; background: #f44336; color: white; border-radius: 10px; padding: 2px 6px; font-size: 11px; font-weight: bold; min-width: 18px; height: 18px; align-items: center; justify-content: center;">0</span>
          </a>`
        : ""}
      
      <div class="obv-user">
        <img src="${user.foto}" alt="Foto do usuário" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname)}&background=667eea&color=fff'" />
        <div class="info">
          <div class="nickname">${user.nome}</div>
          <div class="role">${user.role === "admin" ? "ADMIN" : "MEMBRO"}</div>
        </div>
      </div>

      <button id="logoutBtn">Sair</button>
    </div>
  `;

  // Adicionar header no topo do body
  document.body.prepend(header);

  // Configurar botão de logout
  document.getElementById("logoutBtn").onclick = () => {
    // Registrar logout nos logs
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';
    
    try {
      const form = new URLSearchParams();
      form.append('action', 'log');
      form.append('email', user.email || '');
      form.append('nickname', user.nickname || '');
      form.append('evento', 'logout');
      fetch(APPS_SCRIPT_URL, { method: 'POST', body: form }).catch(err => console.error('Erro ao registrar logout:', err));
    } catch (err) {
      console.error('Erro ao construir payload de logout:', err);
    }

    // Limpar localStorage e redirecionar
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = loginPath;
  };

  // Iniciar sistema de ping para logs de atividade
  startActivityPing(user);
})();

/**
 * Buscar quantidade de cadastros pendentes (somente para admins)
 */
async function fetchPendingCount() {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';
  
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getUsers`);
    const data = await response.json();
    
    if (data.success && data.users) {
      return data.users.filter(u => u.status === 'pendente').length;
    }
  } catch (error) {
    console.error('Erro ao buscar pendentes:', error);
  }
  
  return 0;
}

/**
 * Sistema de ping automático para registrar atividade
 */
function startActivityPing(user) {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';
  const PING_INTERVAL = 5 * 60 * 1000; // 5 minutos

  function sendPing() {
    try {
      const form = new URLSearchParams();
      form.append('action', 'log');
      form.append('email', user.email || '');
      form.append('nickname', user.nickname || '');
      form.append('evento', 'ping');
      fetch(APPS_SCRIPT_URL, { method: 'POST', body: form }).catch(err => console.error('Erro no ping:', err));
    } catch (err) {
      console.error('Erro ao construir payload de ping:', err);
    }
  }

  // Enviar primeiro ping
  sendPing();

  // Configurar intervalo
  setInterval(sendPing, PING_INTERVAL);

  // Tentar registrar logout ao fechar página
  window.addEventListener('beforeunload', () => {
    try {
      const params = new URLSearchParams();
      params.append('action', 'log');
      params.append('email', user.email || '');
      params.append('nickname', user.nickname || '');
      params.append('evento', 'logout');
      // sendBeacon may not set form content-type; keep best-effort
      navigator.sendBeacon(APPS_SCRIPT_URL, params.toString());
    } catch (err) {
      // fallback silent
    }
  });
}
