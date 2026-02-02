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

  header.innerHTML = `
    <div class="left">
      <img src="./assets/logo-obv.png" alt="OBV" onerror="this.style.display='none'" />
      <span>Wiki-OBV</span>
    </div>

    <div class="right">
      ${user.role === "admin"
        ? `<a href="${adminPath}">Admin</a>`
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
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUakDr5kqR07LFGCzPjVkKGeBJl7pGmvEuY0UQpDHPtpcF7e4r5mFNWcdyksyjdgxifw/exec';
    
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'log',
        email: user.email,
        nickname: user.nickname,
        evento: 'logout'
      })
    }).catch(err => console.error('Erro ao registrar logout:', err));

    // Limpar localStorage e redirecionar
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = loginPath;
  };

  // Iniciar sistema de ping para logs de atividade
  startActivityPing(user);
})();

/**
 * Sistema de ping automático para registrar atividade
 */
function startActivityPing(user) {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUakDr5kqR07LFGCzPjVkKGeBJl7pGmvEuY0UQpDHPtpcF7e4r5mFNWcdyksyjdgxifw/exec';
  const PING_INTERVAL = 5 * 60 * 1000; // 5 minutos

  function sendPing() {
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'log',
        email: user.email,
        nickname: user.nickname,
        evento: 'ping'
      })
    }).catch(err => console.error('Erro no ping:', err));
  }

  // Enviar primeiro ping
  sendPing();

  // Configurar intervalo
  setInterval(sendPing, PING_INTERVAL);

  // Tentar registrar logout ao fechar página
  window.addEventListener('beforeunload', () => {
    navigator.sendBeacon(APPS_SCRIPT_URL, JSON.stringify({
      action: 'log',
      email: user.email,
      nickname: user.nickname,
      evento: 'logout'
    }));
  });
}
