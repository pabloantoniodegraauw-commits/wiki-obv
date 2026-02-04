// 🎨 Módulo Smeargle Builder - WIKI OBV

// URL do Google Sheets (configurar depois)
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzN_3K_zbcWQKy-NMLZRN-4WdkSkxpfhtLKHYpF3IuUWXU-P-WT3HtMbZZXW7tLOj8l/exec";

let todosPokemons = [];
let todosGolpes = [];
let golpesSelecionados = [];

// Ícones por tipo
const TIPO_ICONS = {
    'Normal': 'fa-circle',
    'Fire': 'fa-fire',
    'Water': 'fa-tint',
    'Electric': 'fa-bolt',
    'Grass': 'fa-leaf',
    'Ice': 'fa-snowflake',
    'Fighting': 'fa-fist-raised',
    'Poison': 'fa-skull-crossbones',
    'Ground': 'fa-mountain',
    'Flying': 'fa-feather',
    'Psychic': 'fa-brain',
    'Bug': 'fa-bug',
    'Rock': 'fa-gem',
    'Ghost': 'fa-ghost',
    'Dragon': 'fa-dragon',
    'Dark': 'fa-moon',
    'Steel': 'fa-shield-alt',
    'Fairy': 'fa-star'
};

function initSmeargle() {
    console.log('🎨 Inicializando Smeargle Builder...');
    carregarDados();
}

// Carregar dados do Google Sheets
async function carregarDados() {
    try {
        const response = await fetch(SHEETS_URL);
        const dados = await response.json();
        
        todosPokemons = dados;
        extrairGolpes(dados);
        popularFiltros();
        renderizarGolpes(todosGolpes);
        
        configurarEventos();
        
        console.log('✅ Dados carregados:', todosPokemons.length, 'Pokémons');
        console.log('✅ Golpes únicos:', todosGolpes.length);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar dados:', erro);
        document.getElementById('movesGrid').innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar dados. Verifique a conexão.</p>
            </div>
        `;
    }
}

// Extrair todos os golpes de M1 a M10
function extrairGolpes(pokemons) {
    const golpesMap = new Map();
    
    pokemons.forEach(pokemon => {
        for (let i = 1; i <= 10; i++) {
            const coluna = `M${i}`;
            const celula = pokemon[coluna];
            
            if (celula && i === 1) { // Apenas M1 aparece no seletor
                const golpe = parseMove(celula, pokemon['POKEMON']);
                if (golpe) {
                    const key = golpe.nome.toLowerCase();
                    if (!golpesMap.has(key)) {
                        golpesMap.set(key, golpe);
                    }
                }
            }
        }
    });
    
    todosGolpes = Array.from(golpesMap.values())
        .sort((a, b) => a.nome.localeCompare(b.nome));
}

// Parse do formato: "Giga Impact / pulo / Normal / Físico"
function parseMove(cell, pokemonOrigem) {
    if (!cell || typeof cell !== 'string') return null;
    
    const partes = cell.split('/').map(v => v.trim());
    if (partes.length < 4) return null;
    
    return {
        nome: partes[0],
        acao: partes[1],
        tipo: partes[2],
        categoria: partes[3],
        origem: pokemonOrigem
    };
}

// Popular filtros dinamicamente
function popularFiltros() {
    const tipos = new Set();
    const acoes = new Set();
    const categorias = new Set();
    
    todosGolpes.forEach(golpe => {
        tipos.add(golpe.tipo);
        acoes.add(golpe.acao);
        categorias.add(golpe.categoria);
    });
    
    const filterTipo = document.getElementById('filterTipo');
    const filterAcao = document.getElementById('filterAcao');
    const filterCategoria = document.getElementById('filterCategoria');
    
    Array.from(tipos).sort().forEach(tipo => {
        filterTipo.innerHTML += `<option value="${tipo}">${tipo}</option>`;
    });
    
    Array.from(acoes).sort().forEach(acao => {
        filterAcao.innerHTML += `<option value="${acao}">${acao}</option>`;
    });
    
    Array.from(categorias).sort().forEach(cat => {
        filterCategoria.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

// Renderizar golpes no grid
function renderizarGolpes(golpes) {
    const grid = document.getElementById('movesGrid');
    
    if (golpes.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Nenhum golpe encontrado com esses filtros</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = golpes.map(golpe => `
        <div class="move-card type-${golpe.tipo.toLowerCase()}" 
             data-move='${JSON.stringify(golpe)}'
             onclick="selecionarGolpe(this)">
            <div class="move-tipo-icon">
                <i class="fas ${TIPO_ICONS[golpe.tipo] || 'fa-circle'}"></i>
            </div>
            <div class="move-name">${golpe.nome}</div>
            <div class="move-details">
                <span class="move-tipo">${golpe.tipo}</span>
                <span class="move-categoria">${golpe.categoria}</span>
            </div>
            <div class="move-acao">
                <i class="fas fa-running"></i> ${golpe.acao}
            </div>
            <div class="move-origem">
                <i class="fas fa-paw"></i> ${golpe.origem}
            </div>
        </div>
    `).join('');
}

// Selecionar golpe
window.selecionarGolpe = function(element) {
    if (golpesSelecionados.length >= 9) {
        alert('⚠️ Máximo de 9 golpes atingido!');
        return;
    }
    
    const golpe = JSON.parse(element.dataset.move);
    
    // Evitar duplicatas
    if (golpesSelecionados.some(g => g.nome === golpe.nome)) {
        alert('⚠️ Este golpe já foi selecionado!');
        return;
    }
    
    golpesSelecionados.push(golpe);
    atualizarCardSmeargle();
    buscarPokemonsCompativeis();
    
    // Feedback visual
    element.style.animation = 'none';
    setTimeout(() => {
        element.style.animation = 'pulseSelect 0.4s ease';
    }, 10);
};

// Atualizar card do Smeargle
function atualizarCardSmeargle() {
    const card = document.getElementById('smeargleCard');
    const typeIcon = document.getElementById('smeargleTypeIcon');
    const typeBadge = document.getElementById('smeargleTypeBadge');
    const movesList = document.getElementById('movesList');
    const movesCount = document.getElementById('movesCount');
    
    // Contar golpes
    movesCount.textContent = golpesSelecionados.length;
    
    // Calcular tipo dominante
    const tipoDom = tipoDominante(golpesSelecionados);
    
    // Aplicar estilo dinâmico
    card.className = `smeargle-card type-${tipoDom.toLowerCase()}`;
    
    // Atualizar ícone
    typeIcon.innerHTML = `<i class="fas ${TIPO_ICONS[tipoDom] || 'fa-circle'}"></i>`;
    
    // Atualizar badge
    typeBadge.innerHTML = `<span class="type-badge type-${tipoDom.toLowerCase()}">${tipoDom}</span>`;
    
    // Atualizar lista de golpes
    if (golpesSelecionados.length === 0) {
        movesList.innerHTML = '<div class="no-moves-yet">Nenhum golpe selecionado</div>';
    } else {
        movesList.innerHTML = golpesSelecionados.map((golpe, index) => `
            <div class="selected-move-item">
                <span class="move-number">${index + 1}</span>
                <span class="move-info">
                    <strong>${golpe.nome}</strong>
                    <small>${golpe.tipo} • ${golpe.categoria}</small>
                </span>
                <button class="btn-remove-move" onclick="removerGolpe(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
}

// Calcular tipo dominante
function tipoDominante(moves) {
    if (moves.length === 0) return 'Normal';
    
    const contagem = {};
    moves.forEach(m => {
        contagem[m.tipo] = (contagem[m.tipo] || 0) + 1;
    });
    
    return Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Normal';
}

// Remover golpe
window.removerGolpe = function(index) {
    golpesSelecionados.splice(index, 1);
    atualizarCardSmeargle();
    buscarPokemonsCompativeis();
};

// Limpar todos os golpes
function limparGolpes() {
    golpesSelecionados = [];
    atualizarCardSmeargle();
    document.getElementById('compatibleGrid').innerHTML = `
        <div class="no-selection">
            <i class="fas fa-hand-pointer"></i>
            <p>Selecione golpes acima para ver os Pokémons compatíveis</p>
        </div>
    `;
}

// Buscar Pokémons compatíveis
function buscarPokemonsCompativeis() {
    const grid = document.getElementById('compatibleGrid');
    
    if (golpesSelecionados.length === 0) {
        grid.innerHTML = `
            <div class="no-selection">
                <i class="fas fa-hand-pointer"></i>
                <p>Selecione golpes acima para ver os Pokémons compatíveis</p>
            </div>
        `;
        return;
    }
    
    const compativeis = todosPokemons.filter(pokemon => {
        for (let i = 0; i < golpesSelecionados.length; i++) {
            const coluna = `M${i + 1}`;
            const celula = pokemon[coluna];
            
            if (!celula || !celula.includes(golpesSelecionados[i].nome)) {
                return false;
            }
        }
        return true;
    });
    
    if (compativeis.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-times-circle"></i>
                <p>Nenhum Pokémon possui essa sequência de golpes</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = compativeis.map(pokemon => `
        <div class="compatible-card">
            <div class="compatible-img">
                <img src="${obterImagemPokemon(pokemon['POKEMON'])}" 
                     alt="${pokemon['POKEMON']}"
                     onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
            </div>
            <div class="compatible-name">${pokemon['POKEMON']}</div>
            <div class="compatible-location">
                <i class="fas fa-map-marker-alt"></i> ${pokemon['LOCALIZAÇÃO'] || 'Não informado'}
            </div>
        </div>
    `).join('');
}

// Obter imagem do Pokémon
function obterImagemPokemon(nome) {
    const nomeFormatado = nome.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-");
    return `https://img.pokemondb.net/sprites/home/normal/${nomeFormatado}.png`;
}

// Configurar eventos
function configurarEventos() {
    // Filtros
    document.getElementById('filterNome').addEventListener('input', aplicarFiltros);
    document.getElementById('filterTipo').addEventListener('change', aplicarFiltros);
    document.getElementById('filterAcao').addEventListener('change', aplicarFiltros);
    document.getElementById('filterCategoria').addEventListener('change', aplicarFiltros);
    
    // Limpar tudo
    document.getElementById('btnClearMoves').addEventListener('click', limparGolpes);
}

// Aplicar filtros
function aplicarFiltros() {
    const nome = document.getElementById('filterNome').value.toLowerCase();
    const tipo = document.getElementById('filterTipo').value;
    const acao = document.getElementById('filterAcao').value;
    const categoria = document.getElementById('filterCategoria').value;
    
    const filtrados = todosGolpes.filter(golpe => {
        return (!nome || golpe.nome.toLowerCase().includes(nome)) &&
               (!tipo || golpe.tipo === tipo) &&
               (!acao || golpe.acao === acao) &&
               (!categoria || golpe.categoria === categoria);
    });
    
    renderizarGolpes(filtrados);
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('smeargle', initSmeargle);
    console.log('✅ Inicializador Smeargle registrado');
}
