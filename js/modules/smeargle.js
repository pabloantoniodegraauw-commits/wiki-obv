// 🎨 Módulo Smeargle Builder - WIKI OBV

// URL do Google Sheets
const SHEETS_URL = "https://script.google.com/macros/s/AKfycby6b3h2WWcSKYEK_U2RS9WvEODGTYV_GEVcQThaBVEKGRcFGuStBRqEpkTA1KQKtjvAFw/exec";

let smearglePokemonData = [];
let smeargleMovesData = [];
let smeargleSelectedMoves = [];

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
    carregarDadosSmeargle();
}

// Carregar dados do Google Sheets
async function carregarDadosSmeargle() {
    const grid = document.getElementById('movesGrid');
    
    if (!grid) {
        console.error('❌ Elemento movesGrid não encontrado!');
        return;
    }
    
    try {
        console.log('📡 Fazendo fetch da URL:', SHEETS_URL);
        const response = await fetch(SHEETS_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const dados = await response.json();
        console.log('📦 Dados recebidos:', dados.length, 'linhas');
        console.log('📊 Primeira linha:', dados[0]);
        
        smearglePokemonData = dados;
        extrairGolpesSmeargle(dados);
        popularFiltrosSmeargle();
        renderizarGolpesSmeargle(smeargleMovesData);
        
        configurarEventosSmeargle();
        
        console.log('✅ Dados carregados:', smearglePokemonData.length, 'Pokémons');
        console.log('✅ Golpes únicos:', smeargleMovesData.length);
        
    } catch (erro) {
        console.error('❌ Erro ao carregar dados:', erro);
        grid.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar dados: ${erro.message}</p>
                <p style="font-size:0.9em;color:#a0e7ff;">Verifique o console (F12) para mais detalhes</p>
            </div>
        `;
    }
}

// Extrair todos os golpes de M1 a M10
function extrairGolpesSmeargle(pokemons) {
    const golpesMap = new Map();
    
    console.log('🔍 Extraindo golpes de', pokemons.length, 'pokémons...');
    
    let totalM1 = 0;
    let golpesValidos = 0;
    
    pokemons.forEach((pokemon, index) => {
        for (let i = 1; i <= 10; i++) {
            const coluna = `M${i}`;
            const celula = pokemon[coluna];
            
            if (celula && i === 1) { // Apenas M1 aparece no seletor
                totalM1++;
                if (index < 3) { // Log dos primeiros 3 para debug
                    console.log(`M1 de ${pokemon['POKEMON']}:`, celula);
                }
                
                const golpe = parseMove(celula, pokemon['POKEMON']);
                if (golpe) {
                    golpesValidos++;
                    const key = golpe.nome.toLowerCase();
                    if (!golpesMap.has(key)) {
                        golpesMap.set(key, golpe);
                    }
                }
            }
        }
    });
    
    console.log('📊 Total M1 encontrados:', totalM1);
    console.log('✅ Golpes válidos:', golpesValidos);
    console.log('🎯 Golpes únicos:', golpesMap.size);
    
    smeargleMovesData = Array.from(golpesMap.values())
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
function popularFiltrosSmeargle() {
    const tipos = new Set();
    const acoes = new Set();
    const categorias = new Set();
    
    smeargleMovesData.forEach(golpe => {
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
function renderizarGolpesSmeargle(golpes) {
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
    if (smeargleSelectedMoves.length >= 9) {
        alert('⚠️ Máximo de 9 golpes atingido!');
        return;
    }
    
    const golpe = JSON.parse(element.dataset.move);
    
    // Evitar duplicatas
    if (smeargleSelectedMoves.some(g => g.nome === golpe.nome)) {
        alert('⚠️ Este golpe já foi selecionado!');
        return;
    }
    
    smeargleSelectedMoves.push(golpe);
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
    movesCount.textContent = smeargleSelectedMoves.length;
    
    // Calcular tipo dominante
    const tipoDom = tipoDominante(smeargleSelectedMoves);
    
    // Aplicar estilo dinâmico
    card.className = `smeargle-card type-${tipoDom.toLowerCase()}`;
    
    // Atualizar ícone
    typeIcon.innerHTML = `<i class="fas ${TIPO_ICONS[tipoDom] || 'fa-circle'}"></i>`;
    
    // Atualizar badge
    typeBadge.innerHTML = `<span class="type-badge type-${tipoDom.toLowerCase()}">${tipoDom}</span>`;
    
    // Atualizar lista de golpes
    if (smeargleSelectedMoves.length === 0) {
        movesList.innerHTML = '<div class="no-moves-yet">Nenhum golpe selecionado</div>';
    } else {
        movesList.innerHTML = smeargleSelectedMoves.map((golpe, index) => `
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
    smeargleSelectedMoves.splice(index, 1);
    atualizarCardSmeargle();
    buscarPokemonsCompativeis();
};

// Limpar todos os golpes
function limparGolpes() {
    smeargleSelectedMoves = [];
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
    
    if (smeargleSelectedMoves.length === 0) {
        grid.innerHTML = `
            <div class="no-selection">
                <i class="fas fa-hand-pointer"></i>
                <p>Selecione golpes acima para ver os Pokémons compatíveis</p>
            </div>
        `;
        return;
    }
    
    const compativeis = smearglePokemonData.filter(pokemon => {
        for (let i = 0; i < smeargleSelectedMoves.length; i++) {
            const coluna = `M${i + 1}`;
            const celula = pokemon[coluna];
            
            if (!celula || !celula.includes(smeargleSelectedMoves[i].nome)) {
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
function configurarEventosSmeargle() {
    // Filtros
    document.getElementById('filterNome').addEventListener('input', aplicarFiltrosSmeargle);
    document.getElementById('filterTipo').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterAcao').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterCategoria').addEventListener('change', aplicarFiltrosSmeargle);
    
    // Limpar tudo
    document.getElementById('btnClearMoves').addEventListener('click', limparGolpes);
}

// Aplicar filtros
function aplicarFiltrosSmeargle() {
    const nome = document.getElementById('filterNome').value.toLowerCase();
    const tipo = document.getElementById('filterTipo').value;
    const acao = document.getElementById('filterAcao').value;
    const categoria = document.getElementById('filterCategoria').value;
    
    const filtrados = smeargleMovesData.filter(golpe => {
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
