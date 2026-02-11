// 🛒 Módulo Market Builder - WIKI OBV

const MARKET_BASE_URL = "https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec";

// ── Estado ──────────────────────────────────────
let marketItens = [];
let marketNatures = [];
let marketCarrinho = [];
let marketTipoAtual = 'pokemon';
let marketItemSelecionado = null;
let marketPokemonData = [];
let marketDadosCarregados = { itens: false, natures: false, pokemon: false };
let marketUsarStickers = false; // false = sprite-pokemon, true = stickers
let marketVistaCarrinho = 'lista'; // 'lista' ou 'cards'

// Subconjuntos de Itens (preenchidos ao carregar)
let marketPokebolas = [];
let marketHeldItems = [];
let marketMegaStones = [];
let marketItensVenda = []; // Todos exceto conta

// Mapeamento tipo→pasta de imagem
const ITEM_FOLDER_MAP = {
    'pokébola': 'pokebolas',
    'pokebola': 'pokebolas',
    'held item': 'helditem',
    'mega stone': 'megastones',
    'stone': 'stones',
    'addon': 'addonbox',
    'addon box': 'addonbox',
    'dinheiro': 'dinheiro',
    'conta': 'conta',
    'item normal': 'itens-task',
    'item': 'itens-task'
};

// Pastas cujos arquivos usam nomes normalizados (lowercase, sem espaços)
const FOLDERS_NORMALIZED = ['itens-task'];

// ── Inicialização ───────────────────────────────
function initMarket() {
    console.log('🛒 Inicializando Market...');
    marketItemSelecionado = null;
    marketCarrinho = JSON.parse(sessionStorage.getItem('marketCarrinho') || '[]');
    carregarDadosMarket();
    trocarTipoMarket('pokemon');
    renderizarCarrinho();
}

// ── Carregar dados (lazy) ───────────────────────
async function carregarDadosMarket() {
    try {
        const promises = [];

        if (!marketDadosCarregados.itens) {
            promises.push(
                fetch(MARKET_BASE_URL + '?acao=obter_itens')
                    .then(r => r.json())
                    .then(res => {
                        if (res.success && res.data) {
                            marketItens = res.data;
                            classificarItens();
                            marketDadosCarregados.itens = true;
                            console.log('✅ Itens Market:', marketItens.length);
                        }
                    })
            );
        }

        if (!marketDadosCarregados.natures) {
            promises.push(
                fetch(MARKET_BASE_URL + '?acao=obter_natures')
                    .then(r => r.json())
                    .then(res => {
                        if (res.success && res.data) {
                            marketNatures = res.data;
                            marketDadosCarregados.natures = true;
                            console.log('✅ Natures Market:', marketNatures.length);
                        }
                    })
            );
        }

        // Pokémon - reaproveitar dados globais se já carregados
        if (!marketDadosCarregados.pokemon) {
            if (typeof todosPokemonsCompleto !== 'undefined' && todosPokemonsCompleto.length > 0) {
                marketPokemonData = todosPokemonsCompleto;
                marketDadosCarregados.pokemon = true;
            } else if (typeof todosPokemons !== 'undefined' && todosPokemons.length > 0) {
                marketPokemonData = todosPokemons;
                marketDadosCarregados.pokemon = true;
            } else {
                promises.push(
                    fetch(MARKET_BASE_URL + '?acao=obter_todos&page=1&limit=9999')
                        .then(r => r.json())
                        .then(res => {
                            if (res.success !== false && res.data) {
                                marketPokemonData = res.data;
                                marketDadosCarregados.pokemon = true;
                                console.log('✅ Pokémon Market:', marketPokemonData.length);
                            }
                        })
                );
            }
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }

        // Re-renderizar após dados carregados
        if (marketTipoAtual) {
            renderizarFiltros();
            renderizarGridMarket();
        }
    } catch (err) {
        console.error('❌ Erro ao carregar dados do Market:', err);
    }
}

function classificarItens() {
    marketPokebolas = marketItens.filter(i => {
        const t = (i['TIPO DO ITEM'] || '').toLowerCase();
        return t.includes('pokébola') || t.includes('pokebola');
    });
    marketHeldItems = marketItens.filter(i =>
        (i['TIPO DO ITEM'] || '').toLowerCase().includes('held item')
    );
    marketMegaStones = marketItens.filter(i =>
        (i['TIPO DO ITEM'] || '').toLowerCase().includes('mega stone')
    );
    marketItensVenda = marketItens.filter(i => {
        const t = (i['TIPO DO ITEM'] || '').toLowerCase();
        return !t.includes('conta');
    });
}

// Normalizar nome para pastas que usam lowercase sem espaços
function normalizarNomeImagem(nome) {
    return nome.toLowerCase()
        .replace(/'/g, '')
        .replace(/\./g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// ── Imagens ─────────────────────────────────────
function obterImagemItem(nomeItem, tipoItem) {
    const tipoLower = (tipoItem || '').toLowerCase().trim();
    for (const [key, folder] of Object.entries(ITEM_FOLDER_MAP)) {
        if (tipoLower.includes(key)) {
            const nomeArquivo = FOLDERS_NORMALIZED.includes(folder)
                ? normalizarNomeImagem(nomeItem)
                : nomeItem;
            return `IMAGENS/imagens-itens/${folder}/${nomeArquivo}.png`;
        }
    }
    // Fallback: tentar itens-task com nome normalizado
    const nomeFallback = normalizarNomeImagem(nomeItem);
    return `IMAGENS/imagens-itens/itens-task/${nomeFallback}.png`;
}

function obterImagemTM(tipagem) {
    const tipo = (tipagem || 'Normal').trim();
    return `IMAGENS/imagens-itens/tipagens de tm/${tipo}_type_tm_disk.png`;
}

function obterImagemPokemonMarket(pokemon) {
    const nome = pokemon['POKEMON'] || '';
    const ev = pokemon['EV'] || '';
    const nomePrincipal = ev || nome;
    const nomeBase = ev ? nome : '';

    if (typeof obterImagemPokemon === 'function') {
        return obterImagemPokemon(nomePrincipal, nomeBase, marketUsarStickers);
    }

    // Fallback manual (mesma lógica do script.js)
    if (marketUsarStickers) {
        const nomeSticker = (nomeBase || nomePrincipal).trim();
        return `IMAGENS/imagens-pokemon/stickers-pokemon/${nomeSticker}.png`;
    }
    let nomeArquivo;
    if (nomeBase && nomeBase !== nomePrincipal) {
        nomeArquivo = `${nomeBase}-${nomePrincipal.replace(/ /g, '-')}`;
    } else {
        nomeArquivo = nomePrincipal;
    }
    return `IMAGENS/imagens-pokemon/sprite-pokemon/${nomeArquivo.trim()}.png`;
}

function alternarImagensMarket() {
    marketUsarStickers = !marketUsarStickers;
    const btn = document.getElementById('marketToggleImgBtn');
    if (btn) {
        btn.innerHTML = marketUsarStickers
            ? '<i class="fas fa-image"></i> Database'
            : '<i class="fas fa-image"></i> Stickers';
        btn.classList.toggle('active', marketUsarStickers);
    }
    // Re-renderizar grid e card
    renderizarGridMarket();
    if (marketItemSelecionado && marketItemSelecionado.tipo === 'pokemon') {
        const pokemon = marketItemSelecionado.dados;
        const imgSrc = obterImagemPokemonMarket(pokemon);
        const cardImg = document.getElementById('marketCardImg');
        if (cardImg) cardImg.src = imgSrc;
    }
}

// ── Abas de Tipo ────────────────────────────────
function trocarTipoMarket(tipo) {
    marketTipoAtual = tipo;
    marketItemSelecionado = null;

    // UI das abas
    document.querySelectorAll('.market-type-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === tipo);
    });

    // Resetar card
    resetarCard();
    renderizarFiltros();
    renderizarGridMarket();
}

function resetarCard() {
    const placeholder = document.getElementById('marketCardPlaceholder');
    const imgContainer = document.getElementById('marketCardImgContainer');
    const cardName = document.getElementById('marketCardName');
    const fields = document.getElementById('marketCardFields');
    const pricing = document.getElementById('marketPricing');
    const btnAdd = document.getElementById('btnAddCart');
    const label = document.getElementById('marketCardTypeLabel');

    if (placeholder) placeholder.style.display = 'flex';
    if (imgContainer) imgContainer.style.display = 'none';
    if (cardName) cardName.style.display = 'none';
    if (fields) { fields.style.display = 'none'; fields.innerHTML = ''; }
    if (pricing) pricing.style.display = 'none';
    if (btnAdd) btnAdd.style.display = 'none';

    const labels = { pokemon: 'POKÉMON', tm: 'TM', item: 'ITEM', conta: 'CONTA' };
    if (label) label.textContent = labels[marketTipoAtual] || 'SELECIONE';

    // Resetar preços
    ['dinheiro', 'ponto', 'hd'].forEach(t => {
        const check = document.getElementById(`price${capitalize(t)}Check`);
        const val = document.getElementById(`price${capitalize(t)}Value`);
        if (check) check.checked = false;
        if (val) { val.value = ''; val.classList.remove('visible'); }
    });
}

// ── Filtros ─────────────────────────────────────
function renderizarFiltros() {
    const container = document.getElementById('marketFilters');
    if (!container) return;

    let html = '';

    switch (marketTipoAtual) {
        case 'pokemon':
            html = `
                <div class="market-filter-group" style="flex:1; min-width:200px;">
                    <label><i class="fas fa-search"></i> Buscar Pokémon</label>
                    <input type="text" id="marketSearchPokemon" placeholder="Digite o nome... (min 2 letras)"
                           oninput="filtrarGridMarket()">
                </div>
                <div class="market-filter-group" style="flex:0 0 auto;">
                    <label>&nbsp;</label>
                    <button type="button" id="marketToggleImgBtn" class="btn-toggle-img-market" onclick="alternarImagensMarket()">
                        <i class="fas fa-image"></i> Stickers
                    </button>
                </div>
            `;
            break;
        case 'tm':
            html = `
                <div class="market-filter-group" style="flex:1; min-width:200px;">
                    <label><i class="fas fa-search"></i> Buscar TM</label>
                    <input type="text" id="marketSearchTM" placeholder="Nome ou número..."
                           oninput="filtrarGridMarket()">
                </div>
                <div class="market-filter-group">
                    <label><i class="fas fa-fire"></i> Tipagem</label>
                    <select id="marketFilterTipagem" onchange="filtrarGridMarket()">
                        <option value="">Todas</option>
                    </select>
                </div>
            `;
            break;
        case 'item':
            html = `
                <div class="market-filter-group" style="flex:1; min-width:200px;">
                    <label><i class="fas fa-search"></i> Buscar Item</label>
                    <input type="text" id="marketSearchItem" placeholder="Nome do item..."
                           oninput="filtrarGridMarket()">
                </div>
                <div class="market-filter-group">
                    <label><i class="fas fa-layer-group"></i> Tipo</label>
                    <select id="marketFilterTipoItem" onchange="filtrarGridMarket()">
                        <option value="">Todos</option>
                    </select>
                </div>
            `;
            break;
        case 'conta':
            html = `
                <div class="market-filter-group" style="flex:1;">
                    <label><i class="fas fa-info-circle"></i> Selecione o tipo de conta</label>
                </div>
            `;
            break;
    }

    container.innerHTML = html;

    // Popular selects
    if (marketTipoAtual === 'tm') {
        popularFiltroTipagem();
    }
    if (marketTipoAtual === 'item') {
        popularFiltroTipoItem();
    }
}

function popularFiltroTipagem() {
    const select = document.getElementById('marketFilterTipagem');
    if (!select || typeof todosTMs === 'undefined') return;
    const tipos = [...new Set(todosTMs.map(t => t.tipagem).filter(Boolean))].sort();
    tipos.forEach(t => {
        select.innerHTML += `<option value="${t}">${t}</option>`;
    });
}

function popularFiltroTipoItem() {
    const select = document.getElementById('marketFilterTipoItem');
    if (!select) return;
    const tipos = [...new Set(marketItensVenda.map(i => i['TIPO DO ITEM']).filter(Boolean))].sort();
    tipos.forEach(t => {
        select.innerHTML += `<option value="${t}">${t}</option>`;
    });
}

// ── Grid de Resultados ──────────────────────────
function renderizarGridMarket() {
    const grid = document.getElementById('marketGrid');
    if (!grid) return;

    switch (marketTipoAtual) {
        case 'pokemon': renderizarGridPokemon(grid); break;
        case 'tm': renderizarGridTM(grid); break;
        case 'item': renderizarGridItem(grid); break;
        case 'conta': renderizarGridConta(grid); break;
    }
}

function filtrarGridMarket() {
    renderizarGridMarket();
}

function renderizarGridPokemon(grid) {
    const busca = (document.getElementById('marketSearchPokemon')?.value || '').toLowerCase().trim();

    if (busca.length < 2) {
        grid.innerHTML = `<div class="loading"><i class="fas fa-search"></i><p>Digite pelo menos 2 letras para buscar...</p></div>`;
        return;
    }

    const dados = marketPokemonData.length > 0 ? marketPokemonData : todosPokemons || [];
    const resultados = dados.filter(p => {
        const nome = (p['POKEMON'] || '').toLowerCase();
        const ev = (p['EV'] || '').toLowerCase();
        const nomePrincipal = ev || nome;
        return nomePrincipal.includes(busca) || nome.includes(busca);
    }).slice(0, 60);

    if (resultados.length === 0) {
        grid.innerHTML = `<div class="loading"><i class="fas fa-times"></i><p>Nenhum Pokémon encontrado</p></div>`;
        return;
    }

    grid.innerHTML = resultados.map(p => {
        const ev = p['EV'] || '';
        const nomePokemon = p['POKEMON'] || 'Desconhecido';
        const nomePrincipal = ev || nomePokemon;
        const tipo1 = p['Type 1'] || '';
        const imgSrc = obterImagemPokemonMarket(p);
        const evBadge = ev ? '<span class="market-grid-ev-badge">EV</span>' : '';
        return `
            <div class="market-grid-item" onclick="selecionarItemMarket('pokemon', '${nomePrincipal.replace(/'/g, "\\'")}')">
                ${evBadge}
                <div class="market-grid-item-img">
                    <img src="${imgSrc}" alt="${nomePrincipal}"
                         onerror="this.onerror=null;this.src='IMAGENS/imagens-pokemon/sprite-pokemon/placeholder.png'">
                </div>
                <div class="market-grid-item-name">${nomePrincipal}</div>
                <div class="market-grid-item-sub">${ev ? nomePokemon + ' · ' : ''}${tipo1}</div>
            </div>
        `;
    }).join('');
}

function renderizarGridTM(grid) {
    const busca = (document.getElementById('marketSearchTM')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('marketFilterTipagem')?.value || '';

    const dados = typeof todosTMs !== 'undefined' ? todosTMs : [];
    let resultados = dados;

    if (busca) {
        resultados = resultados.filter(tm => {
            const nome = (tm.nome || '').toLowerCase();
            const num = (tm.numero || '').toLowerCase();
            return nome.includes(busca) || num.includes(busca);
        });
    }
    if (filtroTipo) {
        resultados = resultados.filter(tm => tm.tipagem === filtroTipo);
    }

    resultados = resultados.slice(0, 100);

    if (resultados.length === 0) {
        grid.innerHTML = `<div class="loading"><i class="fas fa-compact-disc"></i><p>Nenhuma TM encontrada</p></div>`;
        return;
    }

    grid.innerHTML = resultados.map(tm => {
        const numLabel = tm.tipo === 'HM' ? 'HM' : 'TM';
        const numFormatted = numLabel + String(tm.numero).padStart(2, '0');
        const imgSrc = obterImagemTM(tm.tipagem);
        return `
            <div class="market-grid-item" onclick="selecionarItemMarket('tm', '${tm.numero}')">
                <div class="market-grid-item-img">
                    <img src="${imgSrc}" alt="${numFormatted}"
                         onerror="this.style.opacity='0.3'">
                </div>
                <div class="market-grid-item-name">${numFormatted}</div>
                <div class="market-grid-item-sub">${tm.nome} (${tm.tipagem})</div>
            </div>
        `;
    }).join('');
}

function renderizarGridItem(grid) {
    const busca = (document.getElementById('marketSearchItem')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('marketFilterTipoItem')?.value || '';

    let resultados = marketItensVenda;

    if (busca) {
        resultados = resultados.filter(i => (i['NOME'] || '').toLowerCase().includes(busca));
    }
    if (filtroTipo) {
        resultados = resultados.filter(i => i['TIPO DO ITEM'] === filtroTipo);
    }

    resultados = resultados.slice(0, 100);

    if (resultados.length === 0) {
        grid.innerHTML = `<div class="loading"><i class="fas fa-box-open"></i><p>${marketDadosCarregados.itens ? 'Nenhum item encontrado' : 'Carregando itens...'}</p></div>`;
        return;
    }

    grid.innerHTML = resultados.map(item => {
        const nome = item['NOME'] || '';
        const tipo = item['TIPO DO ITEM'] || '';
        const imgSrc = obterImagemItem(nome, tipo);
        return `
            <div class="market-grid-item" onclick="selecionarItemMarket('item', '${nome.replace(/'/g, "\\'")}')">
                <div class="market-grid-item-img">
                    <img src="${imgSrc}" alt="${nome}"
                         onerror="this.style.opacity='0.3'">
                </div>
                <div class="market-grid-item-name">${nome}</div>
                <div class="market-grid-item-sub">${tipo}</div>
            </div>
        `;
    }).join('');
}

function renderizarGridConta(grid) {
    const contas = [
        { nome: 'Conta CM', img: 'IMAGENS/imagens-itens/conta/conta cm.png' },
        { nome: 'Conta GM', img: 'IMAGENS/imagens-itens/conta/conta gm.png' },
        { nome: 'Conta Help', img: 'IMAGENS/imagens-itens/conta/conta help.png' }
    ];

    grid.innerHTML = contas.map(c => `
        <div class="market-grid-item" onclick="selecionarItemMarket('conta', '${c.nome}')">
            <div class="market-grid-item-img">
                <img src="${c.img}" alt="${c.nome}" onerror="this.style.opacity='0.3'">
            </div>
            <div class="market-grid-item-name">${c.nome}</div>
            <div class="market-grid-item-sub">Conta</div>
        </div>
    `).join('');
}

// ── Selecionar Item → Preencher Card ────────────
function selecionarItemMarket(tipo, identificador) {
    // Marcar selecionado no grid
    document.querySelectorAll('.market-grid-item').forEach(el => el.classList.remove('selected'));
    event?.target?.closest('.market-grid-item')?.classList.add('selected');

    const placeholder = document.getElementById('marketCardPlaceholder');
    const imgContainer = document.getElementById('marketCardImgContainer');
    const cardImg = document.getElementById('marketCardImg');
    const cardName = document.getElementById('marketCardName');
    const fields = document.getElementById('marketCardFields');
    const pricing = document.getElementById('marketPricing');
    const btnAdd = document.getElementById('btnAddCart');

    placeholder.style.display = 'none';
    imgContainer.style.display = 'flex';
    cardName.style.display = 'block';
    fields.style.display = 'flex';
    pricing.style.display = 'block';
    btnAdd.style.display = 'block';

    // Resetar preços
    ['dinheiro', 'ponto', 'hd'].forEach(t => {
        const ck = document.getElementById(`price${capitalize(t)}Check`);
        const vl = document.getElementById(`price${capitalize(t)}Value`);
        if (ck) ck.checked = false;
        if (vl) { vl.value = ''; vl.classList.remove('visible'); }
    });

    switch (tipo) {
        case 'pokemon': renderizarCardPokemon(identificador); break;
        case 'tm': renderizarCardTM(identificador); break;
        case 'item': renderizarCardItem(identificador); break;
        case 'conta': renderizarCardConta(identificador); break;
    }
}

// ── Card: Pokémon ───────────────────────────────
function renderizarCardPokemon(nomeOuEV) {
    const dados = marketPokemonData.length > 0 ? marketPokemonData : todosPokemons || [];
    const pokemon = dados.find(p => {
        const ev = (p['EV'] || '').trim();
        const pk = (p['POKEMON'] || '').trim();
        return (ev || pk) === nomeOuEV;
    }) || dados.find(p => p['POKEMON'] === nomeOuEV);

    if (!pokemon) return;

    marketItemSelecionado = { tipo: 'pokemon', dados: pokemon };

    const ev = pokemon['EV'] || '';
    const nome = pokemon['POKEMON'] || 'Desconhecido';
    const nomePrincipal = ev || nome;
    const imgSrc = obterImagemPokemonMarket(pokemon);

    document.getElementById('marketCardImg').src = imgSrc;
    document.getElementById('marketCardImg').alt = nomePrincipal;
    document.getElementById('marketCardImg').onerror = function() {
        this.onerror = null;
        this.src = 'IMAGENS/imagens-pokemon/sprite-pokemon/placeholder.png';
    };
    document.getElementById('marketCardName').textContent = nomePrincipal;
    document.getElementById('marketCardTypeLabel').textContent = 'POKÉMON';

    // Opções de pokébola
    const pokebolasOpts = marketPokebolas.map(p =>
        `<option value="${p['NOME']}">${p['NOME']}</option>`
    ).join('');

    // Opções de nature
    const naturesOpts = marketNatures.map(n => {
        const val = n['NATURE'] || n['Nature'] || n['nature'] || Object.values(n).find(v => v) || '';
        return val ? `<option value="${val}">${val}</option>` : '';
    }).filter(Boolean).join('');

    // Opções de held item
    const heldOpts = marketHeldItems.map(h =>
        `<option value="${h['NOME']}">${h['NOME']}</option>`
    ).join('');

    // Opções de mega stone
    const megaOpts = marketMegaStones.map(m =>
        `<option value="${m['NOME']}">${m['NOME']}</option>`
    ).join('');

    const fields = document.getElementById('marketCardFields');
    fields.innerHTML = `
        <div class="market-field">
            <label><i class="fas fa-star"></i> Shiny?</label>
            <div class="market-checkbox-group">
                <label class="market-checkbox-option">
                    <input type="checkbox" id="mkShiny"> <span>Sim, é Shiny</span>
                </label>
            </div>
        </div>
        <div class="market-field">
            <label><i class="fas fa-tag"></i> Nickname (opcional)</label>
            <input type="text" id="mkNickname" placeholder="Nickname do Pokémon">
        </div>
        <div class="market-field">
            <label><i class="fas fa-circle"></i> Pokébola</label>
            <select id="mkPokebola">
                <option value="">Nenhuma</option>
                ${pokebolasOpts}
            </select>
        </div>
        <div class="market-field">
            <label><i class="fas fa-arrow-up"></i> Level</label>
            <div class="market-radio-group">
                <label class="market-radio-option">
                    <input type="radio" name="mkLevel" value="100" checked> <span>100</span>
                </label>
                <label class="market-radio-option">
                    <input type="radio" name="mkLevel" value="outro" onchange="toggleCampoLevel()"> <span>Outro</span>
                </label>
            </div>
            <div class="market-conditional-field" id="mkLevelOutroWrap">
                <input type="number" id="mkLevelOutro" placeholder="Nível" min="1" max="100">
            </div>
        </div>
        <div class="market-field">
            <label><i class="fas fa-venus-mars"></i> Sexo</label>
            <div class="market-radio-group">
                <label class="market-radio-option">
                    <input type="radio" name="mkSexo" value="Male" checked> <span>♂ Male</span>
                </label>
                <label class="market-radio-option">
                    <input type="radio" name="mkSexo" value="Female"> <span>♀ Female</span>
                </label>
                <label class="market-radio-option">
                    <input type="radio" name="mkSexo" value="Indefinido"> <span>⚪ Indefinido</span>
                </label>
            </div>
        </div>
        <div class="market-field">
            <label><i class="fas fa-dna"></i> Nature</label>
            <select id="mkNature">
                <option value="">Selecione</option>
                ${naturesOpts}
            </select>
        </div>
        <div class="market-field">
            <label><i class="fas fa-gem"></i> Boost Stone</label>
            <div class="market-checkbox-group">
                <label class="market-checkbox-option">
                    <input type="checkbox" id="mkBoostCheck" onchange="toggleConditional('mkBoostWrap', this.checked)">
                    <span>Com Boost Stone</span>
                </label>
            </div>
            <div class="market-conditional-field" id="mkBoostWrap">
                <input type="number" id="mkBoostQty" placeholder="Quantidade" min="1" value="1">
            </div>
        </div>
        <div class="market-field">
            <label><i class="fas fa-hand-holding"></i> Held Item</label>
            <div class="market-checkbox-group">
                <label class="market-checkbox-option">
                    <input type="checkbox" id="mkHeldCheck" onchange="toggleConditional('mkHeldWrap', this.checked)">
                    <span>Com Held Item</span>
                </label>
            </div>
            <div class="market-conditional-field" id="mkHeldWrap">
                <select id="mkHeldItem">
                    <option value="">Selecione</option>
                    ${heldOpts}
                </select>
            </div>
        </div>
        <div class="market-field">
            <label><i class="fas fa-bolt"></i> Mega Stone</label>
            <div class="market-checkbox-group">
                <label class="market-checkbox-option">
                    <input type="checkbox" id="mkMegaCheck" onchange="toggleConditional('mkMegaWrap', this.checked)">
                    <span>Com Mega Stone</span>
                </label>
            </div>
            <div class="market-conditional-field" id="mkMegaWrap">
                <select id="mkMegaStone">
                    <option value="">Selecione</option>
                    ${megaOpts}
                </select>
            </div>
        </div>
        <div class="market-field">
            <label><i class="fas fa-puzzle-piece"></i> Addon</label>
            <div class="market-checkbox-group">
                <label class="market-checkbox-option">
                    <input type="checkbox" id="mkAddonCheck" onchange="toggleConditional('mkAddonWrap', this.checked)">
                    <span>Com Addon</span>
                </label>
            </div>
            <div class="market-conditional-field" id="mkAddonWrap">
                <input type="text" id="mkAddon" placeholder="Nome do Addon">
            </div>
        </div>
    `;

    // Attach radio listeners for level
    document.querySelectorAll('input[name="mkLevel"]').forEach(r => {
        r.addEventListener('change', toggleCampoLevel);
    });
}

// ── Card: TM ────────────────────────────────────
function renderizarCardTM(numero) {
    const dados = typeof todosTMs !== 'undefined' ? todosTMs : [];
    const tm = dados.find(t => String(t.numero) === String(numero));
    if (!tm) return;

    marketItemSelecionado = { tipo: 'tm', dados: tm };

    const numLabel = tm.tipo === 'HM' ? 'HM' : 'TM';
    const numFormatted = numLabel + String(tm.numero).padStart(2, '0');
    const imgSrc = obterImagemTM(tm.tipagem);

    document.getElementById('marketCardImg').src = imgSrc;
    document.getElementById('marketCardImg').alt = numFormatted;
    document.getElementById('marketCardName').textContent = `${numFormatted} - ${tm.nome}`;
    document.getElementById('marketCardTypeLabel').textContent = 'TM';

    const fields = document.getElementById('marketCardFields');
    fields.innerHTML = `
        <div class="market-field">
            <label><i class="fas fa-fire"></i> Tipagem</label>
            <input type="text" value="${tm.tipagem}" readonly style="opacity:0.7">
        </div>
        <div class="market-field">
            <label><i class="fas fa-sort-numeric-up"></i> Quantidade</label>
            <input type="number" id="mkTMQty" placeholder="Qtd" min="1" value="1">
        </div>
    `;
}

// ── Card: Item ──────────────────────────────────
function renderizarCardItem(nomeItem) {
    const item = marketItensVenda.find(i => i['NOME'] === nomeItem);
    if (!item) return;

    marketItemSelecionado = { tipo: 'item', dados: item };

    const nome = item['NOME'] || '';
    const tipo = item['TIPO DO ITEM'] || '';
    const desc = item['DESCRIÇÃO'] || '';
    const imgSrc = obterImagemItem(nome, tipo);

    document.getElementById('marketCardImg').src = imgSrc;
    document.getElementById('marketCardImg').alt = nome;
    document.getElementById('marketCardName').textContent = nome;
    document.getElementById('marketCardTypeLabel').textContent = 'ITEM';

    const fields = document.getElementById('marketCardFields');
    fields.innerHTML = `
        <div class="market-field">
            <label><i class="fas fa-layer-group"></i> Tipo</label>
            <input type="text" value="${tipo}" readonly style="opacity:0.7">
        </div>
        ${desc ? `<div class="market-field"><label><i class="fas fa-info-circle"></i> Descrição</label><input type="text" value="${desc}" readonly style="opacity:0.7; font-size:0.85em;"></div>` : ''}
        <div class="market-field">
            <label><i class="fas fa-sort-numeric-up"></i> Quantidade</label>
            <input type="number" id="mkItemQty" placeholder="Qtd" min="1" value="1">
        </div>
    `;
}

// ── Card: Conta ─────────────────────────────────
function renderizarCardConta(nomeConta) {
    marketItemSelecionado = { tipo: 'conta', dados: { nome: nomeConta } };

    const imgMap = {
        'Conta CM': 'IMAGENS/imagens-itens/conta/conta cm.png',
        'Conta GM': 'IMAGENS/imagens-itens/conta/conta gm.png',
        'Conta Help': 'IMAGENS/imagens-itens/conta/conta help.png'
    };

    document.getElementById('marketCardImg').src = imgMap[nomeConta] || '';
    document.getElementById('marketCardImg').alt = nomeConta;
    document.getElementById('marketCardName').textContent = nomeConta;
    document.getElementById('marketCardTypeLabel').textContent = 'CONTA';

    const fields = document.getElementById('marketCardFields');
    fields.innerHTML = `
        <div class="market-field">
            <label><i class="fas fa-user"></i> Nick</label>
            <input type="text" id="mkContaNick" placeholder="Nick do personagem">
        </div>
        <div class="market-field">
            <label><i class="fas fa-arrow-up"></i> Level</label>
            <input type="number" id="mkContaLevel" placeholder="Level" min="1">
        </div>
        <div class="market-field">
            <label><i class="fas fa-users"></i> Clã</label>
            <input type="text" id="mkContaCla" placeholder="Nome do clã">
        </div>
        <div class="market-field">
            <label><i class="fas fa-trophy"></i> Tier</label>
            <input type="text" id="mkContaTier" placeholder="Ex: 10">
        </div>
        <div class="market-field">
            <label><i class="fas fa-compact-disc"></i> Qtd TMs</label>
            <input type="number" id="mkContaTMs" placeholder="Quantidade" min="0">
        </div>
    `;
}

// ── Helpers de campos condicionais ──────────────
function toggleCampoLevel() {
    const wrap = document.getElementById('mkLevelOutroWrap');
    const isOutro = document.querySelector('input[name="mkLevel"]:checked')?.value === 'outro';
    if (wrap) wrap.classList.toggle('visible', isOutro);
}

function toggleConditional(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('visible', show);
}

function togglePriceInput(tipo) {
    const check = document.getElementById(`price${capitalize(tipo)}Check`);
    const input = document.getElementById(`price${capitalize(tipo)}Value`);
    if (input) input.classList.toggle('visible', check?.checked || false);
    if (!check?.checked && input) input.value = '';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Carrinho ────────────────────────────────────
function adicionarAoCarrinho() {
    if (!marketItemSelecionado) {
        alert('Selecione um item primeiro!');
        return;
    }

    const precos = obterPrecos();
    if (!precos.dinheiro && !precos.ponto && !precos.hd) {
        alert('Informe pelo menos um valor de venda!');
        return;
    }

    const cartItem = {
        tipo: marketItemSelecionado.tipo,
        precos: precos,
        timestamp: Date.now()
    };

    switch (marketItemSelecionado.tipo) {
        case 'pokemon':
            cartItem.dados = coletarDadosPokemon();
            cartItem.nome = cartItem.dados.nome;
            cartItem.imagem = obterImagemPokemonMarket(marketItemSelecionado.dados);
            break;
        case 'tm':
            cartItem.dados = coletarDadosTM();
            cartItem.nome = cartItem.dados.label;
            cartItem.imagem = obterImagemTM(marketItemSelecionado.dados.tipagem);
            break;
        case 'item':
            cartItem.dados = coletarDadosItem();
            cartItem.nome = cartItem.dados.nome;
            cartItem.imagem = obterImagemItem(cartItem.dados.nome, cartItem.dados.tipo);
            break;
        case 'conta':
            cartItem.dados = coletarDadosConta();
            cartItem.nome = marketItemSelecionado.dados.nome;
            cartItem.imagem = document.getElementById('marketCardImg')?.src || '';
            break;
    }

    cartItem.texto = gerarTextoItemCarrinho(cartItem);
    marketCarrinho.push(cartItem);
    salvarCarrinhoSession();
    renderizarCarrinho();
    resetarCard();

    // Feedback
    const btn = document.getElementById('btnAddCart');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
        btn.disabled = true;
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-cart-plus"></i> Adicionar ao Carrinho';
            btn.disabled = false;
        }, 1500);
    }
}

function obterPrecos() {
    return {
        dinheiro: document.getElementById('priceDinheiroCheck')?.checked ? (document.getElementById('priceDinheiroValue')?.value || '') : '',
        ponto: document.getElementById('pricePontoCheck')?.checked ? (document.getElementById('pricePontoValue')?.value || '') : '',
        hd: document.getElementById('priceHdCheck')?.checked ? (document.getElementById('priceHdValue')?.value || '') : ''
    };
}

function coletarDadosPokemon() {
    const pokemon = marketItemSelecionado.dados;
    const ev = pokemon['EV'] || '';
    const nomePokemon = pokemon['POKEMON'] || '';
    const nome = ev || nomePokemon;
    const shiny = document.getElementById('mkShiny')?.checked || false;
    const nickname = document.getElementById('mkNickname')?.value || '';
    const pokebola = document.getElementById('mkPokebola')?.value || '';
    const levelRadio = document.querySelector('input[name="mkLevel"]:checked')?.value || '100';
    const level = levelRadio === 'outro' ? (document.getElementById('mkLevelOutro')?.value || '?') : '100';
    const sexo = document.querySelector('input[name="mkSexo"]:checked')?.value || 'Indefinido';
    const nature = document.getElementById('mkNature')?.value || '';
    const boost = document.getElementById('mkBoostCheck')?.checked ? (document.getElementById('mkBoostQty')?.value || '1') : '';
    const held = document.getElementById('mkHeldCheck')?.checked ? (document.getElementById('mkHeldItem')?.value || '') : '';
    const mega = document.getElementById('mkMegaCheck')?.checked ? (document.getElementById('mkMegaStone')?.value || '') : '';
    const addon = document.getElementById('mkAddonCheck')?.checked ? (document.getElementById('mkAddon')?.value || '') : '';

    return { nome, shiny, nickname, pokebola, level, sexo, nature, boost, held, mega, addon };
}

function coletarDadosTM() {
    const tm = marketItemSelecionado.dados;
    const numLabel = tm.tipo === 'HM' ? 'HM' : 'TM';
    const label = numLabel + String(tm.numero).padStart(2, '0') + ' - ' + tm.nome;
    const qty = document.getElementById('mkTMQty')?.value || '1';
    return { numero: tm.numero, nome: tm.nome, tipagem: tm.tipagem, tipo: tm.tipo, label, qty };
}

function coletarDadosItem() {
    const item = marketItemSelecionado.dados;
    const qty = document.getElementById('mkItemQty')?.value || '1';
    return { nome: item['NOME'], tipo: item['TIPO DO ITEM'], qty };
}

function coletarDadosConta() {
    return {
        tipoConta: marketItemSelecionado.dados.nome,
        nick: document.getElementById('mkContaNick')?.value || '',
        level: document.getElementById('mkContaLevel')?.value || '',
        cla: document.getElementById('mkContaCla')?.value || '',
        tier: document.getElementById('mkContaTier')?.value || '',
        tms: document.getElementById('mkContaTMs')?.value || ''
    };
}

// ── Gerar texto por item do carrinho ────────────
function gerarTextoItemCarrinho(item) {
    const p = item.precos;
    let precoStr = '';
    if (p.hd) precoStr += `HD💶: ${p.hd} `;
    if (p.ponto) precoStr += `PONTO💎: ${p.ponto} `;
    if (p.dinheiro) precoStr += `💰R$: ${p.dinheiro}`;
    precoStr = precoStr.trim();

    switch (item.tipo) {
        case 'pokemon': {
            const d = item.dados;
            const shinyTag = d.shiny ? 'Shiny ' : '';
            const pokeStr = d.pokebola ? ` ${d.pokebola}.` : '.';
            const extras = [];
            if (d.nickname) extras.push(`Nickname: ${d.nickname}`);
            if (d.addon) extras.push(`Addons: ${d.addon}`);
            if (d.boost) extras.push(`Boost Stone x${d.boost}`);
            if (d.held) extras.push(`Held: ${d.held}`);
            if (d.mega) extras.push(`Mega: ${d.mega}`);
            const extrasStr = extras.length > 0 ? '\n' + extras.join(' / ') : '';
            return `${shinyTag}${d.nome}${pokeStr}\n${d.level}/${d.sexo}/${d.nature || '?'}${extrasStr}\n${precoStr}`;
        }
        case 'tm': {
            const d = item.dados;
            return `${d.qty}x ${d.label}\n${precoStr}`;
        }
        case 'item': {
            const d = item.dados;
            return `${d.qty}x ${d.nome}\n${precoStr}`;
        }
        case 'conta': {
            const d = item.dados;
            return `${d.tipoConta}\nNick: ${d.nick} | Level: ${d.level} | Clã: ${d.cla} (Tier: ${d.tier}) | TMs: ${d.tms}\n${precoStr}`;
        }
        default:
            return '';
    }
}

function removerDoCarrinho(index) {
    marketCarrinho.splice(index, 1);
    salvarCarrinhoSession();
    renderizarCarrinho();
}

function limparCarrinho() {
    if (marketCarrinho.length === 0) return;
    if (!confirm('Limpar todo o carrinho?')) return;
    marketCarrinho = [];
    salvarCarrinhoSession();
    renderizarCarrinho();
}

function salvarCarrinhoSession() {
    sessionStorage.setItem('marketCarrinho', JSON.stringify(marketCarrinho));
}

function alternarVistaCarrinho(vista) {
    marketVistaCarrinho = vista;
    document.querySelectorAll('.market-cart-view-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === vista);
    });
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const list = document.getElementById('marketCartList');
    const count = document.getElementById('cartCount');
    const empty = document.getElementById('cartEmpty');
    const actions = document.getElementById('cartActions');

    if (!list) return;

    if (count) count.textContent = marketCarrinho.length;

    if (marketCarrinho.length === 0) {
        if (empty) empty.style.display = 'flex';
        if (actions) actions.style.display = 'none';
        list.className = 'market-cart-list';
        list.innerHTML = `<div class="market-cart-empty" id="cartEmpty">
            <i class="fas fa-shopping-cart"></i>
            Seu carrinho está vazio. Adicione itens para montar sua lista de vendas.
        </div>`;
        return;
    }

    if (actions) actions.style.display = 'flex';

    const tipoLabels = { pokemon: 'Pokémon', tm: 'TM', item: 'Item', conta: 'Conta' };

    if (marketVistaCarrinho === 'cards') {
        list.className = 'market-cart-list market-cart-cards-grid';
        list.innerHTML = marketCarrinho.map((item, idx) => {
            const precoDisplay = [];
            if (item.precos.hd) precoDisplay.push(`<span class="market-cart-card-price-tag">💶 HD: ${item.precos.hd}</span>`);
            if (item.precos.ponto) precoDisplay.push(`<span class="market-cart-card-price-tag">💎 Ponto: ${item.precos.ponto}</span>`);
            if (item.precos.dinheiro) precoDisplay.push(`<span class="market-cart-card-price-tag">💲 R$: ${item.precos.dinheiro}</span>`);

            // Detalhes extras para pokemon
            let detailsHTML = '';
            if (item.tipo === 'pokemon' && item.dados) {
                const d = item.dados;
                const parts = [];
                if (d.shiny) parts.push('✨ Shiny');
                parts.push(`Lv.${d.level}`);
                parts.push(d.sexo === 'Male' ? '♂' : d.sexo === 'Female' ? '♀' : '⚪');
                if (d.nature) parts.push(d.nature);
                detailsHTML = `<div class="market-cart-card-detail">${parts.join(' · ')}</div>`;
                const extras = [];
                if (d.pokebola) extras.push(d.pokebola);
                if (d.boost) extras.push(`Boost x${d.boost}`);
                if (d.held) extras.push(d.held);
                if (d.mega) extras.push(d.mega);
                if (d.addon) extras.push(d.addon);
                if (extras.length) detailsHTML += `<div class="market-cart-card-extras">${extras.join(' · ')}</div>`;
            } else if (item.tipo === 'tm' && item.dados) {
                detailsHTML = `<div class="market-cart-card-detail">${item.dados.tipagem} · x${item.dados.qty}</div>`;
            } else if (item.tipo === 'item' && item.dados) {
                detailsHTML = `<div class="market-cart-card-detail">${item.dados.tipo} · x${item.dados.qty}</div>`;
            } else if (item.tipo === 'conta' && item.dados) {
                const d = item.dados;
                detailsHTML = `<div class="market-cart-card-detail">Lv.${d.level} · ${d.cla} · Tier ${d.tier}</div>`;
            }

            return `
                <div class="market-cart-card">
                    <button class="market-cart-card-remove" onclick="removerDoCarrinho(${idx})" title="Remover">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="market-cart-card-img">
                        <img src="${item.imagem}" alt="${item.nome}"
                             onerror="this.onerror=null;this.src='IMAGENS/imagens-pokemon/sprite-pokemon/placeholder.png'">
                    </div>
                    <div class="market-cart-card-name">${item.nome}</div>
                    <div class="market-cart-card-type">
                        <i class="fas fa-tag"></i> ${tipoLabels[item.tipo] || item.tipo}
                    </div>
                    ${detailsHTML}
                    <div class="market-cart-card-prices">
                        ${precoDisplay.join('')}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        list.className = 'market-cart-list';
        list.innerHTML = marketCarrinho.map((item, idx) => {
            const precoDisplay = [];
            if (item.precos.hd) precoDisplay.push(`💶${item.precos.hd}`);
            if (item.precos.ponto) precoDisplay.push(`💎${item.precos.ponto}`);
            if (item.precos.dinheiro) precoDisplay.push(`💲${item.precos.dinheiro}`);

            return `
                <div class="market-cart-item">
                    <div class="market-cart-item-img">
                        <img src="${item.imagem}" alt="${item.nome}" onerror="this.style.opacity='0.3'">
                    </div>
                    <div class="market-cart-item-info">
                        <div class="market-cart-item-name">${item.nome}</div>
                        <div class="market-cart-item-details">${tipoLabels[item.tipo] || item.tipo}</div>
                        <div class="market-cart-item-price">${precoDisplay.join(' ')}</div>
                    </div>
                    <button class="market-cart-item-remove" onclick="removerDoCarrinho(${idx})" title="Remover">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }
}

// ── Gerar texto completo da venda ───────────────
function gerarTextoVendaCompleto() {
    if (marketCarrinho.length === 0) return '';

    // Agrupar por tipo
    const pokemons = marketCarrinho.filter(i => i.tipo === 'pokemon');
    const tms = marketCarrinho.filter(i => i.tipo === 'tm');
    const itens = marketCarrinho.filter(i => i.tipo === 'item');
    const contas = marketCarrinho.filter(i => i.tipo === 'conta');

    let texto = '';

    if (pokemons.length > 0) {
        texto += '🔥 POKÉMONS\n\n';
        pokemons.forEach(p => { texto += p.texto + '\n\n'; });
    }
    if (tms.length > 0) {
        texto += '💿 TMs\n\n';
        tms.forEach(t => { texto += t.texto + '\n\n'; });
    }
    if (itens.length > 0) {
        texto += '📦 ITENS\n\n';
        itens.forEach(i => { texto += i.texto + '\n\n'; });
    }
    if (contas.length > 0) {
        texto += '👤 CONTAS\n\n';
        contas.forEach(c => { texto += c.texto + '\n\n'; });
    }

    // Telefone se disponível
    const telefone = document.getElementById('inputTelefone')?.value || '';
    if (telefone) {
        texto += `📞 Contato: ${telefone}\n`;
    }

    return texto.trim();
}

// ── Copiar Texto ────────────────────────────────
function copiarTextoVenda() {
    const texto = gerarTextoVendaCompleto();
    if (!texto) {
        alert('Carrinho vazio!');
        return;
    }

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.querySelector('.btn-copy-sale');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            setTimeout(() => { btn.innerHTML = original; }, 2000);
        }
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = texto;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        alert('Texto copiado!');
    });
}

// ── Salvar Venda ────────────────────────────────
async function salvarVenda() {
    if (marketCarrinho.length === 0) {
        alert('Carrinho vazio! Adicione itens antes de salvar.');
        return;
    }

    const texto = gerarTextoVendaCompleto();
    const telefone = document.getElementById('inputTelefone')?.value || '';

    // Obter dados do usuário
    let email = '', nickname = 'Anônimo', authToken = '';
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        email = user.email || '';
        nickname = user.nickname || user.nome || 'Anônimo';
        authToken = user.token || '';
    } catch (e) {}

    if (!email) {
        alert('Você precisa estar logado para salvar vendas.');
        return;
    }

    const dadosJSON = JSON.stringify(marketCarrinho.map(item => ({
        tipo: item.tipo,
        nome: item.nome,
        dados: item.dados,
        precos: item.precos
    })));

    const btn = document.querySelector('.btn-save-sale');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }

    try {
        const body = new URLSearchParams();
        body.append('action', 'salvarVenda');
        body.append('textoVenda', texto);
        body.append('dadosJSON', dadosJSON);
        body.append('email', email);
        body.append('nickname', nickname);
        body.append('telefone', telefone);
        body.append('authToken', authToken);

        const response = await fetch(MARKET_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        const resultado = await response.json();

        if (resultado.success) {
            alert('✅ Venda salva com sucesso!');
            marketCarrinho = [];
            salvarCarrinhoSession();
            renderizarCarrinho();
        } else {
            alert('❌ Erro: ' + (resultado.message || 'Erro desconhecido'));
        }
    } catch (err) {
        console.error('❌ Erro ao salvar venda:', err);
        alert('Erro ao salvar venda. Tente novamente.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar Venda';
        }
    }
}

// ── Registrar Página ────────────────────────────
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('market', initMarket);
    console.log('✅ Inicializador Market registrado');
}
