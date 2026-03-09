// 🚀 Sistema de Navegação Modular - WIKI OBV
// Carrega páginas dinamicamente via fetch()

let currentPage = 'pokedex';
let pageInitializers = {}; // Armazena funções de inicialização de cada página

// Carregar página via fetch
async function loadPage(pageName) {
    const container = document.getElementById('page-content');
    
    try {
        console.log(`📄 Carregando página: ${pageName}`);
        
        // Loading temporário
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando ${pageName}...</p>
            </div>
        `;
        
        // Caso especial para admin: redirecionar para admin/admin.html
        if (pageName === 'admin') {
            window.location.href = 'admin/admin.html';
            return;
        }
        // Fetch da página - caminho absoluto para funcionar em qualquer subdiretório
        const base = window.location.pathname.includes('/admin/') ? '/wiki-obv/' : '';
        const response = await fetch(`${base}pages/${pageName}.html`);
        
        console.log(`📡 Resposta HTTP: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        
        const html = await response.text();
        
        console.log(`📦 HTML recebido: ${html.length} caracteres`);
        
        container.innerHTML = html;
        
        currentPage = pageName;
        
        // Executar inicializador específico da página
        if (pageInitializers[pageName]) {
            console.log(`⚙️ Inicializando ${pageName}...`);
            pageInitializers[pageName]();
        } else {
            console.warn(`⚠️ Nenhum inicializador encontrado para ${pageName}`);
        }
            // Inicializar tabs se for stagechanges
            if (pageName === 'stagechanges') {
                // Carregar dinamicamente o script das abas se necessário
                if (!window.setupStageTabs) {
                    var script = document.createElement('script');
                    script.src = 'js/modules/stagechanges-tabs.js';
                    script.onload = function() {
                        console.log('[Tabs] Script das abas carregado dinamicamente');
                        // Carregar abilities.js após stagechanges-tabs.js
                        if (!window.carregarAbilitiesParaTabela) {
                            var scriptAb = document.createElement('script');
                            scriptAb.src = 'js/modules/abilities.js';
                            scriptAb.onload = function() {
                                console.log('[Abilities] Script carregado dinamicamente');
                                if (window.setupStageTabs) window.setupStageTabs();
                            };
                            document.body.appendChild(scriptAb);
                        } else {
                            if (window.setupStageTabs) window.setupStageTabs();
                        }
                    };
                    document.body.appendChild(script);
                } else {
                    // stagechanges-tabs.js já carregado, garantir abilities.js também
                    if (!window.carregarAbilitiesParaTabela) {
                        var scriptAb = document.createElement('script');
                        scriptAb.src = 'js/modules/abilities.js';
                        scriptAb.onload = function() {
                            console.log('[Abilities] Script carregado dinamicamente');
                            console.log('[Tabs] Chamando setupStageTabs após carregamento dinâmico');
                            window.setupStageTabs();
                        };
                        document.body.appendChild(scriptAb);
                    } else {
                        console.log('[Tabs] Chamando setupStageTabs após carregamento dinâmico');
                        window.setupStageTabs();
                    }
                }
            }
        
        console.log(`✅ Página ${pageName} carregada com sucesso`);
        
    } catch (erro) {
        console.error(`❌ Erro ao carregar ${pageName}:`, erro);
        console.error('Stack:', erro.stack);
        
        container.innerHTML = `
            <div class="error">
                <h3><i class="fas fa-exclamation-triangle"></i> Erro ao carregar ${pageName}</h3>
                <p style="color:#ff6464;margin:15px 0;">${erro.message}</p>
                <p style="color:#a0e7ff;font-size:0.9em;">Verifique o console (F12) para mais detalhes</p>
                <button onclick="loadPage('${pageName}')" style="margin-top:20px;padding:10px 25px;background:#ffd700;color:#1a2980;border:none;border-radius:25px;font-weight:bold;cursor:pointer">
                    <i class="fas fa-redo"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

// Registrar inicializador de página
function registerPageInitializer(pageName, initFunction) {
    pageInitializers[pageName] = initFunction;
}

// Inicializador da página Stage Changes (pode ser expandido futuramente)
registerPageInitializer('stagechanges', function() {
    console.log('Stage Changes carregado!');
    // Controle de abas agora é feito exclusivamente pelo HTML da página stagechanges.html

});

// Inicializador da página Market/Mural
registerPageInitializer('marketmural', function() {
    console.log('Market/Mural carregado!');
    function setupMarketMuralTabs() {
        const btnMarket = document.getElementById('btnMarket');
        const btnMural = document.getElementById('btnMural');
        const marketPage = document.getElementById('marketPage');
        const muralPage = document.getElementById('muralPage');
        if (btnMarket && btnMural && marketPage && muralPage) {
            btnMarket.onclick = function(e) {
                e.preventDefault();
                setTimeout(function(){
                  btnMarket.classList.add('active');
                  btnMural.classList.remove('active');
                  marketPage.style.display = 'block';
                  muralPage.style.display = 'none';
                  if (typeof initMarket === 'function') initMarket();
                }, 10);
            };
            btnMural.onclick = function(e) {
                e.preventDefault();
                setTimeout(function(){
                  btnMural.classList.add('active');
                  btnMarket.classList.remove('active');
                  marketPage.style.display = 'none';
                  muralPage.style.display = 'block';
                  if (typeof initMural === 'function') initMural();
                }, 10);
            };
            // Inicializar Market ao abrir a aba unificada
            if (typeof initMarket === 'function') initMarket();
        }
    }
    setupMarketMuralTabs();
});

// Configurar navegação por abas
function setupNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover active de todos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Adicionar active no clicado
            button.classList.add('active');
            
            // Carregar página
            const pageName = button.getAttribute('data-page');
            loadPage(pageName);
        });
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema de navegação modular inicializado');
    
    setupNavigation();
    
    // Carregar página inicial (Pokédex)
    loadPage('pokedex');
});
