// Builder module: parses Pokedex paste and allows assembling a moveset
(function(){
  function safe(q){return document.getElementById(q)}

  // Normaliza string para comparação
  function _nk(s){ try{ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g,'').trim(); }catch(e){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9\s]/g,'').trim(); } }

  // Filtro e ordenação do grid de golpes do Builder (lê todos os filtros da barra)
  window.filterCombinedMoves = function(){
    try{
      var grid = document.getElementById('combinedMovesGrid');
      if(!grid) return;

      // ── leitura dos filtros ──────────────────────────────────────────────
      var q         = _nk((document.getElementById('moveSearchInput')||{value:''}).value);
      var fTipo     = _nk((document.getElementById('builderFilterTipo')||{value:''}).value);
      var fAcao     = _nk((document.getElementById('builderFilterAcao')||{value:''}).value);
      var fCat      = _nk((document.getElementById('builderFilterCategoria')||{value:''}).value);
      var fLocal    = (document.getElementById('builderFilterLocal')||{value:''}).value.trim();
      var fPowerSort= (document.getElementById('builderFilterPower')||{value:''}).value.trim();

      var items = Array.from(grid.children || []);

      // ── helper: extrai campos de um tile ─────────────────────────────────
      function fields(it){
        var name  = _nk((it.dataset && it.dataset.moveName) || (it.querySelector('.move-name') && it.querySelector('.move-name').textContent) || '');
        var typeR = (it.dataset && it.dataset.moveType) || (it.querySelector('.move-tipo') && it.querySelector('.move-tipo').textContent) || '';
        if(!typeR){ var cm = (it.className||'').match(/\btype-([a-z0-9\-]+)\b/i); if(cm) typeR = cm[1]; }
        var tipo  = _nk(typeR);
        var acao  = _nk((it.querySelector('.move-acao') && it.querySelector('.move-acao').textContent) || (it.dataset && it.dataset.moveAcao) || '');
        var cat   = _nk((it.dataset && it.dataset.moveCategory) || (it.querySelector('.move-categoria') && it.querySelector('.move-categoria').textContent) || '');
        var slot  = (it.dataset && it.dataset.slotBadge) || (it.querySelector('.slot-badge') && it.querySelector('.slot-badge').textContent) || '';
        var powerTxt = (it.querySelector('.power-value') && it.querySelector('.power-value').textContent) || '';
        var power = parseFloat(powerTxt) || 0;
        var isSep = it.classList.contains('tm-section-separator');
        var isNotice = it.id === 'builderAllAttacksNotice';
        return { name, tipo, acao, cat, slot: slot.trim(), power, isSep, isNotice };
      }

      // ── visibilidade ─────────────────────────────────────────────────────
      var hasAnyFilter = q || fTipo || fAcao || fCat || fLocal;
      var visibleCount = 0;
      items.forEach(function(it){
        var f = fields(it);
        if(f.isNotice){ it.style.removeProperty('display'); return; } // aviso: sempre visível
        if(f.isSep){ it.style.setProperty('display','none','important'); return; } // separador: esconder por padrão, reativar ao final se houver TMs visíveis

        if(!hasAnyFilter){ it.style.removeProperty('display'); visibleCount++; return; }

        // TM tiles não têm ação/categoria/slot — detectar antes dos filtros
        var isTmTile = !!(it.getAttribute && (it.getAttribute('data-is-tm') === '1' || it.classList.contains('tm-tile')));

        var ok = true;
        if(q && ok){
          // Para TM tiles, buscar também no badge de número (ex: "TM09")
          var searchName = f.name;
          if(isTmTile){
            var badge = it.querySelector('.slot-badge, .tm-num-badge');
            if(badge){ var badgeTxt = _nk(badge.textContent); if(badgeTxt) searchName = f.name + ' ' + badgeTxt; }
          }
          if(searchName.indexOf(q) === -1) ok = false;
        }
        if(fTipo && ok){
          var tOk = f.tipo && (f.tipo === fTipo || f.tipo.includes(fTipo) || fTipo.includes(f.tipo));
          if(!tOk) ok = false;
        }
        // Ação e categoria: só filtrar se o card TEM esse dado — itens sem dado passam (não esconder por falta de info)
        if(fAcao && ok && f.acao){
          var aOk = (f.acao === fAcao || f.acao.includes(fAcao) || fAcao.includes(f.acao));
          if(!aOk) ok = false;
        }
        if(fCat && ok && f.cat){
          var cOk = (f.cat === fCat || f.cat.includes(fCat) || fCat.includes(f.cat));
          if(!cOk) ok = false;
        }
        if(fLocal && ok){
          // Usar somente dataset.slotBadge (não o badge visual) para evitar confundir "TM09" com slot M9
          var slotTxt = (it.dataset && it.dataset.slotBadge) ? it.dataset.slotBadge.trim() : '';
          // só filtrar por posição se o card tem um slot explicitamente atribuído
          if(slotTxt && slotTxt !== fLocal) ok = false;
        }
        if(ok){ it.style.removeProperty('display'); } else { it.style.setProperty('display','none','important'); }
        if(ok) visibleCount++;
      });

      // Mostrar separador de TMs apenas se houver TM tiles visíveis após o separador
      items.forEach(function(it, idx){
        if(!it.classList.contains('tm-section-separator')) return;
        var hasTmVisible = false;
        for(var j = idx+1; j < items.length; j++){
          var d = items[j].style.getPropertyValue('display');
          if(d !== 'none') { hasTmVisible = true; break; }
        }
        if(hasTmVisible){ it.style.removeProperty('display'); } else { it.style.setProperty('display','none','important'); }
      });

      // ── ordenação por Power ───────────────────────────────────────────────
      if(fPowerSort === 'desc' || fPowerSort === 'asc' || fPowerSort === ''){
        // Garantir que todos os itens têm índice original registrado
        items.forEach(function(it, i){ if(!it.dataset.origOrder) it.dataset.origOrder = String(i); });

        // Separar: notice + seps ficam fora da ordenação
        var sortable = items.filter(function(it){ var f=fields(it); return !f.isSep && !f.isNotice; });
        var seps     = items.filter(function(it){ return fields(it).isSep; });
        var notices  = items.filter(function(it){ return fields(it).isNotice; });

        if(fPowerSort === 'desc' || fPowerSort === 'asc'){
          sortable.sort(function(a,b){
            var pa = fields(a).power, pb = fields(b).power;
            return fPowerSort === 'desc' ? pb - pa : pa - pb;
          });
        } else {
          // Restaurar ordem original
          sortable.sort(function(a,b){ return parseInt(a.dataset.origOrder||0,10) - parseInt(b.dataset.origOrder||0,10); });
        }

        // Recolocar no DOM: notices no topo, ataques/TMs ordenados, seps logo antes das TMs
        var firstTmIdx = sortable.findIndex(function(it){ return it.classList.contains('tm-tile') || it.getAttribute('data-is-tm') === '1'; });
        var attackTiles = firstTmIdx === -1 ? sortable : sortable.slice(0, firstTmIdx);
        var tmTiles     = firstTmIdx === -1 ? [] : sortable.slice(firstTmIdx);

        notices.forEach(function(n){ grid.appendChild(n); });
        attackTiles.forEach(function(t){ grid.appendChild(t); });
        seps.forEach(function(s){ grid.appendChild(s); });
        tmTiles.forEach(function(t){ grid.appendChild(t); });
      }
    }catch(e){ console.warn('filterCombinedMoves error', e); }
  };

  // Popula os dropdowns de Tipo/Ação/Categoria com os valores dos golpes renderizados
  window._builderPopulateFilters = function(){
    try{
      var grid = document.getElementById('combinedMovesGrid');
      if(!grid) return;
      var selTipo = document.getElementById('builderFilterTipo');
      var selAcao = document.getElementById('builderFilterAcao');
      var selCat  = document.getElementById('builderFilterCategoria');
      if(!selTipo || !selAcao || !selCat) return;

      var tipos = new Set(), acoes = new Set(), cats = new Set();
      Array.from(grid.querySelectorAll('.move-card')).forEach(function(it){
        var tipo = (it.querySelector('.move-tipo') && it.querySelector('.move-tipo').textContent) || (it.dataset && it.dataset.moveType) || '';
        var acao = (it.querySelector('.move-acao') && it.querySelector('.move-acao').textContent) || '';
        var cat  = (it.querySelector('.move-categoria') && it.querySelector('.move-categoria').textContent) || (it.dataset && it.dataset.moveCategory) || '';
        if(tipo.trim()) tipos.add(tipo.trim());
        if(acao.trim()) acoes.add(acao.trim());
        if(cat.trim())  cats.add(cat.trim());
      });

      function rebuild(sel, set, defaultLabel){
        // Usar valor normalizado como `value` para que restaurações funcionem mesmo com
        // variações de capitalização entre re-renders (ex: "Fire" vs "fire")
        var prev = sel.value; // já normalizado de run anterior, ou "" na 1ª vez
        sel.innerHTML = '<option value="">'+defaultLabel+'</option>';
        Array.from(set).sort().forEach(function(v){
          var normVal = (function(s){ try{ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g,'').trim(); }catch(e){ return (s||'').toString().toLowerCase().trim(); } })(v);
          var o = document.createElement('option'); o.value = normVal; o.textContent = v; sel.appendChild(o);
        });
        if(prev) sel.value = prev; // prev já é normalizado → restauração robusta
      }
      rebuild(selTipo, tipos, 'Todos');
      rebuild(selAcao, acoes, 'Todas');
      rebuild(selCat,  cats,  'Todas');
    }catch(e){}
  };

  function parsePokedexText(text){
    if(!text) return {moves:[], tms:[]};
    // simple existing robust parser: look for Move blocks and TM lines
    const meta = { nome: '', tipos: [], clan: '', stats: {} };
    const moves = [];
    const tms = [];
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);

    // tentar extrair meta (Nome, EV/Forma, Tipo, Clã) nas primeiras linhas
    for (let i=0;i<Math.min(20, lines.length); i++){
      const ln = lines[i];
      const nomeMatch = /^Nome:\s*(.+)/i.exec(ln);
      if(nomeMatch) meta.nome = nomeMatch[1].trim();
      // detectar campo EV / Forma (padrões comuns: EV:, Forma:, Form:, Evolution:)
      const evMatch = /^(?:EV|Forma|Form|Evolution|Evolução)\s*[:\-]\s*(.+)/i.exec(ln);
      if(evMatch) meta.ev = evMatch[1].trim();
      const tipoMatch = /^Tipo:\s*(.+)/i.exec(ln);
      if(tipoMatch){
        // exemplos: (Dark)(Dragon)  OR Dark / Dragon
        let raw = tipoMatch[1].trim();
        // remover parênteses e separar por )(
        const par = raw.match(/\([^\)]+\)/g);
        if(par && par.length>0){
          meta.tipos = par.map(p=>p.replace(/[()]/g,'').trim());
        } else {
          // split por /, espaço ou vírgula
          meta.tipos = raw.split(/[\/;,]|\)\(/).map(s=>s.replace(/[()]/g,'').trim()).filter(Boolean);
        }
      }
      const clanMatch = /Clã recomendado:\s*(.+)/i.exec(ln);
      if(clanMatch) meta.clan = clanMatch[1].trim();
      // não sobrescrever `meta.nome` aqui — apenas registrar `meta.ev`.
      if(meta.nome && meta.tipos.length>0) break;
    }

    // tentar extrair bloco de Status (Hp, Attack, Defense, Sp. Attack, Sp. Defense, Speed)
    lines.forEach(ln=>{
      // exemplos: [Hp]: 138  or [Attack]: 157.5
      const mHp = /\[\s*hp\s*\]\s*[:\]]\s*(\d+(?:\.\d+)?)/i.exec(ln);
      if(mHp) meta.stats.hp = parseFloat(mHp[1]);
      const mAtk = /\[\s*attack\s*\]\s*[:\]]\s*(\d+(?:\.\d+)?)/i.exec(ln);
      if(mAtk) meta.stats.atk = parseFloat(mAtk[1]);
      const mDef = /\[\s*defense\s*\]\s*[:\]]\s*(\d+(?:\.\d+)?)/i.exec(ln);
      if(mDef) meta.stats.def = parseFloat(mDef[1]);
      const mSpA = /\[\s*sp\.\s*attack\s*\]\s*[:\]]\s*(\d+(?:\.\d+)?)/i.exec(ln);
      if(mSpA) meta.stats.spatk = parseFloat(mSpA[1]);
      const mSpD = /\[\s*sp\.\s*defense\s*\]\s*[:\]]\s*(\d+(?:\.\d+)?)/i.exec(ln);
      if(mSpD) meta.stats.spdef = parseFloat(mSpD[1]);
      const mSpe = /\[\s*speed\s*\]\s*[:\]]\s*(\d+(?:\.\d+)?)/i.exec(ln);
      if(mSpe) meta.stats.speed = parseFloat(mSpe[1]);
    });

    const moveBlockRx = /\[Move\s*\d+\]:[\s\S]*?(?=(\n\[Move|\n\n|$))/gi;
    let m;
    while((m = moveBlockRx.exec(text))!==null){
      const block = m[0];
      const indexMatch = /\[Move\s*(\d+)\]/i.exec(block);
      const slotIndex = indexMatch ? parseInt(indexMatch[1],10) : null;
      const nome = (/Ataque:\s*(.+)/i.exec(block)||/Attack:\s*(.+)/i.exec(block)||[])[1];
      const tipo = (/Tipo:\s*(.+)/i.exec(block)||/Type:\s*(.+)/i.exec(block)||[])[1]||'';
      const cat = (/Categoria:\s*(.+)/i.exec(block)||/Category:\s*(.+)/i.exec(block)||[])[1]||'';
      if(nome) moves.push({nome:nome.trim(), tipo: (tipo||'').trim(), categoria:(cat||'').trim(), slot: slotIndex});
    }

    // TM blocks
    const tmBlockRx = /\[TM\s*(\d+)\s*-\s*([^\]]+)\]:[\s\S]*?(?=(\n\[TM|\n\n|$))/gi;
    while((m = tmBlockRx.exec(text))!==null){
      const num = (/\[TM\s*(\d+)/i.exec(m[0])||[])[1]||'';
      const nome = (/\[TM\s*\d+\s*-\s*([^\]]+)\]/i.exec(m[0])||[])[1]||'';
      if(nome) tms.push({nome:nome.trim(), numero:num});
    }

    // Coletar TMs de qualquer linha que contenha TM/MT (com ou sem número)
    lines.forEach(ln=>{
      if(!/(?:^|\s|\[)(?:TM|MT)\s*\d/i.test(ln) && !/\bTM\b|\bMT\b/i.test(ln)) return;
      // Formato com número: TM09 - Venoshock  ou  [TM09 - Venoshock]:
      const tmNum = /(?:TM|MT)\s*(\d+)\s*[-–:]\s*([^\]:\n]+)/i.exec(ln);
      if(tmNum){
        const nm = tmNum[2].trim();
        if(nm && !tms.find(t=>t.nome.toLowerCase()===nm.toLowerCase()))
          tms.push({ numero: tmNum[1], nome: nm });
        return;
      }
      // Formato genérico: qualquer linha com TM/MT — extrai o nome
      const nm = ln.replace(/\[?(?:TM|MT)\]?[:\-#\s0-9]*/ig,'').replace(/[\[\]:]/g,'').trim();
      if(nm && !tms.find(t=>t.nome.toLowerCase()===nm.toLowerCase())) tms.push({nome:nm});
    });

    // Tentar extrair EV/qualificador mesmo quando estiver embutido no `meta.nome`
    try{
      if(!meta.ev && meta.nome){
        const quals = ['shiny','mega','alolan','galarian','hisui','crowned','shadow','female','male','alpha','beta'];
        const raw = (meta.nome||'').toString().trim();
        // caso: "Nome (Shiny)" ou "Tyranitar (Shiny)"
        const par = /\(([^)]+)\)/.exec(raw);
        if(par && par[1]){
          meta.ev = par[1].trim();
          meta.nome = raw.replace(par[0],'').trim();
        } else {
          // caso: "Shiny Tyranitar" ou "Tyranitar Shiny"
          const parts = raw.split(/\s+/).filter(Boolean);
          if(parts.length>1){
            const first = parts[0].toLowerCase();
            const last = parts[parts.length-1].toLowerCase();
            if(quals.includes(first)){
              meta.ev = parts[0];
              meta.nome = parts.slice(1).join(' ');
            } else if(quals.includes(last)){
              meta.ev = parts[parts.length-1];
              meta.nome = parts.slice(0, parts.length-1).join(' ');
            } else if(raw.includes('-')){
              const p = raw.split('-').map(s=>s.trim()).filter(Boolean);
              const pfirst = p[0] && p[0].toLowerCase();
              const plast = p[p.length-1] && p[p.length-1].toLowerCase();
              if(quals.includes(pfirst)) { meta.ev = p[0]; meta.nome = p.slice(1).join(' '); }
              else if(quals.includes(plast)) { meta.ev = p[p.length-1]; meta.nome = p.slice(0,p.length-1).join(' '); }
            }
          }
        }
      }

    }catch(e){ /* ignore */ }

    // Após analisar todo o cabeçalho, montar nome exibido preferencialmente com EV + nome base
    try{
      const base = (meta.nome || '').trim();
      const ev = (meta.ev || '').trim();
      if(ev && base){
        // evitar duplicar: se base já contém ev, manter base
        if(base.toLowerCase().includes(ev.toLowerCase())) meta.nome = base;
        else meta.nome = (ev + ' ' + base).trim();
      } else if(ev){
        meta.nome = ev;
      } else {
        meta.nome = base;
      }
    }catch(e){ /* ignore */ }

    return {moves, tms, meta};
  }

  // pré-aquecer o Apps Script (ping) para reduzir cold-start
  try{
    setTimeout(()=>{
      try{
        const base = (window.SHEETS_BASE_URL) ? window.SHEETS_BASE_URL : (window.APPS_SCRIPT_URL ? window.APPS_SCRIPT_URL : null);
        if(base) fetch(base + '?action=ping').catch(()=>{});
      }catch(e){}
    }, 800);
  }catch(e){}

  // Enviar golpes parseados para a planilha POKEDEX via Apps Script
  async function savePokedexMovesToSheet(pokemonName, moves, stats){
    console.log('savePokedexMovesToSheet called', { pokemonName, moves, stats });
    if(!pokemonName || !moves || !moves.length) return {success:false, message:'No data'};
    try{
      const payload = moves.map((m, idx)=>({
        slot: `M${m.slot || (idx+1)}`,
        nome: m.nome || '',
        tipo: m.tipo || '',
        categoria: m.categoria || '',
        descricao: m.efeito || m.descricao || ''
      }));
      // enviar como form-url-encoded para evitar preflight OPTIONS (CORS) e manter envio não-bloqueante
      try{
        const params = new URLSearchParams();
        params.append('action','savePokedexMoves');
        params.append('pokemon', pokemonName);
        params.append('moves', JSON.stringify(payload));
        params.append('stats', JSON.stringify(stats || {}));
        const base = window.SHEETS_BASE_URL || window.APPS_SCRIPT_URL || null;
        console.log('savePokedexMovesToSheet will POST to', base);
        if(base){
          try{
            const resp = await fetch(base, { method: 'POST', body: params });
            console.log('savePokedexMovesToSheet response', resp && resp.status);
            if(!resp.ok){
              try{ const text = await resp.text(); console.warn('savePokedexMovesToSheet non-ok response:', text); }catch(e){}
            }
          }catch(err){ console.warn('savePokedexMovesToSheet fetch err', err); }
        } else {
          console.warn('savePokedexMovesToSheet: nenhum endpoint configurado (window.SHEETS_BASE_URL/window.APPS_SCRIPT_URL)');
        }
      }catch(e){ console.warn('savePokedexMovesToSheet build err', e); }
      return { success: true, message: 'request_sent' };
    }catch(err){ console.error('savePokedexMovesToSheet error', err); return {success:false, message: err && err.message ? err.message : String(err)}; }
  }

  // Retorna a classe de ícone FontAwesome para uma tipagem (aceita nomes PT/EN)
  function getTypeIcon(tipo){
    try{
      if(!tipo) return 'fa-circle';
      const t = tipo.toString().trim();
      // 1) tentar usar o mapa global do Smeargle se disponível
      if(window.TIPO_ICONS && window.TIPO_ICONS[t]) return window.TIPO_ICONS[t];
      // 2) tentar capitalizar e buscar
      const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      if(window.TIPO_ICONS && window.TIPO_ICONS[cap]) return window.TIPO_ICONS[cap];
      // 3) mapeamento PT -> EN comum
      const pt2en = {
        'normal':'Normal','fogo':'Fire','água':'Water','agua':'Water','elétrico':'Electric','eletrico':'Electric',
        'grama':'Grass','gelo':'Ice','lutador':'Fighting','venenoso':'Poison','terra':'Ground','voador':'Flying',
        'psíquico':'Psychic','psiquico':'Psychic','inseto':'Bug','pedra':'Rock','fantasma':'Ghost','dragão':'Dragon',
        'noturno':'Dark','sombrio':'Dark','metálico':'Steel','metalico':'Steel','fada':'Fairy'
      };
      const low = t.toLowerCase();
      if(pt2en[low] && window.TIPO_ICONS && window.TIPO_ICONS[pt2en[low]]) return window.TIPO_ICONS[pt2en[low]];
      // 4) tentativa por substring em keys
      if(window.TIPO_ICONS){
        for(const k in window.TIPO_ICONS){ if(k.toLowerCase().includes(low) || low.includes(k.toLowerCase())) return window.TIPO_ICONS[k]; }
      }
    }catch(e){}
    return 'fa-circle';
  }

  // Build a lookup for TM data coming from any loaded sheet/global (Google API)
  function buildTmLookup(){
    if(window.__tmLookup) return window.__tmLookup;
    const candidates = [];
    const knownGlobals = ['todosTMs','smeargleAtacksData','todos','todos_tms','dexSheet','DEX_TMS'];
    knownGlobals.forEach(k=>{ try{ if(window[k] && Array.isArray(window[k])) candidates.push({name:k,arr:window[k]}); }catch(e){} });
    // also scan window for array-like globals that look like a sheet
    try{
      for(const k in window){
        if(candidates.find(c=>c.name===k)) continue;
        try{
          const v = window[k];
          if(Array.isArray(v) && v.length && typeof v[0] === 'object'){
            const keys = Object.keys(v[0]).join(' ').toUpperCase();
            if(/TIPAG|TIPAGEM|NUMER|TM|NOME/.test(keys)) candidates.push({name:k,arr:v});
          }
        }catch(e){}
      }
    }catch(e){}
    // choose the best candidate (prefer knownGlobals order)
    let source = candidates.length ? candidates[0].arr : [];
    if(candidates.length>1){
      // try prefer explicit todosTMs
      const prefer = candidates.find(c=>['todosTMs','todos','smeargleAtacksData'].includes(c.name));
      if(prefer) source = prefer.arr;
    }
    const byNumber = new Map();
    const byName = new Map();
    (source||[]).forEach(obj=>{
      const num = (obj.numero||obj.NUMERO||obj.Number||obj['Número']||obj['NUMERO DO TM']||'').toString();
      const nRaw = (obj.nome||obj['NOME DO TM']||obj.NOME||obj['NOME']||obj.name||'').toString();
      const n = (typeof _key === 'function') ? _key(nRaw) : nRaw.toLowerCase().trim();
      if(num) byNumber.set(num, obj);
      if(n) byName.set(n, obj);
    });
    const lookup = {sourceName: candidates[0]&&candidates[0].name || null, byNumber, byName, raw: source};
    window.__tmLookup = lookup; return lookup;
  }

  // helper: normalize string for fuzzy matching (simple)
  function _key(s){ try{ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,''); }catch(e){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]/g,''); } }

  // helper: lê um campo de um objeto ignorando case e espaços nas chaves; suporta múltiplos nomes alternativos
  // Resolve problemas de espaço nas chaves ("PP ", "AÇÃO ") e nomes alternativos
  function _getField(obj, ...keys){
    if(!obj) return '';
    // cache de chaves normalizadas do objeto
    const objKeys = Object.keys(obj);
    for(const key of keys){
      // tentativa direta
      if(key in obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return String(obj[key]);
      // busca ignorando case e espaços extras
      const kn = key.toLowerCase().trim();
      const match = objKeys.find(k => k.toLowerCase().trim() === kn);
      if(match !== undefined && obj[match] !== undefined && obj[match] !== null && obj[match] !== '') return String(obj[match]);
    }
    return '';
  }

  // Busca detalhes de ataque na tabela `smeargleAtacksData` ou em window.todosTMs/lookup
  function findAttackDetails(nameOrObj){
    try{
      if(!nameOrObj) return null;
      let name = (typeof nameOrObj === 'string') ? nameOrObj : (nameOrObj.nome || nameOrObj.ATACK || nameOrObj['ATACK'] || nameOrObj.name || '');
      const key = _key(name);
      // tentar múltiplas fontes possíveis: smeargleAtacksData, window.smeargleAtacksData, window.todosAtacks, window.todos
      const altNames = ['smeargleAtacksData','smeargleAtacks','todosAtacks','todosAtacksData','todos','todos_atacks','todos_atacks'];
      let table = [];
      for(const n of altNames){ try{ const v = window[n]; if(Array.isArray(v) && v.length){ table = v; break; } }catch(e){} }
      if(!table.length && typeof smeargleAtacksData !== 'undefined' && Array.isArray(smeargleAtacksData)) table = smeargleAtacksData;
      if(Array.isArray(table) && table.length){
        let found = table.find(a=> _key((a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a.nome||a.NAME||'')+'') === key );
        if(!found){ found = table.find(a=>{ const atn = (a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a.nome||'')+''; const k = _key(atn); return k && key && (k.includes(key) || key.includes(k)); }); }
        if(found) return found;
      }
      // fallback: try todosTMs by name
      try{
        const todos = window.todosTMs || [];
        if(Array.isArray(todos) && todos.length){
          let f = todos.find(x=> _key((x.nome||x['NOME DO TM']||x.NOME||'')+'') === key );
          if(!f) f = todos.find(x=> _key((x.nome||x['NOME DO TM']||'')+'').includes(key) || key.includes(_key((x.nome||x['NOME DO TM']||'')+'')) );
          if(f) return f;
        }
      }catch(e){}
      // última tentativa: procurar em qualquer global que pareça conter ataques (inspecionar chaves do primeiro objeto)
      try{
        for(const k in window){
          try{
            const v = window[k];
            if(Array.isArray(v) && v.length && typeof v[0] === 'object'){
              const keys = Object.keys(v[0]).join(' ').toUpperCase();
              if(/ATACK|ATACK_NAME|POWER|PP|EFEITO|TIPAGEM|NOME/.test(keys)){
                let f = v.find(x=> _key((x['ATACK']||x.nome||x['NOME DO TM']||x.name||'')+'') === key);
                if(!f) f = v.find(x=> _key((x['ATACK']||x.nome||x['NOME DO TM']||x.name||'')+'').includes(key) || key.includes(_key((x['ATACK']||x.nome||x['NOME DO TM']||x.name||'')+'')) );
                if(f) return f;
              }
            }
          }catch(e){}
        }
      }catch(e){}
      return null;
    }catch(e){ return null; }
  }

  // Tenta enriquecer um tile DOM com dados da tabela de ATACKS/TMs usando várias variantes do nome
  function tryEnrichTileFromAttacks(tile, nameOrObj){
    try{
      if(!tile) return;
      var raw = '';
      if(typeof nameOrObj === 'string') raw = nameOrObj;
      else if(nameOrObj && typeof nameOrObj === 'object') raw = (nameOrObj.nome||nameOrObj.name||'')+'';
      if(!raw) return;
      var candidates = [];
      candidates.push(raw);
      candidates.push(raw.replace(/^\s*TM\s*\d+\s*[-:\s]?/i,''));
      if(raw.indexOf('-')!==-1) candidates.push(raw.split('-').slice(1).join('-').trim());
      // dedupe
      candidates = candidates.filter(function(v,i){ return v && candidates.indexOf(v)===i; });

      function applyFound(found){
        try{
          const atAc = _getField(found, 'AÇÃO','ACAO','acao','action','ACTION');
          const atEf = _getField(found, 'EFEITO','efeito','effect','EFFECT');
          const pp   = _getField(found, 'PP','pp');
          const power= _getField(found, 'POWER','power','DANO','dano');
          const acc  = _getField(found, 'ACCURACY','accuracy','PRECISAO','ACURACIA');
          const gen  = _getField(found, 'GEN','gen');
          const tipo = _getField(found, 'TYPE','type','TIPO','tipo','TIPAGEM','tipagem');
          const cat  = _getField(found, 'CATEGORIA','categoria','CATEGORY','category');
          const acEl2 = tile.querySelector('.move-acao'); if(acEl2 && !acEl2.textContent){ acEl2.textContent = atAc; acEl2.style.display = atAc ? 'block' : 'none'; }
          const efEl2 = tile.querySelector('.move-efeito'); if(efEl2 && !efEl2.textContent){ efEl2.textContent = atEf; efEl2.style.display = atEf ? 'block' : 'none'; }
          const statsEl2 = tile.querySelector('.move-stats'); if(statsEl2){ const parts2=[]; if(pp) parts2.push(`<span class="move-stat">PP: <b>${pp}</b></span>`); if(power) parts2.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${power}</b></span>`); if(acc) parts2.push(`<span class="move-stat">Acc: <b>${acc}</b></span>`); if(gen) parts2.push(`<span class="move-stat">Gen: <b>${gen}</b></span>`); statsEl2.innerHTML = parts2.join(' &nbsp; '); statsEl2.style.display = parts2.length ? 'block' : 'none'; }
          if(tipo){ const tipoEl = tile.querySelector('.move-tipo'); if(tipoEl) tipoEl.textContent = tipo; try{ tile.dataset.moveType = tipo.toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g,'').trim(); }catch(e){} }
          if(cat){ const catEl = tile.querySelector('.move-categoria'); if(catEl) catEl.textContent = cat; }
          try{ if(tipo){ const tipoClass = tipo.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,''); tile.className = tile.className.split(/\s+/).filter(c=>!c.startsWith('type-')).join(' ') + ' type-' + tipoClass; } }catch(e){}
        }catch(e){/*ignore*/}
      }

      // tentar match imediato
      for(var n of candidates){ try{ var f = (typeof findAttackDetails==='function')? findAttackDetails(n) : null; if(f){ applyFound(f); return; } }catch(e){}
      }

      // aguardar dados de ATACKS e tentar novamente
      try{ if(typeof ensureAttacksLoaded === 'function'){
        ensureAttacksLoaded(4000).then(function(){ try{ for(var n2 of candidates){ var f2 = (typeof findAttackDetails==='function')? findAttackDetails(n2) : null; if(f2){ applyFound(f2); break; } } }catch(e){} });
      }}catch(e){}
    }catch(e){}
  }

  // Ajusta a altura do painel combinado para igualar ao tamanho do card do Pokémon
  function adjustCombinedPanelHeight(){
    try{
      var card = document.getElementById('smeargleCard');
      // Support multiple panel variants: combinedInnerPanel (builder) or smeargle-moves-panel / movesGrid (smeargle page)
      var inner = document.getElementById('combinedInnerPanel') || document.querySelector('.smeargle-moves-panel') || document.getElementById('movesGrid');
      if(!card || !inner){ return; }
      var cardH = Math.max(120, card.offsetHeight || 200);
      
      inner.style.boxSizing = 'border-box';
      inner.style.height = cardH + 'px';
      inner.style.minHeight = cardH + 'px';
      inner.style.overflow = 'hidden';

      var header = inner.querySelector('h4') || inner.querySelector('.moves-panel-header') || null;
      var headerH = header ? header.offsetHeight : 28;
      var paddingApprox = 28;
      // find moves grid inside inner or fallback to global ids
      var movesGrid = inner.querySelector('#combinedMovesGrid') || inner.querySelector('#movesGrid') || document.getElementById('movesGrid');
      var movesH = Math.max(80, cardH - headerH - paddingApprox);
      if(movesGrid){ movesGrid.style.maxHeight = movesH + 'px'; movesGrid.style.overflowY = 'auto'; }
    }catch(e){ console.warn('adjustCombinedPanelHeight err', e); }
  }

  // chamar no resize e quando a janela for exibida
  try{ window.addEventListener('resize', function(){ try{ setTimeout(adjustCombinedPanelHeight, 40); }catch(e){} }); }catch(e){}

  // Observar mudanças no card para expandir/contrair o painel de ataques em sincronia
  (function observeCombinedPanel(){
    try{
      const card = document.getElementById('smeargleCard');
      const movesGrid = document.getElementById('combinedMovesGrid') || document.getElementById('movesGrid') || document.querySelector('.moves-grid');
      function safeAdjust(){ try{ setTimeout(adjustCombinedPanelHeight, 20); }catch(e){} }
      if(window.ResizeObserver && card){
        try{
        const ro = new ResizeObserver(function(){ safeAdjust(); });
        ro.observe(card);
        if(movesGrid) ro.observe(movesGrid);
        window.__combinedPanelRO = ro;
        
        }catch(e){ /* ignore */ }
      } else if(card){
        try{
        const mo = new MutationObserver(function(m){ safeAdjust(); });
        mo.observe(card, {attributes:true,childList:true,subtree:true});
        if(movesGrid) mo.observe(movesGrid, {childList:true,subtree:true});
        window.__combinedPanelMO = mo;
        
        }catch(e){ /* ignore */ }
      }

      // document-level observer to catch class changes or attribute toggles that may not change layout
      try{
        const docMo = new MutationObserver(function(muts){ safeAdjust(); });
        docMo.observe(document.body, { attributes:true, childList:false, subtree:true });
        window.__combinedPanelDocMO = docMo;
        
      }catch(e){}
    }catch(e){}
  })();

  function renderParsedMoves(parsed){
    // hide old parsed list if present
    const old = safe('parsedMovesList'); if(old) old.style.display = 'none';
    window._builder_parsed = parsed;

    // determine assignments and fill slots as before
    const maxSel = safe('selectMaxBaseMoves') ? parseInt(safe('selectMaxBaseMoves').value,10) : 9;
    const slots = Math.max(9, isNaN(maxSel) ? 9 : maxSel);
    const assignedArr = new Array(slots).fill(null);
    const remaining = [];
      (parsed.moves || []).forEach((mv) => {
      if(mv && mv.slot && Number.isInteger(mv.slot) && mv.slot>=1 && mv.slot<=slots && !assignedArr[mv.slot-1]){
        const origemName = (parsed && parsed.meta && parsed.meta.nome) ? parsed.meta.nome : 'Pokedex';
        assignedArr[mv.slot-1] = { nome: mv.nome, tipo: mv.tipo||'', categoria: mv.categoria||'', origem: origemName, local: `M${mv.slot}` };
        mv.assignedSlot = mv.slot;
      } else {
        remaining.push(mv);
      }
    });
    let remIdx = 0;
    for(let i=0;i<slots;i++){
      if(assignedArr[i]) continue;
      const mv = remaining[remIdx++];
      if(!mv) break;
      const origemName = (parsed && parsed.meta && parsed.meta.nome) ? parsed.meta.nome : 'Pokedex';
      assignedArr[i] = { nome: mv.nome, tipo: mv.tipo||'', categoria: mv.categoria||'', origem: origemName, local: `M${i+1}` };
      mv.assignedSlot = i+1;
    }

    // write assignedArr into global smeargleSelectedMoves
    try {
      if (typeof smeargleSelectedMoves !== 'undefined') smeargleSelectedMoves = assignedArr;
      else window.smeargleSelectedMoves = assignedArr;
    } catch(e){ window.smeargleSelectedMoves = assignedArr; }
    try{ if(typeof scheduleSmeargleUpdate === 'function') scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); else if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle(); }catch(e){}
    try{ if(typeof scheduleSmeargleUpdate === 'function') scheduleSmeargleUpdate({reorder:true,buscar:true}); else { if(typeof reordenarGridMovesOrdenado === 'function') reordenarGridMovesOrdenado(); if(typeof buscarPokemonsCompativeis === 'function') buscarPokemonsCompativeis(); } }catch(e){}

    // render combined moves grid (Smeargle-like)
    const combined = safe('combinedMovesGrid'); if(combined) {
      combined.innerHTML = '';
      (parsed.moves||[]).forEach((mv, idx)=>{
        // mv.slot vem de parsePokedexText; mv.assignedSlot é legado (pode não existir)
        const slotNum = mv.slot || mv.assignedSlot || null;
        const slotLabel = slotNum ? `M${slotNum}` : '';
        const slotBadge = slotLabel ? `<div class="slot-badge">${slotLabel}</div>` : '';
        const card = document.createElement('div');
        card.className = `move-card builder-card type-${(mv.tipo||'').toString().toLowerCase()}`;
        const origemName = (parsed && parsed.meta && parsed.meta.nome) ? parsed.meta.nome : 'Pokedex';
        // use Smeargle-like inner structure so styles apply consistently
        card.innerHTML = `
          <div class="move-tipo-icon"><i class="fas ${getTypeIcon(mv.tipo||mv.type||mv.tipagem||'')}"></i></div>
          <div class="move-name">${mv.nome}</div>
          <div class="move-details">
            <span class="move-tipo">${mv.tipo||''}</span>
            <span class="move-categoria">${mv.categoria?mv.categoria:''}</span>
          </div>
          <div class="move-acao" style="display:none"></div>
          <div class="move-efeito" style="display:none"></div>
          <div class="move-stats" style="margin-top:6px;font-size:12px;opacity:0.9"></div>
          <div class="move-origem">${origemName}</div>
            <div class="move-slot-origem" style="font-size:0.95em;margin-top:6px;">
            <i class="fas fa-hashtag"></i> Slot: <b>${slotLabel}</b>
          </div>
          <div class="move-actions" style="margin-top:8px;display:flex;gap:8px;align-items:center">
            <select id="parsed-slot-${idx}">${[...Array(slots)].map((_,i)=>`<option value="${i+1}" ${slotNum===(i+1)?'selected':''}>M${i+1}</option>`).join('')}</select>
            <button data-idx="${idx}" class="btn-add-parsed">Adicionar</button>
            ${slotBadge}
          </div>
        `;
        // data attributes to help search/filter
        try{
          card.dataset.moveName = mv.nome || mv.name || '';
          card.dataset.moveType = mv.tipo || mv.type || '';
          card.dataset.moveEffect = mv.efeito || mv.effect || mv.EFEITO || '';
          card.dataset.moveCategory = mv.categoria || mv.categoria || '';
          card.dataset.slotBadge = slotLabel; // para filtro de Posição do Move
        }catch(e){}
        // preenche Ação / Efeito / Stats a partir do objeto mv (preferência) ou buscando detalhes na tabela ATACKS/TMs
        try{
          const acEl = card.querySelector('.move-acao');
          const efEl = card.querySelector('.move-efeito');
          const statsEl = card.querySelector('.move-stats');
          // prefer mv properties (podem ter sido preenchidas por applyAttacksToParsed)
          if(acEl){ acEl.textContent = mv.acao || mv.ACAO || mv.action || ''; acEl.style.display = acEl.textContent ? 'block' : 'none'; }
          if(efEl){ efEl.textContent = mv.efeito || mv.EFEITO || mv.effect || ''; efEl.style.display = efEl.textContent ? 'block' : 'none'; }
          if(statsEl){
            const parts = [];
            const ppVal = mv.pp || mv.PP || '';
            const powerVal = mv.power || mv.POWER || mv.Power || '';
            const accVal = mv.accuracy || mv.ACCURACY || '';
            const genVal = mv.gen || mv.GEN || '';
            if(ppVal) parts.push(`<span class="move-stat">PP: <b>${ppVal}</b></span>`);
            if(powerVal) parts.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${powerVal}</b></span>`);
            if(accVal) parts.push(`<span class="move-stat">Acc: <b>${accVal}</b></span>`);
            if(genVal) parts.push(`<span class="move-stat">Gen: <b>${genVal}</b></span>`);
            if(parts.length){ statsEl.innerHTML = parts.join(' &nbsp; '); statsEl.style.display = 'block'; }
          }

          // se ainda faltar informação, tentar buscar na tabela de ataques/TMs
          const needAction = !(acEl && acEl.textContent);
          const needEffect = !(efEl && efEl.textContent);
          const needStats = !(statsEl && statsEl.textContent);
          if(needAction || needEffect || needStats){
            tryEnrichTileFromAttacks(card, mv);
          }
        }catch(e){}
        card.addEventListener('click', function(ev){ if(ev.target && ev.target.classList && ev.target.classList.contains('btn-add-parsed')) return; openCombinedAssignInline(Object.assign({}, mv), slotNum ? slotNum-1 : 0); });
        combined.appendChild(card);
      });
    }

    // render TMs into combined right grid as well
    renderParsedTms(parsed.tms||[]);
    // also populate inline assign (moves list + tms grid) if present
    try{ renderInlineAssign(parsed); }catch(e){}
    // garantir alinhamento da altura do painel combinado com o card do Pokémon
    try{ if(typeof adjustCombinedPanelHeight === 'function'){ setTimeout(adjustCombinedPanelHeight, 60); } }catch(e){}
    // aplicar filtro de busca automaticamente após render (se houver termo na caixa)
    try{ setTimeout(function(){ if(window && typeof window._builderPopulateFilters === 'function') window._builderPopulateFilters(); if(window && typeof window.filterCombinedMoves === 'function') window.filterCombinedMoves(); }, 120); }catch(e){}
  }

  // Re-renderizar os parsed moves quando os dados de ATACKS/TMs estiverem disponíveis
  function refreshParsedMovesAttacks(){
    try{
      if(window._builder_parsed){ renderParsedMoves(window._builder_parsed); }
    }catch(e){ console.warn('refreshParsedMovesAttacks err', e); }
  }
  try{ window.refreshParsedMovesAttacks = refreshParsedMovesAttacks; }catch(e){}

  // Se os dados de ATACKS vierem depois do carregamento deste script, observar e reenfileirar re-render
  (function waitForAttackTable(){
    try{
      if(window.smeargleAtacksData && Array.isArray(window.smeargleAtacksData) && window._builder_parsed){
        try{ refreshParsedMovesAttacks(); }catch(e){}
        return;
      }
      var checks = 0;
      var iv = setInterval(function(){
        checks++;
        if(window.smeargleAtacksData && Array.isArray(window.smeargleAtacksData) && window._builder_parsed){
          try{ refreshParsedMovesAttacks(); }catch(e){}
          clearInterval(iv);
          return;
        }
        if(checks > 25) clearInterval(iv);
      }, 200);
    }catch(e){}
  })();

    function renderInlineAssign(parsed){
      const movesContainer = safe('assignMovesListInline');
      const tmsContainer = safe('assignTmsGridInline');
      if(!movesContainer || !tmsContainer) return;
      movesContainer.innerHTML = '';
      (parsed.moves||[]).forEach((mv,idx)=>{
        const el = document.createElement('div'); el.className='modal-move-item';
        const assigned = mv.assignedSlot ? (`<span class="assigned-slot">M${mv.assignedSlot}</span>`) : '';
        el.innerHTML = `<strong>${mv.nome}</strong><div class="move-sub">${mv.tipo||''} ${mv.categoria?('• '+mv.categoria):''}</div><div style="margin-top:6px">${assigned}</div>`;
        el.addEventListener('click', ()=>{ // select move -> render its TM selection
          const slotIdx = mv.assignedSlot ? mv.assignedSlot-1 : 0;
          const moveObj = (typeof smeargleSelectedMoves !== 'undefined' ? smeargleSelectedMoves[slotIdx] : window.smeargleSelectedMoves && window.smeargleSelectedMoves[slotIdx]) || Object.assign({}, mv, {tms: mv.tms||[]});
          openCombinedAssignInline(moveObj, slotIdx);
        });
        movesContainer.appendChild(el);
      });
      // render all TMs into inline grid (no move selected yet)
      const parsedTms = (parsed.tms||[]);
      const grid = document.createElement('div'); grid.className='tm-grid';
      parsedTms.forEach((tm,i)=>{
        const tile = document.createElement('div'); tile.className='tm-tile move-card builder-card'; tile.dataset.idx=i; tile.dataset.tmName = tm.nome || '';
          // try to detect type for this TM (check multiple datasets: tm object, global todosTMs, smeargleAtacksData)
          (function(){
            let tipo = (tm.tipagem || tm.tipo || tm.type || '').toString().trim();
            // 1) try todosTMs (sheet) by number or by name
            try{
              const todos = window.todosTMs || [];
              if(!tipo && Array.isArray(todos) && todos.length){
                const nm = (tm.nome||'').toString().toLowerCase().trim();
                const byNumber = todos.find(x=> String(x.numero||'') === String(tm.numero||'') );
                const byName = todos.find(x=> (x.nome||'').toString().toLowerCase().trim() === nm || (x.nome||'').toString().toLowerCase().includes(nm) || nm.includes((x.nome||'').toString().toLowerCase().trim()));
                const found = byNumber || byName;
                if(found) tipo = (found.tipagem || found.TIPAGEM || found['TIPAGEM DO TM'] || found.type || found.tipo || '').toString().trim();
              }
            }catch(e){}
            // 2) try smeargleAtacksData (attacks sheet)
            if(!tipo){
              try{
                const lookup = (typeof smeargleAtacksData !== 'undefined') ? smeargleAtacksData : (window.smeargleAtacksData || []);
                if(Array.isArray(lookup) && lookup.length){
                  const nm = (tm.nome||'').toString().toLowerCase().trim();
                  const found = lookup.find(a=> {
                    const atn = (a['ATACK']||a['ATACK_NAME']||a['ATACK_NAME_PT']||a['ATACK_PT']||a['ATACK_BR']||'').toString().toLowerCase().trim();
                    return atn === nm || atn.includes(nm) || nm.includes(atn);
                  });
                  if(found) tipo = (found['TYPE']||found['TYPE_PT']||found['Tipo']||found['TIPO']||found['TIPAGEM']||found['TIPAGEM DO TM']||found.type||found.tipo||'').toString().trim();
                }
              }catch(e){}
            }
            // try to detect type using todosTMs or smeargleAtacksData; fallback to normal
            const tipoClass = (tipo && tipo.toString().trim()) ? tipo.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,'') : 'normal';
            tile.className += ' type-' + tipoClass;
            try{ var tipoNorm = (tipo && tipo.toString().trim()) ? tipo.toString().trim() : 'Normal'; var tipoKey = tipoNorm.toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g,'').trim(); tile.dataset.moveType = tipoKey; }catch(e){}
          })();
            const slotOrig = tm.numero ? tm.numero : '';
            const maxSel = document.getElementById('selectMaxBaseMoves') ? parseInt(document.getElementById('selectMaxBaseMoves').value,10) : 9;
            const slots = Math.max(9, isNaN(maxSel) ? 9 : maxSel);
            const slotOptions = [...Array(slots)].map((_,i)=>`<option value="${i+1}">M${i+1}</option>`).join('');
            var displayTipo = '';
            try{
              const todos = window.todosTMs || [];
              if(!displayTipo && Array.isArray(todos) && todos.length){
                const byNumber = todos.find(x=> String(x.numero||x.NUMERO||x['Número']||x['NUMERO DO TM']||'') === String(tm.numero||''));
                const nm = (tm.nome||'').toString().toLowerCase().trim();
                const byName = todos.find(x=> (x.nome||x['NOME DO TM']||x['NOME']||'').toString().toLowerCase().trim() === nm || (x.nome||'').toString().toLowerCase().includes(nm) || nm.includes((x.nome||'').toString().toLowerCase().trim()));
                const found = byNumber || byName;
                if(found) displayTipo = (found['TIPAGEM DO TM']||found.TIPAGEM||found.tipagem||found.tipo||found.type||found['TIPAGEM_DO_TM']||'').toString().trim();
                if(window.DEBUG_TM_MAP){ console.log('TM map check:', {tm, byNumber, byName, found, displayTipo}); }
              }
            }catch(e){ }
            displayTipo = displayTipo || ((typeof tipo !== 'undefined' && tipo) ? tipo : (tm.tipo||tm.tipagem||'TM'));
            tile.innerHTML = `
              <div class="move-tipo-icon"><i class="fas ${getTypeIcon(displayTipo||tm.tipo||tm.tipagem||'')}"></i></div>
              <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;flex-direction:row;">
                <div class="move-name" style="text-align:center;">${tm.nome}</div>
                <div class="slot-badge" style="font-size:0.85em;background:rgba(255,255,255,0.04);padding:4px 8px;border-radius:8px;color:#ffd700;border:1px solid rgba(255,255,255,0.03);">TM${tm.numero||''}</div>
              </div>
              <div class="move-details">
                <span class="move-tipo">${displayTipo}</span>
                <span class="move-categoria">${tm.categoria||''}</span>
              </div>
              <div class="move-acao" style="display:none"></div>
              <div class="move-efeito" style="display:none"></div>
              <div class="move-stats" style="margin-top:6px;font-size:12px;opacity:0.9"></div>
              <div class="move-origem">${tm.pokemon||''}</div>
              <div class="move-slot-origem" style="font-size:0.95em;margin-top:6px;">
                <i class="fas fa-hashtag"></i> Slot: <b>${slotOrig}</b>
              </div>
              <div class="move-actions">
                <select id="tm-slot-${i}">${slotOptions}</select>
                <button data-idx-tm="${i}" class="btn-add-tm" aria-label="Adicionar TM ${tm.nome || ''}" tabindex="0">Adicionar</button>
              </div>
            `;
            // preencher AÇÃO / EFEITO / STATS a partir de tm, se já disponíveis
            try{
              const acEl = tile.querySelector('.move-acao');
              const efEl = tile.querySelector('.move-efeito');
              const statsEl = tile.querySelector('.move-stats');
              if(acEl){ acEl.textContent = tm.acao || tm.ACAO || tm['AÇÃO'] || ''; acEl.style.display = acEl.textContent ? 'block' : 'none'; }
              if(efEl){ efEl.textContent = tm.efeito || tm.EFEITO || tm['EFEITO'] || ''; efEl.style.display = efEl.textContent ? 'block' : 'none'; }
              if(statsEl){ const parts = []; const pp = tm.pp || tm.PP || ''; const power = tm.power || tm.POWER || tm.DANO || ''; const acc = tm.accuracy || tm.ACCURACY || tm.ACCURACAO || ''; const gen = tm.gen || tm.GEN || ''; if(pp) parts.push(`<span class="move-stat">PP: <b>${pp}</b></span>`); if(power) parts.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${power}</b></span>`); if(acc) parts.push(`<span class="move-stat">Acc: <b>${acc}</b></span>`); if(gen) parts.push(`<span class="move-stat">Gen: <b>${gen}</b></span>`); statsEl.innerHTML = parts.join(' &nbsp; '); statsEl.style.display = parts.length ? 'block' : 'none'; }
            }catch(e){}
        tile.addEventListener('click', ()=>{
          // toggle global selection in builderMeta
          window.builderMeta = window.builderMeta || {tms:[]};
          const name = tile.dataset.tmName;
          const exists = window.builderMeta.tms.find(x=> (x.nome||x).toString().toLowerCase()===name.toLowerCase());
          if(exists){ window.builderMeta.tms = window.builderMeta.tms.filter(x=> (x.nome||x).toString().toLowerCase()!==name.toLowerCase()); tile.classList.remove('selected'); }
          else{ window.builderMeta.tms.push({nome:name}); tile.classList.add('selected'); }
          updateTmCounter();
        });
        grid.appendChild(tile);
      });
      tmsContainer.innerHTML = ''; tmsContainer.appendChild(grid);
    }

  // Enriquece objeto tm com PP/Power/Acc/Ação/Efeito de forma síncrona (busca em todas as fontes disponíveis)
  function _enrichTmFromAvailableData(tm){
    try{
      if(!tm || !tm.nome) return;
      const sources = [
        window.smeargleAtacksData,
        window.__smeargleRawCache && window.__smeargleRawCache.atacks,
        window.todosAtacks,
      ].filter(s => Array.isArray(s) && s.length > 0);
      if(!sources.length) return;
      const name = _key(tm.nome);
      if(!name) return;
      for(const src of sources){
        const found = src.find(a => {
          const atn = _key(_getField(a, 'ATACK','ATACK_NAME','ATACK_PT','ATACK_BR','nome','NAME'));
          return atn === name || (atn && name && (atn.includes(name) || name.includes(atn)));
        });
        if(found){
          if(!tm.pp)       tm.pp       = _getField(found, 'PP', 'pp');
          if(!tm.power)    tm.power    = _getField(found, 'POWER', 'power', 'DANO', 'dano');
          if(!tm.accuracy) tm.accuracy = _getField(found, 'ACCURACY', 'accuracy', 'PRECISAO', 'ACURACIA');
          if(!tm.gen)      tm.gen      = _getField(found, 'GEN', 'gen');
          if(!tm.acao)     tm.acao     = _getField(found, 'AÇÃO', 'ACAO', 'acao', 'action', 'ACTION');
          if(!tm.efeito)   tm.efeito   = _getField(found, 'EFEITO', 'efeito', 'effect', 'EFFECT');
          if(!tm.tipo)     tm.tipo     = _getField(found, 'TYPE', 'type', 'TIPO', 'tipo', 'tipagem', 'TIPAGEM');
          if(!tm.categoria)tm.categoria= _getField(found, 'CATEGORIA', 'categoria', 'CATEGORY', 'category');
          return;
        }
      }
    }catch(e){}
  }

  function renderParsedTms(tms){
    // Injeta TMs direto no combinedMovesGrid (mesma janela dos moves)
    const c = safe('combinedMovesGrid') || safe('builderTmsList'); if(!c) return;
    // Remover TMs e separador anteriores
    Array.from(c.querySelectorAll('[data-is-tm]')).forEach(el=>el.remove());
    Array.from(c.querySelectorAll('.tm-section-separator')).forEach(el=>el.remove());
    if(!tms || tms.length===0) return;
    // Separador de título
    const sep = document.createElement('div');
    sep.className = 'tm-section-separator';
    sep.setAttribute('data-is-tm','1');
    sep.style.cssText = 'grid-column:1/-1;padding:8px 4px 4px;color:#ffd700;font-weight:700;font-size:0.95em;border-top:1px solid rgba(255,215,0,0.2);margin-top:4px;';
    sep.innerHTML = '<i class="fas fa-compact-disc"></i> TMs detectados';
    c.appendChild(sep);
    tms.forEach((tm,i)=>{
      // Enriquecer sincronamente com dados disponíveis ANTES de criar o tile
      _enrichTmFromAvailableData(tm);
      const tile = document.createElement('div'); tile.className='tm-tile move-card builder-card'; tile.dataset.idx=i; tile.dataset.tmName = tm.nome || tm.name || ''; tile.dataset.isTm='1';
      try{
        var _tmNome = tm.nome || tm.name || '';
        var _tmNum  = tm.numero || tm.number || '';
        tile.dataset.moveName     = _tmNome + (_tmNum ? ' TM' + _tmNum : '');
        tile.dataset.moveType     = (tm.tipo||tm.tipagem||tm.type||'');
        tile.dataset.moveEffect   = tm.efeito||'';
        tile.dataset.moveCategory = tm.categoria||'';
        tile.dataset.slotBadge    = ''; // não confundir badge "TM09" com slot de posição
      }catch(e){}
      (function(){
        let tipo = (tm.tipo || tm.tipagem || tm.type || '').toString().trim();
        try{
          const todos = window.todosTMs || [];
          if(!tipo && Array.isArray(todos) && todos.length){
            const nm = (tm.nome||tm.name||'').toString().toLowerCase().trim();
            const byNumber = todos.find(x=> String((x.numero||'') ) === String(tm.numero||''));
            const byName = todos.find(x=> (x['NOME DO TM']||x.nome||'').toString().toLowerCase().trim() === nm || (x['NOME DO TM']||x.nome||'').toString().toLowerCase().includes(nm) || nm.includes(((x['NOME DO TM']||x.nome||'').toString().toLowerCase().trim())));
            const found = byNumber || byName;
            if(found) tipo = (found.tipagem || found.TIPAGEM || found['TIPAGEM DO TM'] || found.type || found.tipo || found['TIPAGEM_DO_TM'] || '').toString().trim();
          }
        }catch(e){}
        if(!tipo){
          try{ const lookup = (typeof smeargleAtacksData !== 'undefined') ? smeargleAtacksData : (window.smeargleAtacksData || []);
            if(Array.isArray(lookup) && lookup.length){ const nm = (tm.nome||tm.name||'').toString().toLowerCase().trim(); const found = lookup.find(a=> { const atn=(a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||'').toString().toLowerCase().trim(); return atn===nm || atn.includes(nm) || nm.includes(atn); }); if(found) tipo=(found['TYPE']||found['type']||found['TIPAGEM']||found['TIPAGEM DO TM']||found.tipo||'').toString().trim(); }
          }catch(e){}
        }
        // try to detect type using todosTMs or smeargleAtacksData; fallback to normal
        const tipoClass2 = (tipo && tipo.toString().trim()) ? tipo.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,'') : 'normal';
        tile.className += ' type-' + tipoClass2;
        try{ var tipoNorm2 = (tipo && tipo.toString().trim()) ? tipo.toString().trim() : (displayTipo2||'TM'); var tipoKey2 = tipoNorm2.toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g,'').trim(); tile.dataset.moveType = tipoKey2; }catch(e){}
      })();
      const slotOrig2 = tm.numero ? tm.numero : '';
      const maxSel2 = document.getElementById('selectMaxBaseMoves') ? parseInt(document.getElementById('selectMaxBaseMoves').value,10) : 9;
      const slots2 = Math.max(9, isNaN(maxSel2) ? 9 : maxSel2);
      const slotOptions2 = [...Array(slots2)].map((_,i)=>`<option value="${i+1}">M${i+1}</option>`).join('');
      var displayTipo2 = '';
      try{
        const todos = window.todosTMs || [];
        if(!displayTipo2 && Array.isArray(todos) && todos.length){
          const byNumber = todos.find(x=> String(x.numero||x.NUMERO||x['Número']||x['NUMERO DO TM']||'') === String(tm.numero||''));
          const nm = (tm.nome||'').toString().toLowerCase().trim();
          const byName = todos.find(x=> (x.nome||x['NOME DO TM']||x['NOME']||'').toString().toLowerCase().trim() === nm || (x.nome||'').toString().toLowerCase().includes(nm) || nm.includes((x.nome||'').toString().toLowerCase().trim()));
          const found = byNumber || byName;
          if(found) displayTipo2 = (found['TIPAGEM DO TM']||found.TIPAGEM||found.tipagem||found.tipo||found.type||found['TIPAGEM_DO_TM']||'').toString().trim();
          if(window.DEBUG_TM_MAP){ console.log('TM map check parsedTms:', {tm, byNumber, byName, found, displayTipo2}); }
        }
      }catch(e){}
      displayTipo2 = displayTipo2 || ((typeof tipo !== 'undefined' && tipo) ? tipo : (tm.tipo||tm.tipagem||'TM'));
      tile.innerHTML = `
        <div class="move-tipo-icon"><i class="fas ${getTypeIcon(displayTipo2||tm.tipo||tm.tipagem||'')}"></i></div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;flex-direction:row;">
          <div class="move-name" style="text-align:center;">${tm.nome}</div>
          <div class="slot-badge" style="font-size:0.85em;background:rgba(255,255,255,0.04);padding:4px 8px;border-radius:8px;color:#ffd700;border:1px solid rgba(255,255,255,0.03);">TM${tm.numero||''}</div>
        </div>
        <div class="move-details">
            <span class="move-tipo">${displayTipo2}</span>
            <span class="move-categoria">${tm.categoria||''}</span>
          </div>
        <div class="move-acao" style="display:none"></div>
        <div class="move-efeito" style="display:none"></div>
        <div class="move-stats" style="margin-top:6px;font-size:12px;opacity:0.9"></div>
        <div class="move-origem" style="display:none">${tm.pokemon||''}</div>
        <div class="move-slot-origem">
          <i class="fas fa-hashtag"></i> Slot: <b>${slotOrig2}</b>
        </div>
        <div class="move-actions">
          <select id="tm-slot-parsed-${i}">${slotOptions2}</select>
          <button data-idx-tm="${i}" class="btn-add-tm" aria-label="Adicionar TM ${tm.nome || ''}" tabindex="0">Adicionar</button>
        </div>
      `;
      tile.tabIndex=0; tile.setAttribute('role','button');
      // preencher stats diretamente dos campos do objeto tm (já enriquecido por applyAttacksToParsed)
      try{
        const acEl = tile.querySelector('.move-acao');
        const efEl = tile.querySelector('.move-efeito');
        const statsEl = tile.querySelector('.move-stats');
        if(acEl){ acEl.textContent = tm.acao||tm.ACAO||tm['AÇÃO']||''; acEl.style.display = acEl.textContent ? 'block':'none'; }
        if(efEl){ efEl.textContent = tm.efeito||tm.EFEITO||tm['EFEITO']||''; efEl.style.display = efEl.textContent ? 'block':'none'; }
        if(statsEl){
          const parts=[];
          const pp    = tm.pp||tm.PP||'';
          const power = tm.power||tm.POWER||tm.DANO||'';
          const acc   = tm.accuracy||tm.ACCURACY||'';
          const gen   = tm.gen||tm.GEN||'';
          if(pp)    parts.push(`<span class="move-stat">PP: <b>${pp}</b></span>`);
          if(power) parts.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${power}</b></span>`);
          if(acc)   parts.push(`<span class="move-stat">Acc: <b>${acc}</b></span>`);
          if(gen)   parts.push(`<span class="move-stat">Gen: <b>${gen}</b></span>`);
          if(parts.length){ statsEl.innerHTML = parts.join(' &nbsp; '); statsEl.style.display='block'; }
        }
      }catch(e){}
      // se os campos ainda estiverem vazios, buscar da tabela de ataques (primeiro render antes do enriquecimento)
      try{ tryEnrichTileFromAttacks(tile, tm); }catch(e){}
      tile.addEventListener('click', ()=>{
        window.builderMeta = window.builderMeta || {tms:[]};
        const name = tile.dataset.tmName;
        const exists = window.builderMeta.tms.find(x=> (x.nome||x).toString().toLowerCase()===name.toLowerCase());
        if(exists){ window.builderMeta.tms = window.builderMeta.tms.filter(x=> (x.nome||x).toString().toLowerCase()!==name.toLowerCase()); tile.classList.remove('selected'); }
        else{ window.builderMeta.tms.push({nome:name}); tile.classList.add('selected'); }
        updateTmCounter();
      });
      c.appendChild(tile);
    });
    // Re-enriquecimento em lote: aguardar dados carregarem e atualizar tiles sem stats
    (function schedulePostRenderEnrich(){
      try{
        ensureAttacksLoaded(8000).then(function(atacksSrc){
          try{
            if(!Array.isArray(atacksSrc) || !atacksSrc.length) return;
            const container = safe('combinedMovesGrid') || safe('builderTmsList');
            if(!container) return;
            container.querySelectorAll('[data-is-tm="1"].tm-tile').forEach(function(t){
              try{
                const statsEl = t.querySelector('.move-stats');
                if(statsEl && statsEl.children.length > 0) return; // já tem stats
                const name = _key(t.dataset.tmName || t.dataset.moveName || '');
                if(!name) return;
                const found = atacksSrc.find(function(a){
                  const atn = _key(_getField(a,'ATACK','ATACK_NAME','ATACK_PT','ATACK_BR','nome','NAME'));
                  return atn===name || (atn&&name&&(atn.includes(name)||name.includes(atn)));
                });
                if(!found) return;
                const pp    = _getField(found,'PP','pp');
                const power = _getField(found,'POWER','power','DANO','dano');
                const acc   = _getField(found,'ACCURACY','accuracy','PRECISAO','ACURACIA');
                const gen   = _getField(found,'GEN','gen');
                const acao  = _getField(found,'AÇÃO','ACAO','acao','action','ACTION');
                const efeito= _getField(found,'EFEITO','efeito','effect','EFFECT');
                const acEl = t.querySelector('.move-acao');
                const efEl = t.querySelector('.move-efeito');
                if(acEl && acao){ acEl.textContent = acao; acEl.style.display='block'; }
                if(efEl && efeito){ efEl.textContent = efeito; efEl.style.display='block'; }
                if(statsEl){
                  const parts=[];
                  if(pp)    parts.push('<span class="move-stat">PP: <b>'+pp+'</b></span>');
                  if(power) parts.push('<span class="move-stat move-stat-power">Pow: <b class="power-value">'+power+'</b></span>');
                  if(acc)   parts.push('<span class="move-stat">Acc: <b>'+acc+'</b></span>');
                  if(gen)   parts.push('<span class="move-stat">Gen: <b>'+gen+'</b></span>');
                  if(parts.length){ statsEl.innerHTML = parts.join(' &nbsp; '); statsEl.style.display='block'; }
                }
              }catch(ex){}
            });
          }catch(ex){}
        });
      }catch(e){}
    })();
    try{ setTimeout(function(){ if(window && typeof window._builderPopulateFilters === 'function') window._builderPopulateFilters(); if(window && typeof window.filterCombinedMoves === 'function') window.filterCombinedMoves(); }, 90); }catch(e){}
  }

  // Render TM grid into a given container for assigning to a specific moveObj
  function renderTmGridForMove(container, tms, moveObj){
    if(!container) return;
    container.innerHTML = '';
    if(!tms || tms.length===0){ container.innerHTML = '<div style="opacity:0.8">Nenhum TM detectado</div>'; return; }
    const grid = document.createElement('div'); grid.className='tm-grid';
    moveObj.tms = moveObj.tms || [];
    tms.forEach((tm,i)=>{
      const tile = document.createElement('div'); tile.className='tm-tile move-card builder-card'; tile.dataset.idx=i; tile.dataset.tmName = tm.nome || tm.name || '';
      (function(){
        let tipo = (tm.tipagem || tm.tipo || tm.type || '').toString().trim();
        try{
          const todos = window.todosTMs || [];
          if(!tipo && Array.isArray(todos) && todos.length){
            const nm = (tm.nome||tm.name||'').toString().toLowerCase().trim();
            const byNumber = todos.find(x=> String((x.numero||'')) === String(tm.numero||''));
            const byName = todos.find(x=> (x['NOME DO TM']||x.nome||'').toString().toLowerCase().trim() === nm || (x['NOME DO TM']||x.nome||'').toString().toLowerCase().includes(nm) || nm.includes(((x['NOME DO TM']||x.nome||'').toString().toLowerCase().trim())));
            const found = byNumber || byName;
            if(found) tipo = (found.tipagem || found.TIPAGEM || found['TIPAGEM DO TM'] || found.type || found.tipo || found['TIPAGEM_DO_TM'] || '').toString().trim();
          }
        }catch(e){}
        if(!tipo){
          try{ const lookup = (typeof smeargleAtacksData !== 'undefined') ? smeargleAtacksData : (window.smeargleAtacksData || []);
            if(Array.isArray(lookup) && lookup.length){
              const nm=(tm.nome||tm.name||'').toString().toLowerCase().trim();
              const found=lookup.find(a=> {
                const atn=(a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||'').toString().toLowerCase().trim();
                return atn===nm || atn.includes(nm) || nm.includes(atn);
              });
              if(found) tipo=(found['TYPE']||found['type']||found['TIPAGEM']||found['TIPAGEM DO TM']||found.tipo||'').toString().trim();
            }
          }catch(e){}
        }
        // try to detect type using todosTMs or smeargleAtacksData; fallback to normal
        const tipoClass3 = (tipo && tipo.toString().trim()) ? tipo.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,'') : 'normal';
        tile.className += ' type-' + tipoClass3;
      })();
      const isSel = moveObj.tms.find(x=> (x.nome||x).toString().toLowerCase()===(tile.dataset.tmName||'').toLowerCase());
      if(isSel) tile.classList.add('selected');
      const slotOrig3 = tm.numero ? tm.numero : '';
      const maxSel3 = document.getElementById('selectMaxBaseMoves') ? parseInt(document.getElementById('selectMaxBaseMoves').value,10) : 9;
      const slots3 = Math.max(9, isNaN(maxSel3) ? 9 : maxSel3);
      const slotOptions3 = [...Array(slots3)].map((_,i)=>`<option value="${i+1}">M${i+1}</option>`).join('');
      var displayTipo3 = '';
      try{
        const todos = window.todosTMs || [];
        if(!displayTipo3 && Array.isArray(todos) && todos.length){
          const byNumber = todos.find(x=> String(x.numero||x.NUMERO||x['Número']||x['NUMERO DO TM']||'') === String(tm.numero||''));
          const nm = (tm.nome||'').toString().toLowerCase().trim();
          const byName = todos.find(x=> (x.nome||x['NOME DO TM']||x['NOME']||'').toString().toLowerCase().trim() === nm || (x.nome||'').toString().toLowerCase().includes(nm) || nm.includes((x.nome||'').toString().toLowerCase().trim()));
          const found = byNumber || byName;
          if(found) displayTipo3 = (found['TIPAGEM DO TM']||found.TIPAGEM||found.tipagem||found.tipo||found.type||found['TIPAGEM_DO_TM']||'').toString().trim();
          if(window.DEBUG_TM_MAP){ console.log('TM map check renderTmGridForMove:', {tm, byNumber, byName, found, displayTipo3}); }
        }
      }catch(e){}
      displayTipo3 = displayTipo3 || ((typeof tipo !== 'undefined' && tipo) ? tipo : (tm.tipo||tm.tipagem||'TM'));
      tile.innerHTML = `
        <div class="move-tipo-icon"><i class="fas ${getTypeIcon(displayTipo3||tm.tipo||tm.tipagem||'')}"></i></div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;flex-direction:row;">
          <div class="move-name" style="text-align:center;">${tm.nome}</div>
          <div class="slot-badge" style="font-size:0.85em;background:rgba(255,255,255,0.04);padding:4px 8px;border-radius:8px;color:#ffd700;border:1px solid rgba(255,255,255,0.03);">TM${tm.numero||''}</div>
        </div>
        <div class="move-details">
          <span class="move-tipo">${displayTipo3}</span>
          <span class="move-categoria">${tm.categoria||''}</span>
        </div>
        <div class="move-acao" style="display:none"></div>
        <div class="move-efeito" style="display:none"></div>
        <div class="move-stats" style="margin-top:6px;font-size:12px;opacity:0.9"></div>
        <div class="move-origem">${tm.pokemon||''}</div>
        <div class="move-slot-origem">
          <i class="fas fa-hashtag"></i> Slot: <b>${slotOrig3}</b>
        </div>
        <div class="move-actions">
          <select id="tm-slot-formove-${i}">${slotOptions3}</select>
          <button data-idx-tm="${i}" class="btn-add-tm" aria-label="Adicionar TM ${tm.nome || ''}" tabindex="0">Adicionar</button>
        </div>
      `;
            // preencher AÇÃO / EFEITO / STATS a partir de tm, se já disponíveis
            try{
              const acEl = tile.querySelector('.move-acao');
              const efEl = tile.querySelector('.move-efeito');
              const statsEl = tile.querySelector('.move-stats');
              if(acEl){ acEl.textContent = tm.acao || tm.ACAO || tm['AÇÃO'] || ''; acEl.style.display = acEl.textContent ? 'block' : 'none'; }
              if(efEl){ efEl.textContent = tm.efeito || tm.EFEITO || tm['EFEITO'] || ''; efEl.style.display = efEl.textContent ? 'block' : 'none'; }
              if(statsEl){ const parts = []; const pp = tm.pp || tm.PP || ''; const power = tm.power || tm.POWER || tm.DANO || ''; const acc = tm.accuracy || tm.ACCURACY || tm.ACCURACAO || ''; const gen = tm.gen || tm.GEN || ''; if(pp) parts.push(`<span class="move-stat">PP: <b>${pp}</b></span>`); if(power) parts.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${power}</b></span>`); if(acc) parts.push(`<span class="move-stat">Acc: <b>${acc}</b></span>`); if(gen) parts.push(`<span class="move-stat">Gen: <b>${gen}</b></span>`); statsEl.innerHTML = parts.join(' &nbsp; '); statsEl.style.display = parts.length ? 'block' : 'none'; }
            }catch(e){}
        // tentar enriquecer tile usando variantes do nome e aguardando tabela de ATACKS caso necessário
        try{ tryEnrichTileFromAttacks(tile, tm); }catch(e){}
      tile.tabIndex=0; tile.setAttribute('role','button');
      tile.addEventListener('click', ()=>{
        const name = tile.dataset.tmName;
        const exists = moveObj.tms.find(x=> (x.nome||x).toString().toLowerCase()===name.toLowerCase());
        if(exists){ moveObj.tms = moveObj.tms.filter(x=> (x.nome||x).toString().toLowerCase()!==name.toLowerCase()); tile.classList.remove('selected'); }
        else{ moveObj.tms.push({nome:name, numero: tm.numero||''}); tile.classList.add('selected'); }
      });
      grid.appendChild(tile);
    });
    container.appendChild(grid);
    try{ setTimeout(function(){ if(window && typeof window._builderPopulateFilters === 'function') window._builderPopulateFilters(); if(window && typeof window.filterCombinedMoves === 'function') window.filterCombinedMoves(); }, 80); }catch(e){}
  }

  function updateTmCounter(){ const el = safe('tmCountVal'); if(!el) return; const n = (window.builderMeta && Array.isArray(window.builderMeta.tms))?window.builderMeta.tms.length:0; el.textContent = n; }

  // Atualiza tipagens exibidas nos tiles de TM já renderizados.
  function refreshTmTypes(){
    try{
      console.log('refreshTmTypes: todosTMs=', (window.todosTMs||[]).length, ' smeargleAtacksData=', (window.smeargleAtacksData||[]).length);
      const todos = window.todosTMs || [];
      const tiles = Array.from(document.querySelectorAll('.tm-tile'));
      if(!tiles.length) return;
      // se ainda não há dados, aguardar curto período e tentar novamente (uma vez)
      if((!todos || todos.length===0) && !refreshTmTypes._retry){
        refreshTmTypes._retry = true;
        setTimeout(refreshTmTypes, 800);
        return;
      }
      tiles.forEach(tile=>{
        try{
          const name = (tile.dataset.tmName||'').toString();
          const idx = tile.dataset.idx ? parseInt(tile.dataset.idx,10) : null;
          // extrair o texto de nome exibido
          const nameText = (tile.querySelector('.move-name')||{textContent:''}).textContent || name;
          const displayName = nameText.toString().trim();
          // tentar achar por numero (badge) ou por nome
          const badge = (tile.querySelector('.slot-badge')||{textContent:''}).textContent || '';
          const tmNumero = (badge.match(/\d+/)||[])[0] || '';
          let found = null;
          try{
            // use buildTmLookup if available for robust number/name matching
            const lookup = (typeof buildTmLookup === 'function') ? buildTmLookup() : null;
            if(lookup){
              if(tmNumero && lookup.byNumber && lookup.byNumber.has(String(tmNumero))){ found = lookup.byNumber.get(String(tmNumero)); }
              if(!found){
                const nm = (typeof _key === 'function') ? _key(displayName) : (displayName||'').toString().toLowerCase().trim();
                // try exact name using normalized key
                if(lookup.byName && lookup.byName.has(nm)) found = lookup.byName.get(nm);
                // try fuzzy includes
                if(!found && lookup.raw && Array.isArray(lookup.raw)){
                  const rawFound = lookup.raw.find(x=>{
                    try{
                      const nval = (typeof _key === 'function') ? _key((x.nome||x['NOME DO TM']||x.NOME||'')+ '') : ((x.nome||x['NOME DO TM']||x.NOME||'')+ '').toString().toLowerCase();
                      const numval = String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'');
                      if(tmNumero && numval && numval === String(tmNumero)) return true;
                      if(nval && nm && (nval === nm || nval.includes(nm) || nm.includes(nval))) return true;
                    }catch(e){}
                    return false;
                  });
                  if(rawFound) found = rawFound;
                }
              }
            } else {
              if(tmNumero) found = todos.find(x=> String(x.numero||x.NUMERO||x['NUMERO DO TM']||'') === String(tmNumero));
              if(!found){
                const nm = displayName.toLowerCase().trim();
                found = todos.find(x=> ((x.nome||x['NOME DO TM']||x.NOME||'')+ '').toString().toLowerCase().trim() === nm || (((x.nome||x['NOME DO TM']||'')+ '').toString().toLowerCase().includes(nm)) || (nm.includes(((x.nome||x['NOME DO TM']||'')+ '').toString().toLowerCase().trim())) );
              }
            }
          }catch(e){ console.warn('refreshTmTypes lookup error', e); }
          if(found){
            const tip = (found['TIPAGEM DO TM']||found.TIPAGEM||found.tipagem||found.tipo||found.type||'').toString().trim() || '';
            const tipoText = tip || 'TM';
            const tipoEl = tile.querySelector('.move-tipo');
            if(tipoEl) tipoEl.textContent = tipoText;
            // atualizar classe de tipo
            const tipoClass = (tip && tip.toString().trim()) ? tip.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,'') : 'normal';
            // remover classes type-* existentes
            tile.className = tile.className.split(/\s+/).filter(c=>!c.startsWith('type-')).join(' ') + ' type-' + tipoClass;
            try{ var tk = (tip && tip.toString().trim()) ? tip.toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g,'').trim() : 'tm'; tile.dataset.moveType = tk; }catch(e){}

            // preencher ação / efeito
            try{
              const action = (found['AÇÃO']||found['ACAO']||found.ACAO||found['AÇÃO DO GOLPE']||found.acao||found.action||found['ACTION']||found.ACTION||'')+'';
              const effect = (found['EFEITO']||found.EFEITO||found.efeito||found['Efeito']||found.effect||found.EFFECT||'')+'';
              const acEl = tile.querySelector('.move-acao');
              const efEl = tile.querySelector('.move-efeito');
              if(acEl){ acEl.textContent = action ? action.trim() : ''; acEl.style.display = action ? 'block' : 'none'; }
              if(efEl){ efEl.textContent = effect ? effect.trim() : ''; efEl.style.display = effect ? 'block' : 'none'; }

              // preencher stats: PP / POWER / ACCURACY / GEN
              const pp = (found['PP']||found.pp||found.PP_DO_GOLPE||found['PP DO GOLPE']||'')+'';
              const power = (found['POWER']||found.power||found.DANO||found['DANO']||'')+'';
              const accuracy = (found['ACCURACY']||found.accuracy||found.ACCURACY||found['ACURACIDADE']||found.ACURACAO||found.ACC||found['PRECISAO']||'')+'';
              const gen = (found['GEN']||found.GEN||found['Geração']||found['GERACAO']||found.GENERATION||'')+'';
              const statsEl = tile.querySelector('.move-stats');
              if(statsEl){
                const parts = [];
                if(pp && pp.toString().trim()) parts.push(`<span class="move-stat">PP: <b>${pp.toString().trim()}</b></span>`);
                if(power && power.toString().trim()) parts.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${power.toString().trim()}</b></span>`);
                if(accuracy && accuracy.toString().trim()) parts.push(`<span class="move-stat">Acc: <b>${accuracy.toString().trim()}</b></span>`);
                if(gen && gen.toString().trim()) parts.push(`<span class="move-stat">Gen: <b>${gen.toString().trim()}</b></span>`);
                statsEl.innerHTML = parts.join(' &nbsp; ');
                statsEl.style.display = parts.length ? 'block' : 'none';
              }
            }catch(e){}
          } else {
            // se não achou na lista de TMs, tentar procurar nos dados de ataques (smeargleAtacksData)
            try{
              const lookup = (typeof smeargleAtacksData !== 'undefined') ? smeargleAtacksData : (window.smeargleAtacksData || []);
              if(Array.isArray(lookup) && lookup.length){
                const nm = displayName.toLowerCase().trim();
                const foundAtk = lookup.find(a=>{
                  try{
                    const atn = ((a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a['ATACK_BR']||a['ATACK_NAME_PT']||'')+'').toString().toLowerCase().trim();
                    return atn===nm || atn.includes(nm) || nm.includes(atn);
                  }catch(e){return false}
                });
                if(foundAtk){
                  // preencher ação / efeito a partir dos dados de ataque
                  try{
                    const action = (foundAtk['AÇÃO']||foundAtk.ACAO||foundAtk.acao||foundAtk.action||'')+'';
                    const effect = (foundAtk['EFEITO']||foundAtk.EFEITO||foundAtk.efeito||foundAtk.effect||'')+'';
                    const acEl = tile.querySelector('.move-acao');
                    const efEl = tile.querySelector('.move-efeito');
                    if(acEl){ acEl.textContent = action ? action.trim() : ''; acEl.style.display = action ? 'block' : 'none'; }
                    if(efEl){ efEl.textContent = effect ? effect.trim() : ''; efEl.style.display = effect ? 'block' : 'none'; }
                  }catch(e){}
                  try{
                    const pp = (foundAtk['PP']||foundAtk.pp||'')+'';
                    const power = (foundAtk['POWER']||foundAtk.power||foundAtk.DANO||foundAtk.DANO||'')+'';
                    const accuracy = (foundAtk['ACCURACY']||foundAtk.accuracy||foundAtk.ACCURACAO||'')+'';
                    const gen = (foundAtk['GEN']||foundAtk.GEN||'')+'';
                    const statsEl = tile.querySelector('.move-stats');
                    if(statsEl){
                      const parts = [];
                      if(pp && pp.toString().trim()) parts.push(`<span class="move-stat">PP: <b>${pp.toString().trim()}</b></span>`);
                      if(power && power.toString().trim()) parts.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${power.toString().trim()}</b></span>`);
                      if(accuracy && accuracy.toString().trim()) parts.push(`<span class="move-stat">Acc: <b>${accuracy.toString().trim()}</b></span>`);
                      if(gen && gen.toString().trim()) parts.push(`<span class="move-stat">Gen: <b>${gen.toString().trim()}</b></span>`);
                      statsEl.innerHTML = parts.join(' &nbsp; ');
                      statsEl.style.display = parts.length ? 'block' : 'none';
                    }
                  }catch(e){}
                  // também atualizar tipagem se disponível
                  try{
                    const tip2 = (foundAtk['TYPE']||foundAtk.type||foundAtk.TIPO||foundAtk['TIPAGEM']||'')+'';
                    if(tip2 && tile.querySelector('.move-tipo')) tile.querySelector('.move-tipo').textContent = tip2;
                    if(tip2){ const tipoClass2 = tip2.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,''); tile.className = tile.className.split(/\s+/).filter(c=>!c.startsWith('type-')).join(' ') + ' type-' + tipoClass2; try{ tile.dataset.moveType = tip2.toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g,'').trim(); }catch(e){} }
                  }catch(e){}
                }
              }
            }catch(e){}
          }
        }catch(e){}
      });
    }catch(e){ console.error('refreshTmTypes error', e); }
  }
  window.refreshTmTypes = refreshTmTypes;

  // Atualiza os cards combinados (combinedMovesGrid) preenchendo AÇÃO / EFEITO / STATS
  function refreshParsedMovesAttacks(){
    try{
      const lookup = (typeof smeargleAtacksData !== 'undefined') ? smeargleAtacksData : (window.smeargleAtacksData || []);
      console.log('refreshParsedMovesAttacks: smeargleAtacksData length=', (lookup||[]).length);
      if(!Array.isArray(lookup) || lookup.length===0) return;
      // atualizar combined moves
      const combined = safe('combinedMovesGrid');
      if(combined){
        const cards = Array.from(combined.querySelectorAll('.move-card'));
        cards.forEach(card=>{
          try{
            const nameEl = card.querySelector('.move-name');
            const name = nameEl ? (nameEl.textContent||'').toString().trim() : '';
            if(!name) return;
            const nm = name.toLowerCase().trim();
            const found = lookup.find(a=>{ const atn = ((a['ATACK']||a['ATACK_NAME']||a['ATACK_PT']||a['ATACK_BR']||'')+'').toString().toLowerCase().trim(); return atn===nm || atn.includes(nm) || nm.includes(atn); });
            if(found){
              const acEl = card.querySelector('.move-acao'); if(acEl){ acEl.textContent = (found['AÇÃO']||found.ACAO||found.acao||found.action||'')+''; acEl.style.display = acEl.textContent ? 'block' : 'none'; }
              const efEl = card.querySelector('.move-efeito'); if(efEl){ efEl.textContent = (found['EFEITO']||found.EFEITO||found.efeito||found.effect||'')+''; efEl.style.display = efEl.textContent ? 'block' : 'none'; }
              const statsEl = card.querySelector('.move-stats'); if(statsEl){ const pp = (found['PP']||found.pp||'')+''; const power = (found['POWER']||found.power||found.DANO||'')+''; const accuracy = (found['ACCURACY']||found.accuracy||found.ACCURACAO||'')+''; const gen = (found['GEN']||found.GEN||'')+''; const parts = []; if(pp) parts.push(`<span class="move-stat">PP: <b>${pp}</b></span>`); if(power) parts.push(`<span class="move-stat move-stat-power">Pow: <b class="power-value">${power}</b></span>`); if(accuracy) parts.push(`<span class="move-stat">Acc: <b>${accuracy}</b></span>`); if(gen) parts.push(`<span class="move-stat">Gen: <b>${gen}</b></span>`); statsEl.innerHTML = parts.join(' &nbsp; '); statsEl.style.display = parts.length ? 'block' : 'none'; }
              // tipo
                try{ const tip2 = (found['TYPE']||found.type||found.TIPO||found['TIPAGEM']||'')+''; if(tip2 && card.querySelector('.move-tipo')) card.querySelector('.move-tipo').textContent = tip2; if(tip2){ const tipoClass2 = tip2.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,''); card.className = card.className.split(/\s+/).filter(c=>!c.startsWith('type-')).join(' ') + ' type-' + tipoClass2; try{ card.dataset.moveType = tip2.toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g,'').trim(); }catch(e){} } }catch(e){}
            }
          }catch(e){}
        });
      }
      // também atualizar TMs (reusar existente)
      try{ if(typeof refreshTmTypes === 'function') refreshTmTypes(); }catch(e){}
    }catch(e){ console.error('refreshParsedMovesAttacks error', e); }
  }
  window.refreshParsedMovesAttacks = refreshParsedMovesAttacks;

  // Garante que smeargleAtacksData esteja carregado; tenta retryFetchAttacks se necessário
  function ensureAttacksLoaded(timeoutMs = 5000){
    return new Promise(async (resolve, reject)=>{
      try{
        if(Array.isArray(window.smeargleAtacksData) && window.smeargleAtacksData.length>0) return resolve(window.smeargleAtacksData);
        // usar cache bruto do smeargle se disponível (pre-fetch roda 2s após page load)
        if(window.__smeargleRawCache && Array.isArray(window.__smeargleRawCache.atacks) && window.__smeargleRawCache.atacks.length){
          window.smeargleAtacksData = window.__smeargleRawCache.atacks;
          return resolve(window.smeargleAtacksData);
        }
        // buscar diretamente do Apps Script se nenhum dado disponível
        try{
          const base = window.SHEETS_BASE_URL || window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';
          const resp = await fetch(base + '?acao=obter_atacks&page=1&limit=10000');
          if(resp.ok){
            const data = await resp.json().catch(()=>null);
            let arr = [];
            if(Array.isArray(data)) arr = data;
            else if(data && Array.isArray(data.data)) arr = data.data;
            if(arr.length){ window.smeargleAtacksData = arr; return resolve(arr); }
          }
        }catch(e){}
        // aguardar curto período até que dados apareçam (smeargle pode carregar em paralelo)
        const start = Date.now();
        (function waitFor(){
          if(Array.isArray(window.smeargleAtacksData) && window.smeargleAtacksData.length>0) return resolve(window.smeargleAtacksData);
          if(window.__smeargleRawCache && Array.isArray(window.__smeargleRawCache.atacks) && window.__smeargleRawCache.atacks.length){
            window.smeargleAtacksData = window.__smeargleRawCache.atacks; return resolve(window.smeargleAtacksData);
          }
          if(Date.now() - start > timeoutMs) return resolve(window.smeargleAtacksData || []);
          setTimeout(waitFor, 120);
        })();
      }catch(e){ resolve(window.smeargleAtacksData || []); }
    });
  }
  window.ensureAttacksLoaded = ensureAttacksLoaded;

  // Aplica dados de smeargleAtacksData ao objeto parsed (moves + tms) e atualiza UI
  async function applyAttacksToParsed(parsed){
    if(!parsed) parsed = window._builder_parsed || null;
    if(!parsed) return;
    const lookup = await ensureAttacksLoaded(5000) || [];
    // combinar com window.todosAtacks (populado pelo script.js)
    const extraSrc = (window.todosAtacks && Array.isArray(window.todosAtacks)) ? window.todosAtacks : [];
    const allSrc = lookup.length ? lookup : extraSrc;
    if(!Array.isArray(allSrc) || allSrc.length===0) return;

    function enrichObj(obj){
      try{
        const name = _key(obj.nome||'');
        if(!name) return;
        const found = allSrc.find(a=>{ const atn = _key(_getField(a,'ATACK','ATACK_NAME','ATACK_PT','ATACK_BR','nome','NAME')); return atn===name || (atn&&name&&(atn.includes(name)||name.includes(atn))); });
        if(found){
          if(!obj.pp)       obj.pp       = _getField(found, 'PP', 'pp');
          if(!obj.power)    obj.power    = _getField(found, 'POWER', 'power', 'DANO', 'dano');
          if(!obj.accuracy) obj.accuracy = _getField(found, 'ACCURACY', 'accuracy', 'PRECISAO', 'ACURACIA');
          if(!obj.gen)      obj.gen      = _getField(found, 'GEN', 'gen');
          if(!obj.acao)     obj.acao     = _getField(found, 'AÇÃO', 'ACAO', 'acao', 'action', 'ACTION');
          if(!obj.efeito)   obj.efeito   = _getField(found, 'EFEITO', 'efeito', 'effect', 'EFFECT');
          if(!obj.tipo)     obj.tipo     = _getField(found, 'TYPE', 'type', 'TIPO', 'tipo', 'tipagem', 'TIPAGEM');
          if(!obj.categoria)obj.categoria= _getField(found, 'CATEGORIA', 'categoria', 'CATEGORY', 'category');
        }
      }catch(e){}
    }
    try{
      (parsed.moves||[]).forEach(enrichObj);
      (parsed.tms||[]).forEach(enrichObj);
      // re-render tudo
      try{ renderParsedMoves(parsed); }catch(e){}
      try{ renderParsedTms(parsed.tms||[]); }catch(e){}
      try{ if(window.refreshParsedMovesAttacks) window.refreshParsedMovesAttacks(); if(window.refreshTmTypes) window.refreshTmTypes(); }catch(e){}
    }catch(e){ console.error('applyAttacksToParsed error', e); }
  }
  window.applyAttacksToParsed = applyAttacksToParsed;

  // Expor parse/save para outras abas (Pokedex / Smeargle)
  try{
    window.parsePokedexText = parsePokedexText;
    window.savePokedexMovesToSheet = savePokedexMovesToSheet;
  }catch(e){}

  // ENVIAR MOVE7: ler da área de transferência e apresentar os golpes parseados
  const enviarBtnHandler = async function() {
    try{
      console.log('ENVIAR MOVE7 clicked');
      let txt = '';
      try{
        if(navigator.clipboard && navigator.clipboard.readText) txt = await navigator.clipboard.readText();
      }catch(e){ /* ignorar */ }
      if(!txt) txt = prompt('Cole o texto da Pokedex aqui:');
      if(!txt) { if(window.showToast) window.showToast('Nenhum texto fornecido','error'); return; }
      const parsed = parsePokedexText(txt);
      if(!parsed || !parsed.moves || parsed.moves.length===0){ if(window.showToast) window.showToast('Nenhum golpe detectado','error'); return; }
      window._builder_parsed = parsed;
      console.log('ENVIAR MOVE7 parsed moves:', parsed.moves && parsed.moves.length);
      renderParsedMoves(parsed);
      // enriquecer moves E tms com dados da tabela de ataques (async — atualiza tiles quando dados chegarem)
      try{ applyAttacksToParsed(parsed); }catch(e){}
      // ensure user can copy moveset afterwards
      if(window.refreshParsedMovesAttacks) try{ window.refreshParsedMovesAttacks(); }catch(e){}
      if(window.refreshTmTypes) try{ window.refreshTmTypes(); }catch(e){}
      // se disponível, enviar para a planilha automaticamente
      try{
        if(typeof savePokedexMovesToSheet === 'function'){
          try{ if(window.mostrarToastSucesso) window.mostrarToastSucesso('Enviando...'); }catch(e){}
          await savePokedexMovesToSheet(parsed.meta && parsed.meta.nome ? parsed.meta.nome : '', parsed.moves || [], parsed.meta && parsed.meta.stats ? parsed.meta.stats : {});
          try{ if(window.mostrarToastSucesso) window.mostrarToastSucesso('Enviado ✓'); }catch(e){}
        }
      }catch(err){ console.error('ENVIAR MOVE7 save error', err); }
    }catch(e){ console.error('Enviar Move7 parse error', e); if(window.showToast) window.showToast('Erro ao processar texto','error'); }
  };

  // attach handler if button exists (also called from initBuilderUI)
  const enviarBtnImmediate = safe('btnEnviarMove7'); if(enviarBtnImmediate){ enviarBtnImmediate.removeEventListener && enviarBtnImmediate.removeEventListener('click', null); enviarBtnImmediate.addEventListener('click', enviarBtnHandler); }

  // add parsed move to selected slot
  document.addEventListener('click', function(e){
    const add = e.target.closest ? e.target.closest('.btn-add-parsed') : null;
    if(add){ const idx = parseInt(add.dataset.idx,10); const sel = document.getElementById(`parsed-slot-${idx}`); const slot = sel?parseInt(sel.value,10):null; const parsed = window._builder_parsed; if(!parsed) return; const mv = parsed.moves[idx]; if(!mv) return; // set into smeargleSelectedMoves
      // ensure we update the actual global variable used by smeargle (top-level let)
      try {
        if (typeof smeargleSelectedMoves !== 'undefined') {
          smeargleSelectedMoves = smeargleSelectedMoves || new Array(9).fill(null);
          const origemName = (window._builder_parsed && window._builder_parsed.meta && window._builder_parsed.meta.nome) ? window._builder_parsed.meta.nome : 'Pokedex';
          smeargleSelectedMoves[slot-1] = { nome: mv.nome, tipo: mv.tipo||'', categoria: mv.categoria||'', origem: origemName, local: `M${slot}` };
        } else {
          window.smeargleSelectedMoves = window.smeargleSelectedMoves || new Array(9).fill(null);
          const origemName = (window._builder_parsed && window._builder_parsed.meta && window._builder_parsed.meta.nome) ? window._builder_parsed.meta.nome : 'Pokedex';
          window.smeargleSelectedMoves[slot-1] = { nome: mv.nome, tipo: mv.tipo||'', categoria: mv.categoria||'', origem: origemName, local: `M${slot}` };
        }
      } catch(e) {
        window.smeargleSelectedMoves = window.smeargleSelectedMoves || new Array(9).fill(null);
        const origemName = (window._builder_parsed && window._builder_parsed.meta && window._builder_parsed.meta.nome) ? window._builder_parsed.meta.nome : 'Pokedex';
        window.smeargleSelectedMoves[slot-1] = { nome: mv.nome, tipo: mv.tipo||'', categoria: mv.categoria||'', origem: origemName, local: `M${slot}` };
      }
      try{
        // sinalizar adição recente para evitar que a atualização de card sobrescreva status
        try{ window.__smeargle_recently_added_move = true; setTimeout(function(){ try{ window.__smeargle_recently_added_move = false; }catch(e){} }, 350); }catch(e){}
        if(typeof scheduleSmeargleUpdate === 'function') scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); else if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle();
      }catch(e){}
            // open combined inline assign view for this move/slot
            try{ const moveObj = (typeof smeargleSelectedMoves !== 'undefined' ? smeargleSelectedMoves[slot-1] : window.smeargleSelectedMoves[slot-1]); openCombinedAssignInline(moveObj, slot-1); }catch(e){console.warn('erro abrindo inline combinado',e);}      
      return; }
  });

  // add TM tile -> assign to selected slot
  document.addEventListener('click', function(e){
    const add = e.target.closest ? e.target.closest('.btn-add-tm') : null;
    if(!add) return;
    const tile = add.closest ? add.closest('.tm-tile') : null;
    const tmName = tile && tile.dataset ? (tile.dataset.tmName || '') : '';
    if(!tmName) return;
    // try to find a select within this tile for chosen slot
    const sel = tile.querySelector('select');
    const slot = sel ? parseInt(sel.value,10) : null;
    if(!slot || isNaN(slot)) return;
    try {
      // visual immediate feedback
      tile && tile.classList.add('adding');
      add.disabled = true;
      setTimeout(()=>{ try{ add.disabled = false; tile && tile.classList.remove('adding'); }catch(e){} }, 600);

      // determine origem/tipo/numero from parsed tms or sheet data so image lookup works
      let origemName = 'TM';
      let tipoForEntry = '';
      let numeroForEntry = '';
      try{
        const idx = tile && tile.dataset && tile.dataset.idx ? parseInt(tile.dataset.idx,10) : null;
        const parsed = window._builder_parsed && window._builder_parsed.tms ? window._builder_parsed.tms : null;
        let tmObj = null;
        if(parsed && idx !== null && parsed[idx]) tmObj = parsed[idx];
        // fallback: usar buildTmLookup (mais robusto) ou procurar em window.todosTMs
        if(!tmObj){
            try{
            const lookup = (typeof buildTmLookup === 'function') ? buildTmLookup() : (window.__tmLookup || null);
            const nmRaw = (tmName||'').toString();
            const nm = (typeof _key === 'function') ? _key(nmRaw) : nmRaw.toLowerCase().trim();
            const badgeNumMatch = tile && tile.querySelector('.slot-badge') ? ((tile.querySelector('.slot-badge').textContent||'').match(/\d+/)||[])[0] : '';
            if(lookup){
              // tentar por número (normalizando)
              if(badgeNumMatch){
                const byNum = lookup.byNumber.get(String(badgeNumMatch));
                if(byNum) tmObj = byNum;
              }
              // tentar por nome usando chave normalizada
              if(!tmObj && lookup.byName){
                if(lookup.byName.has(nm)) tmObj = lookup.byName.get(nm);
              }
              // se ainda não achou, varrer raw com correspondência flexível
              if(!tmObj && Array.isArray(lookup.raw)){
                const rawFound = lookup.raw.find(x=>{
                  try{
                    const nval = (typeof _key === 'function') ? _key((x.nome||x['NOME DO TM']||x.NOME||'')+ '') : ((x.nome||x['NOME DO TM']||x.NOME||'')+ '').toString().toLowerCase();
                    const numval = String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'');
                    if(badgeNumMatch && numval && numval === String(badgeNumMatch)) return true;
                    if(nval && nm && (nval === nm || nval.includes(nm) || nm.includes(nval))) return true;
                  }catch(e){}
                  return false;
                });
                if(rawFound) tmObj = rawFound;
              }
            } else {
              const todos = window.todosTMs || [];
              const byNumber = todos.find(x=> String(x.numero||x.NUMERO||x['Número']||'').replace(/\D/g,'') === String((tile && tile.querySelector('.slot-badge'))?((tile.querySelector('.slot-badge').textContent||'').match(/\d+/)||[])[0]:''));
              const byName = todos.find(x=> ((x.nome||x['NOME DO TM']||'') + '').toString().toLowerCase().trim() === nm || ((x.nome||x['NOME DO TM']||'') + '').toString().toLowerCase().includes(nm));
              tmObj = byNumber || byName || null;
            }
          }catch(e){ /* silently ignore */ }
        }
        if(tmObj){
          origemName = tmObj.pokemon || tmObj.POKEMON || origemName;
          // extrair tipagem com várias chaves possíveis
          const candidateTipo = (tmObj['TIPAGEM DO TM'] || tmObj['TIPAGEM_DO_TM'] || tmObj.TIPAGEM || tmObj.tipagem || tmObj.tipo || tmObj.type || tmObj.TIPO || '').toString().trim();
          if(candidateTipo) tipoForEntry = candidateTipo;
          numeroForEntry = (tmObj.numero||tmObj.NUMERO||tmObj['Número']||tmObj['NUMERO DO TM']||'') || numeroForEntry;
        }
      }catch(e){}

      // preserve previous origem if new tmObj lacks pokemon info, but do NOT preserve previous tipo
      try{
        const prev = (typeof smeargleSelectedMoves !== 'undefined' ? smeargleSelectedMoves : window.smeargleSelectedMoves) || new Array(9).fill(null);
        const prevEntry = prev[slot-1] || null;
        if((!origemName || origemName === 'TM' || String(origemName).trim()==='') && prevEntry && prevEntry.origem){ origemName = prevEntry.origem; }
        // Important: do not copy prevEntry.tipo here — prefer to resolve tipo from TM lookup or leave empty so obterTipoGolpe() can infer it
      }catch(e){}

      if (typeof smeargleSelectedMoves !== 'undefined') {
        smeargleSelectedMoves = smeargleSelectedMoves || new Array(9).fill(null);
        smeargleSelectedMoves[slot-1] = { nome: tmName, tipo: tipoForEntry || '', categoria: '', origem: origemName||'TM', numero: numeroForEntry||'', local: `M${slot}` };
      } else {
        window.smeargleSelectedMoves = window.smeargleSelectedMoves || new Array(9).fill(null);
        window.smeargleSelectedMoves[slot-1] = { nome: tmName, tipo: tipoForEntry || '', categoria: '', origem: origemName||'TM', numero: numeroForEntry||'', local: `M${slot}` };
      }
      if(window.DEBUG_TM_ADD){ console.log('add-tm:', {slot, tmName, origemName, tipoForEntry, prevEntry: (typeof smeargleSelectedMoves !== 'undefined' ? smeargleSelectedMoves[slot-1] : window.smeargleSelectedMoves[slot-1])}); }

      // update UI quickly
      try{ if(typeof scheduleSmeargleUpdate === 'function') scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); else if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle(); }catch(e){}

      // defer heavier UI (inline modal/grid rendering) to allow paint and avoid jank
    }catch(e){ console.warn('add-tm handler error', e); }
  });

  // keyboard support: Enter/Space on focused tile activates click
  document.addEventListener('keydown', function(e){
    const active = document.activeElement;
    if(!active) return;
    if(active.classList && active.classList.contains('tm-tile')){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault(); active.click();
      }
    }
  });

  // init UI handlers (call when page is inserted or on DOM ready)
  function initBuilderUI(){
    const btn = safe('btnParsePokedex'); if(btn){ btn.removeEventListener && btn.removeEventListener('click', null); btn.addEventListener('click', ()=>{ const txt = safe('pokedexPaste')?safe('pokedexPaste').value:''; const parsed = parsePokedexText(txt); renderParsedMoves(parsed); }); }
    const btnClear = safe('btnClearPokedex'); if(btnClear){ btnClear.removeEventListener && btnClear.removeEventListener('click', null); btnClear.addEventListener('click', ()=>{ if(safe('pokedexPaste')) safe('pokedexPaste').value=''; if(safe('parsedMovesList')) safe('parsedMovesList').innerHTML=''; // clear the unified TM panel
      if(safe('combinedTmsGrid')) safe('combinedTmsGrid').innerHTML='';
      // legacy fallback
      if(safe('builderTmsList')) safe('builderTmsList').innerHTML='';
      window._builder_parsed = null; window.builderMeta = {tms:[]}; updateTmCounter(); }); }
    const submit = safe('btnSubmitBuild'); if(submit){
      // change label to reflect copy action
      try{ submit.textContent = 'Copiar Moveset'; }catch(e){}
      submit.removeEventListener && submit.removeEventListener('click', null);
      submit.addEventListener('click', async ()=>{
        try{
          const moves = (typeof smeargleSelectedMoves !== 'undefined' ? smeargleSelectedMoves : window.smeargleSelectedMoves) || [];
          const meta = window.builderMeta || {};
          // determine pokemon name: prefer parsed meta, then smeargle card, then fallback
          let pokeName = '';
          try{ if(window._builder_parsed && window._builder_parsed.meta && window._builder_parsed.meta.nome) pokeName = window._builder_parsed.meta.nome; }catch(e){}
          if(!pokeName){ const el = document.querySelector('.smeargle-name'); if(el) pokeName = (el.textContent||'').toString().trim(); }
          if(!pokeName) pokeName = meta.name || '';

          const lines = [];
          lines.push('Build Moveset');
          lines.push('');
          if(pokeName) lines.push(pokeName);
          lines.push('');
          for(let i=0;i<moves.length;i++){
            const m = moves[i];
            const slot = 'M' + (i+1);
            if(!m || !m.nome){ lines.push(`${slot}: (vazio)`); continue; }
            const tipoPart = m.tipo ? (' - ' + m.tipo) : '';
            // if this slot is directly a TM, include its number
            let tmSuffix = '';
            if(m.numero) tmSuffix = ` | TM-${m.numero}`;
            else if(Array.isArray(m.tms) && m.tms.length){ tmSuffix = ' | TMs: ' + m.tms.map(t=> (t.numero?(`${t.nome} (TM-${t.numero})`):(t.nome||''))).join(', '); }
            lines.push(`${slot}: ${m.nome}${tipoPart}${tmSuffix}`);
          }

          const text = lines.join('\n');
          // try modern clipboard API, fallback to legacy textarea copy
          if(navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          }
          console.log('Build copied', {moves, meta});
          const original = submit.textContent;
          submit.textContent = 'Copiado ✓';
          setTimeout(()=>{ try{ submit.textContent = original }catch(e){} }, 1200);
        }catch(err){
          console.error('Erro ao copiar build:', err);
          alert('Não foi possível copiar os golpes. Veja o console (F12) para detalhes.');
        }
      });
    }
    // clicking a selected move in the left card opens the TM modal
    const movesList = safe('movesList'); if(movesList){ movesList.addEventListener('click', function(ev){ const item = ev.target.closest ? ev.target.closest('.selected-move-item') : null; if(!item) return; const slot = parseInt(item.dataset-slot,10); if(!slot) return; const moveObj = (typeof smeargleSelectedMoves !== 'undefined' ? smeargleSelectedMoves[slot-1] : window.smeargleSelectedMoves[slot-1]); openCombinedAssignInline(moveObj, slot-1); }); }
    // also update counter display
    updateTmCounter();
    // event listeners para a barra de filtros do Builder
    try{
      var handler = function(){ try{ if(window.filterCombinedMoves) window.filterCombinedMoves(); }catch(e){} };
      ['moveSearchInput','builderFilterTipo','builderFilterAcao','builderFilterCategoria','builderFilterLocal','builderFilterPower'].forEach(function(id){
        var el = document.getElementById(id);
        if(!el) return;
        el.removeEventListener('input', handler);
        el.removeEventListener('change', handler);
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
      });
      try{ if(typeof window.filterCombinedMoves === 'function') window.filterCombinedMoves(); }catch(e){}
    }catch(e){ /* ignore */ }

    // Se o usuário já parseou um Pokémon antes e navegou de volta, re-exibir os golpes
    // Caso contrário, pré-popular o grid com todos os ataques disponíveis para pesquisa
    try{
      var grid = document.getElementById('combinedMovesGrid');
      if(grid && grid.children.length === 0){
        if(window._builder_parsed && window._builder_parsed.moves && window._builder_parsed.moves.length > 0){
          // Re-renderizar a última parse ao voltar para a aba
          setTimeout(function(){
            try{ if(typeof renderParsedMoves === 'function') renderParsedMoves(window._builder_parsed); }catch(e){}
          }, 50);
        } else {
          // Pré-popular com todos os ataques para pesquisa (como a aba Smeargle)
          setTimeout(_prePopularTodosAtaques, 200);
        }
      }
    }catch(e){ /* ignore */ }
  }

  // Popula o grid com todos os ataques disponíveis quando não há moveset parseado
  function _prePopularTodosAtaques(){
    try{
      var grid = document.getElementById('combinedMovesGrid');
      if(!grid) return;
      // Verificar se já foi populado (checar o notice, não children.length, para permitir append de TMs)
      var alreadyPopulated = !!grid.querySelector('#builderAllAttacksNotice');
      var tmSepExists = !!grid.querySelector('.tm-section-separator[data-preload]');
      if(alreadyPopulated && tmSepExists) return; // tudo já adicionado
      // Se o grid tem conteúdo mas NÃO é o modo pré-populado (ex: moveset de Pokémon), não sobrescrever
      if(!alreadyPopulated && grid.children.length > 0) return;

      var attacks = (window.smeargleAtacksData && Array.isArray(window.smeargleAtacksData) && window.smeargleAtacksData.length > 0)
        ? window.smeargleAtacksData
        : (window.todosAtacks && Array.isArray(window.todosAtacks) && window.todosAtacks.length > 0
            ? window.todosAtacks : null);
      var tms = (window.todosTMs && Array.isArray(window.todosTMs) && window.todosTMs.length > 0) ? window.todosTMs : null;

      if(!attacks && !tms){
        // Dados ainda não chegaram: tentar novamente a cada 500ms por até 15s
        var tries = 0;
        var iv = setInterval(function(){
          tries++;
          var a = (window.smeargleAtacksData && Array.isArray(window.smeargleAtacksData) && window.smeargleAtacksData.length > 0)
            ? window.smeargleAtacksData
            : (window.todosAtacks && Array.isArray(window.todosAtacks) && window.todosAtacks.length > 0 ? window.todosAtacks : null);
          var t = (window.todosTMs && Array.isArray(window.todosTMs) && window.todosTMs.length > 0) ? window.todosTMs : null;
          if(a || t){
            clearInterval(iv);
            if(document.getElementById('combinedMovesGrid')) _prePopularTodosAtaques();
          }
          if(tries > 30) clearInterval(iv);
        }, 500);
        return;
      }

      // Se já populado com ataques mas TMs ainda não estavam disponíveis, tentar adicionar TMs
      if(alreadyPopulated && !tmSepExists && tms && tms.length){
        _appendTMsToGrid(grid, tms);
        return;
      }

      // Se TMs estão disponíveis mas ataques não chegaram ainda, aguardar mais 2s
      if(!attacks && tms){
        setTimeout(function(){
          if(document.getElementById('combinedMovesGrid') && !document.querySelector('#builderAllAttacksNotice')){
            _prePopularTodosAtaques();
          }
        }, 2000);
        // Mas já tentar adicionar TMs como fallback imediato
      }

      // Mostrar aviso de modo "todos os ataques/TMs"
      var notice = document.createElement('div');
      notice.id = 'builderAllAttacksNotice';
      notice.style.cssText = 'grid-column:1/-1;padding:8px 12px;background:rgba(255,215,0,0.12);border:1px solid rgba(255,215,0,0.3);border-radius:8px;color:#ffd700;font-size:0.85em;text-align:center;';
      notice.innerHTML = '<i class="fas fa-info-circle"></i> Exibindo todos os ataques e TMs. Use <b>ENVIAR MOVE7</b> para carregar o moveset de um Pokémon.';

      var frag = document.createDocumentFragment();
      frag.appendChild(notice);

      // ── Ataques ──────────────────────────────────────────────────────────
      if(attacks){
        attacks.forEach(function(atk){
          try{
            var nome = _getField(atk, 'ATACK', 'ATACK_NAME', 'ATACK_PT', 'nome', 'name', 'NOME') || '';
            if(!nome || nome.length < 2) return;
            var tipo    = _getField(atk, 'TYPE', 'TIPO', 'tipo', 'tipagem', 'TIPAGEM') || '';
            var cat     = _getField(atk, 'CATEGORIA', 'categoria', 'CATEGORY') || '';
            var power   = _getField(atk, 'POWER', 'power', 'DANO', 'dano') || '';
            var pp      = _getField(atk, 'PP', 'pp') || '';
            var acc     = _getField(atk, 'ACCURACY', 'accuracy') || '';
            var acao    = _getField(atk, 'AÇÃO', 'ACAO', 'acao', 'action') || '';
            var efeito  = _getField(atk, 'EFEITO', 'efeito', 'effect') || '';
            var tipoClass = (tipo||'').toString().toLowerCase().replace(/[^a-z]/g,'');

            var card = document.createElement('div');
            card.className = 'move-card builder-card type-' + (tipoClass || 'normal');
            card.innerHTML =
              '<div class="move-tipo-icon"><i class="fas ' + getTypeIcon(tipo) + '"></i></div>' +
              '<div class="move-name">' + nome + '</div>' +
              '<div class="move-details">' +
                '<span class="move-tipo">' + tipo + '</span>' +
                '<span class="move-categoria">' + cat + '</span>' +
              '</div>' +
              '<div class="move-acao" style="font-size:0.82em;opacity:0.75;margin-top:3px">' + acao + '</div>' +
              '<div class="move-stats" style="margin-top:4px;font-size:11px;opacity:0.8">' +
                (pp    ? 'PP: <b>' + pp + '</b> ' : '') +
                (power ? 'Pow: <b class="power-value">' + power + '</b> ' : '') +
                (acc   ? 'Acc: <b>' + acc + '</b>' : '') +
              '</div>' +
              '<div class="move-efeito" style="font-size:0.8em;opacity:0.65;margin-top:3px;display:none">' + efeito + '</div>';

            card.dataset.moveName     = nome;
            card.dataset.moveType     = tipo;
            card.dataset.moveCategory = cat;
            card.dataset.moveEffect   = efeito;
            card.dataset.slotBadge    = '';

            frag.appendChild(card);
          }catch(e){}
        });
      }

      // ── TMs ──────────────────────────────────────────────────────────────
      if(tms && tms.length){
        var tmSep = document.createElement('div');
        tmSep.className = 'tm-section-separator';
        tmSep.setAttribute('data-preload', '1');
        tmSep.style.cssText = 'grid-column:1/-1;padding:8px 4px 4px;color:#ffd700;font-weight:700;font-size:0.95em;border-top:1px solid rgba(255,215,0,0.2);margin-top:4px;';
        tmSep.innerHTML = '<i class="fas fa-compact-disc"></i> TMs disponíveis';
        frag.appendChild(tmSep);

        tms.forEach(function(tm){
          try{
            var tmNome  = _getField(tm, 'NOME DO TM', 'nome', 'name', 'NOME') || '';
            if(!tmNome || tmNome.length < 2) return;
            var tmNum   = _getField(tm, 'NUMERO DO TM', 'numero', 'NUMERO', 'number') || '';
            var tmTipo  = _getField(tm, 'TIPAGEM DO TM', 'tipagem', 'TIPAGEM', 'tipo', 'TYPE', 'type') || '';
            var tipoClass = (tmTipo||'').toString().toLowerCase().replace(/[^a-z]/g,'');
            var tmLabel = tmNum ? 'TM' + tmNum : 'TM';
            // dataset.moveName inclui nome + número para pesquisa por ambos
            var searchName = tmNome + (tmNum ? ' TM' + tmNum : '');

            var tile = document.createElement('div');
            tile.className = 'move-card builder-card tm-tile type-' + (tipoClass || 'normal');
            tile.setAttribute('data-is-tm', '1');
            tile.setAttribute('data-preload-tm', '1');
            tile.innerHTML =
              '<div class="move-tipo-icon"><i class="fas ' + getTypeIcon(tmTipo) + '"></i></div>' +
              '<div style="display:flex;align-items:center;justify-content:center;gap:6px">' +
                '<div class="move-name">' + tmNome + '</div>' +
                '<div class="tm-num-badge" style="font-size:0.82em;background:rgba(255,255,255,0.04);padding:3px 7px;border-radius:8px;color:#ffd700;border:1px solid rgba(255,255,255,0.08);">' + tmLabel + '</div>' +
              '</div>' +
              '<div class="move-details">' +
                '<span class="move-tipo">' + tmTipo + '</span>' +
              '</div>' +
              '<div class="move-stats" style="margin-top:4px;font-size:11px;opacity:0.8"></div>';

            tile.dataset.moveName     = searchName;
            tile.dataset.moveType     = tmTipo;
            tile.dataset.moveCategory = '';
            tile.dataset.moveEffect   = '';
            tile.dataset.slotBadge    = '';

            frag.appendChild(tile);
          }catch(e){}
        });
      }

      grid.appendChild(frag);

      try{ if(window._builderPopulateFilters) window._builderPopulateFilters(); }catch(e){}
      try{ if(window.filterCombinedMoves) window.filterCombinedMoves(); }catch(e){}

      // Se TMs ainda não estavam disponíveis, vigiar e adicionar quando chegarem
      if(!tms){
        var tmWatchTries = 0;
        var tmWatch = setInterval(function(){
          tmWatchTries++;
          var t = (window.todosTMs && Array.isArray(window.todosTMs) && window.todosTMs.length > 0) ? window.todosTMs : null;
          if(t){
            clearInterval(tmWatch);
            var g = document.getElementById('combinedMovesGrid');
            if(g && !g.querySelector('.tm-section-separator[data-preload]')) _appendTMsToGrid(g, t);
          }
          if(tmWatchTries > 30) clearInterval(tmWatch);
        }, 600);
      }
    }catch(e){ console.warn('_prePopularTodosAtaques err', e); }
  }

  // Adiciona seção de TMs ao grid pré-populado (quando chegam depois dos ataques)
  function _appendTMsToGrid(grid, tms){
    try{
      if(!grid || !tms || !tms.length) return;
      if(grid.querySelector('.tm-section-separator[data-preload]')) return; // já adicionado
      var frag = document.createDocumentFragment();
      var tmSep = document.createElement('div');
      tmSep.className = 'tm-section-separator';
      tmSep.setAttribute('data-preload', '1');
      tmSep.style.cssText = 'grid-column:1/-1;padding:8px 4px 4px;color:#ffd700;font-weight:700;font-size:0.95em;border-top:1px solid rgba(255,215,0,0.2);margin-top:4px;';
      tmSep.innerHTML = '<i class="fas fa-compact-disc"></i> TMs disponíveis';
      frag.appendChild(tmSep);
      tms.forEach(function(tm){
        try{
          var tmNome = _getField(tm, 'NOME DO TM', 'nome', 'name', 'NOME') || '';
          if(!tmNome || tmNome.length < 2) return;
          var tmNum  = _getField(tm, 'NUMERO DO TM', 'numero', 'NUMERO', 'number') || '';
          var tmTipo = _getField(tm, 'TIPAGEM DO TM', 'tipagem', 'TIPAGEM', 'tipo', 'TYPE', 'type') || '';
          var tipoClass = (tmTipo||'').toString().toLowerCase().replace(/[^a-z]/g,'');
          var tmLabel = tmNum ? 'TM' + tmNum : 'TM';
          var searchName = tmNome + (tmNum ? ' TM' + tmNum : '');
          var tile = document.createElement('div');
          tile.className = 'move-card builder-card tm-tile type-' + (tipoClass || 'normal');
          tile.setAttribute('data-is-tm', '1');
          tile.setAttribute('data-preload-tm', '1');
          tile.innerHTML =
            '<div class="move-tipo-icon"><i class="fas ' + getTypeIcon(tmTipo) + '"></i></div>' +
            '<div style="display:flex;align-items:center;justify-content:center;gap:6px">' +
              '<div class="move-name">' + tmNome + '</div>' +
              '<div class="tm-num-badge" style="font-size:0.82em;background:rgba(255,255,255,0.04);padding:3px 7px;border-radius:8px;color:#ffd700;border:1px solid rgba(255,255,255,0.08);">' + tmLabel + '</div>' +
            '</div>' +
            '<div class="move-details"><span class="move-tipo">' + tmTipo + '</span></div>' +
            '<div class="move-stats" style="margin-top:4px;font-size:11px;opacity:0.8"></div>';
          tile.dataset.moveName = searchName;
          tile.dataset.moveType = tmTipo;
          tile.dataset.slotBadge = '';
          frag.appendChild(tile);
        }catch(e){}
      });
      grid.appendChild(frag);
      try{ if(window._builderPopulateFilters) window._builderPopulateFilters(); }catch(e){}
      try{ if(window.filterCombinedMoves) window.filterCombinedMoves(); }catch(e){}
    }catch(e){}
  }
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(initBuilderUI, 50);
  } else {
    document.addEventListener('DOMContentLoaded', initBuilderUI);
  }

  // register initializer so SPA navigation can call it
  if(typeof registerPageInitializer !== 'undefined') registerPageInitializer('builder', function(){ initBuilderUI(); console.log('Builder initialized'); });

  // Expose key functions globally for other scripts (ENVIAR DEX, global paste+parse)
  try{
    window.parsePokedexText = parsePokedexText;
    window.savePokedexMovesToSheet = savePokedexMovesToSheet;
    window.renderParsedMoves = renderParsedMoves;
    window.renderParsedTms = renderParsedTms;
    window.initBuilderUI = initBuilderUI;
  }catch(e){ console.warn('builder: failed to expose globals', e); }

  // ─── SISTEMA DE BUILDS DO MOVE7 ─────────────────────────────────────────────
  // Prefixo para diferenciar builds Move7 das builds Smeargle na mesma planilha
  var MOVE7_BUILD_PREFIX = '[MOVE7] ';
  var SHEETS_URL_BUILDS = window.SHEETS_BASE_URL || window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';

  // Abre o modal de builds do Move7 (sobrepõe abrirModalBuilds global quando este modal existir)
  window.abrirModalBuilds = function(){
    var modal = document.getElementById('modalBuildsMove7');
    if(modal){
      modal.style.display = 'flex';
      _builderAtualizarPreview();
      _builderCarregarBuilds();
    }
  };

  function _builderAtualizarPreview(){
    var preview = document.getElementById('builderBuildPreview');
    if(!preview) return;
    var parsed = window._builder_parsed;
    if(!parsed || ((!parsed.moves || !parsed.moves.length) && (!parsed.tms || !parsed.tms.length))){
      preview.innerHTML = '<em>Nenhum golpe detectado. Use ENVIAR MOVE7 primeiro.</em>';
      return;
    }
    var parts = (parsed.moves||[]).filter(Boolean).map(function(m,i){
      return 'M'+(m.slot||i+1)+': '+m.nome;
    });
    var tmParts = (parsed.tms||[]).filter(Boolean).map(function(t){ return 'TM: '+t.nome; });
    preview.innerHTML = '<strong>Preview:</strong> '+(parts.concat(tmParts).join(' / ') || '—');
  }

  // Salvar build atual do Move7
  window._builderSalvarBuild = async function(){
    var nomeInput = document.getElementById('builderInputNomeBuild');
    var nomeBuild = nomeInput ? nomeInput.value.trim() : '';
    if(!nomeBuild){ alert('⚠️ Digite um nome para a build!'); return; }
    var parsed = window._builder_parsed;
    if(!parsed || ((!parsed.moves||!parsed.moves.length)&&(!parsed.tms||!parsed.tms.length))){
      alert('⚠️ Nenhum golpe detectado. Use ENVIAR MOVE7 primeiro!'); return;
    }
    try{
      var userStr = localStorage.getItem('user');
      var user = userStr ? JSON.parse(userStr) : null;
      var usuario = user && user.nickname ? user.nickname : 'Anônimo';
      var pokeName = (parsed.meta && parsed.meta.nome) ? parsed.meta.nome : 'Pokémon';

      // Combinar moves e TMs num array com formato compatível com o GAS:
      // moves: { nome, origem } — TMs com origem='[TM]'
      var movesArr = (parsed.moves||[]).filter(Boolean).map(function(m){
        return { nome: m.nome, origem: pokeName };
      });
      var tmsArr = (parsed.tms||[]).filter(Boolean).map(function(t){
        return { nome: t.nome, origem: '[TM]' };
      });
      var allMoves = movesArr.concat(tmsArr);

      var SHEETS_URL_BUILDS = window.SHEETS_BASE_URL || window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';
      var formData = new URLSearchParams({
        action: 'salvarBuild',
        nomeBuild: MOVE7_BUILD_PREFIX + nomeBuild,
        moves: JSON.stringify(allMoves),
        usuario: usuario
      });
      var resp = await fetch(SHEETS_URL_BUILDS, { method: 'POST', body: formData });
      var result = await resp.json();
      if(result.success){
        alert('✅ Build salva com sucesso!');
        if(nomeInput) nomeInput.value = '';
        _builderCarregarBuilds();
      } else {
        alert('❌ Erro ao salvar: ' + result.message);
      }
    }catch(e){ console.error('_builderSalvarBuild error', e); alert('❌ Erro ao salvar build.'); }
  };

  // Carregar builds do Move7 (filtra pelo prefixo [MOVE7])
  async function _builderCarregarBuilds(){
    var lista = document.getElementById('builderBuildsList');
    if(!lista) return;
    lista.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    try{
      var SHEETS_URL_BUILDS = window.SHEETS_BASE_URL || window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';
      var resp = await fetch(SHEETS_URL_BUILDS + '?action=carregarBuilds');
      var result = await resp.json();
      var userStr = localStorage.getItem('user');
      var user = userStr ? JSON.parse(userStr) : null;
      var isAdmin = user && user.role === 'admin';
      if(result.success && result.builds && result.builds.length){
        // filtrar apenas builds do Move7
        var builds = result.builds.filter(function(b){ return b.nome && b.nome.startsWith(MOVE7_BUILD_PREFIX); });
        if(!builds.length){
          lista.innerHTML = '<p style="color:rgba(255,255,255,0.6);text-align:center;padding:20px;">Nenhuma build salva ainda.</p>';
          return;
        }
        lista.innerHTML = builds.map(function(build, idx){
          var displayNome = build.nome.replace(MOVE7_BUILD_PREFIX, '');
          var dataFmt = build.data ? (function(d){ try{ return new Date(d).toLocaleDateString('pt-BR'); }catch(e){ return d||''; } })(build.data) : '';
          var deleteBtn = isAdmin ? '<button class="btn-delete-build" onclick="event.stopPropagation();window._builderExcluirBuild('+build.id+',\''+displayNome.replace(/'/g,"&apos;")+'\')"><i class="fas fa-trash"></i></button>' : '';
          return '<div class="build-item" style="display:flex;align-items:flex-start;gap:8px;">'
            +'<div onclick="window._builderAplicarBuild(\''+build.buildCompleta.replace(/'/g,"&apos;")+'\',\''+displayNome.replace(/'/g,"&apos;")+'\')\" style="cursor:pointer;flex:1;">'
            +'<div class="build-item-header"><div class="build-item-name">'+displayNome+'</div><div class="build-item-date">'+dataFmt+'</div></div>'
            +'<div class="build-item-content">'+build.buildCompleta+'</div>'
            +'<div class="build-item-usuario">Por: '+(build.usuario||'—')+'</div>'
            +'</div>'+deleteBtn+'</div>';
        }).join('');
      } else {
        lista.innerHTML = '<p style="color:rgba(255,255,255,0.6);text-align:center;padding:20px;">Nenhuma build salva ainda.</p>';
      }
    }catch(e){ console.error('_builderCarregarBuilds error', e); lista.innerHTML = '<p style="color:#ff6464;text-align:center;padding:20px;">Erro ao carregar builds.</p>'; }
  }

  // Aplicar build selecionada no Builder (re-popula os golpes e TMs)
  window._builderAplicarBuild = function(buildCompleta, nomeBuild){
    try{
      // Parsear formato: "m1 - MoveName - Pokemon / m2 - MoveName - [TM]"
      var moves = [], tms = [];
      var parts = buildCompleta.split(' / ');
      parts.forEach(function(part, idx){
        var segs = part.trim().split(' - ');
        if(segs.length < 2) return;
        var slotStr = segs[0].trim(); // ex: "m1"
        var nomeMov = segs[1].trim();
        var origem  = segs[2] ? segs[2].trim() : '';
        var slotNum = parseInt(slotStr.replace(/^m/i,''), 10);
        if(origem === '[TM]'){
          tms.push({ nome: nomeMov });
        } else {
          moves.push({ nome: nomeMov, slot: isNaN(slotNum) ? (idx+1) : slotNum, origem: origem });
        }
      });
      if(!moves.length && !tms.length){ alert('⚠️ Nenhum golpe válido encontrado!'); return; }
      // Pokemon nome: pegar da origem do primeiro move
      var pokeName = moves.length ? (moves[0].origem || 'Pokémon') : 'Pokémon';
      var parsed = { moves: moves, tms: tms, meta: { nome: pokeName } };
      window._builder_parsed = parsed;
      if(typeof renderParsedMoves === 'function') try{ renderParsedMoves(parsed); }catch(e){}
      if(typeof renderParsedTms === 'function')   try{ renderParsedTms(tms); }catch(e){}
      if(window.applyAttacksToParsed)             try{ window.applyAttacksToParsed(parsed); }catch(e){}
      document.getElementById('modalBuildsMove7').style.display = 'none';
      alert('✅ Build "'+nomeBuild+'" aplicada! '+moves.length+' golpe(s) + '+tms.length+' TM(s).');
    }catch(e){ console.error('_builderAplicarBuild error', e); alert('❌ Erro ao aplicar build.'); }
  };

  // Excluir build do Move7 (apenas admin)
  window._builderExcluirBuild = async function(buildIndex, nomeBuild){
    if(!confirm('❌ Excluir a build "'+nomeBuild+'"?\n\nEsta ação não pode ser desfeita!')) return;
    try{
      var userStr = localStorage.getItem('user');
      var user = userStr ? JSON.parse(userStr) : null;
      if(!user || !user.authToken || !user.email){ alert('❌ Você precisa estar logado como admin!'); return; }
      var SHEETS_URL_BUILDS = window.SHEETS_BASE_URL || window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';
      var formData = new URLSearchParams({
        action: 'excluirBuild',
        buildIndex: buildIndex.toString(),
        authToken: user.authToken,
        adminEmail: user.email
      });
      var resp = await fetch(SHEETS_URL_BUILDS, { method: 'POST', body: formData });
      var result = await resp.json();
      if(result.success){ alert('✅ Build excluída!'); _builderCarregarBuilds(); }
      else { alert('❌ Erro: ' + result.message); }
    }catch(e){ console.error('_builderExcluirBuild error', e); alert('❌ Erro ao excluir build.'); }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // -- Modal combinado: golpes + TMs --
  function openCombinedAssignModal(moveObj, slotIndex){
    const modal = safe('assignModal'); if(!modal) return;
    const title = safe('assignTitle'); const subtitle = safe('assignSubtitle'); const movesContainer = safe('assignMovesList'); const tmsContainer = safe('assignTmsGrid');
    title.textContent = 'Golpes e TMs';
    subtitle.textContent = moveObj && moveObj.nome ? `${moveObj.nome} — Slot ${moveObj.local||('M'+(slotIndex+1))}` : `Slot M${slotIndex+1}`;
    // prepare list of parsed moves on the left; prefer window._builder_parsed.moves
    const parsedMoves = (window._builder_parsed && window._builder_parsed.moves) ? window._builder_parsed.moves : [];
    // create a shallow copy of move objects for editing selection
    const movesCopy = parsedMoves.map(m => Object.assign({}, m));
    // default selected move index: the passed moveObj if it exists in parsedMoves by name, else first
    let selectedIdx = 0;
    if(moveObj && moveObj.nome){ const found = movesCopy.findIndex(x=>x && x.nome && x.nome.toLowerCase()===moveObj.nome.toLowerCase()); if(found>=0) selectedIdx = found; }

    function renderMovesLeft(){
      movesContainer.innerHTML = '';
      movesCopy.forEach((mv, i)=>{
        const el = document.createElement('div'); el.className='modal-move-item';
        if(i===selectedIdx) el.classList.add('selected-move-highlight');
        const assigned = mv.assignedSlot ? `<span class="assigned-slot">M${mv.assignedSlot}</span>` : '';
        const icon = `<div class="tm-icon">⚡</div>`;
        el.innerHTML = `<div class="modal-move-inner">${icon}<div class="modal-move-main"><strong>${mv.nome}</strong><div class="move-sub">${mv.tipo||''} ${mv.categoria?('• '+mv.categoria):''}</div></div>${assigned}</div>`;
        el.addEventListener('click', ()=>{ selectedIdx = i; // re-render tm grid for selected
          renderMovesLeft(); renderTmGridForMove(tmsContainer, (window._builder_parsed && window._builder_parsed.tms)?window._builder_parsed.tms:[], moveObjForModal());
        });
        movesContainer.appendChild(el);
      });
    }

      // Inline version: render combined assign UI into the right-side panel (assignContainer)
      function openCombinedAssignInline(moveObj, slotIndex){
        const movesContainer = safe('assignMovesListInline');
        const tmsContainer = safe('assignTmsGridInline');
        if(!movesContainer || !tmsContainer) return;
        const parsedMoves = (window._builder_parsed && window._builder_parsed.moves) ? window._builder_parsed.moves : [];
        const movesCopy = parsedMoves.map(m => Object.assign({}, m));
        // find selected index if moveObj matches
        let selectedIdx = 0;
        if(moveObj && moveObj.nome){ const found = movesCopy.findIndex(x=>x && x.nome && x.nome.toLowerCase()===moveObj.nome.toLowerCase()); if(found>=0) selectedIdx = found; }

        function renderLeft(){
          movesContainer.innerHTML = '';
          movesCopy.forEach((mv,i)=>{
            const el = document.createElement('div'); el.className='modal-move-item';
            if(i===selectedIdx) el.classList.add('selected-move-highlight');
            const assigned = mv.assignedSlot ? `<span class="assigned-slot">M${mv.assignedSlot}</span>` : '';
            el.innerHTML = `<div class="modal-move-inner"><div class="modal-move-main"><strong>${mv.nome}</strong><div class="move-sub">${mv.tipo||''} ${mv.categoria?('• '+mv.categoria):''}</div></div>${assigned}</div>`;
            el.addEventListener('click', ()=>{ selectedIdx = i; renderLeft(); renderTmGridForMove(tmsContainer, (window._builder_parsed && window._builder_parsed.tms)?window._builder_parsed.tms:[], moveObjForInline()); });
            movesContainer.appendChild(el);
          });
        }

        function moveObjForInline(){ if(moveObj && moveObj.nome) return moveObj; moveObj.tms = moveObj.tms || []; return moveObj; }

        renderLeft();
        renderTmGridForMove(tmsContainer, (window._builder_parsed && window._builder_parsed.tms)?window._builder_parsed.tms:[], moveObjForInline());
        // scroll into view
        try{ document.getElementById('assignContainer') && document.getElementById('assignContainer').scrollIntoView({behavior:'smooth', block:'center'}); }catch(e){}
      }

    function moveObjForModal(){
      // if the modal was opened for a specific assigned slot, operate on that moveObj; otherwise use selected parsed move
      if(moveObj && moveObj.nome) return moveObj;
      // create temporary object for the selected parsed move
      const base = movesCopy[selectedIdx] || {nome:'', tipo:'', categoria:''};
      moveObj.tms = moveObj.tms || [];
      return moveObj;
    }

    // render initial
    renderMovesLeft();
    renderTmGridForMove(tmsContainer, (window._builder_parsed && window._builder_parsed.tms)?window._builder_parsed.tms:[], moveObjForModal());

    modal.style.display = 'block';
    // wire buttons
    const closeBtn = safe('assignClose'); const saveBtn = safe('assignSave');
    function onClose(){ modal.style.display='none'; }
    function onSave(){
      // persist current selection's tms into proper global slot
      try{
        const target = (typeof smeargleSelectedMoves !== 'undefined' ? smeargleSelectedMoves : window.smeargleSelectedMoves);
        if(!target || !Array.isArray(target)) window.smeargleSelectedMoves = new Array(9).fill(null);
        // if modal was opened for an assigned move (moveObj.nome exists), ensure we saved from moveObj
        if(moveObj && moveObj.nome){
          try{ if(typeof smeargleSelectedMoves !== 'undefined') smeargleSelectedMoves[slotIndex] = moveObj; else window.smeargleSelectedMoves[slotIndex] = moveObj; }catch(e){ window.smeargleSelectedMoves[slotIndex]=moveObj; }
        } else {
          // otherwise, use selected parsed move and assign its tms into the slotIndex (if any)
          const sel = movesCopy[selectedIdx];
          const selTms = sel.tms || [];
          try{
            if(typeof smeargleSelectedMoves !== 'undefined'){
              smeargleSelectedMoves[slotIndex] = smeargleSelectedMoves[slotIndex]||{};
              smeargleSelectedMoves[slotIndex].tms = selTms;
            } else {
              window.smeargleSelectedMoves[slotIndex] = window.smeargleSelectedMoves[slotIndex]||{};
              window.smeargleSelectedMoves[slotIndex].tms = selTms;
            }
            // tentar inferir tipagem a partir dos TMs atribuídos
            try{
              const lookup = (typeof buildTmLookup === 'function') ? buildTmLookup() : (window.__tmLookup || null);
              const tipos = [];
              (selTms||[]).forEach(tm=>{
                if(!tm) return;
                if(tm.tipo) tipos.push(String(tm.tipo).trim());
                else if(tm.numero && lookup && lookup.byNumber){
                  const f = lookup.byNumber.get(String(tm.numero));
                  if(f){ const tip = f['TIPAGEM DO TM']||f.TIPAGEM||f.tipagem||f.tipo||f.type||''; if(tip) tipos.push(String(tip).trim()); }
                }
              });
              if(tipos.length){
                const cnt = {}; tipos.forEach(t=>cnt[t]= (cnt[t]||0)+1);
                const tipoEscolhido = Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
                if(typeof smeargleSelectedMoves !== 'undefined') smeargleSelectedMoves[slotIndex].tipo = tipoEscolhido; else window.smeargleSelectedMoves[slotIndex].tipo = tipoEscolhido;
              }
            }catch(e){}
          } catch(e){
            window.smeargleSelectedMoves[slotIndex] = window.smeargleSelectedMoves[slotIndex]||{};
            window.smeargleSelectedMoves[slotIndex].tms = selTms;
          }
        }
      }catch(e){ console.warn('Erro ao salvar atribuições do modal combinado', e); }
      try{ if(typeof scheduleSmeargleUpdate === 'function') scheduleSmeargleUpdate({card:true,reorder:true,buscar:true}); else if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle(); }catch(e){}
      onClose();
    }
    // ensure we don't add duplicate listeners
    closeBtn && (closeBtn.onclick = onClose);
    saveBtn && (saveBtn.onclick = onSave);
  }

  // Inject CSS transitions and contrast rules for smoother expansion and better readability
  (function ensureBuilderStyles(){
    try{
      if(document.getElementById('__builder_injected_styles')) return;
      const css = `
        #combinedInnerPanel { transition: height 220ms ease; }
        #combinedMovesGrid { transition: max-height 220ms ease; }
        .move-card, .builder-card { color: #111; }
        .text-white, .move-card.text-white { color: #fff !important; }
        .move-slot-origem { color: inherit !important; }
        .move-stat-power .power-value { background: #ffd54d; padding: 2px 6px; border-radius: 6px; color: #111; font-weight:700; }
        .move-stat-power { display: inline-block; margin-left:6px; }
        /* Fade-in details */
        .move-efeito, .move-stats { opacity: 0; transform: translateY(6px); transition: opacity 180ms ease, transform 180ms ease; }
        .move-card.details-visible .move-efeito, .move-card.details-visible .move-stats { opacity: 1; transform: none; }
      `;
      const s = document.createElement('style'); s.id = '__builder_injected_styles'; s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
    }catch(e){/* ignore */}
  })();

  // Delegação segura para botões de toggle (garante resposta após re-renders)
  (function ensureToggleDelegation(){
    try{
      if(window.__builder_toggle_delegation_added) return;
      window.__builder_toggle_delegation_added = true;
      // Captura cliques em botões com classe .btn-toggle-stats ou .btn-toggle-weaknesses
      // Use capture=true para interceptar antes de handlers inline/bubble e prevenir double-toggle
      document.addEventListener('click', function(ev){
        try{
          if(ev.button && ev.button !== 0) return; // ignore non-left clicks
          var btn = ev.target && ev.target.closest ? ev.target.closest('.btn-toggle-stats, .btn-toggle-weaknesses') : null;
          if(!btn) return;
          // interceptar e impedir handlers posteriores para evitar double-toggle
          try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
          // evitar re-entrância imediata
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

  // Observe move cards and fill details when they become visible (lazy fill to avoid jank)
  (function observeMoveCards(){
    try{
      const container = document.getElementById('combinedMovesGrid');
      if(!container) return;

      function shouldSkipFill(card){
        try{
          const stats = card.querySelector('.move-stats');
          if(!stats) return false;
          const pv = stats.querySelector('.power-value');
          if(pv && pv.textContent && pv.textContent.trim() !== '') return true;
          if(stats.textContent && /Pow:\s*\d+/i.test(stats.textContent)) return true;
        }catch(e){}
        return false;
      }

      const io = new IntersectionObserver(function(entries){
        entries.forEach(entry=>{
          try{
            const el = entry.target;
            if(!entry.isIntersecting) return;
            if(shouldSkipFill(el)) { try{ el.classList.add('details-visible'); }catch(e){}; io.unobserve(el); return; }
            try{ if(typeof tryEnrichTileFromAttacks === 'function'){ const name = el.dataset.moveName || (el.querySelector('.move-name') && el.querySelector('.move-name').textContent) || ''; tryEnrichTileFromAttacks(el, name); } }catch(e){}
            try{ if(typeof refreshParsedMovesAttacks === 'function') refreshParsedMovesAttacks(); }catch(e){}
            try{ el.classList.add('details-visible'); }catch(e){}
            try{ setTimeout(function(){ if(typeof adjustCombinedPanelHeight === 'function') adjustCombinedPanelHeight(); }, 60); }catch(e){}
            io.unobserve(el);
          }catch(e){}
        });
      }, { root: document.getElementById('combinedInnerPanel') || null, threshold: 0.25 });

      function observeChildren(){
        try{
          const cards = Array.from(container.querySelectorAll('.move-card'));
          cards.forEach(c=>{ try{ io.observe(c); }catch(e){} });
        }catch(e){}
      }

      observeChildren();

      const mo = new MutationObserver(function(muts){ try{ observeChildren(); }catch(e){} });
      mo.observe(container, { childList:true, subtree:true });
      window.__builder_moveCardIO = io; window.__builder_moveCardMO = mo;
    }catch(e){}
  })();

})();
