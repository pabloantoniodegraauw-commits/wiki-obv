// 🎨 Módulo Smeargle Builder - WIKI OBV

// URL do Google Sheets - IMPORTANTE: Usar "acao" (sem "ti") conforme esperado pelo Apps Script
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec?acao=obter_todos&page=1&limit=10000";
const SHEETS_BASE_URL = "https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec";

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
        
        const textoResposta = await response.text();
        console.log('📄 Texto recebido (primeiros 200 chars):', textoResposta.substring(0, 200));
        
        // Parse do JSON
        let resultado;
        try {
            resultado = JSON.parse(textoResposta);
            console.log('✅ JSON parseado. Tipo:', typeof resultado);
            console.log('📋 Propriedades:', Object.keys(resultado));
        } catch (e) {
            throw new Error('Resposta não é JSON válido: ' + e.message);
        }
        
        // Verificar se a resposta tem formato paginado ou array direto
        let dados;
        if (Array.isArray(resultado)) {
            dados = resultado;
            console.log('📦 Formato: Array direto');
        } else if (resultado.data && Array.isArray(resultado.data)) {
            dados = resultado.data;
            console.log('📦 Formato: Objeto com data[]');
        } else {
            console.error('❌ Formato não reconhecido:', resultado);
            throw new Error('Formato de resposta não reconhecido');
        }
        
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
            
            if (celula) { // Extrair TODOS os golpes (M1 até M10)
                if (i === 1) totalM1++;
                
                if (index < 3 && i === 1) { // Log dos primeiros 3 para debug
                    console.log(`M1 de ${pokemon['POKEMON']}:`, celula);
                }
                
                const golpe = parseMove(celula, pokemon['POKEMON'], coluna);
                if (golpe) {
                    golpesValidos++;
                    const key = golpe.nome.toLowerCase() + '_' + coluna;
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
function parseMove(cell, pokemonOrigem, local) {
    if (!cell || typeof cell !== 'string') return null;
    
    const partes = cell.split('/').map(v => v.trim());
    if (partes.length < 4) return null;
    
    return {
        nome: partes[0],
        acao: partes[1],
        tipo: partes[2],
        categoria: partes[3],
        origem: pokemonOrigem,
        local: local || 'M1'
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
    
    const nomesSelecionados = smeargleSelectedMoves.map(m => m.nome.toLowerCase());
    
    grid.innerHTML = golpes.map(golpe => {
        const estaSelecionado = nomesSelecionados.includes(golpe.nome.toLowerCase());
        const classeExtra = estaSelecionado ? ' move-card-selected' : '';
        
        return `
            <div class="move-card type-${golpe.tipo.toLowerCase()}${classeExtra}" 
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
                ${estaSelecionado ? '<div class="move-selected-badge"><i class="fas fa-check-circle"></i></div>' : ''}
            </div>
        `;
    }).join('');
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
    
    // VALIDAÇÃO: Verificar se o move pode ser adicionado na próxima posição
    const proximaPosicao = smeargleSelectedMoves.length + 1;
    if (!validarPosicaoMove(golpe, proximaPosicao)) {
        alert(`⚠️ Este golpe só está disponível em: ${obterPosicoesDisponiveis(golpe).join(', ')}\nVocê está tentando adicionar na posição M${proximaPosicao}.`);
        return;
    }
    
    smeargleSelectedMoves.push(golpe);
    atualizarCardSmeargle();
    buscarPokemonsCompativeis();
    
    // Reordenar grid para mostrar moves selecionados no topo
    reordenarGridMovesOrdenado();
    
    // Feedback visual
    element.style.animation = 'none';
    setTimeout(() => {
        element.style.animation = 'pulseSelect 0.4s ease';
    }, 10);
};

// Validar se um move pode ser adicionado em uma posição específica
function validarPosicaoMove(golpe, posicao) {
    const posicaoStr = `M${posicao}`;
    
    // Buscar todas as posições onde este golpe aparece
    const posicoesDisponiveis = obterPosicoesDisponiveis(golpe);
    
    // Verificar se a posição desejada está disponível
    return posicoesDisponiveis.includes(posicaoStr);
}

// Obter todas as posições onde um golpe está disponível
function obterPosicoesDisponiveis(golpe) {
    const posicoes = new Set();
    
    smearglePokemonData.forEach(pokemon => {
        for (let i = 1; i <= 10; i++) {
            const coluna = `M${i}`;
            const celula = pokemon[coluna];
            
            if (celula && typeof celula === 'string') {
                const partes = celula.split('/').map(v => v.trim());
                if (partes.length >= 1 && partes[0].toLowerCase() === golpe.nome.toLowerCase()) {
                    posicoes.add(coluna);
                }
            }
        }
    });
    
    return Array.from(posicoes).sort();
}

// Reordenar grid para mostrar moves selecionados no topo
function reordenarGridMovesOrdenado() {
    const filtros = {
        nome: document.getElementById('filterNome').value.toLowerCase(),
        tipo: document.getElementById('filterTipo').value,
        acao: document.getElementById('filterAcao').value,
        categoria: document.getElementById('filterCategoria').value,
        local: document.getElementById('filterLocal').value
    };
    
    // Aplicar filtros primeiro
    let movesFiltrados = smeargleMovesData.filter(golpe => {
        return (!filtros.nome || golpe.nome.toLowerCase().includes(filtros.nome)) &&
               (!filtros.tipo || golpe.tipo === filtros.tipo) &&
               (!filtros.acao || golpe.acao === filtros.acao) &&
               (!filtros.categoria || golpe.categoria === filtros.categoria) &&
               (!filtros.local || golpe.local === filtros.local);
    });
    
    // Separar moves selecionados e não selecionados
    const movesSelecionados = [];
    const movesNaoSelecionados = [];
    
    const nomesSelecionados = smeargleSelectedMoves.map(m => m.nome.toLowerCase());
    
    movesFiltrados.forEach(move => {
        const index = nomesSelecionados.indexOf(move.nome.toLowerCase());
        if (index !== -1) {
            // Adicionar na ordem de seleção
            movesSelecionados[index] = move;
        } else {
            movesNaoSelecionados.push(move);
        }
    });
    
    // Remover undefined do array (caso haja gaps)
    const movesOrdenados = movesSelecionados.filter(m => m).concat(movesNaoSelecionados);
    
    renderizarGolpesSmeargle(movesOrdenados);
}

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
    reordenarGridMovesOrdenado();
};

// Limpar todos os golpes
function limparGolpes() {
    smeargleSelectedMoves = [];
    atualizarCardSmeargle();
    reordenarGridMovesOrdenado();
    document.getElementById('compatibleGrid').innerHTML = `
        <div class="no-selection">
            <i class="fas fa-hand-pointer"></i>
            <p>Selecione golpes acima para ver os Pokémons compatíveis</p>
        </div>
    `;
}

// Buscar Pokémons compatíveis (mostra o Pokémon de origem de cada golpe)
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
    
    // Mostrar o Pokémon de origem de cada golpe selecionado na ordem
    grid.innerHTML = smeargleSelectedMoves.map((golpe, index) => {
        // Buscar o pokémon completo na base de dados
        const pokemon = smearglePokemonData.find(p => 
            (p['POKEMON'] || '').toLowerCase() === golpe.origem.toLowerCase() ||
            (p['EV'] || '').toLowerCase() === golpe.origem.toLowerCase()
        );
        
        if (!pokemon) {
            return `
                <div class="compatible-card">
                    <div class="compatible-img">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png" 
                             alt="${golpe.origem}">
                    </div>
                    <div class="compatible-name">${golpe.origem}</div>
                    <div class="compatible-move">
                        <i class="fas fa-star"></i> M${index + 1}: ${golpe.nome}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="compatible-card">
                <div class="compatible-img">
                    <img src="${window.obterImagemPokemon ? window.obterImagemPokemon(pokemon['EV'] || pokemon['POKEMON'], pokemon['POKEMON']) : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'}" 
                         alt="${pokemon['POKEMON']}"
                         onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
                </div>
                <div class="compatible-name">${pokemon['EV'] || pokemon['POKEMON']}</div>
                <div class="compatible-move">
                    <i class="fas fa-star"></i> M${index + 1}: ${golpe.nome}
                </div>
                <div class="compatible-location">
                    <i class="fas fa-map-marker-alt"></i> ${pokemon['LOCALIZAÇÃO'] || 'Não informado'}
                </div>
            </div>
        `;
    }).join('');
}

// Configurar eventos
function configurarEventosSmeargle() {
    // Filtros
    document.getElementById('filterNome').addEventListener('input', aplicarFiltrosSmeargle);
    document.getElementById('filterTipo').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterAcao').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterCategoria').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterLocal').addEventListener('change', aplicarFiltrosSmeargle);
    
    // Limpar tudo
    document.getElementById('btnClearMoves').addEventListener('click', limparGolpes);
}

// Aplicar filtros
function aplicarFiltrosSmeargle() {
    reordenarGridMovesOrdenado();
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('smeargle', initSmeargle);
    console.log('✅ Inicializador Smeargle registrado');
}

/* ============================================
   FUNÇÕES DE GERENCIAMENTO DE BUILDS
   ============================================ */

// Abrir modal de builds
window.abrirModalBuilds = function() {
    const modal = document.getElementById('modalBuilds');
    modal.style.display = 'flex';
    
    // Atualizar preview da build atual
    atualizarPreviewBuild();
    
    // Carregar builds salvas
    carregarBuilds();
};

// Fechar modal de builds
window.fecharModalBuilds = function() {
    const modal = document.getElementById('modalBuilds');
    modal.style.display = 'none';
};

// Atualizar preview da build atual
function atualizarPreviewBuild() {
    const preview = document.getElementById('buildPreview');
    
    if (smeargleSelectedMoves.length === 0) {
        preview.innerHTML = '<em>Nenhum golpe selecionado. Selecione golpes antes de salvar.</em>';
        preview.style.display = 'block';
        return;
    }
    
    const buildText = smeargleSelectedMoves.map((move, index) => 
        `m${index + 1} - ${move.nome} - ${move.origem}`
    ).join(' / ');
    
    preview.innerHTML = `<strong>Preview:</strong> ${buildText}`;
    preview.style.display = 'block';
}

// Salvar build atual
window.salvarBuildAtual = async function() {
    const nomeBuild = document.getElementById('inputNomeBuild').value.trim();
    
    if (!nomeBuild) {
        alert('⚠️ Por favor, digite um nome para a build!');
        return;
    }
    
    if (smeargleSelectedMoves.length === 0) {
        alert('⚠️ Selecione pelo menos um golpe antes de salvar!');
        return;
    }
    
    try {
        // Obter dados do usuário do localStorage
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const usuario = user && user.nickname ? user.nickname : 'Anônimo';
        
        // Usar URLSearchParams para enviar como form data (evita preflight CORS)
        const formData = new URLSearchParams({
            action: 'salvarBuild',
            nomeBuild: nomeBuild,
            moves: JSON.stringify(smeargleSelectedMoves),
            usuario: usuario
        });
        
        const response = await fetch(SHEETS_BASE_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Build salva com sucesso!');
            document.getElementById('inputNomeBuild').value = '';
            carregarBuilds(); // Recarregar lista
        } else {
            alert('❌ Erro ao salvar build: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao salvar build:', error);
        alert('❌ Erro ao salvar build. Verifique o console.');
    }
};

// Carregar builds salvas
async function carregarBuilds() {
    const buildsList = document.getElementById('buildsList');
    buildsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    
    try {
        const response = await fetch(`${SHEETS_BASE_URL}?action=carregarBuilds`);
        const result = await response.json();
        
        // Verificar se usuário é admin
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const isAdmin = user && user.role === 'admin';
        
        if (result.success && result.builds.length > 0) {
            buildsList.innerHTML = result.builds.map((build, index) => `
                <div class="build-item">
                    <div onclick="aplicarBuild('${build.buildCompleta.replace(/'/g, "&apos;")}', '${build.nome.replace(/'/g, "&apos;")}')" style="cursor: pointer; flex: 1;">
                        <div class="build-item-header">
                            <div class="build-item-name">${build.nome}</div>
                            <div class="build-item-date">${formatarData(build.data)}</div>
                        </div>
                        <div class="build-item-content">${build.buildCompleta}</div>
                        <div class="build-item-usuario">Por: ${build.usuario}</div>
                    </div>
                    ${isAdmin ? `
                        <button class="btn-delete-build" onclick="event.stopPropagation(); excluirBuild(${index}, '${build.nome.replace(/'/g, "&apos;")}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            `).join('');
        } else {
            buildsList.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">Nenhuma build salva ainda.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar builds:', error);
        buildsList.innerHTML = '<p style="color: #ff6464; text-align: center; padding: 20px;">Erro ao carregar builds.</p>';
    }
}

// Aplicar uma build selecionada
window.aplicarBuild = function(buildCompleta, nomeBuild) {
    try {
        // Limpar seleção atual
        smeargleSelectedMoves = [];
        
        // Parsear a build: "m1 - Shadow Ball - Chandelure / m2 - ..."
        // Função para normalizar nome de origem (remove prefixos regionais e EVs)
        function normalizarOrigem(origem) {
            if (!origem) return '';
            // Remove prefixos regionais e EVs
            return origem
                .replace(/^(Hisuian|Alolan|Galarian|Paldean|Mega|Primal|Shadow|Dark|Light|Shiny|Gigantamax|Therian|Origin|Crowned|Totem|Partner|Battle|Ash|Dawn|Dusk|Midnight|Midday|School|10%|Complete|Rainy|Snowy|Sunny|Attack|Defense|Speed|Normal|Large|Super|Small|Average|Male|Female|F)/i, '')
                .replace(/\s*\(.*?\)/g, '') // Remove parênteses
                .replace(/\s*EV.*$/i, '') // Remove EVs
                .trim()
                .toLowerCase();
        }

        const moves = buildCompleta.split(' / ').map(moveStr => {
            const partes = moveStr.trim().split(' - ').map(p => p.trim());
            if (partes.length >= 3) {
                // Encontrar o move completo nos dados
                const nomeMove = partes[1];
                const pokemonOrigem = partes[2];
                
                // Buscar o move nos dados (normalizando origem)
                const moveEncontrado = smeargleMovesData.find(m => 
                    m.nome.toLowerCase() === nomeMove.toLowerCase() &&
                    normalizarOrigem(m.origem) === normalizarOrigem(pokemonOrigem)
                );
                if (!moveEncontrado) {
                    console.warn('[Smeargle Build] Golpe não encontrado:', {
                        nomeMove,
                        pokemonOrigem,
                        candidatos: smeargleMovesData.filter(m => m.nome.toLowerCase() === nomeMove.toLowerCase()).map(m => m.origem)
                    });
                }
                return moveEncontrado;
            }
            return null;
        }).filter(Boolean);
        
        if (moves.length === 0) {
            alert('⚠️ Nenhum golpe válido encontrado nesta build!');
            return;
        }
        
        // Aplicar os moves
        smeargleSelectedMoves = moves;
        
        // Atualizar interface
        atualizarCardSmeargle();
        buscarPokemonsCompativeis();
        reordenarGridMovesOrdenado();
        
        // Fechar modal
        fecharModalBuilds();
        
        alert(`✅ Build "${nomeBuild}" aplicada com sucesso!\n${moves.length} golpes carregados.`);
        
    } catch (error) {
        console.error('Erro ao aplicar build:', error);
        alert('❌ Erro ao aplicar build. Verifique o console.');
    }
};

// Excluir build (apenas admin)
window.excluirBuild = async function(buildIndex, nomeBuild) {
    if (!confirm(`❌ Tem certeza que deseja excluir a build "${nomeBuild}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }
    
    try {
        // Obter dados do usuário do localStorage
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (!user || !user.authToken || !user.email) {
            alert('❌ Você precisa estar logado como admin para excluir builds!');
            return;
        }
        
        const formData = new URLSearchParams({
            action: 'excluirBuild',
            buildIndex: buildIndex.toString(),
            authToken: user.authToken,
            adminEmail: user.email
        });
        
        const response = await fetch(SHEETS_BASE_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Build excluída com sucesso!');
            carregarBuilds(); // Recarregar lista
        } else {
            alert('❌ Erro: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao excluir build:', error);
        alert('❌ Erro ao excluir build. Verifique o console.');
    }
};

// Formatar data
function formatarData(data) {
    if (!data) return 'Data desconhecida';
    
    try {
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR');
    } catch {
        return 'Data inválida';
    }
}
