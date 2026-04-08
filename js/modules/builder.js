// Builder module: parses Pokedex paste and allows assembling a moveset
(function(){
  function safe(q){return document.getElementById(q)}

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

    // heurísticas por linha para linhas simples (Name / Type / Category) e TM simple lines
    lines.forEach(ln=>{
      // Ignorar linhas que sejam apenas indicação de clã (ex: "Clã recomendado: Void")
      if(/cl[ãa]\s*recomendad/i.test(ln)) return;
      if(/^cl[ãa]\b/i.test(ln)) return;
      if(/\[Move\s*\d+\]|\[TM\s*\d+/i.test(ln)) return;
      if(/\bTM\b|\bMT\b/i.test(ln)){
        // extract name and optional number
        const nm = ln.replace(/\[?TM\]?[:\-#\s0-9]*/ig,'').trim();
        if(nm) tms.push({nome:nm});
        return;
      }
      if(ln.includes('/')){
        const parts = ln.split('/').map(x=>x.trim()).filter(Boolean);
        if(parts.length>=1){
          const nome = parts[0];
          if(nome && !moves.find(x=>x.nome.toLowerCase()===nome.toLowerCase())) moves.push({nome: nome, tipo: parts[2]||'', categoria: parts[3]||''});
        }
      }
      // short lines
      if(/^[A-Za-zÀ-ÿ0-9'\-\s]+$/.test(ln) && ln.length>2 && ln.length<60){
        if(!moves.find(x=>x.nome.toLowerCase()===ln.toLowerCase())) moves.push({nome:ln, tipo:'', categoria:''});
      }
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
    setTimeout(()=>{ try{ fetch(SHEETS_BASE_URL + '?action=ping').catch(()=>{}); }catch(e){} }, 800);
  }catch(e){}

  // Enviar golpes parseados para a planilha POKEDEX via Apps Script
  async function savePokedexMovesToSheet(pokemonName, moves, stats){
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
        fetch(SHEETS_BASE_URL, { method: 'POST', body: params }).catch(err=>{ console.warn('savePokedexMovesToSheet fetch err', err); });
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
      const n = (obj.nome||obj['NOME DO TM']||obj.NOME||obj['NOME']||obj.name||'').toString().toLowerCase().trim();
      if(num) byNumber.set(num, obj);
      if(n) byName.set(n, obj);
    });
    const lookup = {sourceName: candidates[0]&&candidates[0].name || null, byNumber, byName, raw: source};
    window.__tmLookup = lookup; return lookup;
  }

  function renderParsedMoves(parsed){
    // hide old parsed list if present
    const old = safe('parsedMovesList'); if(old) old.style.display = 'none';
    window._builder_parsed = parsed;

    // determine assignments and fill slots as before
    const maxSel = safe('selectMaxBaseMoves') ? parseInt(safe('selectMaxBaseMoves').value,10) : 9;
    const slots = Math.max(9, isNaN(maxSel) ? 9 : maxSel);
    const assignedArr = new Array(slots).fill(null);
    const remaining = [];
    (parsed.moves||[]).forEach((mv)=>{
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
    if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle();
    if(typeof reordenarGridMovesOrdenado === 'function') reordenarGridMovesOrdenado();
    if(typeof buscarPokemonsCompativeis === 'function') buscarPokemonsCompativeis();

    // render combined moves grid (Smeargle-like)
    const combined = safe('combinedMovesGrid'); if(combined) {
      combined.innerHTML = '';
      (parsed.moves||[]).forEach((mv, idx)=>{
        const slotBadge = mv.assignedSlot ? `<div class="slot-badge">M${mv.assignedSlot}</div>` : '';
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
          <div class="move-origem">${origemName}</div>
          <div class="move-slot-origem" style="font-size:0.95em;color:#ffd700;margin-top:6px;">
            <i class="fas fa-hashtag"></i> Slot: <b>M${mv.assignedSlot||''}</b>
          </div>
          <div class="move-actions" style="margin-top:8px;display:flex;gap:8px;align-items:center">
            <select id="parsed-slot-${idx}">${[...Array(slots)].map((_,i)=>`<option value="${i+1}" ${mv.assignedSlot===(i+1)?'selected':''}>M${i+1}</option>`).join('')}</select>
            <button data-idx="${idx}" class="btn-add-parsed">Adicionar</button>
            ${slotBadge}
          </div>
        `;
        card.addEventListener('click', function(ev){ if(ev.target && ev.target.classList && ev.target.classList.contains('btn-add-parsed')) return; openCombinedAssignInline(Object.assign({}, mv), mv.assignedSlot?mv.assignedSlot-1:0); });
        combined.appendChild(card);
      });
    }

    // render TMs into combined right grid as well
    renderParsedTms(parsed.tms||[]);
    // also populate inline assign (moves list + tms grid) if present
    try{ renderInlineAssign(parsed); }catch(e){}
  }

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
              <div class="move-origem">${tm.pokemon||''}</div>
              <div class="move-slot-origem">
                <i class="fas fa-hashtag"></i> Slot: <b>${slotOrig}</b>
              </div>
              <div class="move-actions">
                <select id="tm-slot-${i}">${slotOptions}</select>
                <button data-idx-tm="${i}" class="btn-add-tm" aria-label="Adicionar TM ${tm.nome || ''}" tabindex="0">Adicionar</button>
              </div>
            `;
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

  function renderParsedTms(tms){
    // default rendering for the right-hand TM panel
    // try common target ids for TM panels (compatibility): prefer combinedTmsGrid, fall back to builderTmsList
    const c = safe('combinedTmsGrid') || safe('builderTmsList'); if(!c) return; c.innerHTML='';
    if(!tms || tms.length===0){ c.innerHTML = '<div style="opacity:0.8">Nenhum TM detectado</div>'; return; }
    const grid = document.createElement('div'); grid.className='tm-grid';
    tms.forEach((tm,i)=>{
      const tile = document.createElement('div'); tile.className='tm-tile move-card builder-card'; tile.dataset.idx=i; tile.dataset.tmName = tm.nome || tm.name || '';
      (function(){
        let tipo = (tm.tipagem || tm.tipo || tm.type || '').toString().trim();
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
      tile.addEventListener('click', ()=>{
        window.builderMeta = window.builderMeta || {tms:[]};
        const name = tile.dataset.tmName;
        const exists = window.builderMeta.tms.find(x=> (x.nome||x).toString().toLowerCase()===name.toLowerCase());
        if(exists){ window.builderMeta.tms = window.builderMeta.tms.filter(x=> (x.nome||x).toString().toLowerCase()!==name.toLowerCase()); tile.classList.remove('selected'); }
        else{ window.builderMeta.tms.push({nome:name}); tile.classList.add('selected'); }
        updateTmCounter();
      });
      grid.appendChild(tile);
    });
    c.appendChild(grid);
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
        <div class="move-origem">${tm.pokemon||''}</div>
        <div class="move-slot-origem">
          <i class="fas fa-hashtag"></i> Slot: <b>${slotOrig3}</b>
        </div>
        <div class="move-actions">
          <select id="tm-slot-formove-${i}">${slotOptions3}</select>
          <button data-idx-tm="${i}" class="btn-add-tm" aria-label="Adicionar TM ${tm.nome || ''}" tabindex="0">Adicionar</button>
        </div>
      `;
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
  }

  function updateTmCounter(){ const el = safe('tmCountVal'); if(!el) return; const n = (window.builderMeta && Array.isArray(window.builderMeta.tms))?window.builderMeta.tms.length:0; el.textContent = n; }

  // Atualiza tipagens exibidas nos tiles de TM já renderizados.
  function refreshTmTypes(){
    try{
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
          if(tmNumero) found = todos.find(x=> String(x.numero||x.NUMERO||x['NUMERO DO TM']||'') === String(tmNumero));
          if(!found){
            const nm = displayName.toLowerCase().trim();
            found = todos.find(x=> ((x.nome||x['NOME DO TM']||x.NOME||'')+ '').toString().toLowerCase().trim() === nm || (((x.nome||x['NOME DO TM']||'')+ '').toString().toLowerCase().includes(nm)) || (nm.includes(((x.nome||x['NOME DO TM']||'')+ '').toString().toLowerCase().trim())) );
          }
          if(found){
            const tip = (found['TIPAGEM DO TM']||found.TIPAGEM||found.tipagem||found.tipo||found.type||'').toString().trim() || '';
            const tipoText = tip || 'TM';
            const tipoEl = tile.querySelector('.move-tipo');
            if(tipoEl) tipoEl.textContent = tipoText;
            // atualizar classe de tipo
            const tipoClass = (tip && tip.toString().trim()) ? tip.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,'') : 'normal';
            // remover classes type-* existentes
            tile.className = tile.className.split(/\s+/).filter(c=>!c.startsWith('type-')).join(' ') + ' type-' + tipoClass;
          }
        }catch(e){}
      });
    }catch(e){ console.error('refreshTmTypes error', e); }
  }
  window.refreshTmTypes = refreshTmTypes;

  // Expor parse/save para outras abas (Pokedex / Smeargle)
  try{
    window.parsePokedexText = parsePokedexText;
    window.savePokedexMovesToSheet = savePokedexMovesToSheet;
  }catch(e){}

  // delegated click handler for parse button (works even if element inserted later)
  document.addEventListener('click', function(e){
    try {
      const pb = e.target.closest ? e.target.closest('#btnParsePokedex') : null;
      if (pb) {
        console.log('builder: btnParsePokedex clicked');
        try{
          const txt = safe('pokedexPaste') ? safe('pokedexPaste').value : '';
          const parsed = parsePokedexText(txt);
          renderParsedMoves(parsed);
          // salvar automaticamente na planilha POKEDEX (Apps Script)
          try{
            if(parsed && parsed.meta && parsed.meta.nome && parsed.moves && parsed.moves.length){
              savePokedexMovesToSheet(parsed.meta.nome, parsed.moves, parsed.meta && parsed.meta.stats ? parsed.meta.stats : {}).then(res=>{
                if(res && res.success){ if(window.showToast) window.showToast('Pokedex salvo ✓','success'); else console.log('Pokedex salvo', res); }
                else { if(window.showToast) window.showToast('Erro salvando Pokedex','error'); else console.warn('Erro salvando Pokedex', res); }
              }).catch(err=>{ if(window.showToast) window.showToast('Erro salvando Pokedex','error'); else console.warn('Erro saving',err); });
            }
          }catch(e){ console.warn('auto-save Pokedex failed', e); }
          // visual feedback
          const original = pb.textContent;
          pb.textContent = 'Parseado ✓';
          setTimeout(()=>{ try{ pb.textContent = original } catch(e){} }, 900);
          } catch(err){
            console.error('Erro ao parsear Pokedex:', err);
            const msg = (err && err.message) ? err.message : String(err);
            alert('Erro ao parsear — ' + msg + '\nVeja console (F12) para mais detalhes.');
          }
      }
    } catch (err) { console.error('builder delegated click error', err); }
  });

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
      if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle();
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
            const nm = (tmName||'').toString().toLowerCase().trim();
            const badgeNumMatch = tile && tile.querySelector('.slot-badge') ? ((tile.querySelector('.slot-badge').textContent||'').match(/\d+/)||[])[0] : '';
            if(lookup){
              // tentar por número (normalizando)
              if(badgeNumMatch){
                const byNum = lookup.byNumber.get(String(badgeNumMatch));
                if(byNum) tmObj = byNum;
              }
              // tentar por nome
              if(!tmObj && lookup.byName){
                const byName = lookup.byName.get(nm);
                if(byName) tmObj = byName;
              }
              // se ainda não achou, varrer raw com correspondência flexível
              if(!tmObj && Array.isArray(lookup.raw)){
                const rawFound = lookup.raw.find(x=>{
                  try{
                    const nval = ((x.nome||x['NOME DO TM']||x.NOME||'')+ '').toString().toLowerCase();
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
      if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle();

      // defer heavier UI (inline modal/grid rendering) to allow paint and avoid jank
      setTimeout(()=>{
        try{ const moveObj = (typeof smeargleSelectedMoves !== 'undefined' ? smeargleSelectedMoves[slot-1] : window.smeargleSelectedMoves[slot-1]); openCombinedAssignInline(moveObj, slot-1); }catch(e){}
      }, 40);
    } catch(e) {
      // fallback (don't force tipo 'TM' — deixar vazio para que a resolução seja feita por obterTipoGolpe)
      window.smeargleSelectedMoves = window.smeargleSelectedMoves || new Array(9).fill(null);
      const origemName = 'TM';
      window.smeargleSelectedMoves[slot-1] = { nome: tmName, tipo: '', categoria: '', origem: origemName, numero: '', local: `M${slot}` };
      if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle();
    }
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
  }

  // try to init now if document ready
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(initBuilderUI, 50);
  } else {
    document.addEventListener('DOMContentLoaded', initBuilderUI);
  }

  // register initializer so SPA navigation can call it
  if(typeof registerPageInitializer !== 'undefined') registerPageInitializer('builder', function(){ initBuilderUI(); console.log('Builder initialized'); });

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
      if(typeof atualizarCardSmeargle === 'function') atualizarCardSmeargle();
      onClose();
    }
    // ensure we don't add duplicate listeners
    closeBtn && (closeBtn.onclick = onClose);
    saveBtn && (saveBtn.onclick = onSave);
  }

})();
