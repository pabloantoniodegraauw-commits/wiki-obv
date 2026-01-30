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
        
        // Fetch da página
        const response = await fetch(`pages/${pageName}.html`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const html = await response.text();
        container.innerHTML = html;
        
        currentPage = pageName;
        
        // Executar inicializador específico da página
        if (pageInitializers[pageName]) {
            console.log(`⚙️ Inicializando ${pageName}...`);
            pageInitializers[pageName]();
        }
        
        console.log(`✅ Página ${pageName} carregada`);
        
    } catch (erro) {
        console.error(`❌ Erro ao carregar ${pageName}:`, erro);
        container.innerHTML = `
            <div class="error">
                <h3><i class="fas fa-exclamation-triangle"></i> Erro</h3>
                <p>Não foi possível carregar a página ${pageName}</p>
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
