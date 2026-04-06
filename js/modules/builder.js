// Builder module: parses Pokedex paste and allows assembling a moveset
(function(){
  function safe(q){return document.getElementById(q)}

  function parsePokedexText(text){
    if(!text) return {moves:[], tms:[]};
    // simple existing robust parser: look for Move blocks and TM lines
    const meta = { nome: '', tipos: [], clan: '' };
    const moves = [];
    const tms = [];
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);

    // tentar extrair meta (Nome, Tipo, Clã) nas primeiras linhas
    for (let i=0;i<Math.min(20, lines.length); i++){
      const ln = lines[i];
      const nomeMatch = /^Nome:\s*(.+)/i.exec(ln);
      if(nomeMatch) meta.nome = nomeMatch[1].trim();
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
      if(meta.nome && meta.tipos.length>0) break;
    }

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

    return {moves, tms, meta};
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
          <div class="move-tipo-icon">⚡</div>
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
        const tile = document.createElement('div'); tile.className='tm-tile move-card'; tile.dataset.idx=i; tile.dataset.tmName = tm.nome || '';
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
            if(tipo) tile.className += ' type-'+tipo.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,'');
          })();
            const slotOrig = tm.numero ? tm.numero : '';
            tile.innerHTML = `
              <div class="move-tipo-icon">⚡</div>
              <div class="move-name">${tm.nome}</div>
              <div class="move-details">
                <span class="move-tipo">${(tm.tipo||tm.tipagem||'TM')}</span>
                <span class="move-categoria">${tm.categoria||''}</span>
              </div>
              <div class="move-acao" style="display:none"></div>
              <div class="move-efeito" style="display:none"></div>
              <div class="move-origem">${tm.pokemon||''}</div>
              <div class="move-slot-origem" style="font-size:0.95em;color:#ffd700;margin-top:2px;">
                <i class="fas fa-hashtag"></i> Slot: <b>${slotOrig}</b>
              </div>
              <div class="tm-number-badge">${tm.numero||''}</div>
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
      const tile = document.createElement('div'); tile.className='tm-tile move-card'; tile.dataset.idx=i; tile.dataset.tmName = tm.nome || tm.name || '';
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
        if(tipo) tile.className += ' type-'+tipo.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,'');
      })();
      const slotOrig2 = tm.numero ? tm.numero : '';
      tile.innerHTML = `
        <div class="move-tipo-icon">⚡</div>
        <div class="move-name">${tm.nome}</div>
        <div class="move-details">
          <span class="move-tipo">${(tm.tipo||tm.tipagem||'TM')}</span>
          <span class="move-categoria">${tm.categoria||''}</span>
        </div>
        <div class="move-acao" style="display:none"></div>
        <div class="move-efeito" style="display:none"></div>
        <div class="move-origem" style="display:none">${tm.pokemon||''}</div>
        <div class="move-slot-origem" style="font-size:0.95em;color:#ffd700;margin-top:2px;display:none;">
          <i class="fas fa-hashtag"></i> Slot: <b>${slotOrig2}</b>
        </div>
        <div class="tm-number-badge">${tm.numero||''}</div>
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
      const tile = document.createElement('div'); tile.className='tm-tile move-card'; tile.dataset.idx=i; tile.dataset.tmName = tm.nome || tm.name || '';
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
        if(tipo) tile.className += ' type-'+tipo.toString().toLowerCase().replace(/\s+/g,'-').normalize('NFD').replace(/[^\w\-]/g,'');
      })();
      const isSel = moveObj.tms.find(x=> (x.nome||x).toString().toLowerCase()===(tile.dataset.tmName||'').toLowerCase());
      if(isSel) tile.classList.add('selected');
      const slotOrig3 = tm.numero ? tm.numero : '';
      tile.innerHTML = `
        <div class="move-tipo-icon">⚡</div>
        <div class="move-name">${tm.nome}</div>
        <div class="move-details">
          <span class="move-tipo">${(tm.tipo||tm.tipagem||'TM')}</span>
          <span class="move-categoria">${tm.categoria||''}</span>
        </div>
        <div class="move-acao" style="display:none"></div>
        <div class="move-efeito" style="display:none"></div>
        <div class="move-origem">${tm.pokemon||''}</div>
        <div class="move-slot-origem" style="font-size:0.95em;color:#ffd700;margin-top:2px;">
          <i class="fas fa-hashtag"></i> Slot: <b>${slotOrig3}</b>
        </div>
        <div class="tm-number-badge">${tm.numero||''}</div>
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

  // init UI handlers (call when page is inserted or on DOM ready)
  function initBuilderUI(){
    const btn = safe('btnParsePokedex'); if(btn){ btn.removeEventListener && btn.removeEventListener('click', null); btn.addEventListener('click', ()=>{ const txt = safe('pokedexPaste')?safe('pokedexPaste').value:''; const parsed = parsePokedexText(txt); renderParsedMoves(parsed); }); }
    const btnClear = safe('btnClearPokedex'); if(btnClear){ btnClear.removeEventListener && btnClear.removeEventListener('click', null); btnClear.addEventListener('click', ()=>{ if(safe('pokedexPaste')) safe('pokedexPaste').value=''; if(safe('parsedMovesList')) safe('parsedMovesList').innerHTML=''; // clear the unified TM panel
      if(safe('combinedTmsGrid')) safe('combinedTmsGrid').innerHTML='';
      // legacy fallback
      if(safe('builderTmsList')) safe('builderTmsList').innerHTML='';
      window._builder_parsed = null; window.builderMeta = {tms:[]}; updateTmCounter(); }); }
    const submit = safe('btnSubmitBuild'); if(submit){ submit.removeEventListener && submit.removeEventListener('click', null); submit.addEventListener('click', ()=>{ console.log('Build submit', {moves: window.smeargleSelectedMoves, meta: window.builderMeta}); alert('Build submetido (veja console)'); }); }
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
          try{ if(typeof smeargleSelectedMoves !=='undefined'){ smeargleSelectedMoves[slotIndex] = smeargleSelectedMoves[slotIndex]||{}; smeargleSelectedMoves[slotIndex].tms = selTms; } else { window.smeargleSelectedMoves[slotIndex] = window.smeargleSelectedMoves[slotIndex]||{}; window.smeargleSelectedMoves[slotIndex].tms = selTms; } } catch(e){ window.smeargleSelectedMoves[slotIndex] = window.smeargleSelectedMoves[slotIndex]||{}; window.smeargleSelectedMoves[slotIndex].tms = selTms; }
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
