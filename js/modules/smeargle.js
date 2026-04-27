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
// expor globalmente para outros módulos
try{ window.SHEETS_BASE_URL = SHEETS_BASE_URL; }catch(e){}

let smearglePokemonData = [];
let smeargleMovesData = [];
let smeargleAtacksData = [];
// smeargleSelectedMoves agora é um array fixo de 9 slots (índices 0..8 -> M1..M9)
// smeargleSelectedMoves agora é um array fixo de 9 slots (índices 0..8 -> M1..M9)
let smeargleSelectedMoves = new Array(9).fill(null);
// slot alvo quando usuário clica em "Adicionar" num slot vazio (null ou 0-based index)
let smeargleTargetSlot = null;

// Scheduler para agrupar/adiar atualizações pesadas (evita várias execuções seguidas)
window._smeargleUpdateFlags = { card:false, reorder:false, buscar:false, timer:null };
window.scheduleSmeargleUpdate = function(opts){
    try{
        opts = opts || {};
        if(opts.card) window._smeargleUpdateFlags.card = true;
        if(opts.reorder) window._smeargleUpdateFlags.reorder = true;
        if(opts.buscar) window._smeargleUpdateFlags.buscar = true;
        if(window._smeargleUpdateFlags.timer) return; // já agendado
        function run(){
            try{
                if(window._smeargleUpdateFlags.card && typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle();
                if(window._smeargleUpdateFlags.buscar && typeof buscarPokemonsCompativeis==='function') buscarPokemonsCompativeis();
                if(window._smeargleUpdateFlags.reorder && typeof reordenarGridMovesOrdenado==='function') reordenarGridMovesOrdenado();
            }catch(e){console.warn('scheduleSmeargleUpdate run error', e);} finally {
                window._smeargleUpdateFlags.card = false; window._smeargleUpdateFlags.reorder = false; window._smeargleUpdateFlags.buscar = false;
                window._smeargleUpdateFlags.timer = null;
            }
        }
        if(window.requestIdleCallback){ window._smeargleUpdateFlags.timer = requestIdleCallback(run, {timeout:500}); }
        else { window._smeargleUpdateFlags.timer = setTimeout(run, 80); }
    }catch(e){ console.warn('scheduleSmeargleUpdate error', e); }
};

// Helpers de timing seguros (evitam warnings do console sobre timers duplicados)
const __smTimers = new Map();
function smTimeStart(label){ try{ if(!__smTimers.has(label)) __smTimers.set(label, performance.now()); }catch(e){} }
function smTimeEnd(label){ try{ const t = __smTimers.get(label); if(typeof t === 'number'){ console.log(label + ': ' + (performance.now() - t).toFixed(3) + ' ms'); __smTimers.delete(label); } }catch(e){} }

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
        .move-stats .move-stat { margin-right:8px; }
        .move-stat-power { display:inline-block; background: #ffd700; padding:6px 10px; border-radius:10px; border:1px solid #e6b800; box-shadow: 0 8px 24px rgba(230,184,0,0.18); margin-right:8px; }
        .move-stat-power .power-value { color: #161616; font-weight:900; font-size:1.18em; letter-spacing:0.4px; }
        /* texto padrão dos cards: escuro em fundos claros */
        .move-card, .builder-card { color: #111; }
        .move-card * , .builder-card * { color: inherit; }
        /* para cards com fundo escuro aplicamos texto branco */
        .move-card.text-white, .builder-card.text-white { color: #fff; }
        .move-card.text-white .move-acao, .move-card.text-white .move-origem, .move-card.text-white .move-slot-origem { color: rgba(255,255,255,0.95); }
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
// Expor mapeamento globalmente para outros módulos (ex: builder)
try{ window.TIPO_ICONS = TIPO_ICONS; }catch(e){}

// Helpers de normalização para comparar nomes sem acento/maiús/minús
function normalizeName(str) {
    if (!str) return '';
    try {
        return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    } catch (e) {
        return str.toString().toLowerCase().trim();
    }
}
// Simplifica string para comparação tolerante: remove acentos, espaços, hífens e caracteres não alfanuméricos
function simplifyForCompare(s) {
    try {
        return normalizeName(s).replace(/[^a-z0-9]/g, '');
    } catch (e) { return (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, ''); }
}

// Construir índice rápido de ataques/TMs para lookup O(1) por nome/numero
function buildAttackLookup(){
    try{
        if(window.__smAttackLookup) return window.__smAttackLookup;
        const lookup = { byName: new Map(), byNumber: new Map(), raw: [] };
        const candidates = [];
        // priorizar arrays já conhecidas
        const known = ['smeargleAtacksData','todosTMs','todos','todosAtacks','todos_tms','DEX_TMS'];
        known.forEach(k=>{ try{ if(window[k] && Array.isArray(window[k]) && window[k].length) candidates.push(window[k]); }catch(e){} });
        // também incluir smeargleAtacksData local se definida
        try{ if(Array.isArray(smeargleAtacksData) && smeargleAtacksData.length) candidates.push(smeargleAtacksData); }catch(e){}
        // flatenar e dedup
        const seen = new Set();
        candidates.forEach(arr=>{
            arr.forEach(obj=>{
                try{
                    if(!obj || typeof obj !== 'object') return;
                    const rawName = (obj['ATACK']||obj['ATACK_NAME']||obj['nome']||obj['NOME']||obj.name||'')+'';
                    const key = simplifyForCompare(normalizeName(rawName||''));
                    if(!key) return;
                    if(!seen.has(key)){
                        seen.add(key);
                        lookup.byName.set(key, obj);
                        lookup.raw.push(obj);
                    }
                    const num = (obj.numero||obj.NUMERO||obj.Number||'')+'';
                    if(num) lookup.byNumber.set(String(num).replace(/\D/g,''), obj);
                }catch(e){}
            });
        });
        // fallback: scan window once for arrays that pareçam tabelas de ataques
        try{
            for(const k in window){
                try{
                    const v = window[k];
                    if(!Array.isArray(v) || !v.length) continue;
                    if(lookup.raw.length>0 && lookup.raw.length>200) break; // já temos bom índice
                    const keys = Object.keys(v[0]).join(' ').toUpperCase();
                    if(/ATACK|POWER|PP|EFEITO|TIPAGEM|NOME|TM/.test(keys)){
                        v.forEach(obj=>{
                            try{
                                if(!obj || typeof obj !== 'object') return;
                                const rawName = (obj['ATACK']||obj['ATACK_NAME']||obj['nome']||obj['NOME']||obj.name||'')+'';
                                const key = simplifyForCompare(normalizeName(rawName||''));
                                if(!key) return;
                                if(!seen.has(key)){
                                    seen.add(key);
                                    lookup.byName.set(key, obj);
                                    lookup.raw.push(obj);
                                }
                                const num = (obj.numero||obj.NUMERO||obj.Number||'')+'';
                                if(num) lookup.byNumber.set(String(num).replace(/\D/g,''), obj);
                            }catch(e){}
                        });
                    }
                }catch(e){}
            }
        }catch(e){}
        window.__smAttackLookup = lookup;
        return lookup;
    }catch(e){ return { byName:new Map(), byNumber:new Map(), raw:[] }; }
}

// Lookup rápido por nome ou numero (usa buildAttackLookup)
function fastLookupAttack(nameOrObj){
    try{
        const lookup = buildAttackLookup();
        if(!lookup) return null;
        if(!nameOrObj) return null;
        if(typeof nameOrObj === 'string'){
            const key = simplifyForCompare(normalizeName(nameOrObj));
            if(!key) return null;
            if(lookup.byName.has(key)) return lookup.byName.get(key);
            // tentativa por inclusão (fallback rápido via raw array)
            for(const o of lookup.raw){
                try{ const on = (o['ATACK']||o['ATACK_NAME']||o.nome||o.name||'')+''; const k2 = simplifyForCompare(normalizeName(on)); if(k2 && (k2===key || k2.includes(key) || key.includes(k2))) return o; }catch(e){}
            }
            return null;
        }
        if(typeof nameOrObj === 'object'){
            const num = (nameOrObj.numero||nameOrObj.NUMERO||'')+'';
            if(num){ const n = String(num).replace(/\D/g,''); if(lookup.byNumber.has(n)) return lookup.byNumber.get(n); }
            const raw = (nameOrObj.nome||nameOrObj.name||'')+'';
            if(raw) return fastLookupAttack(raw);
        }
    }catch(e){}
    return null;
}
// Extrai o nome primário de um campo que pode conter qualifiers como " - passive - poison"
function extractPrimaryMoveName(raw) {
    if (!raw) return '';
    let s = raw.toString().trim();
    // Remover conteúdo entre parênteses
    s = s.replace(/\(.*?\)/g, '').trim();
    // Padrão "TMxx - Nome do Ataque": retornar o nome após o traço
    const tmMatch = s.match(/^TM\d+\s*[-–]\s*(.+)/i);
    if (tmMatch) return tmMatch[1].trim();
    // Se houver separadores com ' - ' ou '–' ou ':' pegar a primeira parte
    const parts = s.split(/\s[-–:]\s/);
    if (parts && parts.length > 0) return parts[0].trim();
    return s;
}

function initSmeargle() {
    console.log('🎨 Inicializando Smeargle Builder...');
    ensureSmeargleStyles();

    // Se os golpes já foram extraídos (retorno à aba), re-renderiza instantaneamente
    if (Array.isArray(smeargleMovesData) && smeargleMovesData.length > 0) {
        console.log('⚡ Smeargle: dados em cache, renderizando sem fetch...');
        popularFiltrosSmeargle();
        renderizarGolpesSmeargle(smeargleMovesData);
        configurarEventosSmeargle();
        return;
    }

    carregarDadosSmeargle();
}

// Mostra um banner informando que os dados de ataques não foram carregados
function showAttacksMissingBanner(){
    try{
        const container = document.getElementById('combinedPanel') || document.getElementById('combinedMovesGrid') || document.body;
        if(!container) return;
        let b = document.getElementById('attacksMissingBanner');
        if(b) return; // já exibido
        b = document.createElement('div');
        b.id = 'attacksMissingBanner';
        b.style.cssText = 'background:#3a2f14;color:#fff;padding:10px;border-radius:8px;margin-bottom:8px;border:1px solid rgba(255,215,0,0.12);display:flex;align-items:center;justify-content:space-between;gap:12px';
        b.innerHTML = `<div style="font-weight:700">Aviso: dados de ataques (ATACKS) não carregaram — informações Ação/Efeito/Stats estarão vazias.</div><div style="display:flex;gap:8px"><button id="retryAtacksBtn" style="background:#ffd700;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:700">Tentar novamente</button><button id="hideAtacksBanner" style="background:transparent;border:1px solid rgba(255,255,255,0.06);padding:6px 10px;border-radius:6px;cursor:pointer">Fechar</button></div>`;
        // inserir no topo do painel
        if(container===document.body) document.body.insertBefore(b, document.body.firstChild);
        else container.insertBefore(b, container.firstChild);
        document.getElementById('retryAtacksBtn').addEventListener('click', retryFetchAttacks);
        document.getElementById('hideAtacksBanner').addEventListener('click', ()=>{ try{ const el=document.getElementById('attacksMissingBanner'); if(el) el.remove(); }catch(e){} });
    }catch(e){ console.warn('showAttacksMissingBanner error', e); }
}

// Re-tenta buscar a tabela de ataques do Apps Script
async function retryFetchAttacks(){
    try{
        console.log('retryFetchAttacks: tentando nova requisição de ATACKS...');
        const ATACKS_URL = SHEETS_BASE_URL + '?acao=obter_atacks&page=1&limit=10000';
        const resp = await fetch(ATACKS_URL);
        if(!resp.ok){ console.warn('retryFetchAttacks: response not ok', resp.status); return; }
        const text = await resp.text();
        let data;
        try{ data = JSON.parse(text); }catch(e){ console.warn('retryFetchAttacks: parse error', e); return; }
        let arr = [];
        if(Array.isArray(data)) arr = data;
        else if(data.data && Array.isArray(data.data)) arr = data.data;
        if(!arr || arr.length===0){ console.warn('retryFetchAttacks: ainda vazio'); return; }
        smeargleAtacksData = arr;
        console.log('retryFetchAttacks: dados de ataques carregados, count=', arr.length);
        // remover banner
        try{ const b=document.getElementById('attacksMissingBanner'); if(b) b.remove(); }catch(e){}
        // atualizar views
        try{ if(window.refreshParsedMovesAttacks) window.refreshParsedMovesAttacks(); if(window.refreshTmTypes) window.refreshTmTypes(); }catch(e){}
    }catch(e){ console.warn('retryFetchAttacks error', e); }
}

// Extrai nome principal/species de uma string (remove qualifiers como Shiny/Mega/Alolan etc.)
function extractSpeciesName(raw){
    if(!raw) return '';
    try{
        let s = raw.toString().replace(/\(.*\)/g,'').trim();
        s = s.replace(/\s+/g,' ');
        const quals = ['shiny','mega','alolan','galarian','hisui','crowned','female','male','shadow'];
        const parts = s.split(/\s+/).filter(Boolean);
        // remove qualifiers at start/end
        if(parts.length>1 && quals.includes(parts[0].toLowerCase())) parts.shift();
        if(parts.length>1 && quals.includes(parts[parts.length-1].toLowerCase())) parts.pop();
        const species = parts.join(' ');
        return species.split(' ').map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    }catch(e){ return raw; }
}

// Carregar dados do Google Sheets
// Busca os dados brutos (pokemon + ataques + abilities + TMs) e armazena em cache global.
// Retorna Promise<boolean> (true = sucesso).
async function _fetchSmeargleRawData() {
    try {
        const ATACKS_URL = SHEETS_BASE_URL + '?acao=obter_atacks&page=1&limit=10000';
        const TMS_URL    = SHEETS_BASE_URL + '?acao=obter_tms&page=1&limit=10000';
        const [pokeResp, atacksResp, tmsResp] = await Promise.all([
            fetch(SHEETS_URL),
            fetch(ATACKS_URL),
            fetch(TMS_URL)
        ]);
        if (!pokeResp.ok) throw new Error(`HTTP ${pokeResp.status}`);
        if (!atacksResp.ok) throw new Error(`HTTP ataques ${atacksResp.status}`);

        const [pokeJson, atacksJson] = await Promise.all([
            pokeResp.json(),
            atacksResp.json()
        ]);

        let tms = [];
        try {
            const tmsJson = await tmsResp.json();
            const rawTms  = Array.isArray(tmsJson) ? tmsJson : (tmsJson.data || []);
            tms = rawTms.map(tm => ({
                tipo: tm['TIPO DE ITEM'] || 'TM',
                numero: String(tm['NUMERO DO TM'] || ''),
                nome: tm['NOME DO TM'] || '',
                tipagem: tm['TIPAGEM DO TM'] || 'Normal',
                categoria: tm['TIPO DE DROP'] || ''
            }));
        } catch(e) { console.warn('[Smeargle] TMs não carregados:', e); }

        const pokemon = Array.isArray(pokeJson) ? pokeJson : (pokeJson.data || []);
        const atacks  = Array.isArray(atacksJson) ? atacksJson : (atacksJson.data || []);

        // abilities: usar cache global ou buscar
        let abilities = [];
        if (window.todasAbilities && window.todasAbilities.length > 0) {
            abilities = window.todasAbilities;
        } else {
            try {
                const abResp = await fetch(SHEETS_BASE_URL + '?acao=obter_abilities&page=1&limit=10000');
                if (abResp.ok) {
                    const abJson = await abResp.json();
                    abilities = Array.isArray(abJson) ? abJson : (abJson.data || []);
                }
            } catch(e) {}
        }

        window.__smeargleRawCache = { pokemon, atacks, abilities, tms, ts: Date.now() };
        // expor TMs globalmente para outros módulos
        if (tms.length > 0 && (!window.todosTMs || window.todosTMs.length === 0)) {
            window.todosTMs = tms;
        }
        console.log('✅ [Smeargle] Cache bruto pronto — pokemon:', pokemon.length, 'ataques:', atacks.length, 'TMs:', tms.length);
        return true;
    } catch(e) {
        console.warn('[Smeargle] _fetchSmeargleRawData error:', e);
        return false;
    }
}

async function carregarDadosSmeargle() {
    const grid = document.getElementById('movesGrid');
    if (!grid) { console.error('❌ Elemento movesGrid não encontrado!'); return; }

    try {
        // --- Usar cache bruto se já disponível (pré-fetch ou visita anterior) ---
        if (!window.__smeargleRawCache || !window.__smeargleRawCache.pokemon) {
            // Dados ainda não chegaram: mostrar loading e buscar agora
            grid.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Carregando golpes...</p></div>`;
            const ok = await _fetchSmeargleRawData();
            if (!ok) throw new Error('Falha ao buscar dados do servidor');
        }

        const cache = window.__smeargleRawCache;
        smearglePokemonData  = cache.pokemon;
        smeargleAtacksData   = cache.atacks;
        smeargleAbilitiesData = cache.abilities.length > 0 ? cache.abilities : (window.todasAbilities || []);
        // TMs: injetar no global para uso no extrair
        if (cache.tms && cache.tms.length > 0 && (!window.todosTMs || window.todosTMs.length === 0)) {
            window.todosTMs = cache.tms;
        }

        try{ window.smeargleAtacksData = smeargleAtacksData; }catch(e){}
        try{ buildAttackLookup(); }catch(e){}
        try{ if(typeof atualizarCardSmeargle === 'function') setTimeout(atualizarCardSmeargle, 120); }catch(e){}

        if (!Array.isArray(smeargleAtacksData) || smeargleAtacksData.length === 0) {
            console.warn('smeargleAtacksData is empty, scheduling retry');
            showAttacksMissingBanner();
            setTimeout(() => { try{ retryFetchAttacks(); }catch(e){} }, 1200);
        }

        extrairGolpesSmeargle(smearglePokemonData);
        popularFiltrosSmeargle();
        renderizarGolpesSmeargle(smeargleMovesData);
        configurarEventosSmeargle();
        try{ setTimeout(()=>{ if(window.refreshParsedMovesAttacks) window.refreshParsedMovesAttacks(); if(window.refreshTmTypes) window.refreshTmTypes(); }, 80); }catch(e){}

    } catch (erro) {
        console.error('❌ Erro ao carregar dados Smeargle:', erro);
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
    let totalM1 = 0, golpesValidos = 0;

    // Helper: adiciona golpe ao mapa
    function addGolpe(g, origem, origPoke, coluna) {
        const key = g.nome.toLowerCase() + '_' + origem.toLowerCase();
        if (!golpesMap.has(key)) {
            golpesMap.set(key, Object.assign({ origem, origem_pokemon: origPoke, local: coluna }, g));
            golpesValidos++;
        }
    }

    // Helper: monta origem
    function getOrigem(pokemon) {
        return (pokemon['EV'] && pokemon['EV'].toString().trim()) ? pokemon['EV'].toString().trim() : (pokemon['POKEMON'] || '').toString().trim();
    }

    pokemons.forEach((pokemon, index) => {
        for (let i = 1; i <= 10; i++) {
            const coluna = `M${i}`;
            const celula = pokemon[coluna];
            if (!celula) continue;

            if (i === 1) totalM1++;

            const celulaStr = String(celula).trim();

            // Suportar tanto "Nome / ação / tipo / categoria" quanto nome simples ("Shadow Ball")
            // ou formato com traço ("TM09 - Venoshock", "Shadow Ball - Special - Ghost")
            const partes = celulaStr.includes('/') ? celulaStr.split('/').map(s => s.trim()) : celulaStr.split(/\s[-–]\s/).map(s => s.trim());
            const rawName = partes[0];
            if (!rawName || /^Descri[çc]/i.test(rawName) || rawName.length > 80) continue;

            const origem   = getOrigem(pokemon);
            const origPoke = (pokemon['POKEMON'] || '').toString().trim();

            const primaryName = extractPrimaryMoveName(rawName);
            const nomeSimple  = simplifyForCompare(normalizeName(primaryName));
            const found = _lookupAtack(nomeSimple);
            if (found) {
                addGolpe(_makeGolpeFromAtack(found, primaryName), origem, origPoke, coluna);
            } else {
                // fallback: criar com dados da própria célula
                addGolpe({ nome: primaryName, acao: partes[1]||'', tipo: partes[2]||'', categoria: partes[3]||'', efeito: '', power: 0 }, origem, origPoke, coluna);
            }
        }
    });

    console.log('📊 Total M1:', totalM1, '| Válidos:', golpesValidos, '| Únicos:', golpesMap.size);
    smeargleMovesData = Array.from(golpesMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

// Lookup rápido em smeargleAtacksData (exact + inclusion fallback)
function _lookupAtack(nomeSimple) {
    if (!nomeSimple) return null;
    let found = smeargleAtacksData.find(a => simplifyForCompare(normalizeName(a['ATACK'])) === nomeSimple);
    if (!found) found = smeargleAtacksData.find(a => { const s = simplifyForCompare(normalizeName(a['ATACK'])); return s && (s.includes(nomeSimple) || nomeSimple.includes(s)); });
    return found || null;
}

// Cria objeto golpe a partir de um registro de smeargleAtacksData
function _makeGolpeFromAtack(a, fallbackNome) {
    const _rawPow  = a['POWER'] || a['power'] || a['Power'] || '';
    const _powMatch = _rawPow ? String(_rawPow).match(/-?\d+/) : null;
    return {
        nome:      a['ATACK'] || fallbackNome,
        acao:      a['AÇÃO'] || '',
        efeito:    a['EFEITO'] || '',
        tipo:      a['TYPE'] || '',
        categoria: a['CATEGORIA'] || '',
        power:     _powMatch ? parseInt(_powMatch[0], 10) : 0
    };
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
    const _smTimerLabel = '[Smeargle] renderizarGolpesSmeargle';
    smTimeStart(_smTimerLabel);
    if (!grid) {
        console.warn('[Smeargle] renderizarGolpesSmeargle: elemento #movesGrid não encontrado. Pulando render.');
        try{ smTimeEnd(_smTimerLabel); }catch(e){}
        return;
    }
    if (!Array.isArray(golpes) || golpes.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Nenhum golpe encontrado com esses filtros</p>
            </div>
        `;
        try{ smTimeEnd(_smTimerLabel); }catch(e){}
        return;
    }

    const nomesSelecionados = smeargleSelectedMoves.filter(Boolean).map(m => m.nome.toLowerCase());

    // Construir array de HTML por item (não inserir tudo de uma vez para evitar bloqueio em grandes listas)
    // Minimizar trabalho pesado aqui: usar dados diretos do objeto e evitar lookups caros
    const itemsHtml = golpes.map(golpe => {
        const estaSelecionado = nomesSelecionados.includes((golpe.nome||'').toLowerCase());
        const classeExtra = estaSelecionado ? ' move-card-selected' : '';
        const darkTypes = new Set(['dark','ghost','rock','steel','poison','ground','dragon','fighting']);
        const slotOrigem = golpe.local ? golpe.local.toUpperCase() : '';
        const tipoResolvido = (golpe.tipo && golpe.tipo.toString().trim()) ? golpe.tipo : 'Normal';
        const tipoClassSafe = (tipoResolvido||'Normal').toString().toLowerCase().replace(/\s+/g,'-');
        const iconClass = TIPO_ICONS[tipoResolvido] || 'fa-circle';
        const acao = golpe.acao || golpe.ACAO || golpe['AÇÃO'] || '';
        const categoria = golpe.categoria || golpe.CATEGORIA || '';

        const textClass = darkTypes.has(tipoClassSafe) ? ' text-white' : '';
        return `
            <div class="move-card builder-card type-${tipoClassSafe}${classeExtra}${textClass}"
                 data-move-name="${(golpe.nome||'').replace(/"/g,'&quot;')}" data-move-local="${(golpe.local||'') }" data-move-origem="${(golpe.origem||'').replace(/"/g,'&quot;')}"
                 onclick="selecionarGolpe(this)">
                <div class="move-tipo-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="move-name">${golpe.nome}</div>
                <div class="move-details">
                    <span class="move-tipo">${tipoResolvido}</span>
                    <span class="move-categoria">${categoria}</span>
                </div>
                <div class="move-acao" style="display:${acao ? 'block' : 'none'}">${acao}</div>
                <div class="move-efeito" style="display:none"></div>
                <div class="move-stats" style="margin-top:6px;font-size:12px;opacity:0.9"></div>
                <div class="move-origem">
                    <i class="fas fa-paw"></i> ${golpe.origem || ''}
                </div>
                <div class="move-slot-origem" style="font-size:0.95em;margin-top:6px;">
                    <i class="fas fa-hashtag"></i> Slot: <b>${slotOrigem}</b>
                </div>
                <div class="move-actions" style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end">
                    <button class="btn-copy-move" onclick="event.stopPropagation(); copiarGolpeParaClipboard(this)" title="Copiar ataque" style="background:#2b6cb0;color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:0.9em">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
                ${estaSelecionado ? '<div class="move-selected-badge"><i class="fas fa-check-circle"></i></div>' : ''}
            </div>
        `;
    });

    // Renderizar em chunks para evitar travamento em grandes listas
    grid.innerHTML = '';
    var CHUNK = 40;
    var idx = 0;
    function appendChunk(){
        try{
            var end = Math.min(idx + CHUNK, itemsHtml.length);
            if(end > idx){ grid.insertAdjacentHTML('beforeend', itemsHtml.slice(idx, end).join('')); 
                // preencher detalhes (PP / Power / Acc / Efeito) dos itens recém-inseridos sem travar
                try{ if(window.requestIdleCallback) requestIdleCallback(function(){ preencherDetalhesMovimentosBatch(grid, 12); }, {timeout:400}); else setTimeout(function(){ preencherDetalhesMovimentosBatch(grid,12); }, 60); }catch(e){}
            }
            idx = end;
            if(idx < itemsHtml.length){
                if(window.requestIdleCallback) requestIdleCallback(appendChunk, {timeout:200});
                else setTimeout(appendChunk, 40);
            } else {
                // fim da renderização
                try{ smTimeEnd(_smTimerLabel); }catch(e){}
            }
        }catch(e){ console.warn('renderizarGolpesSmeargle chunk error', e); try{ smTimeEnd(_smTimerLabel); }catch(e){} }
    }
    // iniciar primeiro chunk imediatamente para rapidez percebida
    appendChunk();
    // timer será encerrado ao final dos chunks
}

// Selecionar golpe
window.selecionarGolpe = function(element) {
    var golpe = null;
    try{
        if(element && element.dataset && element.dataset.move){ golpe = JSON.parse(element.dataset.move); }
        else if(element && element.dataset && element.dataset.moveName){
            var nm = (element.dataset.moveName||'')+'';
            var local = (element.dataset.moveLocal||'')+'';
            var found = null;
            try{ if(Array.isArray(smeargleMovesData)){
                const key = normalizeName(nm);
                found = smeargleMovesData.find(function(m){ try{ return normalizeName(m.nome||m.name||m.NOME||'') === key && ((m.local||'')===(local||'') || !local); }catch(e){return false;} });
                if(!found) found = smeargleMovesData.find(function(m){ try{ return normalizeName(m.nome||m.name||m.NOME||'') === key; }catch(e){return false;} });
            }}catch(e){}
            golpe = found || { nome: nm, local: local };
        }
    }catch(e){ console.warn('selecionarGolpe parse fallback', e); golpe = null; }
    if(!golpe) golpe = {};

    // Se estamos em modo seleção de slot específico, tentar inserir no slot alvo
    if (typeof smeargleTargetSlot === 'number' && smeargleTargetSlot !== null) {
        const slotIdx = smeargleTargetSlot; // 0-based
        // Só permitir adicionar o golpe no slot exato de origem
        const slotOrigem = golpe.local ? parseInt(golpe.local.replace(/^M/i, ''), 10) : null;
        if (slotOrigem !== slotIdx + 1) {
            const msg = `⚠️ Este golpe só pode ser copiado no slot ${golpe.local}.`;
            if (window.showToast) window.showToast(msg, 'error'); else alert(msg);
            smeargleTargetSlot = null;
            try{ scheduleSmeargleUpdate({card:true}); }catch(e){}
            return;
        }
        if (smeargleSelectedMoves[slotIdx]) {
            const msg = `⚠️ O slot M${slotIdx + 1} já está ocupado.`;
            if (window.showToast) window.showToast(msg, 'error'); else alert(msg);
            smeargleTargetSlot = null;
            try{ scheduleSmeargleUpdate({card:true}); }catch(e){}
            return;
        }
        // Inserção imediata no modelo e feedback visual rápido
        smeargleSelectedMoves[slotIdx] = golpe;
        smeargleTargetSlot = null;
        try{ const movesCount = document.getElementById('movesCount'); if(movesCount) movesCount.textContent = smeargleSelectedMoves.filter(Boolean).length; }catch(e){}
        try{ const slotEl = document.querySelector(`#movesList [data-slot="${slotIdx+1}"]`); if(slotEl){ slotEl.outerHTML = `<div class="selected-move-item" data-slot="${slotIdx+1}">\n                        <span class="move-number">${slotIdx + 1}</span>\n                        <span class="move-info">\n                            <strong>${golpe.nome}</strong>\n                            <small>${(golpe.tipo||'')} ${(golpe.categoria?('• '+golpe.categoria):'')}</small>\n                        </span>\n                        <div style="display:flex;gap:6px;align-items:center;margin-left:8px;">\n                            <button class="btn-edit-move" onclick="editarSlot(${slotIdx})" title="Editar"><i class="fas fa-edit"></i></button>\n                            <button class="btn-move-left" onclick="moverGolpeEsquerda(${slotIdx})" title="Mover para a esquerda"><i class="fas fa-arrow-left"></i></button>\n                            <button class="btn-move-right" onclick="moverGolpeDireita(${slotIdx})" title="Mover para a direita"><i class="fas fa-arrow-right"></i></button>\n                            <button class="btn-remove-move" onclick="removerGolpe(${slotIdx})" title="Remover"><i class="fas fa-times"></i></button>\n                        </div>\n                    </div>`; } }catch(e){}
        const okMsg = `✔️ Golpe adicionado em M${slotIdx + 1}`;
        if (window.showToast) window.showToast(okMsg, 'success');

        // sinalizar adição recente para evitar que a atualização de card sobrescreva status
        try{ window.__smeargle_recently_added_move = true; setTimeout(function(){ try{ window.__smeargle_recently_added_move = false; }catch(e){} }, 350); }catch(e){}
        // agendar trabalho pesado sem bloquear a interação
        try{ scheduleSmeargleUpdate({card:true,buscar:true,reorder:true}); }catch(e){}
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
    // atualização imediata e feedback visual leve
    try{ const movesCount = document.getElementById('movesCount'); if(movesCount) movesCount.textContent = smeargleSelectedMoves.filter(Boolean).length; }catch(e){}
    try{ element.style.animation = 'none'; setTimeout(() => { element.style.animation = 'pulseSelect 0.4s ease'; }, 10); }catch(e){}
    try{ const slotIdx2 = slotOrigem - 1; const slotEl2 = document.querySelector(`#movesList [data-slot="${slotIdx2+1}"]`); if(slotEl2){ slotEl2.outerHTML = `<div class="selected-move-item" data-slot="${slotIdx2+1}">\n                        <span class="move-number">${slotIdx2 + 1}</span>\n                        <span class="move-info">\n                            <strong>${golpe.nome}</strong>\n                            <small>${(golpe.tipo||'')} ${(golpe.categoria?('• '+golpe.categoria):'')}</small>\n                        </span>\n                        <div style="display:flex;gap:6px;align-items:center;margin-left:8px;">\n                            <button class="btn-edit-move" onclick="editarSlot(${slotIdx2})" title="Editar"><i class="fas fa-edit"></i></button>\n                            <button class="btn-move-left" onclick="moverGolpeEsquerda(${slotIdx2})" title="Mover para a esquerda"><i class="fas fa-arrow-left"></i></button>\n                            <button class="btn-move-right" onclick="moverGolpeDireita(${slotIdx2})" title="Mover para a direita"><i class="fas fa-arrow-right"></i></button>\n                            <button class="btn-remove-move" onclick="removerGolpe(${slotIdx2})" title="Remover"><i class="fas fa-times"></i></button>\n                        </div>\n                    </div>`; } }catch(e){}

    // sinalizar adição recente para evitar que a atualização de card sobrescreva status
    try{ window.__smeargle_recently_added_move = true; setTimeout(function(){ try{ window.__smeargle_recently_added_move = false; }catch(e){} }, 350); }catch(e){}
    // agendar trabalho pesado sem bloquear a interação
    try{ scheduleSmeargleUpdate({card:true,buscar:true,reorder:true}); }catch(e){}
};

// Preenche detalhes de movimentos em lotes não bloqueantes (PP / Power / Acc / Efeito / Tipo)
function preencherDetalhesMovimentosBatch(container, batchSize){
    try{
        batchSize = batchSize || 10;
        container = container || document.getElementById('movesGrid');
        if(!container) return;
        const cards = Array.from(container.querySelectorAll('.move-card'));
        const toProcess = [];
        for(const c of cards){
            try{
                const statsEl = c.querySelector('.move-stats');
                const efEl = c.querySelector('.move-efeito');
                // processar apenas se ainda não preenchido
                if(statsEl && (!statsEl.__filled) ){ toProcess.push(c); }
                else if(efEl && (!efEl.__filled) && (!efEl.textContent || efEl.textContent.trim()==='')) toProcess.push(c);
            }catch(e){}
        }
        if(toProcess.length===0) return;
        let i = 0;
        function runChunk(){
            const end = Math.min(i + batchSize, toProcess.length);
            for(; i<end; i++){
                const card = toProcess[i];
                try{
                    const name = (card.dataset && card.dataset.moveName) ? card.dataset.moveName : (card.querySelector('.move-name') && card.querySelector('.move-name').textContent) || '';
                    const g = { nome: name };
                    // tentar lookup rápido antes de usar as funções mais pesadas
                    let pp = '';
                    let pow = '';
                    let acc = '';
                    let gen = '';
                    let ef = '';
                    let tipo = '';
                    try{
                        const found = fastLookupAttack(name);
                        if(found){
                            pp = found.PP || found.pp || found['PP'] || '';
                            pow = found.POWER || found.power || found.Power || found['POWER'] || '';
                            acc = found.ACCURACY || found.accuracy || found.ACC || '';
                            gen = found.GEN || found.gen || '';
                            ef = found.EFEITO || found.efeito || found.effect || found.Effect || '';
                            tipo = found.TYPE || found.type || found.TIPAGEM || found.tipagem || found.tipo || '';
                        } else {
                            pp = obterPPGolpe(g) || '';
                            pow = obterPowerGolpe(g) || '';
                            acc = obterAccuracyGolpe(g) || '';
                            gen = obterGenGolpe(g) || '';
                            ef = obterEfeitoGolpe(g) || '';
                            tipo = obterTipoGolpe(g) || '';
                        }
                    }catch(e){ pp = obterPPGolpe(g) || ''; pow = obterPowerGolpe(g) || ''; acc = obterAccuracyGolpe(g) || ''; gen = obterGenGolpe(g) || ''; ef = obterEfeitoGolpe(g) || ''; tipo = obterTipoGolpe(g) || ''; }
                    // preencher DOM
                    try{ const tipoEl = card.querySelector('.move-tipo'); if(tipoEl && (!tipoEl.textContent || tipoEl.textContent.trim()==='')) tipoEl.textContent = tipo; }catch(e){}
                    try{ const catEl = card.querySelector('.move-categoria'); if(catEl && (!catEl.textContent || catEl.textContent.trim()==='')) {} }catch(e){}
                        try{ const efEl = card.querySelector('.move-efeito'); if(efEl && (!efEl.textContent || efEl.textContent.trim()==='')){ efEl.textContent = ef; efEl.style.display = ef ? 'block' : 'none'; efEl.__filled = true; } }catch(e){}
                    try{ const statsEl = card.querySelector('.move-stats'); if(statsEl && (!statsEl.__filled)){
                        const parts = [];
                        if(pp) parts.push(`<span class="move-stat">PP: <b>${pp}</b></span>`);
                        if(pow) parts.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${pow}</b></span>`);
                        if(acc) parts.push(`<span class="move-stat">Acc: <b>${acc}</b></span>`);
                        if(gen) parts.push(`<span class="move-stat">Gen: <b>${gen}</b></span>`);
                        if(parts.length){ statsEl.innerHTML = parts.join(' &nbsp; '); statsEl.style.display = 'block'; }
                        statsEl.__filled = true;
                        try{ card.classList.add('details-visible'); }catch(e){}
                    } }catch(e){}
                }catch(e){}
            }
            if(i < toProcess.length){
                if(window.requestIdleCallback) requestIdleCallback(runChunk, {timeout:400}); else setTimeout(runChunk, 60);
            }
        }
        runChunk();
    }catch(e){ console.warn('preencherDetalhesMovimentosBatch error', e); }
}

// Copiar golpe para clipboard (botão Copiar)
window.copiarGolpeParaClipboard = function(btn){
    try{
        const card = btn && btn.closest ? btn.closest('.move-card') : null;
        const nome = card && card.dataset ? (card.dataset.moveName || '') : '';
        const origem = card && card.dataset ? (card.dataset.moveOrigem || '') : '';
        if(!nome) { if(window.showToast) window.showToast('Erro ao copiar golpe','error'); else alert('Erro ao copiar golpe'); return; }
        const texto = nome + (origem ? (' — ' + origem) : '');
        if(navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(texto).then(()=>{ if(window.showToast) window.showToast('Golpe copiado','success'); else alert('Golpe copiado'); }).catch(()=>{
                // fallback
                const ta = document.createElement('textarea'); ta.value = texto; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); if(window.showToast) window.showToast('Golpe copiado','success'); else alert('Golpe copiado'); }catch(e){ if(window.showToast) window.showToast('Falha ao copiar','error'); else alert('Falha ao copiar'); } finally{ ta.remove(); }
            });
        } else {
            const ta = document.createElement('textarea'); ta.value = texto; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); if(window.showToast) window.showToast('Golpe copiado','success'); else alert('Golpe copiado'); }catch(e){ if(window.showToast) window.showToast('Falha ao copiar','error'); else alert('Falha ao copiar'); } finally{ ta.remove(); }
        }
    }catch(e){ console.error('copiarGolpeParaClipboard error', e); if(window.showToast) window.showToast('Erro ao copiar golpe','error'); else alert('Erro ao copiar golpe'); }
};

// Copiar conteúdo inteiro do slot M7
window.copiarTodosMovesSmeargle = function(){
    try{
        if(!smeargleSelectedMoves || !Array.isArray(smeargleSelectedMoves)){
            if(window.showToast) window.showToast('Nenhum movimento selecionado','error'); else alert('Nenhum movimento selecionado');
            return;
        }
        // Formatar conforme solicitado:
        // Smeargle
        //
        // tipo: Ghost
        //
        // m1 - Phantom Force - Gengar /
        const tipoDom = (typeof tipoDominante === 'function') ? tipoDominante(smeargleSelectedMoves.filter(Boolean)) : 'Normal';
        const header = ['Smeargle', '', `tipo: ${tipoDom}`, ''];
        const moveLines = [];
        for(let i=0;i<9;i++){
            const mv = smeargleSelectedMoves[i];
            const nome = mv && mv.nome ? mv.nome : '(vazio)';
            let origem = '';
            if(mv && mv.origem){
                try{ origem = (typeof extractSpeciesName === 'function') ? extractSpeciesName(mv.origem) : (mv.origem||''); }
                catch(e){ origem = mv.origem || ''; }
            }
            const suffix = (i < 8) ? ' /' : '';
            const origemPart = origem ? ` - ${origem}` : '';
            moveLines.push(`m${i+1} - ${nome}${origemPart}${suffix}`);
        }
        const texto = header.concat(moveLines).join('\n');
        if(navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(texto).then(()=>{ if(window.showToast) window.showToast('M1-M9 copiados','success'); else alert('M1-M9 copiados'); }).catch(()=>{
                const ta=document.createElement('textarea'); ta.value=texto; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); if(window.showToast) window.showToast('M1-M9 copiados','success'); else alert('M1-M9 copiados'); }catch(e){ if(window.showToast) window.showToast('Falha ao copiar','error'); else alert('Falha ao copiar'); } finally{ ta.remove(); }
            });
        } else {
            const ta=document.createElement('textarea'); ta.value=texto; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); if(window.showToast) window.showToast('M1-M9 copiados','success'); else alert('M1-M9 copiados'); }catch(e){ if(window.showToast) window.showToast('Falha ao copiar','error'); else alert('Falha ao copiar'); } finally{ ta.remove(); }
        }
    }catch(e){ console.error('copiarTodosMovesSmeargle error', e); if(window.showToast) window.showToast('Erro ao copiar','error'); else alert('Erro ao copiar'); }
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
    smTimeStart('[Smeargle] reordenarGridMovesOrdenado');
    // obter valores de filtros com fallback caso os elementos não existam (p.ex. na aba Builder)
    const el = id => document.getElementById(id);
    const filtros = {
        nome: (el('filterNome') && el('filterNome').value) ? el('filterNome').value.toLowerCase() : '',
        tipo: (el('filterTipo') && el('filterTipo').value) ? el('filterTipo').value : '',
        acao: (el('filterAcao') && el('filterAcao').value) ? el('filterAcao').value : '',
        categoria: (el('filterCategoria') && el('filterCategoria').value) ? el('filterCategoria').value : '',
        local: (el('filterLocal') && el('filterLocal').value) ? el('filterLocal').value : '',
        power: (el('filterPower') && el('filterPower').value) ? el('filterPower').value : ''
    };
    
    // Aplicar filtros primeiro
    let movesFiltrados = smeargleMovesData.filter(golpe => {
        if (filtros.nome && !golpe.nome.toLowerCase().includes(filtros.nome)) return false;
        if (filtros.tipo && golpe.tipo !== filtros.tipo) return false;
        if (filtros.acao && golpe.acao !== filtros.acao) return false;
        if (filtros.categoria && golpe.categoria !== filtros.categoria) return false;
        if (filtros.local && golpe.local !== filtros.local) return false;
        return true;
    });

    // Ordenar por Power se selecionado (usa campo pré-cacheado .power)
    if (filtros.power === 'desc') {
        movesFiltrados = movesFiltrados.slice().sort((a, b) => (b.power || 0) - (a.power || 0));
    } else if (filtros.power === 'asc') {
        movesFiltrados = movesFiltrados.slice().sort((a, b) => (a.power || 0) - (b.power || 0));
    }
        
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
    smTimeEnd('[Smeargle] reordenarGridMovesOrdenado');
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
    const iconForDom = TIPO_ICONS[tipoDom] || TIPO_ICONS[(tipoDom.charAt(0).toUpperCase()+tipoDom.slice(1).toLowerCase())] || 'fa-circle';
    typeIcon.innerHTML = `<i class="fas ${iconForDom}"></i>`;
    
    // Atualizar badge (defensivo: criar se não existir)
    try{
        if(typeBadge){
            typeBadge.innerHTML = `<span class="type-badge type-${tipoDom.toLowerCase()}">${tipoDom}</span>`;
        } else {
            var badgeEl = card.querySelector('.smeargle-type-badge');
            if(!badgeEl){
                badgeEl = document.createElement('div');
                badgeEl.className = 'smeargle-type-badge';
                var insertBeforeEl = card.querySelector('.smeargle-moves-selected') || null;
                if(insertBeforeEl) insertBeforeEl.parentNode.insertBefore(badgeEl, insertBeforeEl);
                else card.appendChild(badgeEl);
            }
            // ensure id for future queries
            badgeEl.id = 'smeargleTypeBadge';
            badgeEl.innerHTML = `<span class="type-badge type-${tipoDom.toLowerCase()}">${tipoDom}</span>`;
        }
    }catch(e){ console.warn('Erro atualizando typeBadge', e); }
    // Injetar bloco no estilo Pokédex: tipos, fraquezas e status (minimizado e idempotente)
    try{
        // localizar container existente ou criar novo bloco após o badge
        var existingTypes = card.querySelector('.pokemon-types');
        // função auxiliar para extrair campos de um objeto Pokémon com várias chaves possíveis
        function pick(p, keys, fallback){ try{ for(var k of keys){ if(p && (p[k]!==undefined) && p[k]!==null) return p[k]; } }catch(e){} return fallback; }
        // tentar obter tipo1/tipo2 e stats a partir do Pokémon de origem (primeiro slot) procurado em smearglePokemonData
        var tipo1 = '';
        var tipo2 = '';
        var hp = '0', ataque = '0', defesa = '0', ataqueEsp = '0', defesaEsp = '0', velocidade = '0';
        try{
            var first = smeargleSelectedMoves.find(Boolean);
            var candidateName = null;
            if(first && first.origem) candidateName = first.origem;
            if(!candidateName && window.builderMeta && window.builderMeta.name) candidateName = window.builderMeta.name;
            if(!candidateName && window.builderSelectedPokemonName) candidateName = window.builderSelectedPokemonName;
            var found = null;
            if(candidateName && Array.isArray(smearglePokemonData) && smearglePokemonData.length){
                var norm = normalizeName(candidateName || '');
                found = smearglePokemonData.find(function(p){
                    try{
                        var pok = pick(p, ['POKEMON','Pokemon','pokemon','Name','NAME','EV'], '');
                        var ev = pick(p, ['EV','Ev','ev'], '');
                        var combined = (pok + ' ' + ev).toString();
                        if(!combined) return false;
                        combined = normalizeName(combined);
                        if(!norm) return false;
                        if(combined === norm) return true;
                        if(combined.includes(norm) || norm.includes(combined)) return true;
                        // fallback: verificar campos individuais
                        var pokNorm = normalizeName(pok||''); if(pokNorm && (pokNorm===norm || pokNorm.includes(norm) || norm.includes(pokNorm))) return true;
                        var evNorm = normalizeName(ev||''); if(evNorm && (evNorm===norm || evNorm.includes(norm) || norm.includes(evNorm))) return true;
                        return false;
                    }catch(e){return false}
                });
            }
            if(found){
                tipo1 = pick(found, ['Type 1','TYPE 1','Type1','TIPO1','TIPO 1','Tipo','TYPE','type'], tipoDom);
                tipo2 = pick(found, ['Type 2','TYPE 2','Type2','TIPO2','TIPO 2','Tipo 2','type2'], '');
                hp = pick(found, ['HP','Hp','hp'], hp);
                ataque = pick(found, ['Attack','ATK','ATQUE','Attack'], ataque);
                defesa = pick(found, ['Defense','DEF','Defense'], defesa);
                ataqueEsp = pick(found, ['Sp.Attack','SpAttack','Sp. Attack','Sp_Attack','Spatk','Sp.Atk','SpAttack'], ataqueEsp);
                defesaEsp = pick(found, ['Sp.Defense','SpDefense','Sp. Defense','Sp_Defense','SpDef','Sp.Def'], defesaEsp);
                velocidade = pick(found, ['Speed','SPD','Velocidade','speed'], velocidade);
            }
        }catch(e){ /* ignore */ }

        // Se estamos na página 'smeargle' e não encontramos via origem, tentar carregar dados do próprio Smeargle na pokedex
        try{
            var isSmearglePage = (typeof window.currentPage !== 'undefined' && window.currentPage === 'smeargle') || (typeof currentPage !== 'undefined' && currentPage === 'smeargle') || (window.location && /smeargle/i.test(window.location.pathname));
            if(isSmearglePage && (!found)){
                if(Array.isArray(smearglePokemonData) && smearglePokemonData.length){
                    var sFound = smearglePokemonData.find(function(p){
                        try{ var name = (p['POKEMON']||p['Pokemon']||p['pokemon']||'')+''; return name && normalizeName(name).includes('smeargle'); }catch(e){return false}
                    });
                    if(sFound){ found = sFound; tipo1 = pick(found, ['Type 1','TYPE 1','Type1','TIPO1','Tipo','TYPE','type'], tipoDom); tipo2 = pick(found, ['Type 2','TYPE 2','Type2','TIPO2','Tipo 2','type2'], ''); hp = pick(found, ['HP','Hp','hp'], hp); ataque = pick(found, ['Attack','ATK','attack'], ataque); defesa = pick(found, ['Defense','DEF','defense'], defesa); ataqueEsp = pick(found, ['Sp.Attack','SpAttack','spatk'], ataqueEsp); defesaEsp = pick(found, ['Sp.Defense','SpDefense','spdef'], defesaEsp); velocidade = pick(found, ['Speed','SPD','speed'], velocidade); }
                }
            }
        }catch(e){}

        // fallback para pelo menos ter um tipo dominante
        if(!tipo1) tipo1 = tipoDom || 'Normal';

        // montar o bloco HTML (idempotente)
        var pokedexBlock = card.querySelector('.builder-pokedex-block');
        var fraquezasHTML = (typeof gerarFraquezasHTML === 'function') ? gerarFraquezasHTML(tipo1, tipo2) : '';
        var typesHTML = `<div class="pokemon-types"><span class="type-badge type-${(tipo1||'').toString().toLowerCase()}"><span class="type-icon">${(typeof getTypeIcon==='function'?getTypeIcon(tipo1):'')}</span>${tipo1}</span>` + (tipo2?`<span class="type-badge type-${(tipo2||'').toString().toLowerCase()}"><span class="type-icon">${(typeof getTypeIcon==='function'?getTypeIcon(tipo2):'')}</span>${tipo2}</span>`:'') + `</div>`;
        var statsHTML = `
            <div class="pokemon-stats stats-hidden">
                <div class="stat"><div class="stat-value">${hp}</div><div class="stat-label">HP</div></div>
                <div class="stat"><div class="stat-value">${ataque}</div><div class="stat-label">Ataque</div></div>
                <div class="stat"><div class="stat-value">${defesa}</div><div class="stat-label">Defesa</div></div>
                <div class="stat"><div class="stat-value">${ataqueEsp}</div><div class="stat-label">Sp.Atk</div></div>
                <div class="stat"><div class="stat-value">${defesaEsp}</div><div class="stat-label">Sp.Def</div></div>
                <div class="stat"><div class="stat-value">${velocidade}</div><div class="stat-label">Velocidade</div></div>
            </div>`;

        if(!pokedexBlock){
            pokedexBlock = document.createElement('div'); pokedexBlock.className = 'builder-pokedex-block';
            pokedexBlock.innerHTML = typesHTML + `
                <button class="btn-toggle-weaknesses" onclick="this.nextElementSibling.classList.toggle('weaknesses-hidden');this.classList.toggle('stats-open')">
                    <i class="fas fa-shield-alt"></i> Fraquezas
                    <i class="fas fa-chevron-down toggle-arrow"></i>
                </button>
                <div class="pokemon-weaknesses weaknesses-hidden">` + fraquezasHTML + `</div>
                <button class="btn-toggle-stats" onclick="this.nextElementSibling.classList.toggle('stats-hidden');this.classList.toggle('stats-open')">
                    <i class="fas fa-chart-bar"></i> Status
                    <i class="fas fa-chevron-down toggle-arrow"></i>
                </button>
                ` + statsHTML;
            // inserir antes da lista de golpes selecionados para manter layout similar ao Pokédex
            var insertBeforeEl = card.querySelector('.smeargle-moves-selected') || card.querySelector('#smeargleMovesSelected');
            if(insertBeforeEl) insertBeforeEl.parentNode.insertBefore(pokedexBlock, insertBeforeEl);
            else card.appendChild(pokedexBlock);
        } else {
            // atualizar conteúdo existente (types / fraquezas / stats)
            try{ var typesNode = pokedexBlock.querySelector('.pokemon-types'); if(typesNode) typesNode.outerHTML = typesHTML; }catch(e){}
            try{ var wnode = pokedexBlock.querySelector('.pokemon-weaknesses'); if(wnode) wnode.innerHTML = fraquezasHTML; }catch(e){}
            try{ var statsNode = pokedexBlock.querySelector('.pokemon-stats'); if(statsNode){ if(!window.__smeargle_recently_added_move) statsNode.outerHTML = statsHTML; } }catch(e){}
        }
    }catch(e){ console.warn('Erro injetando bloco Pokédex no card Smeargle', e); }

    // Tornar os botões mais robustos e preencher stats a partir de parsed/fallbacks
    try{
        var pokedexBlock = card.querySelector('.builder-pokedex-block');
        if(pokedexBlock){
            // garantir botões interativos mesmo se houver overlays
            var wBtn = pokedexBlock.querySelector('.btn-toggle-weaknesses');
            var sBtn = pokedexBlock.querySelector('.btn-toggle-stats');
            [wBtn, sBtn].forEach(function(b){ if(b){ b.style.pointerEvents = 'auto'; b.style.zIndex = 3; b.style.position = b.style.position || 'relative'; } });
            // substituir onclick inline por listeners que previnem propagation
            if(wBtn){ wBtn.removeAttribute && wBtn.removeAttribute('onclick'); wBtn.addEventListener('click', function(ev){ try{ ev.preventDefault(); ev.stopPropagation(); var target = this.nextElementSibling; if(target){ target.classList.toggle('weaknesses-hidden'); this.classList.toggle('stats-open'); } }catch(e){} }); }
            if(sBtn){ sBtn.removeAttribute && sBtn.removeAttribute('onclick'); sBtn.addEventListener('click', function(ev){ try{ ev.preventDefault(); ev.stopPropagation(); var target = this.nextElementSibling; if(target){ target.classList.toggle('stats-hidden'); this.classList.toggle('stats-open'); } }catch(e){} }); }

            // preencher stats se estiverem vazios/zeros usando parsed meta como fallback
            try{
                var statsNode = pokedexBlock.querySelector('.pokemon-stats');
                if(statsNode){
                    var vals = Array.from(statsNode.querySelectorAll('.stat .stat-value')).map(function(el){ return (el && el.textContent)?el.textContent.trim():'0'; });
                    var allZero = vals.every(function(v){ return v === '0' || v === '' || v === '0' ; });
                    if(allZero){
                        // tentar usar parsed meta (resultado do parsePokedexText)
                        var pm = (window._builder_parsed && window._builder_parsed.meta && window._builder_parsed.meta.stats) ? window._builder_parsed.meta.stats : null;
                        if(pm){
                            function pickStat(obj, keys, def){ try{ for(var i=0;i<keys.length;i++){ var k=keys[i]; if(obj[k]!==undefined && obj[k]!==null && obj[k]!=='' ) return obj[k]; } }catch(e){} return def; }
                            var nhp = pickStat(pm, ['HP','hp','Hp','Hp.','hpValue'], vals[0]||'0');
                            var natk = pickStat(pm, ['Attack','ATK','atk','attack'], vals[1]||'0');
                            var ndef = pickStat(pm, ['Defense','DEF','defense','def'], vals[2]||'0');
                            var nspa = pickStat(pm, ['Sp.Attack','SpAttack','SpAtk','spatk'], vals[3]||'0');
                            var nspd = pickStat(pm, ['Sp.Defense','SpDefense','spdef','spdf'], vals[4]||'0');
                            var nvel = pickStat(pm, ['Speed','speed','SPD'], vals[5]||'0');
                            var targets = statsNode.querySelectorAll('.stat .stat-value');
                            if(targets && targets.length>=6){ try{ targets[0].textContent = nhp; targets[1].textContent = natk; targets[2].textContent = ndef; targets[3].textContent = nspa; targets[4].textContent = nspd; targets[5].textContent = nvel; }catch(e){} }
                        }
                        // se ainda zeros, tentar extrair de smearglePokemonData (já feito antes), caso contrário deixar como está
                    }
                }
            }catch(e){ console.warn('Erro preenchendo stats fallback', e); }

            // Se não houver dados para stats, esconder botão de Status para evitar cliques inúteis
            try{
                var statsVals = pokedexBlock.querySelectorAll('.pokemon-stats .stat .stat-value');
                if(statsVals && statsVals.length){
                    var anyNonZero = Array.from(statsVals).some(function(el){ var t = (el.textContent||'').toString().trim(); return t !== '0' && t !== '' && t !== '0'; });
                    if(!anyNonZero && sBtn) sBtn.style.display = 'none';
                    else if(sBtn) sBtn.style.display = '';
                }
            }catch(e){}
        }
    }catch(e){ console.warn('Erro ao robustecer botões Pokédex', e); }
    // Atualizar imagem do Smeargle/card principal
    try{
        const imgEl = document.querySelector('.smeargle-img');
        if(imgEl){
            // Se estivermos na página 'smeargle', mostrar a imagem fixa do Smeargle
            // detectar a página atual: alguns scripts usam `currentPage` (lexical) e outros `window.currentPage`
            if ((typeof window.currentPage !== 'undefined' && window.currentPage === 'smeargle') || (typeof currentPage !== 'undefined' && currentPage === 'smeargle')){
                try{
                    if(typeof obterImagemPokemon === 'function'){
                        const src = obterImagemPokemon('Smeargle', '');
                        imgEl.src = src;
                    } else {
                        imgEl.src = 'IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png';
                    }
                    imgEl.alt = 'Smeargle';
                    imgEl.onerror = function(){ this.onerror=null; this.src='IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png'; };
                }catch(e){ imgEl.src = 'IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png'; imgEl.alt = 'Smeargle'; }
            } else {
                // Em outras páginas (ex: builder) restaurar comportamento anterior: usar Pokémon da origem do primeiro slot ou fallbacks
                const first = smeargleSelectedMoves.find(Boolean);
                let nomeParaImagem = null;
                if(first && first.origem){ nomeParaImagem = first.origem; }
                if(!nomeParaImagem && window.builderMeta && window.builderMeta.name) nomeParaImagem = window.builderMeta.name;
                if(!nomeParaImagem && window.builderSelectedPokemonName) nomeParaImagem = window.builderSelectedPokemonName;
                if(nomeParaImagem && typeof obterImagemPokemon === 'function'){
                    function splitNomeParaImagem(raw){
                        if(!raw) return {nomePrincipal:'', nomeBase:''};
                        let s = raw.replace(/\(.*\)/g,'').trim();
                        s = s.replace(/\s+/g,' ');
                        const quals = ['shiny','mega','alolan','galarian','hisui','crowned','female','male','shadow'];
                        const parts = s.split(/\s+/).filter(Boolean);
                        let qualifier = null;
                        let species = s;
                        if(parts.length>1 && quals.includes(parts[0].toLowerCase())){ qualifier = parts[0]; species = parts.slice(1).join(' '); }
                        else if(parts.length>1 && quals.includes(parts[parts.length-1].toLowerCase())){ qualifier = parts[parts.length-1]; species = parts.slice(0, parts.length-1).join(' '); }
                        const cap = str => str.split(' ').map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
                        const nomePrincipal = cap(species);
                        const nomeBase = qualifier ? (nomePrincipal + '-' + (qualifier.charAt(0).toUpperCase()+qualifier.slice(1))) : '';
                        return {nomePrincipal, nomeBase};
                    }
                    try{
                        const parts = splitNomeParaImagem(nomeParaImagem);
                        const src = obterImagemPokemon(parts.nomePrincipal, parts.nomeBase);
                        imgEl.src = src;
                        imgEl.alt = nomeParaImagem;
                        imgEl.onerror = function(){ this.onerror=null; this.src='IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png'; };
                    }catch(e){ imgEl.src = 'IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png'; imgEl.alt = nomeParaImagem; }
                } else {
                    imgEl.src = 'IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png';
                    imgEl.alt = nomeParaImagem || 'Pokémon';
                }
            }
        }
    }catch(e){ console.warn('Erro atualizando imagem Smeargle', e); }
        // Atualizar nome exibido no card
        try{
            const nameEl = document.querySelector('.smeargle-name');
            if(nameEl){
                // Manter nome fixo quando estivermos na página smeargle
                if ((typeof window.currentPage !== 'undefined' && window.currentPage === 'smeargle') || (typeof currentPage !== 'undefined' && currentPage === 'smeargle')){
                    nameEl.textContent = 'Smeargle';
                } else {
                    // comportamento antigo para outras páginas (ex: builder)
                    let displayName = '';
                    const first = smeargleSelectedMoves.find(Boolean);
                    function hasQualifier(raw){
                        if(!raw) return false;
                        try{
                            const s = raw.toString().toLowerCase();
                            if(/\(.*\)/.test(raw)) return true;
                            const quals = ['shiny','mega','alolan','galarian','hisui','crowned','shadow','female','male','alpha','beta'];
                            const parts = s.split(/\s+|-/).filter(Boolean);
                            if(parts.length>1){
                                if(quals.includes(parts[0]) || quals.includes(parts[parts.length-1])) return true;
                                for(const q of quals){ if(s.includes(q)) return true; }
                            }
                        }catch(e){ }
                        return false;
                    }
                    function capitalize(raw){ if(!raw) return ''; return raw.toString().replace(/\(|\)/g,'').split(/\s+/).map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' ').trim(); }

                    if(first && first.origem){
                        if(hasQualifier(first.origem)) displayName = capitalize(first.origem);
                        else displayName = extractSpeciesName(first.origem);
                    }
                    if(!displayName && window.builderMeta && window.builderMeta.name){
                        if(hasQualifier(window.builderMeta.name)) displayName = capitalize(window.builderMeta.name);
                        else displayName = extractSpeciesName(window.builderMeta.name);
                    }
                    if(!displayName && window.builderSelectedPokemonName){
                        if(hasQualifier(window.builderSelectedPokemonName)) displayName = capitalize(window.builderSelectedPokemonName);
                        else displayName = extractSpeciesName(window.builderSelectedPokemonName);
                    }
                    if(!displayName) displayName = 'Build';
                    nameEl.textContent = displayName;
                }
            }
        }catch(e){ console.warn('Erro atualizando nome Smeargle', e); }

    // Calcular e exibir power total dos golpes selecionados
    try{
        // Garantir elementos de Power e Effects existam no card (injetar se necessário)
        try{
            var powerEl = document.getElementById('smearglePowerTotal');
            var effectsEl = document.getElementById('smeargleEffects');
            var insertBeforeEl = card.querySelector('.smeargle-moves-selected') || card.querySelector('#smeargleMovesSelected');
            if(!powerEl){
                var pb = document.createElement('div'); pb.className = 'power-box'; pb.innerHTML = '<div id="smearglePowerTotal">POWER TOTAL: <span class="power-value">0</span></div>';
                if(insertBeforeEl) insertBeforeEl.parentNode.insertBefore(pb, insertBeforeEl);
                else card.appendChild(pb);
                powerEl = document.getElementById('smearglePowerTotal');
            }
            if(!effectsEl){
                var eb = document.createElement('div'); eb.className = 'effects-box'; eb.innerHTML = '<div id="smeargleEffects">EFEITOS: —</div>';
                if(insertBeforeEl) insertBeforeEl.parentNode.insertBefore(eb, insertBeforeEl);
                else card.appendChild(eb);
                effectsEl = document.getElementById('smeargleEffects');
            }
        }catch(e){ /* ignore element injection errors */ }
        powerEl = document.getElementById('smearglePowerTotal');
        if(powerEl){
            const total = smeargleSelectedMoves.filter(Boolean).reduce((acc,m)=>{
                try{
                    const p = obterPowerGolpe(m);
                    return acc + (Number.isFinite(p) ? p : 0);
                }catch(e){ return acc; }
            }, 0);
            powerEl.innerHTML = 'POWER TOTAL: <span class="power-value">' + total + '</span>';
        }
    }catch(e){ /* ignore */ }
    // Calcular e exibir efeitos combinados
    try{
        const effectsEl = document.getElementById('smeargleEffects');
        if(effectsEl){
            const efeitos = [];
            smeargleSelectedMoves.filter(Boolean).forEach(m=>{
                const ef = obterEfeitoGolpe(m);
                if(ef){ if(!efeitos.includes(ef)) efeitos.push(ef); }
            });
            if(efeitos.length){
                // mostrar cada efeito em linha separada
                effectsEl.innerHTML = '<strong>EFEITOS:</strong><br>' + efeitos.map(e=>`<div class="effect-line">${e}</div>`).join('');
            } else {
                effectsEl.innerHTML = 'EFEITOS: —';
            }
        }
    }catch(e){ /* ignore */ }
    
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
                // Resolver tipo usando obterTipoGolpe, priorizando tipagem do(s) TM(s)
                let tmText = '';
                if (golpe.numero) {
                    tmText = `TM${golpe.numero}`;
                } else if (golpe.tms && golpe.tms.length) {
                    const nums = golpe.tms.map(t => t && t.numero ? (`TM${t.numero}`) : null).filter(Boolean);
                    if (nums.length === 1) tmText = nums[0];
                    else if (nums.length > 1) tmText = nums.join(', ');
                }
                const tipoResolvido = (typeof obterTipoGolpe === 'function') ? (obterTipoGolpe(golpe) || golpe.tipo || 'Normal') : (golpe.tipo || 'Normal');
                const tipoCategoriaLine = `${tipoResolvido || ''}${tmText ? (' • ' + tmText) : (golpe.categoria ? (' • ' + golpe.categoria) : '')}`;
                // calcular power e efeito para exibir no item
                let _powerVal = obterPowerGolpe(golpe);
                let _powerText = '';
                try{ if(_powerVal && Number.isFinite(_powerVal)) _powerText = String(_powerVal); else if(golpe.POWER||golpe.power) _powerText = (golpe.POWER||golpe.power); }catch(e){}
                items.push(`
                    <div class="selected-move-item" data-slot="${index+1}">
                        <span class="move-number">${index + 1}</span>
                        <span class="move-info">
                            <strong>${golpe.nome}</strong>
                            <small>${tipoCategoriaLine}</small>
                            ${_powerText ? `<small style="display:block;margin-top:4px">Power: <b>${_powerText}</b></small>` : ''}
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
    try{ scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); }catch(e){}
};

// Mover golpe para a direita (swap)
window.moverGolpeDireita = function(index) {
    if (index >= smeargleSelectedMoves.length - 1) return;
    const tmp = smeargleSelectedMoves[index+1];
    smeargleSelectedMoves[index+1] = smeargleSelectedMoves[index];
    smeargleSelectedMoves[index] = tmp;
    try{ scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); }catch(e){}
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
    try{ scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); }catch(e){}
};

// Calcular tipo dominante
function tipoDominante(moves) {
    if (moves.length === 0) return 'Normal';

    const contagem = {};
    moves.forEach(m => {
        const t = obterTipoGolpe(m) || 'Normal';
        contagem[t] = (contagem[t] || 0) + 1;
    });

    return Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Normal';
}

// Resolve a tipagem efetiva de um golpe/slot, incluindo TMs atribuídos
function obterTipoGolpe(golpe){
    if(!golpe) return 'Normal';
    // quick direct check in window.todosTMs (most reliable source when loaded)
    try{
        if(golpe.numero && window.todosTMs && Array.isArray(window.todosTMs)){
            const numClean = String(golpe.numero).replace(/\D/g,'');
            const found = (window.todosTMs||[]).find(x=> String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'') === numClean);
            if(found){ const tip = found['TIPAGEM DO TM']||found.TIPAGEM||found.tipagem||found.tipo||found.type||''; if(tip){ if(window.DEBUG_TM_MAP) console.log('obterTipoGolpe: matched todosTMs by numero', found); return String(tip).trim(); } }
        }
        // try match by nome in todosTMs if numero not found
        if(golpe.nome && window.todosTMs && Array.isArray(window.todosTMs)){
            const nm = (golpe.nome||'').toString().toLowerCase().trim();
            const foundByName = (window.todosTMs||[]).find(x=>{
                const nval = ((x.nome||x['NOME DO TM']||x.NOME||'')+ '').toString().toLowerCase();
                return nval === nm || nval.includes(nm) || nm.includes(nval);
            });
            if(foundByName){ const tip = foundByName['TIPAGEM DO TM']||foundByName.TIPAGEM||foundByName.tipagem||foundByName.tipo||foundByName.type||''; if(tip){ if(window.DEBUG_TM_MAP) console.log('obterTipoGolpe: matched todosTMs by nome', foundByName); return String(tip).trim(); } }
        }
    }catch(e){}
    // 1) se é um TM direto com numero, tentar lookup
    try{
        const lookup = buildTmLookup && typeof buildTmLookup === 'function' ? buildTmLookup() : (window.__tmLookup || null);
        if(golpe.numero && lookup){
            let found = null;
            if(lookup.byNumber) found = lookup.byNumber.get(String(golpe.numero));
            if(!found && Array.isArray(lookup.raw)){
                const numClean = String(golpe.numero).replace(/\D/g,'');
                found = lookup.raw.find(x=> String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'') === numClean);
            }
            if(found){
                const tip = found['TIPAGEM DO TM'] || found.TIPAGEM || found.tipagem || found.tipo || found.type || '';
                if(tip) return String(tip).trim();
            }
        }
        // se não houver um lookup estruturado, tentar consultar window.todosTMs diretamente
        if(golpe.numero && !lookup && window.todosTMs && Array.isArray(window.todosTMs)){
            const numClean = String(golpe.numero).replace(/\D/g,'');
            const foundDirect = (window.todosTMs||[]).find(x=> String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'') === numClean);
            if(foundDirect){ const tip = foundDirect['TIPAGEM DO TM']||foundDirect.TIPAGEM||foundDirect.tipagem||foundDirect.tipo||foundDirect.type||''; if(tip) return String(tip).trim(); }
        }
    }catch(e){}

    // 3) se tem um array de TMs atribuídos ao slot, extrair tipos dos TMs
    try{
        if(Array.isArray(golpe.tms) && golpe.tms.length){
            const tipos = [];
            const lookup = buildTmLookup && typeof buildTmLookup === 'function' ? buildTmLookup() : (window.__tmLookup || null);
            golpe.tms.forEach(tm=>{
                if(!tm) return;
                if(tm.tipo && String(tm.tipo).trim()) tipos.push(String(tm.tipo).trim());
                else if(tm.numero && lookup){
                    let found = null;
                    if(lookup.byNumber) found = lookup.byNumber.get(String(tm.numero));
                    if(!found && Array.isArray(lookup.raw)){
                        const numClean = String(tm.numero).replace(/\D/g,'');
                        found = lookup.raw.find(x=> String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'') === numClean);
                    }
                    if(found){ const tip = found['TIPAGEM DO TM'] || found.TIPAGEM || found.tipagem || found.tipo || found.type || ''; if(tip) tipos.push(String(tip).trim()); }
                } else if(tm.nome && lookup && lookup.byName){
                    const nmKey = (typeof _key === 'function') ? _key((tm.nome||'').toString()) : (tm.nome||'').toString().toLowerCase().trim();
                    const found = lookup.byName.get(nmKey);
                    if(found){ const tip = found['TIPAGEM DO TM'] || found.TIPAGEM || found.tipagem || found.tipo || found.type || ''; if(tip) tipos.push(String(tip).trim()); }
                }
            });
            if(tipos.length){
                // escolher tipo mais frequente
                const cnt = {}; tipos.forEach(t=>cnt[t]= (cnt[t]||0)+1);
                return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
            }
        }
    }catch(e){}
    // 4) se já tem tipo declarado no próprio objeto (fallback)
    if(golpe.tipo && String(golpe.tipo).trim()) return String(golpe.tipo).trim();

    // 5) fallback: se possuir nome, tentar buscar na tabela de ataques (smeargleAtacksData)
    try{
        if(window.smeargleAtacksData && golpe.nome){
            const nm = (golpe.nome||'').toString().toLowerCase().trim();
            const found = (window.smeargleAtacksData||[]).find(a=>{
                const atn = ((a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a['ATACK_BR']||'')+ '').toString().toLowerCase().trim();
                return atn === nm || atn.includes(nm) || nm.includes(atn);
            });
            if(found){ const tip = found['TYPE']||found.type||found['TIPAGEM']||found['TIPAGEM DO TM']||found.tipo||''; if(tip) return String(tip).trim(); }
        }
    }catch(e){}

    return 'Normal';
}

// Retorna o valor numérico de POWER para um golpe (procura em campos do próprio objeto,
// busca na tabela de ataques `smeargleAtacksData` por nome, e tenta lookup por número de TM)
function obterPowerGolpe(golpe){
    try{
        if(!golpe) return 0;
        // 1) checar propriedades diretas
        const candidates = [golpe.power, golpe.POWER, golpe.Power, golpe['POWER'], golpe['Power']];
        for(const c of candidates){ if(typeof c !== 'undefined' && c !== null){ const s = String(c).trim(); const m = s.match(/-?\d+/); if(m) return parseInt(m[0],10); } }

        // 2) se tem número de TM, tentar buscar no lookup por numero
        try{
            const lookup = (typeof buildTmLookup === 'function') ? buildTmLookup() : (window.__tmLookup || null);
            if(golpe.numero && lookup){
                const numClean = String(golpe.numero).replace(/\D/g,'');
                let found = null;
                if(lookup.byNumber && lookup.byNumber.has(String(numClean))) found = lookup.byNumber.get(String(numClean));
                if(!found && Array.isArray(lookup.raw)) found = lookup.raw.find(x=> String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'') === String(numClean));
                if(found){ const pow = found.POWER || found.power || found.Power || found['POWER'] || found['Power']; if(pow) { const mm = String(pow).match(/-?\d+/); if(mm) return parseInt(mm[0],10); } }
            }
        }catch(e){}

        // 3) tentar buscar por nome na tabela smeargleAtacksData exposta em window ou em qualquer global que pareça conter ataques
        try{
            const key = simplifyForCompare(golpe.nome || '');
            // fontes preferenciais
            const candidates = [window.smeargleAtacksData, smeargleAtacksData, window.todosAtacks, window.todos, window.todosTMs];
            for(const tbl of candidates){
                if(Array.isArray(tbl) && tbl.length){
                    let found = tbl.find(a => simplifyForCompare((a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a.nome||a.NAME||'') + '') === key);
                    if(!found){ found = tbl.find(a => { const atn = (a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a.nome||'')+''; const s = simplifyForCompare(atn); return s && key && (s.includes(key) || key.includes(s)); }); }
                    if(found){ const pow = found.POWER || found.power || found.Power || found['POWER'] || found['Power']; if(pow){ const mm = String(pow).match(/-?\d+/); if(mm) return parseInt(mm[0],10); } }
                }
            }
            // fallback: vasculhar window em busca de arrays que pareçam tabelas de ataques
            for(const k in window){
                try{
                    const v = window[k];
                    if(Array.isArray(v) && v.length && typeof v[0] === 'object'){
                        const keys = Object.keys(v[0]).join(' ').toUpperCase();
                        if(/ATACK|POWER|PP|EFEITO|TIPAGEM|NOME/.test(keys)){
                            let f = v.find(x=> simplifyForCompare((x['ATACK']||x.nome||x['NOME DO TM']||x.name||'')+'') === key);
                            if(!f) f = v.find(x=> { const atn=(x['ATACK']||x.nome||x['NOME DO TM']||x.name||'')+''; const s=simplifyForCompare(atn); return s && key && (s.includes(key) || key.includes(s)); });
                            if(f){ const pow = f.POWER||f.power||f.Power||f['POWER']||f['Power']; if(pow){ const mm = String(pow).match(/-?\d+/); if(mm) return parseInt(mm[0],10); } }
                        }
                    }
                }catch(e){}
            }
        }catch(e){}

        return 0;
    }catch(e){ return 0; }
}

// Obter texto de EFEITO para um golpe (procura no próprio objeto, em smeargleAtacksData e em lookup de TMs)
function obterEfeitoGolpe(golpe){
    try{
        if(!golpe) return '';
        const candidates = [golpe.efeito, golpe.EFEITO, golpe.effect, golpe.EFFECT, golpe.Efeito, golpe['EFEITO']];
        for(const c of candidates){ if(typeof c !== 'undefined' && c !== null){ const s = String(c).trim(); if(s) return s; } }

        // tentar lookup por numero de TM
        try{
            const lookup = (typeof buildTmLookup === 'function') ? buildTmLookup() : (window.__tmLookup || null);
            if(golpe.numero && lookup){
                const numClean = String(golpe.numero).replace(/\D/g,'');
                let found = null;
                if(lookup.byNumber && lookup.byNumber.has(String(numClean))) found = lookup.byNumber.get(String(numClean));
                if(!found && Array.isArray(lookup.raw)) found = lookup.raw.find(x=> String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'') === String(numClean));
                if(found){ const ef = found.EFEITO || found.efeito || found.effect || found.Effect || found['EFFECT']; if(ef) return String(ef).trim(); }
            }
        }catch(e){}

        // buscar por nome na tabela smeargleAtacksData exposta ou em qualquer global de ataques
        try{
            const key = simplifyForCompare(golpe.nome || '');
            const candidates = [window.smeargleAtacksData, smeargleAtacksData, window.todosAtacks, window.todos, window.todosTMs];
            for(const tbl of candidates){
                if(Array.isArray(tbl) && tbl.length){
                    let found = tbl.find(a => simplifyForCompare((a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a.nome||a.NAME||'') + '') === key);
                    if(!found){ found = tbl.find(a => { const atn = (a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a.nome||'')+''; const s = simplifyForCompare(atn); return s && key && (s.includes(key) || key.includes(s)); }); }
                    if(found){ const ef = found.EFEITO || found.efeito || found.effect || found.Effect || found['EFFECT']; if(ef) return String(ef).trim(); }
                }
            }
            for(const k in window){
                try{
                    const v = window[k];
                    if(Array.isArray(v) && v.length && typeof v[0] === 'object'){
                        const keys = Object.keys(v[0]).join(' ').toUpperCase();
                        if(/ATACK|POWER|PP|EFEITO|TIPAGEM|NOME/.test(keys)){
                            let f = v.find(x=> simplifyForCompare((x['ATACK']||x.nome||x['NOME DO TM']||x.name||'')+'') === key);
                            if(!f) f = v.find(x=> { const atn=(x['ATACK']||x.nome||x['NOME DO TM']||x.name||'')+''; const s=simplifyForCompare(atn); return s && key && (s.includes(key) || key.includes(s)); });
                            if(f){ const ef = f.EFEITO||f.efeito||f.effect||f.Effect||f['EFFECT']; if(ef) return String(ef).trim(); }
                        }
                    }
                }catch(e){}
            }
        }catch(e){}

        return '';
    }catch(e){ return ''; }
}

// Helpers para obter PP / ACC / GEN a partir do objeto golpe ou tabelas de ataques
function obterPPGolpe(golpe){
    try{
        if(!golpe) return '';
        const direct = golpe.PP || golpe.pp || golpe['PP'] || golpe.POWER_POINTS || golpe['POWER_POINTS'];
        if(direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
        const key = simplifyForCompare(golpe.nome || '');
        const candidates = [window.smeargleAtacksData, smeargleAtacksData, window.todosAtacks, window.todos, window.todosTMs];
        for(const tbl of candidates){
            if(Array.isArray(tbl) && tbl.length){
                let found = tbl.find(a => simplifyForCompare(((a['ATACK']||a.nome||a['NOME']||a.NAME||'')+'').toString()) === key);
                if(!found) found = tbl.find(a => { const atn = ((a['ATACK']||a.nome||a['NOME']||'')+'').toString(); const s = simplifyForCompare(atn); return s && key && (s.includes(key) || key.includes(s)); });
                if(found){ const v = found.PP || found.pp || found['PP'] || found.POWER_POINTS || found['POWER_POINTS']; if(v !== undefined && v !== null) return String(v); }
            }
        }
    }catch(e){}
    return '';
}

function obterAccuracyGolpe(golpe){
    try{
        if(!golpe) return '';
        const direct = golpe.ACCURACY || golpe.accuracy || golpe.ACC || golpe.Acc || golpe['ACCURACY'];
        if(direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
        const key = simplifyForCompare(golpe.nome || '');
        const candidates = [window.smeargleAtacksData, smeargleAtacksData, window.todosAtacks, window.todos, window.todosTMs];
        for(const tbl of candidates){
            if(Array.isArray(tbl) && tbl.length){
                let found = tbl.find(a => simplifyForCompare(((a['ATACK']||a.nome||a['NOME']||a.NAME||'')+'').toString()) === key);
                if(!found) found = tbl.find(a => { const atn = ((a['ATACK']||a.nome||a['NOME']||'')+'').toString(); const s = simplifyForCompare(atn); return s && key && (s.includes(key) || key.includes(s)); });
                if(found){ const v = found.ACCURACY || found.acc || found.ACC || found.Acc || found['ACCURACY']; if(v !== undefined && v !== null) return String(v); }
            }
        }
    }catch(e){}
    return '';
}

function obterGenGolpe(golpe){
    try{
        if(!golpe) return '';
        const direct = golpe.GEN || golpe.gen || golpe.Gen || golpe['GEN'];
        if(direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
        const key = simplifyForCompare(golpe.nome || '');
        const candidates = [window.smeargleAtacksData, smeargleAtacksData, window.todosAtacks, window.todos, window.todosTMs];
        for(const tbl of candidates){
            if(Array.isArray(tbl) && tbl.length){
                let found = tbl.find(a => simplifyForCompare(((a['ATACK']||a.nome||a['NOME']||a.NAME||'')+'').toString()) === key);
                if(!found) found = tbl.find(a => { const atn = ((a['ATACK']||a.nome||a['NOME']||'')+'').toString(); const s = simplifyForCompare(atn); return s && key && (s.includes(key) || key.includes(s)); });
                if(found){ const v = found.GEN || found.gen || found.Gen || found['GEN']; if(v !== undefined && v !== null) return String(v); }
            }
        }
    }catch(e){}
    return '';
}

// Remover golpe
window.removerGolpe = function(index) {
    // Não remover o índice (shift); apenas marcar o slot como vazio
    if (index >= 0 && index < smeargleSelectedMoves.length) {
        smeargleSelectedMoves[index] = null;
    }
    // feedback imediato: atualizar contagem e substituir visual do slot removido
    try{
        const movesCount = document.getElementById('movesCount');
        if(movesCount) movesCount.textContent = smeargleSelectedMoves.filter(Boolean).length;
        const movesList = document.getElementById('movesList');
        if(movesList){
            const sel = movesList.querySelector(`[data-slot="${index+1}"]`);
            if(sel){
                sel.outerHTML = `<div class="selected-move-item selected-move-empty" data-slot="${index+1}">\n                        <span class="move-number">${index + 1}</span>\n                        <span class="move-info"><em>Slot livre</em></span>\n                        <button class="btn-add-slot" onclick="iniciarSelecaoSlot(${index})" style="margin-left:8px;">Adicionar</button>\n                    </div>`;
            }
        }
    }catch(e){/* ignore quick update errors */}

    // agendar trabalho pesado sem bloquear interação
    try{ scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); }catch(e){}
};

// Limpar todos os golpes
function limparGolpes() {
    // limpar slots (feedback imediato)
    smeargleSelectedMoves = new Array(9).fill(null);
    try{ const movesCount = document.getElementById('movesCount'); if(movesCount) movesCount.textContent = '0'; }catch(e){}
    try{ const movesList = document.getElementById('movesList'); if(movesList) movesList.innerHTML = '<div class="no-moves-yet">Nenhum golpe selecionado</div>'; }catch(e){}
    // agendar re-renderizações pesadas sem bloquear interação
    try{ scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); }catch(e){}
}

// Iniciar seleção de slot vazio para inserir o próximo golpe clicado
window.iniciarSelecaoSlot = function(index) {
    if (typeof index !== 'number') return;
    // Se já estava ativo esse slot, cancelar
    if (smeargleTargetSlot === index) {
        smeargleTargetSlot = null;
        if (window.showToast) window.showToast('Seleção cancelada', 'error'); else alert('Seleção cancelada');
        try{ scheduleSmeargleUpdate({card:true}); }catch(e){}
        return;
    }
    smeargleTargetSlot = index;
    const msg = `Selecione um golpe no grid para inserir em M${index + 1} (clique em "Adicionar" novamente para cancelar).`;
    if (window.showToast) window.showToast(msg, 'success'); else alert(msg);
    try{ scheduleSmeargleUpdate({card:true}); }catch(e){}
};

// Buscar Pokémons compatíveis (mostra o Pokémon de origem de cada golpe)
function buscarPokemonsCompativeis() {
    const grid = document.getElementById('compatibleGrid');
    const _smBuscarLabel = '[Smeargle] buscarPokemonsCompativeis';
    smTimeStart(_smBuscarLabel);
    if (!grid) {
        console.warn('[Smeargle] buscarPokemonsCompativeis: elemento #compatibleGrid não encontrado. Pulando render.');
        try{ smTimeEnd(_smBuscarLabel); }catch(e){}
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

        // Usar normalizeName para comparar nomes de forma mais robusta (remove acentos, parênteses, etc.)
        const pokemon = smearglePokemonData.find(p => {
            try{
                const pokRaw = (p['POKEMON'] || '');
                const evRaw = (p['EV'] || '');
                const pok = typeof normalizeName === 'function' ? normalizeName(pokRaw) : (pokRaw||'').toString().toLowerCase();
                const ev = typeof normalizeName === 'function' ? normalizeName(evRaw) : (evRaw||'').toString().toLowerCase();
                const o = typeof normalizeName === 'function' ? normalizeName(origemNorm || rawOrigem) : (origemNorm||rawOrigem||'').toString().toLowerCase();
                if(!o) return false;
                if(pok === o || ev === o) return true;
                // comparar por inclusão (última palavra ou qualquer parte)
                if(pok.includes(o) || ev.includes(o)) return true;
                const parts = o.split(/\s+/).filter(Boolean);
                const last = parts.length ? parts[parts.length - 1] : o;
                if (last && (pok.includes(last) || ev.includes(last))) return true;
                return false;
            }catch(e){ return false; }
        });
        if (!pokemon) {
            if(window.DEBUG_SMEARGLE) console.warn(`[Smeargle] Não encontrou Pokémon para origem="${rawOrigem}" (procurando por M${index + 1}: ${golpe.nome}). Tentando sugerir candidatos...`);
            // tentar sugerir candidatos aproximados (busca por substring no POKEMON/EV) usando origem normalizada
            const termo = (origemNorm || rawOrigem).toString();
            const tnorm = typeof normalizeName === 'function' ? normalizeName(termo) : termo.toLowerCase();
            const candidatos = smearglePokemonData.filter(p => {
                try{
                    const pokAll = Object.values(p).filter(v=>typeof v === 'string').map(v=> typeof normalizeName === 'function' ? normalizeName(v) : v.toLowerCase()).join(' ');
                    return tnorm && pokAll.includes(tnorm);
                }catch(e){ return false; }
            }).slice(0, 12).map(p => ({POKEMON: p['POKEMON'], EV: p['EV']}));
            if(window.DEBUG_SMEARGLE) console.warn('[Smeargle] Candidatos encontrados:', candidatos);
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
                        alt="${pokemon['POKEMON']}" onerror="tryNextImage(this)">
                    </div>
                <div class="compatible-name">${pokemon['EV'] || pokemon['POKEMON']}</div>
                <div class="compatible-move"><i class="fas fa-star"></i> M${index + 1}: ${golpe.nome}</div>
                <div class="compatible-location"><i class="fas fa-map-marker-alt"></i>${formatarLocalizacoesSmeargle(pokemon['LOCALIZAÇÃO'])}</div>
            </div>
        `);
    }
    grid.innerHTML = cards.join('');
    try{ smTimeEnd(_smBuscarLabel); }catch(e){}
}

// Configurar eventos
function configurarEventosSmeargle() {
    // Filtros
    document.getElementById('filterNome').addEventListener('input', aplicarFiltrosSmeargle);
    document.getElementById('filterTipo').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterAcao').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterCategoria').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterLocal').addEventListener('change', aplicarFiltrosSmeargle);
    document.getElementById('filterPower').addEventListener('change', aplicarFiltrosSmeargle);
    
    // Limpar tudo
    document.getElementById('btnClearMoves').addEventListener('click', limparGolpes);
    // Adicionar botão "Copiar M1-M9" abaixo do botão limpar (se existir)
    try{
        const clearBtn = document.getElementById('btnClearMoves');
        if(clearBtn && clearBtn.parentNode){
            const copyAll = document.createElement('button');
            copyAll.id = 'btnCopyAllMoves';
            copyAll.textContent = 'Copiar M1-M9';
            copyAll.title = 'Copiar todos os golpes (M1..M9)';
            copyAll.className = 'btn-clear-moves btn-copy-moves';
            clearBtn.parentNode.insertBefore(copyAll, clearBtn.nextSibling);
            copyAll.addEventListener('click', copiarTodosMovesSmeargle);
        }
    }catch(e){/* ignore */}
}

// Aplicar filtros
function aplicarFiltrosSmeargle() {
    try{ if(typeof scheduleSmeargleUpdate === 'function') scheduleSmeargleUpdate({reorder:true}); else if(typeof reordenarGridMovesOrdenado === 'function') reordenarGridMovesOrdenado(); }catch(e){}
}

// Registrar inicializador
// Registrar inicializador da página (deve ficar no final do arquivo)
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('smeargle', initSmeargle);
    console.log('✅ Inicializador Smeargle registrado');
}

// ─── Pré-carregamento em background ──────────────────────────────────────────
// Inicia o fetch dos dados assim que o script é carregado, antes do usuário
// clicar na aba. Usa um pequeno delay para não competir com o carregamento
// inicial das outras abas.
(function smearglePreFetch() {
    try {
        if (window.__smeargleRawCache) return; // já disponível
        var delay = 2000; // 2s após o script carregar
        setTimeout(function() {
            try {
                if (!window.__smeargleRawCache) {
                    console.log('[Smeargle] Iniciando pré-fetch em background...');
                    _fetchSmeargleRawData();
                }
            } catch(e) {}
        }, delay);
    } catch(e) {}
})();

// Delegação segura para botões de toggle na página Smeargle
(function ensureSmeargleToggleDelegation(){
    try{
        if(window.__smeargle_toggle_delegation_added) return;
        window.__smeargle_toggle_delegation_added = true;
        document.addEventListener('click', function(ev){
            try{
                if(ev.button && ev.button !== 0) return;
                var btn = ev.target && ev.target.closest ? ev.target.closest('.btn-toggle-stats, .btn-toggle-weaknesses') : null;
                if(!btn) return;
                try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
                if(btn.dataset && btn.dataset.__delegationHandled === '1') return;
                var isStats = btn.classList.contains('btn-toggle-stats');
                var isWeak = btn.classList.contains('btn-toggle-weaknesses');
                var next = btn.nextElementSibling;
                if(isStats){ if(next) next.classList.toggle('stats-hidden'); btn.classList.toggle('stats-open'); }
                else if(isWeak){ if(next) next.classList.toggle('weaknesses-hidden'); btn.classList.toggle('stats-open'); }
                try{ if(btn.dataset) btn.dataset.__delegationHandled = '1'; }catch(e){}
                setTimeout(function(){ try{ if(btn.dataset) delete btn.dataset.__delegationHandled; }catch(e){} }, 80);
            }catch(e){}
        }, true);
    }catch(e){}
})();

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
            // Filtrar builds do Move7 (prefixo [MOVE7]) — essas aparecem apenas na aba Move7
            const buildsSmeargle = result.builds.filter(b => !b.nome || !b.nome.startsWith('[MOVE7] '));
            if (!buildsSmeargle.length) {
                buildsList.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">Nenhuma build salva ainda.</p>';
                return;
            }
            buildsList.innerHTML = buildsSmeargle.map((build, index) => `
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
                        <button class="btn-delete-build" onclick="event.stopPropagation(); excluirBuild(${build.id}, '${build.nome.replace(/'/g, "&apos;")}')">
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
        
        // Atualizar interface (agendado para não travar)
        try{ scheduleSmeargleUpdate({card:true,buscar:true,reorder:true}); }catch(e){}
        
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
