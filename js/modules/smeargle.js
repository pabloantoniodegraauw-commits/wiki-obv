// Formata a string de localizações para exibir cada uma em uma linha com bullet (apenas na aba Smeargle)
function formatarLocalizacoesSmeargle(localizacoes) {
    if (!localizacoes) return 'Não informado';
    // Quebra por barra e remove espaços extras
    const lista = localizacoes.split('/').map(function(l) { return l.trim(); }).filter(Boolean);
    return lista.map(function(loc) { return '• ' + loc; }).join('<br>');
}
// 🎨 Módulo Smeargle Builder - WIKI OBV

// URL do Google Sheets - IMPORTANTE: Usar "acao" (sem "ti") conforme esperado pelo Apps Script
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec?acao=obter_todos&page=1&limit=10000";
const SHEETS_BASE_URL = "https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec";

let smearglePokemonData = [];
let smeargleMovesData = [];
let smeargleAtacksData = [];
// smeargleSelectedMoves agora é um array fixo de 9 slots (índices 0..8 -> M1..M9)
// smeargleSelectedMoves agora é um array fixo de 9 slots (índices 0..8 -> M1..M9)
let smeargleSelectedMoves = new Array(9).fill(null);
// slot alvo quando usuário clica em "Adicionar" num slot vazio (null ou 0-based index)
let smeargleTargetSlot = null;

// Garantir estilos visuais para o slot alvo
function ensureSmeargleStyles() {
    if (document.getElementById('smeargle-slot-styles')) return;
    const css = `
        .selected-move-item.selected-move-empty { display:flex; align-items:center; gap:8px; padding:8px; border-radius:8px; transition: box-shadow 200ms ease, transform 120ms ease, outline-color 200ms ease; }
        .selected-move-item.selected-move-empty .btn-add-slot { background:#ffd700;color:#23284a;border:none;padding:6px 8px;border-radius:6px;cursor:pointer }
        .selected-move-item.selected-move-empty.slot-active { outline: 3px solid rgba(255,215,0,0.95); box-shadow: 0 10px 30px rgba(255,215,0,0.18); transform: translateY(-4px); }
        .selected-move-item { display:flex; align-items:flex-start; gap:10px; padding:10px; border-radius:10px; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.03)); margin-bottom:8px }
        .selected-move-item .move-info small { display:block; opacity:0.85; margin-top:4px }
        .move-tm-badges{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
        .tm-badge-mini{background:rgba(255,255,255,0.04);padding:4px 8px;border-radius:10px;font-size:11px;color:#fff;border:1px solid rgba(255,255,255,0.03)}
    `;
    const s = document.createElement('style');
    s.id = 'smeargle-slot-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
}

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

// Helpers de normalização para comparar nomes sem acento/maiús/minús
function normalizeName(str) {
    if (!str) return '';
    try {
        return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    } catch (e) {
        return str.toString().toLowerCase().trim();
    }
}

function initSmeargle() {
    console.log('🎨 Inicializando Smeargle Builder...');
    ensureSmeargleStyles();
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
        // 1. Buscar dados da Pokédex (Pokémon e ataques)
        console.log('📡 Fazendo fetch da URL:', SHEETS_URL);
        const response = await fetch(SHEETS_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const textoResposta = await response.text();
        let resultado;
        try {
            resultado = JSON.parse(textoResposta);
        } catch (e) {
            throw new Error('Resposta não é JSON válido: ' + e.message);
        }
        let dados;
        if (Array.isArray(resultado)) {
            dados = resultado;
        } else if (resultado.data && Array.isArray(resultado.data)) {
            dados = resultado.data;
        } else {
            throw new Error('Formato de resposta não reconhecido');
        }
        smearglePokemonData = dados;

        // 2. Buscar dados da aba de ataques
        const ATACKS_URL = SHEETS_BASE_URL + '?acao=obter_atacks&page=1&limit=10000';
        const atacksResp = await fetch(ATACKS_URL);
        if (!atacksResp.ok) throw new Error(`HTTP ${atacksResp.status}: ${atacksResp.statusText}`);
        const atacksText = await atacksResp.text();
        let atacksResult;
        try {
            atacksResult = JSON.parse(atacksText);
        } catch (e) {
            throw new Error('Resposta de ataques não é JSON válido: ' + e.message);
        }
        let atacksData;
        if (Array.isArray(atacksResult)) {
            atacksData = atacksResult;
        } else if (atacksResult.data && Array.isArray(atacksResult.data)) {
            atacksData = atacksResult.data;
        } else {
            throw new Error('Formato de resposta de ataques não reconhecido');
        }
        smeargleAtacksData = atacksData;

        extrairGolpesSmeargle(dados);
        popularFiltrosSmeargle();
        renderizarGolpesSmeargle(smeargleMovesData);
        configurarEventosSmeargle();
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
            if (celula) {
                if (i === 1) totalM1++;
                if (index < 3 && i === 1) {
                    console.log(`M1 de ${pokemon['POKEMON']}:`, celula);
                }
                // Buscar detalhes do ataque na aba de ataques (usar normalização)
                const nomeAtaque = celula.split('/')[0].trim();
                const nomeNorm = normalizeName(nomeAtaque);
                let atackDetalhes = smeargleAtacksData.find(a => normalizeName(a['ATACK']) === nomeNorm);
                // fallback: busca por inclusão (ex: 'Knock Off' vs 'Knock-Off' ou variações)
                if (!atackDetalhes) {
                    atackDetalhes = smeargleAtacksData.find(a => {
                        const an = normalizeName(a['ATACK']);
                        return an.includes(nomeNorm) || nomeNorm.includes(an);
                    });
                }
                if (atackDetalhes) {
                    const golpe = {
                        nome: atackDetalhes['ATACK'] || nomeAtaque,
                        acao: atackDetalhes['AÇÃO'] || '',
                        efeito: atackDetalhes['EFEITO'] || '',
                        tipo: atackDetalhes['TYPE'] || '',
                        categoria: atackDetalhes['CATEGORIA'] || '',
                        origem: (pokemon['EV'] && pokemon['EV'].toString().trim()) ? pokemon['EV'].toString().trim() : (pokemon['POKEMON'] || '').toString().trim(),
                        origem_pokemon: (pokemon['POKEMON'] || '').toString().trim(),
                        local: coluna
                    };
                    golpesValidos++;
                    const key = golpe.nome.toLowerCase() + '_' + golpe.origem.toLowerCase();
                    if (!golpesMap.has(key)) {
                        golpesMap.set(key, golpe);
                    }
                }
                else {
                    console.warn(`[Smeargle] Ataque não encontrado em atacks: "${nomeAtaque}" (origem ${pokemon['POKEMON']} / EV=${pokemon['EV']})`);
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
    if (!grid) {
        console.warn('[Smeargle] renderizarGolpesSmeargle: elemento #movesGrid não encontrado. Pulando render.');
        return;
    }

    if (golpes.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Nenhum golpe encontrado com esses filtros</p>
            </div>
        `;
        return;
    }
    
    const nomesSelecionados = smeargleSelectedMoves.filter(Boolean).map(m => m.nome.toLowerCase());
    
    grid.innerHTML = golpes.map(golpe => {
        const estaSelecionado = nomesSelecionados.includes(golpe.nome.toLowerCase());
        const classeExtra = estaSelecionado ? ' move-card-selected' : '';
        // Exibir slot de origem (ex: M7)
        const slotOrigem = golpe.local ? golpe.local.toUpperCase() : '';
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
                <div class="move-efeito">
                    <i class="fas fa-magic"></i> ${golpe.efeito}
                </div>
                <div class="move-origem">
                    <i class="fas fa-paw"></i> ${golpe.origem}
                </div>
                <div class="move-slot-origem" style="font-size:0.95em;color:#ffd700;margin-top:2px;">
                    <i class="fas fa-hashtag"></i> Slot: <b>${slotOrigem}</b>
                </div>
                ${estaSelecionado ? '<div class="move-selected-badge"><i class="fas fa-check-circle"></i></div>' : ''}
            </div>
        `;
    }).join('');
}

// Selecionar golpe
window.selecionarGolpe = function(element) {
    const golpe = JSON.parse(element.dataset.move);

    // Se estamos em modo seleção de slot específico, tentar inserir no slot alvo
    if (typeof smeargleTargetSlot === 'number' && smeargleTargetSlot !== null) {
        const slotIdx = smeargleTargetSlot; // 0-based
        // Só permitir adicionar o golpe no slot exato de origem
        const slotOrigem = golpe.local ? parseInt(golpe.local.replace(/^M/i, ''), 10) : null;
        if (slotOrigem !== slotIdx + 1) {
            const msg = `⚠️ Este golpe só pode ser copiado no slot ${golpe.local}.`;
            if (window.showToast) window.showToast(msg, 'error'); else alert(msg);
            smeargleTargetSlot = null;
            atualizarCardSmeargle();
            return;
        }
        if (smeargleSelectedMoves[slotIdx]) {
            const msg = `⚠️ O slot M${slotIdx + 1} já está ocupado.`;
            if (window.showToast) window.showToast(msg, 'error'); else alert(msg);
            smeargleTargetSlot = null;
            atualizarCardSmeargle();
            return;
        }
        smeargleSelectedMoves[slotIdx] = golpe;
        smeargleTargetSlot = null;
        atualizarCardSmeargle();
        buscarPokemonsCompativeis();
        reordenarGridMovesOrdenado();
        const okMsg = `✔️ Golpe adicionado em M${slotIdx + 1}`;
        if (window.showToast) window.showToast(okMsg, 'success'); else alert(okMsg);
        return;
    }

    // Limite de 9 slots (M1..M9)
    const totalSelecionados = smeargleSelectedMoves.filter(Boolean).length;
    if (totalSelecionados >= 9) {
        alert('⚠️ Máximo de 9 golpes atingido!');
        return;
    }

    // Evitar duplicatas MESMO NOME MESMO SLOT
    if (smeargleSelectedMoves.some(g => g && g.nome === golpe.nome && g.local === golpe.local)) {
        alert('⚠️ Este golpe já foi selecionado neste slot!');
        return;
    }

    // Só permitir adicionar o golpe no slot de origem
    const slotOrigem = golpe.local ? parseInt(golpe.local.replace(/^M/i, ''), 10) : null;
    if (!slotOrigem || slotOrigem < 1 || slotOrigem > 9) {
        alert('⚠️ Slot de origem inválido para este golpe.');
        return;
    }
    if (smeargleSelectedMoves[slotOrigem - 1]) {
        alert(`⚠️ O slot M${slotOrigem} já está ocupado.`);
        return;
    }
    smeargleSelectedMoves[slotOrigem - 1] = golpe;

    atualizarCardSmeargle();
    buscarPokemonsCompativeis();
    reordenarGridMovesOrdenado();

    // Feedback visual
    element.style.animation = 'none';
    setTimeout(() => { element.style.animation = 'pulseSelect 0.4s ease'; }, 10);
};

// Validar se um move pode ser adicionado em uma posição específica
function validarPosicaoMove(golpe, posicao) {
    const posicaoStr = `M${posicao}`;
    const posicoesDisponiveis = obterPosicoesDisponiveis(golpe);
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
    // obter valores de filtros com fallback caso os elementos não existam (p.ex. na aba Builder)
    const el = id => document.getElementById(id);
    const filtros = {
        nome: (el('filterNome') && el('filterNome').value) ? el('filterNome').value.toLowerCase() : '',
        tipo: (el('filterTipo') && el('filterTipo').value) ? el('filterTipo').value : '',
        acao: (el('filterAcao') && el('filterAcao').value) ? el('filterAcao').value : '',
        categoria: (el('filterCategoria') && el('filterCategoria').value) ? el('filterCategoria').value : '',
        local: (el('filterLocal') && el('filterLocal').value) ? el('filterLocal').value : ''
    };
    
    // Aplicar filtros primeiro
    let movesFiltrados = smeargleMovesData.filter(golpe => {
        return (!filtros.nome || golpe.nome.toLowerCase().includes(filtros.nome)) &&
               (!filtros.tipo || golpe.tipo === filtros.tipo) &&
               (!filtros.acao || golpe.acao === filtros.acao) &&
               (!filtros.categoria || golpe.categoria === filtros.categoria) &&
               (!filtros.local || golpe.local === filtros.local);
    });
        
        // Separar moves selecionados (por slot) e não selecionados
        const movesSelecionados = [];
        const movesNaoSelecionados = [];
        // Mapa nome -> slotIndex (0-based)
        const selectedMap = {};
        smeargleSelectedMoves.forEach((m, i) => { if (m) selectedMap[m.nome.toLowerCase()] = i; });

        movesFiltrados.forEach(move => {
            const key = move.nome.toLowerCase();
            if (selectedMap.hasOwnProperty(key)) {
                movesSelecionados[selectedMap[key]] = move; // posicione pelo slot
            } else {
                movesNaoSelecionados.push(move);
            }
        });

        // Concatena mantendo ordem por slot (removendo gaps) e depois os não selecionados
        const movesOrdenados = movesSelecionados.filter(Boolean).concat(movesNaoSelecionados);
    
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
    // Contagem de slots preenchidos
    const countSelected = smeargleSelectedMoves.filter(Boolean).length;
    movesCount.textContent = countSelected;

    // Calcular tipo dominante a partir dos moves preenchidos
    const tipoDom = tipoDominante(smeargleSelectedMoves.filter(Boolean));
    
    // Aplicar estilo dinâmico
    card.className = `smeargle-card type-${tipoDom.toLowerCase()}`;
    
    // Atualizar ícone
    typeIcon.innerHTML = `<i class="fas ${TIPO_ICONS[tipoDom] || 'fa-circle'}"></i>`;
    
    // Atualizar badge
    typeBadge.innerHTML = `<span class="type-badge type-${tipoDom.toLowerCase()}">${tipoDom}</span>`;
    
    // Atualizar lista de golpes
    if (countSelected === 0) {
        movesList.innerHTML = '<div class="no-moves-yet">Nenhum golpe selecionado</div>';
    } else {
        // Renderizar cada slot (M1..M9) mantendo posições vazias
        const items = [];
        for (let index = 0; index < smeargleSelectedMoves.length; index++) {
            const golpe = smeargleSelectedMoves[index];
            if (golpe) {
                // Exibir slot de origem
                const slotOrigem = golpe.local ? golpe.local.toUpperCase() : '';
                items.push(`
                    <div class="selected-move-item" data-slot="${index+1}">
                        <span class="move-number">${index + 1}</span>
                        <span class="move-info">
                            <strong>${golpe.nome}</strong>
                            <small>${golpe.tipo} • ${golpe.categoria}</small>
                            <span class="move-slot-origem" style="font-size:0.95em;color:#ffd700;margin-left:6px;display:inline-block;margin-top:6px;">
                                <i class='fas fa-hashtag'></i> Slot: <b>${slotOrigem}</b>
                            </span>
                            ${golpe.tms && golpe.tms.length ? (`<div class="move-tm-badges">${golpe.tms.map(tm => `<span class="tm-badge-mini">${tm.numero?('TM'+tm.numero+' '):''}${tm.nome}</span>`).join('')}</div>`) : ''}
                        </span>
                                <div style="display:flex;gap:6px;align-items:center;margin-left:8px;">
                                    <button class="btn-edit-move" onclick="editarSlot(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                                    <button class="btn-move-left" onclick="moverGolpeEsquerda(${index})" title="Mover para a esquerda"><i class="fas fa-arrow-left"></i></button>
                                    <button class="btn-move-right" onclick="moverGolpeDireita(${index})" title="Mover para a direita"><i class="fas fa-arrow-right"></i></button>
                                    <button class="btn-remove-move" onclick="removerGolpe(${index})" title="Remover"><i class="fas fa-times"></i></button>
                                </div>
                    </div>
                `);
            } else {
                const active = smeargleTargetSlot === index;
                items.push(`
                    <div class="selected-move-item selected-move-empty${active ? ' slot-active' : ''}" data-slot="${index+1}">
                        <span class="move-number">${index + 1}</span>
                        <span class="move-info"><em>Slot livre</em></span>
                        <button class="btn-add-slot" onclick="iniciarSelecaoSlot(${index})" style="margin-left:8px;">
                            ${active ? 'Cancelar' : 'Adicionar'}
                        </button>
                    </div>
                `);
            }
        }
        movesList.innerHTML = items.join('');
    }
}

// Mover golpe para a esquerda (swap)
window.moverGolpeEsquerda = function(index) {
    if (index <= 0) return;
    const tmp = smeargleSelectedMoves[index-1];
    smeargleSelectedMoves[index-1] = smeargleSelectedMoves[index];
    smeargleSelectedMoves[index] = tmp;
    atualizarCardSmeargle();
    reordenarGridMovesOrdenado();
    buscarPokemonsCompativeis();
};

// Mover golpe para a direita (swap)
window.moverGolpeDireita = function(index) {
    if (index >= smeargleSelectedMoves.length - 1) return;
    const tmp = smeargleSelectedMoves[index+1];
    smeargleSelectedMoves[index+1] = smeargleSelectedMoves[index];
    smeargleSelectedMoves[index] = tmp;
    atualizarCardSmeargle();
    reordenarGridMovesOrdenado();
    buscarPokemonsCompativeis();
};

// Editar um slot manualmente
window.editarSlot = function(index) {
    if (typeof index !== 'number' || index < 0 || index >= smeargleSelectedMoves.length) return;
    const atual = smeargleSelectedMoves[index];
    const nome = prompt('Nome do ataque:', atual ? atual.nome : '');
    if (!nome) return;
    const tipo = prompt('Tipo (opcional):', atual ? atual.tipo : '');
    const categoria = prompt('Categoria (opcional):', atual ? atual.categoria : '');
    const origem = atual && atual.origem ? atual.origem : (window.builderSelectedPokemonName || 'Manual');
    smeargleSelectedMoves[index] = { nome: nome.trim(), tipo: (tipo||'').trim(), categoria: (categoria||'').trim(), acao: '', efeito: '', origem: origem, local: `M${index+1}` };
    atualizarCardSmeargle();
    reordenarGridMovesOrdenado();
    buscarPokemonsCompativeis();
};

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
    // Não remover o índice (shift); apenas marcar o slot como vazio
    if (index >= 0 && index < smeargleSelectedMoves.length) {
        smeargleSelectedMoves[index] = null;
    }
    atualizarCardSmeargle();
    buscarPokemonsCompativeis();
    reordenarGridMovesOrdenado();
};

// Limpar todos os golpes
function limparGolpes() {
    smeargleSelectedMoves = new Array(9).fill(null);
    atualizarCardSmeargle();
    reordenarGridMovesOrdenado();
    document.getElementById('compatibleGrid').innerHTML = `
        <div class="no-selection">
            <i class="fas fa-hand-pointer"></i>
            <p>Selecione golpes acima para ver os Pokémons compatíveis</p>
        </div>
    `;
}

// Iniciar seleção de slot vazio para inserir o próximo golpe clicado
window.iniciarSelecaoSlot = function(index) {
    if (typeof index !== 'number') return;
    // Se já estava ativo esse slot, cancelar
    if (smeargleTargetSlot === index) {
        smeargleTargetSlot = null;
        if (window.showToast) window.showToast('Seleção cancelada', 'error'); else alert('Seleção cancelada');
        atualizarCardSmeargle();
        return;
    }
    smeargleTargetSlot = index;
    const msg = `Selecione um golpe no grid para inserir em M${index + 1} (clique em "Adicionar" novamente para cancelar).`;
    if (window.showToast) window.showToast(msg, 'success'); else alert(msg);
    atualizarCardSmeargle();
};

// Buscar Pokémons compatíveis (mostra o Pokémon de origem de cada golpe)
function buscarPokemonsCompativeis() {
    const grid = document.getElementById('compatibleGrid');
    if (!grid) {
        console.warn('[Smeargle] buscarPokemonsCompativeis: elemento #compatibleGrid não encontrado. Pulando render.');
        return;
    }

    const countSelected = smeargleSelectedMoves.filter(Boolean).length;
    if (countSelected === 0) {
        grid.innerHTML = `
            <div class="no-selection">
                <i class="fas fa-hand-pointer"></i>
                <p>Selecione golpes acima para ver os Pokémons compatíveis</p>
            </div>
        `;
        return;
    }
    
    // Mostrar o Pokémon de origem de cada golpe selecionado por slot (M1..M9)
    const cards = [];
    for (let index = 0; index < smeargleSelectedMoves.length; index++) {
        const golpe = smeargleSelectedMoves[index];
        if (!golpe) continue;
        // Normalizar campo origem: remover qualifiers comuns (Shiny, Mega, Alolan etc.) e parênteses
        const rawOrigem = (golpe.origem || '').toString().trim();
        let origemNorm = rawOrigem.replace(/\(.*\)/g, '').trim();
        origemNorm = origemNorm.replace(/^(shiny|shadow|mega|alolan|galarian|hisui|crowned|male|female)\s+/i, '').trim();
        origemNorm = origemNorm.replace(/\s+(shiny|shadow|mega|alolan|galarian|hisui|crowned|male|female)$/i, '').trim();

        const pokemon = smearglePokemonData.find(p => {
            const pok = (p['POKEMON'] || '').toLowerCase();
            const ev = (p['EV'] || '').toLowerCase();
            const o = origemNorm.toLowerCase();
            if (!o) return false;
            if (pok === o || ev === o) return true;
            // tentar comparar pela última palavra (ex: 'hydreigon' em 'shiny hydreigon')
            const parts = o.split(/\s+/).filter(Boolean);
            const last = parts.length ? parts[parts.length - 1] : o;
            if (last && (pok.includes(last) || ev.includes(last))) return true;
            return false;
        });
        if (!pokemon) {
            console.warn(`[Smeargle] Não encontrou Pokémon para origem="${rawOrigem}" (procurando por M${index + 1}: ${golpe.nome}). Tentando sugerir candidatos...`);
            // tentar sugerir candidatos aproximados (busca por substring no POKEMON/EV) usando origem normalizada
            const termo = (origemNorm || rawOrigem).toLowerCase().split(/\s|\(|\-|_/).pop();
            const candidatos = smearglePokemonData.filter(p => {
                const pok = (p['POKEMON'] || '').toLowerCase();
                const ev = (p['EV'] || '').toLowerCase();
                const allFields = Object.values(p).filter(v=>typeof v === 'string').map(v=>normalizeName(v)).join(' ');
                // usar termo já normalizado
                const t = normalizeName(termo || '');
                return (t && (pok.includes(t) || ev.includes(t) || allFields.includes(t)));
            }).slice(0, 12).map(p => ({POKEMON: p['POKEMON'], EV: p['EV']}));
            console.warn('[Smeargle] Candidatos encontrados:', candidatos);
            // Se nenhum candidato encontrado, tentar buscar por qual Pokémon possui este golpe nas colunas M1..M10
            if (candidatos.length === 0) {
                const moveTerm = normalizeName(golpe.nome || '');
                if (moveTerm) {
                    const byMove = [];
                    smearglePokemonData.forEach(p => {
                        for (let i = 1; i <= 10; i++) {
                            const col = p[`M${i}`];
                            if (!col) continue;
                            const colNome = normalizeName((col || '').split('/')[0] || '');
                            if (colNome && colNome.includes(moveTerm)) {
                                byMove.push({POKEMON: p['POKEMON'], EV: p['EV']});
                                break;
                            }
                        }
                    });
                    if (byMove.length) {
                        console.warn('[Smeargle] Candidatos por golpe encontrados:', byMove.slice(0,12));
                        candidatos.push(...byMove.slice(0,12));
                    }
                }
            }
            cards.push(`
                <div class="compatible-card">
                    <div class="compatible-img">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png" alt="${golpe.origem}">
                    </div>
                    <div class="compatible-name">${golpe.origem}</div>
                    <div class="compatible-move"><i class="fas fa-star"></i> M${index + 1}: ${golpe.nome}</div>
                </div>
            `);
            continue;
        }
        cards.push(`
                <div class="compatible-card">
                    <div class="compatible-img">
                        <!-- Usar placeholder inline para evitar 404 caso o arquivo não exista -->
                        <img src="${window.obterImagemPokemon ? window.obterImagemPokemon(
                        pokemon['EV'] ? pokemon['EV'].replace(/ /g, '-') : pokemon['POKEMON'],
                        pokemon['POKEMON']) : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}" 
                        alt="${pokemon['POKEMON']}" onerror="this.onerror=null;this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='">
                    </div>
                <div class="compatible-name">${pokemon['EV'] || pokemon['POKEMON']}</div>
                <div class="compatible-move"><i class="fas fa-star"></i> M${index + 1}: ${golpe.nome}</div>
                <div class="compatible-location"><i class="fas fa-map-marker-alt"></i>${formatarLocalizacoesSmeargle(pokemon['LOCALIZAÇÃO'])}</div>
            </div>
        `);
    }
    grid.innerHTML = cards.join('');
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
// Registrar inicializador da página (deve ficar no final do arquivo)
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
    
    const countSelectedPreview = smeargleSelectedMoves.filter(Boolean).length;
    if (countSelectedPreview === 0) {
        preview.innerHTML = '<em>Nenhum golpe selecionado. Selecione golpes antes de salvar.</em>';
        preview.style.display = 'block';
        return;
    }
    
    const parts = [];
    for (let i = 0; i < smeargleSelectedMoves.length; i++) {
        const move = smeargleSelectedMoves[i];
        if (move) parts.push(`m${i + 1} - ${move.nome} - ${move.origem}`);
    }
    const buildText = parts.join(' / ');
    
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
    
    const countToSave = smeargleSelectedMoves.filter(Boolean).length;
    if (countToSave === 0) {
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
        // Limpar seleção atual (usar array fixo de 9 slots)
        smeargleSelectedMoves = new Array(9).fill(null);
        
        // Parsear a build: "m1 - Shadow Ball - Chandelure / m2 - ..."
        const moves = buildCompleta.split(' / ').map(moveStr => {
            const partes = moveStr.trim().split(' - ').map(p => p.trim());
            if (partes.length >= 3) {
                // Encontrar o move completo nos dados
                const nomeMove = partes[1];
                const pokemonOrigem = partes[2];

                // Buscar o move nos dados pela origem normal
                let moveEncontrado = smeargleMovesData.find(m => 
                    m.nome.toLowerCase() === nomeMove.toLowerCase() &&
                    m.origem.toLowerCase() === pokemonOrigem.toLowerCase()
                );

                // Se não encontrar, buscar pelo campo EV do Pokémon de origem
                if (!moveEncontrado) {
                    // Procurar todos os pokémons que tenham EV igual ao nome de origem
                    const pokemonsEV = smearglePokemonData.filter(p => (p['EV'] || '').toLowerCase() === pokemonOrigem.toLowerCase());
                    for (const poke of pokemonsEV) {
                        moveEncontrado = smeargleMovesData.find(m =>
                            m.nome.toLowerCase() === nomeMove.toLowerCase() &&
                            m.origem.toLowerCase() === poke['POKEMON'].toLowerCase()
                        );
                        if (moveEncontrado) break;
                    }
                }

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
        
        // Aplicar os moves em slots fixos (se a build indicar o slot, caso contrário preencher sequencialmente)
        const arr = new Array(9).fill(null);
        let nextIdx = 0;
        moves.forEach((mv, i) => {
            // A build original pode ter o slot no começo (ex: "m1 - Shadow Ball - Chandelure").
            // Aqui tentamos detectar o slot a partir da string original (moves variable contains found move objects),
            // mas se não houver informação de slot, preenchemos sequencialmente no próximo slot livre.
            // Como fallback usamos a ordem encontrada.
            if (mv && mv.local) {
                // tentar usar o campo local se existir (ex: 'M1')
                const num = parseInt((mv.local || '').replace(/^M/i, ''), 10);
                if (!isNaN(num) && num >= 1 && num <= 9) {
                    arr[num - 1] = mv;
                    return;
                }
            }
            // fallback: preencher próximo slot livre
            while (nextIdx < arr.length && arr[nextIdx]) nextIdx++;
            if (nextIdx < arr.length) {
                arr[nextIdx] = mv;
                nextIdx++;
            }
        });
        smeargleSelectedMoves = arr;
        
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
