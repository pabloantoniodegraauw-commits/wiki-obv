// Função global para envio de sugestão de ataque
window.enviarSugestaoAtack = async function(atackName) {
    const input = document.getElementById('sugestao_' + atackName);
    if (!input) return;
    const sugestao = input.value.trim();
    if (!sugestao) {
        showToast('Digite uma sugestão antes de enviar.', 'error');
        return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.email) {
        showToast('Você precisa estar logado para sugerir.', 'error');
        return;

    // Listener para atualizar tabela STAGE visualmente ao receber o evento de atualização
    document.addEventListener('stageAttackUpdated', function (ev) {
        try {
            const d = ev && ev.detail ? ev.detail : null;
            if (!d) return;
            const atackName = (d.atack || d.nomeAtack || '').toString().trim();
            if (!atackName) return;
            const normName = atackName.toLowerCase();
            let updated = false;

            // Estratégia 1: linhas marcadas com data-attack / data-field
            Array.from(document.querySelectorAll('[data-attack]')).forEach(row => {
                try {
                    if ((row.getAttribute('data-attack') || '').trim().toLowerCase() === normName) {
                        row.querySelectorAll('[data-field]').forEach(el => {
                            const key = (el.getAttribute('data-field') || '').toLowerCase();
                            if (!key) return;
                            const val = d.dados && (d.dados[key] ?? d.dados[key.replace(/-/g, '')]);
                            if (val !== undefined) el.textContent = val === null ? '' : String(val);
                        });
                        updated = true;
                    }
                } catch (e) { /* ignore row errors */ }
            });

            // Estratégia 2: procurar tabelas com classe .stage-changes-table e mapear por cabeçalho
            if (!updated) {
                Array.from(document.querySelectorAll('.stage-changes-table')).forEach(table => {
                    try {
                        const headers = Array.from(table.querySelectorAll('thead th')).map(h => (h.textContent || '').trim().toUpperCase());
                        const idx = {};
                        headers.forEach((h, i) => { if (h) idx[h] = i; });
                        const body = table.querySelector('tbody') || table;
                        Array.from(body.querySelectorAll('tr')).forEach(tr => {
                            const cells = Array.from(tr.querySelectorAll('td'));
                            if (!cells || cells.length === 0) return;
                            const attackCell = (idx['ATACK'] !== undefined) ? cells[idx['ATACK']] : cells[0];
                            if (!attackCell) return;
                            if ((attackCell.textContent || '').trim().toLowerCase() === normName) {
                                const map = {
                                    'AÇÃO': ['acaoAtack', 'acao'],
                                    'EFEITO': ['efeito'],
                                    'TYPE': ['tipo'],
                                    'CATEGORIA': ['categoria'],
                                    'PP': ['pp'],
                                    'POWER': ['power'],
                                    'ACCURACY': ['accuracy'],
                                    'GEN': ['gen']
                                };
                                Object.keys(map).forEach(hdr => {
                                    if (idx[hdr] !== undefined && cells[idx[hdr]]) {
                                        const keys = map[hdr];
                                        let val = '';
                                        for (const k of keys) { if (d.dados && d.dados[k] !== undefined) { val = d.dados[k]; break; } }
                                        cells[idx[hdr]].textContent = val === undefined || val === null ? '' : String(val);
                                    }
                                });
                                // pequeno destaque visual
                                tr.style.transition = 'background 0.25s';
                                tr.style.background = 'rgba(46,204,113,0.12)';
                                setTimeout(() => { tr.style.background = ''; }, 1200);
                                updated = true;
                            }
                        });
                    } catch (e) { /* ignore table errors */ }
                });
            }

            // Estratégia 3: fallback — procurar qualquer célula com o texto do ataque e atualizar a mesma linha
            if (!updated) {
                const allCells = Array.from(document.querySelectorAll('td,th'));
                for (const cell of allCells) {
                    try {
                        if ((cell.textContent || '').trim().toLowerCase() === normName) {
                            const tr = cell.closest('tr');
                            if (!tr) continue;
                            // tenta atualizar células por posição aproximada (procura cabeçalho na mesma tabela)
                            const table = cell.closest('table');
                            let headers = [];
                            if (table) headers = Array.from(table.querySelectorAll('thead th')).map(h => (h.textContent || '').trim().toUpperCase());
                            const idx = {};
                            headers.forEach((h, i) => { if (h) idx[h] = i; });
                            const cells = Array.from(tr.querySelectorAll('td'));
                            const map = {
                                'AÇÃO': ['acaoAtack', 'acao'],
                                'EFEITO': ['efeito'],
                                'TYPE': ['tipo'],
                                'CATEGORIA': ['categoria'],
                                'PP': ['pp'],
                                'POWER': ['power'],
                                'ACCURACY': ['accuracy'],
                                'GEN': ['gen']
                            };
                            Object.keys(map).forEach(hdr => {
                                if (idx[hdr] !== undefined && cells[idx[hdr]]) {
                                    const keys = map[hdr];
                                    let val = '';
                                    for (const k of keys) { if (d.dados && d.dados[k] !== undefined) { val = d.dados[k]; break; } }
                                    cells[idx[hdr]].textContent = val === undefined || val === null ? '' : String(val);
                                }
                            });
                            tr.style.transition = 'background 0.25s';
                            tr.style.background = 'rgba(46,204,113,0.12)';
                            setTimeout(() => { tr.style.background = ''; }, 1200);
                            updated = true;
                            break;
                        }
                    } catch (e) { }
                }
            }

            if (!updated) console.log('stageAttackUpdated: nenhum elemento atualizado para', atackName);
        } catch (err) {
            console.warn('Erro no listener stageAttackUpdated', err);
        }
    });
    }
    input.disabled = true;
    const btn = input.nextElementSibling;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando'; }
    try {
        const form = new URLSearchParams();
        form.append('action', 'sugerirEdicaoAtack');
        form.append('atack', atackName);
        form.append('sugestao', sugestao);
        form.append('email', user.email || '');
        form.append('authToken', user.authToken || '');
        const resp = await fetch(window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec', {
            method: 'POST',
            body: form
        });
        let json = {};
        try { json = await resp.json(); } catch (e) { try { const txt = await resp.text(); json = JSON.parse(txt || '{}'); } catch (_) { json = {}; } }
        if (json.sucesso || json.success) {
            input.value = '';
            showToast('Sugestão enviada para aprovação!', 'success');
        } else {
            showToast('Erro ao enviar sugestão: ' + (json.mensagem || json.message || resultado), 'error');
        }
    } catch (e) {
        showToast('Erro ao enviar sugestão. Tente novamente.', 'error');
    }
    input.disabled = false;
    if (btn) { btn.disabled = false; btn.innerHTML = 'Enviar'; }
};
// Função para carregar e exibir ataques na aba Atacks
window.carregarAtacksParaTabela = async function() {
    const atacksPage = document.getElementById('atacksPage');
    if (!atacksPage) return;
    atacksPage.innerHTML = '<div style="color:#ffd700">Carregando ataques...</div>';

    // Função para renderizar tabela
    function renderTabela() {
        if (!window.todosAtacks || !Array.isArray(window.todosAtacks) || window.todosAtacks.length === 0) {
            atacksPage.innerHTML = '<div style="color:#ff6464">Nenhum ataque encontrado.</div>';
            return;
        }
        const headers = ['ATACK', 'AÇÃO', 'EFEITO', 'TYPE', 'CATEGORIA', 'PP', 'POWER', 'ACCURACY', 'GEN', 'Sugestão'];

        // construir valores únicos para filtros (estilo Pokedex)
        const tipos = [...new Set(window.todosAtacks.map(a => String(a['TYPE']||a.type||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
        const categorias = [...new Set(window.todosAtacks.map(a => String(a['CATEGORIA']||a.categoria||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
        const acoes = [...new Set(window.todosAtacks.map(a => String(a['AÇÃO']||a.acao||a.action||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));

        const filtroHtml = `
            <div class="pokedex-filters-panel" style="margin-top:8px;">
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-fire"></i> Tipo</label>
                    <select id="atacksFilterTipo" class="filter-select"><option value="">Todos</option>${tipos.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
                </div>
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-list"></i> Categoria</label>
                    <select id="atacksFilterCategoria" class="filter-select"><option value="">Todos</option>${categorias.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
                </div>
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-bolt"></i> Ação</label>
                    <select id="atacksFilterAcao" class="filter-select"><option value="">Todos</option>${acoes.map(a=>`<option value="${a}">${a}</option>`).join('')}</select>
                </div>
                <div class="filter-group" style="flex:1;min-width:180px;">
                    <label class="filter-label"><i class="fas fa-search"></i> Pesquisar</label>
                    <input type="text" id="atacksSearch" class="filter-select" placeholder="Buscar registro..." style="width:100%;box-sizing:border-box;">
                </div>
                <button id="atacksClearFilters" class="filter-clear-btn"><i class="fas fa-times"></i> Limpar Filtros</button>
            </div>`;

        let table = filtroHtml + '<div style="overflow-x:auto"><table id="atacksDataTable" class="atk-table display" style="width:100%;border-collapse:collapse;background:#181c2a;color:#fff;font-size:14px;">';
        table += '<thead><tr>' + headers.map(h => `<th style=\"padding:8px 6px;background:#23284a;color:#ffd700;border-bottom:2px solid #ffd700;\">${h}</th>`).join('') + '</tr></thead>';
        table += '<tbody>';
        for (const atk of window.todosAtacks) {
            const atackAttr = String(atk['ATACK'] || atk.atack || '').replace(/"/g, '&quot;');
            const tipoAttr = String(atk['TYPE'] || atk.type || '').replace(/"/g, '&quot;');
            const categoriaAttr = String(atk['CATEGORIA'] || atk.categoria || '').replace(/"/g, '&quot;');
            const acaoAttr = String(atk['AÇÃO'] || atk.acao || atk.action || '').replace(/"/g, '&quot;');
            table += '<tr data-attack="' + atackAttr + '" data-type="' + tipoAttr + '" data-category="' + categoriaAttr + '" data-action="' + acaoAttr + '">';
            for (const h of headers) {
                if (h === 'Sugestão') {
                    let sugestoes = atk['SUGESTAO_ATACKS'] || atk['SUGESTÃO_ATACKS'] || '';
                    let sugestoesHtml = '';
                    if (sugestoes) {
                        sugestoesHtml = `<div style=\"margin-bottom:4px;font-size:12px;color:#ffd700;\">${sugestoes.split(' - ').map(s => `<div style=\"margin-bottom:2px;\">${s}</div>`).join('')}</div>`;
                    }
                    let adminHtml = '';
                    const isADM = window.isAdmin && window.isAdmin();
                    // Botão de aprovar para cada sugestão
                    if (isADM && sugestoes) {
                        sugestoesHtml = sugestoes.split(' - ').map((s, idx) =>
                            `<div style=\"margin-bottom:2px;\">${s} <button style=\"margin-left:4px;padding:1px 6px;border-radius:4px;background:#2ecc71;color:#fff;font-size:11px;cursor:pointer;\" onclick=\"aprovarSugestaoAtack('${atk['ATACK']}',${idx})\">Aprovar</button></div>`
                        ).join('');
                        adminHtml = `<div style=\"margin-top:4px;\"><span style=\"color:#2ecc71;font-size:11px;\">(ADM)</span></div>`;
                    }
                    // Botão editar para ADM, botão sugestão para usuário comum
                    let actionBtn = '';
                    if (isADM) {
                        actionBtn = `<button style=\"margin-top:6px;padding:2px 10px;border-radius:5px;background:#ffd700;color:#23284a;font-weight:bold;cursor:pointer;font-size:13px;\" onclick=\"abrirModalEdicaoAtack('${atk['ATACK']}')\">Editar</button>`;
                    } else {
                        actionBtn = `<button style=\"margin-top:6px;padding:2px 10px;border-radius:5px;background:#ffd700;color:#23284a;font-weight:bold;cursor:pointer;font-size:13px;\" onclick=\"abrirModalSugestaoAtack('${atk['ATACK']}')\">Sugerir</button>`;
                    }
                    table += `<td style=\"padding:6px 4px;border-bottom:1px solid #23284a;text-align:center;min-width:180px;\">${sugestoesHtml}${adminHtml}${actionBtn}</td>`;
                // Modal de sugestão para ataque (usuário comum)
                window.abrirModalSugestaoAtack = function(atackName) {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    if (!user.email) {
                        showToast('Você precisa estar logado para sugerir!', 'error');
                        return;
                    }
                    const modal = document.createElement('div');
                    modal.id = 'modalSugestaoAtack';
                    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
                    modal.innerHTML = `
                        <div style="background:#23284a;padding:30px;border-radius:20px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:2px solid #ffd700;position:relative;">
                            <button onclick="document.getElementById('modalSugestaoAtack').remove()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:#ffd700;font-size:24px;cursor:pointer;padding:5px 10px;line-height:1;z-index:10;" title="Fechar"><i class="fas fa-times"></i></button>
                            <h2 style="color:#ffd700;margin-bottom:18px;font-size:20px;">Sugerir alteração para: <br><span style='color:#fff'>${atackName}</span></h2>
                            <input id="inputSugestaoModal" type="text" placeholder="Descreva sua sugestão..." style="width:100%;padding:12px;border-radius:10px;border:2px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:18px;">
                            <button onclick="enviarSugestaoAtackModal('${atackName}')" style="width:100%;padding:12px;background:#ffd700;color:#23284a;font-weight:bold;border:none;border-radius:10px;font-size:16px;cursor:pointer;">Enviar Sugestão</button>
                        </div>
                    `;
                    document.body.appendChild(modal);
                };

                window.enviarSugestaoAtackModal = function(atackName) {
                    const input = document.getElementById('inputSugestaoModal');
                    if (!input) return;
                    const sugestao = input.value.trim();
                    if (!sugestao) { showToast('Digite uma sugestão antes de enviar.', 'error'); return; }
                    document.getElementById('modalSugestaoAtack').remove();
                    window.enviarSugestaoAtack(atackName, sugestao);
                };

                // Modal de edição para ataque (ADM)
                window.abrirModalEdicaoAtack = function(atackName) {
                                        // Função para limpar aspas e barras invertidas
                                        function limparValor(val) {
                                            if (typeof val !== 'string') return val;
                                            try {
                                                return val.replace(/^\s*\\?"|\\?"\s*$/g, '').replace(/\\"/g, '"');
                                            } catch (e) { return val; }
                                        }
                    const atk = (window.todosAtacks || []).find(a => a['ATACK'] === atackName);
                    if (!atk) { showToast('Ataque não encontrado!', 'error'); return; }
                    const modal = document.createElement('div');
                    modal.id = 'modalEdicaoAtack';
                    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
                    // Gerar listas únicas para cada campo
                    const getUnique = (key) => [...new Set((window.todosAtacks||[]).map(a => a[key]||'').filter(Boolean))].sort();
                    const tipos = getUnique('TYPE');
                    const categorias = getUnique('CATEGORIA');
                    const acoes = getUnique('AÇÃO');
                    const efeitos = getUnique('EFEITO');
                    const gens = getUnique('GEN');
                    const pps = getUnique('PP');
                    const powers = getUnique('POWER');
                    const accuracies = getUnique('ACCURACY');
                    let sugestoes = atk['SUGESTAO_ATACKS'] || atk['SUGESTÃO_ATACKS'] || '';
                    let sugestoesHtml = '';
                    if (sugestoes) {
                        sugestoesHtml = `<div style=\"margin-bottom:10px;font-size:13px;color:#ffd700;\"><b>Sugestões pendentes:</b><br>` +
                            sugestoes.split(' - ').map((s, idx) =>
                                `<div style=\"margin-bottom:2px;\">${s} <button style=\"margin-left:4px;padding:1px 6px;border-radius:4px;background:#2ecc71;color:#fff;font-size:11px;cursor:pointer;\" onclick=\"aprovarSugestaoAtack('${atk['ATACK']}',${idx})\">Aprovar</button></div>`
                            ).join('') + '</div>';
                    }
                    modal.innerHTML = `
                        <div style="background:#23284a;padding:30px;border-radius:20px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:2px solid #ffd700;position:relative;">
                            <button onclick="document.getElementById('modalEdicaoAtack').remove()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:#ffd700;font-size:24px;cursor:pointer;padding:5px 10px;line-height:1;z-index:10;" title="Fechar"><i class="fas fa-times"></i></button>
                            <h2 style="color:#ffd700;margin-bottom:18px;font-size:20px;">Editar ataque: <span style='color:#fff'>${atk['ATACK']}</span></h2>
                            ${sugestoesHtml}
                            <label style="color:#ffd700;font-size:14px;">Ação:</label>
                            <input id="editAcaoAtack" type="text" value="${limparValor(atk['AÇÃO']) || ''}" list="datalistAcaoAtack" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;">
                            <datalist id="datalistAcaoAtack">${acoes.map(v=>`<option value="${v}">`).join('')}</datalist>
                            <label style="color:#ffd700;font-size:14px;">Efeito:</label>
                            <input id="editEfeitoAtack" type="text" value="${limparValor(atk['EFEITO']) || ''}" list="datalistEfeitoAtack" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;">
                            <datalist id="datalistEfeitoAtack">${efeitos.map(v=>`<option value="${v}">`).join('')}</datalist>
                            <label style="color:#ffd700;font-size:14px;">Tipo:</label>
                            <input id="editTipoAtack" type="text" value="${limparValor(atk['TYPE']) || ''}" list="datalistTipoAtack" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;">
                            <datalist id="datalistTipoAtack">${tipos.map(v=>`<option value="${v}">`).join('')}</datalist>
                            <label style="color:#ffd700;font-size:14px;">Categoria:</label>
                            <input id="editCategoriaAtack" type="text" value="${limparValor(atk['CATEGORIA']) || ''}" list="datalistCategoriaAtack" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;">
                            <datalist id="datalistCategoriaAtack">${categorias.map(v=>`<option value="${v}">`).join('')}</datalist>
                            <label style="color:#ffd700;font-size:14px;">PP:</label>
                            <input id="editPPAtack" type="number" value="${limparValor(atk['PP']) || ''}" list="datalistPPAtack" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;">
                            <datalist id="datalistPPAtack">${pps.map(v=>`<option value="${v}">`).join('')}</datalist>
                            <label style="color:#ffd700;font-size:14px;">Power:</label>
                            <input id="editPowerAtack" type="number" value="${limparValor(atk['POWER']) || ''}" list="datalistPowerAtack" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;">
                            <datalist id="datalistPowerAtack">${powers.map(v=>`<option value="${v}">`).join('')}</datalist>
                            <label style="color:#ffd700;font-size:14px;">Accuracy:</label>
                            <input id="editAccuracyAtack" type="number" value="${limparValor(atk['ACCURACY']) || ''}" list="datalistAccuracyAtack" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;">
                            <datalist id="datalistAccuracyAtack">${accuracies.map(v=>`<option value="${v}">`).join('')}</datalist>
                            <label style="color:#ffd700;font-size:14px;">GEN:</label>
                            <input id="editGenAtack" type="text" value="${limparValor(atk['GEN']) || ''}" list="datalistGenAtack" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:18px;">
                            <datalist id="datalistGenAtack">${gens.map(v=>`<option value="${v}">`).join('')}</datalist>
                            <button onclick="salvarEdicaoAtack('${atk['ATACK']}')" style="width:100%;padding:12px;background:#ffd700;color:#23284a;font-weight:bold;border:none;border-radius:10px;font-size:16px;cursor:pointer;">Salvar Alterações</button>
                        </div>
                    `;
                    document.body.appendChild(modal);
                };

                window.salvarEdicaoAtack = async function(atackName) {
                                        // Validação de campos obrigatórios
                                        function campoObrigatorio(id, nome) {
                                            const el = document.getElementById(id);
                                            if (!el || !el.value || el.value.trim() === '') {
                                                showToast(`O campo "${nome}" é obrigatório!`, 'error');
                                                return undefined;
                                            }
                                            return el.value.trim();
                                        }
                                        const acaoAtack = campoObrigatorio('editAcaoAtack', 'Ação');
                                        const tipo = campoObrigatorio('editTipoAtack', 'Tipo');
                                        const categoria = campoObrigatorio('editCategoriaAtack', 'Categoria');
                                        if ([acaoAtack, tipo, categoria].includes(undefined)) return;
                                        // Campos opcionais: permitir apagar/limpar 'Efeito' e 'GEN'
                                        const elEfeito = document.getElementById('editEfeitoAtack');
                                        const efeito = elEfeito && elEfeito.value ? elEfeito.value.trim() : '';
                                        const elGen = document.getElementById('editGenAtack');
                                        const gen = elGen && elGen.value ? elGen.value.trim() : '';

                                        // Se o campo 'Efeito' foi limpo, pedir confirmação ao usuário
                                        let confirmClearedEfeito = false;
                                        if (!efeito) {
                                            const ok = confirm('Você apagou o campo "Efeito". Deseja confirmar a remoção do efeito deste ataque?');
                                            if (!ok) return; // abortar salvamento
                                            confirmClearedEfeito = true;
                                        }
                                        // ...existing code...
                                        // ...existing code...
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    if (!user.email) { showToast('ADM não autenticado!', 'error'); return; }
                    // Corrigir campos numéricos inválidos
                    function parseNum(val) {
                        if (val === undefined || val === null) return '';
                        if (typeof val === 'string' && val.trim() === '') return '';
                        if (val === '∞' || val === '∞%' || val === '∞%') return '';
                        const n = Number(val);
                        return isNaN(n) ? '' : n;
                    }
                    // Recuperar nomePokemon, slot e nomeAtack
                    const nomePokemon = atackName;
                    const slot = 'acao'; // Ajuste conforme o slot real se necessário
                    const nomeAtack = acaoAtack;
                    const dados = {
                        acao: 'atualizar',
                        efeito,
                        tipo,
                        categoria,
                        pp: parseNum(document.getElementById('editPPAtack').value),
                        power: parseNum(document.getElementById('editPowerAtack').value),
                        accuracy: parseNum(document.getElementById('editAccuracyAtack').value),
                        gen,
                        acaoAtack,
                        nomePokemon,
                        slot,
                        nomeAtack
                    };
                    const btn = document.querySelector('#modalEdicaoAtack button');
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                    try {
                        const form = new URLSearchParams();
                        form.append('action', 'atualizar');
                        form.append('atack', atackName);
                        form.append('efeito', efeito || '');
                        form.append('tipo', tipo || '');
                        form.append('categoria', categoria || '');
                        form.append('pp', dados.pp || '');
                        form.append('power', dados.power || '');
                        form.append('accuracy', dados.accuracy || '');
                        form.append('gen', gen || '');
                        form.append('acaoAtack', acaoAtack || '');
                        form.append('nomePokemon', nomePokemon || '');
                        form.append('slot', slot || '');
                        form.append('nomeAtack', nomeAtack || '');
                        form.append('email', user.email || '');
                        form.append('authToken', user.authToken || '');
                        const resp = await fetch(window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec', {
                            method: 'POST',
                            body: form
                        });
                        let json = {};
                        try { json = await resp.json(); } catch (e) { try { const txt = await resp.text(); json = JSON.parse(txt || '{}'); } catch (_) { json = {}; } }
                        if (json.sucesso || json.success) {
                            document.getElementById('modalEdicaoAtack').remove();
                            showToast(confirmClearedEfeito ? 'Efeito removido com sucesso!' : 'Alterações salvas!', 'success');
                            // Atualiza dados locais em window.todosAtacks para que a re-renderização reflita a mudança
                            try {
                                if (window.todosAtacks && Array.isArray(window.todosAtacks)) {
                                    const idx = window.todosAtacks.findIndex(a => ((a['ATACK'] || a.atack || '') + '').trim() === (atackName + '').trim());
                                    if (idx !== -1) {
                                        const entry = window.todosAtacks[idx];
                                        entry['AÇÃO'] = (typeof acaoAtack !== 'undefined') ? acaoAtack : entry['AÇÃO'];
                                        entry['TYPE'] = (typeof tipo !== 'undefined') ? tipo : entry['TYPE'];
                                        entry['CATEGORIA'] = (typeof categoria !== 'undefined') ? categoria : entry['CATEGORIA'];
                                        entry['EFEITO'] = (typeof efeito !== 'undefined') ? efeito : entry['EFEITO'];
                                        entry['PP'] = (typeof dados.pp !== 'undefined') ? dados.pp : entry['PP'];
                                        entry['POWER'] = (typeof dados.power !== 'undefined') ? dados.power : entry['POWER'];
                                        entry['ACCURACY'] = (typeof dados.accuracy !== 'undefined') ? dados.accuracy : entry['ACCURACY'];
                                        entry['GEN'] = (typeof gen !== 'undefined') ? gen : entry['GEN'];
                                        // manter campos de sugestão e outros inalterados
                                        window.todosAtacks[idx] = entry;
                                    }
                                }
                            } catch (e) { console.warn('Erro ao atualizar cache local de ataques', e); }
                            // Re-renderiza tabela de Atacks com dados atualizados
                            window.carregarAtacksParaTabela();
                            // Dispara evento para quem quiser atualizar a tabela de STAGE localmente
                            try {
                                const detalhe = {
                                    atack: atackName,
                                    nomeAtack: nomeAtack,
                                    slot: slot,
                                    dados: dados,
                                    resposta: json
                                };
                                document.dispatchEvent(new CustomEvent('stageAttackUpdated', { detail: detalhe }));
                                // Atualização imediata: substituir a linha do STAGE no DOM (mesma lógica dos cards)
                                try {
                                    atualizarStageNoDom(atackName, dados);
                                } catch (e) { console.warn('Erro ao propagar atualização STAGE localmente', e); }
                            } catch (e) { console.warn('Erro ao propagar atualização STAGE localmente', e); }
                        } else {
                            showToast('Erro ao salvar: ' + (json.mensagem || json.message || resultado), 'error');
                            btn.disabled = false;
                            btn.innerHTML = 'Salvar Alterações';
                        }
                    } catch (e) {
                        showToast('Erro ao salvar. Tente novamente.', 'error');
                        btn.disabled = false;
                        btn.innerHTML = 'Salvar Alterações';
                    }
                };
                } else {
                    table += `<td style=\"padding:6px 4px;border-bottom:1px solid #23284a;text-align:center;\">${atk[h] ?? ''}</td>`;
                }
            }
            table += '</tr>';
        }
        // Função global para aprovar sugestão de ataque (ADM)
        window.aprovarSugestaoAtack = async function(atackName, idx) {
            if (!window.isAdmin || !window.isAdmin()) {
                showToast('Apenas ADM pode aprovar sugestões.', 'error');
                return;
            }
            const atks = window.todosAtacks || [];
            const atk = atks.find(a => a['ATACK'] === atackName);
            if (!atk) return;
            let sugestoes = atk['SUGESTAO_ATACKS'] || atk['SUGESTÃO_ATACKS'] || '';
            let arr = sugestoes.split(' - ');
            const sugestao = arr[idx];
            if (!sugestao) return;
            if (!confirm('Aprovar esta sugestão e aplicar na tabela real?')) return;
            // Enviar para o backend
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            try {
                const form = new URLSearchParams();
                form.append('action', 'aprovarSugestaoAtack');
                form.append('atack', atackName);
                form.append('sugestao', sugestao);
                form.append('email', user.email || '');
                form.append('authToken', user.authToken || '');
                const resp = await fetch(window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec', {
                    method: 'POST',
                    body: form
                });
                let json = {};
                try { json = await resp.json(); } catch (e) { try { const txt = await resp.text(); json = JSON.parse(txt || '{}'); } catch (_) { json = {}; } }
                    if (json.sucesso || json.success) {
                    showToast('Sugestão aprovada e aplicada!', 'success');
                    // Remover sugestão aprovada da lista local
                    arr.splice(idx, 1);
                    atk['SUGESTAO_ATACKS'] = arr.join(' - ');
                    window.carregarAtacksParaTabela();
                } else {
                    showToast('Erro ao aprovar: ' + (json.mensagem || json.message || resultado), 'error');
                }
            } catch (e) {
                showToast('Erro ao aprovar sugestão. Tente novamente.', 'error');
            }
        };
        table += '</tbody></table></div>';
        atacksPage.innerHTML = table;
        // Pós-processamento: adicionar atributos data-field nas células para compatibilidade com o listener
        try {
            const tbl = document.getElementById('atacksDataTable');
            if (tbl) {
                const headersTxt = Array.from(tbl.querySelectorAll('thead th')).map(h => (h.textContent || '').trim().toUpperCase());
                const fieldMap = {
                    'ATACK': 'atack',
                    'AÇÃO': 'acaoAtack',
                    'EFEITO': 'efeito',
                    'TYPE': 'tipo',
                    'CATEGORIA': 'categoria',
                    'PP': 'pp',
                    'POWER': 'power',
                    'ACCURACY': 'accuracy',
                    'GEN': 'gen'
                };
                const idxToField = headersTxt.map(h => fieldMap[h] || '');
                const tbodyRows = tbl.querySelectorAll('tbody tr');
                tbodyRows.forEach(tr => {
                    Array.from(tr.querySelectorAll('td')).forEach((td, i) => {
                        const f = idxToField[i] || '';
                        if (f) td.setAttribute('data-field', f);
                    });
                });
            }
        } catch (e) { console.warn('Erro ao adicionar data-field na tabela de Atacks', e); }
        // Converter coluna TYPE em badges (usar classes definidas em css/style.css)
        function convertTypeBadges() {
            try {
                const tbl = document.getElementById('atacksDataTable');
                if (!tbl) return;
                const headers = Array.from(tbl.querySelectorAll('thead th')).map(h => (h.textContent || '').trim().toUpperCase());
                const typeIdx = headers.indexOf('TYPE');
                if (typeIdx === -1) return;
                const rows = tbl.querySelectorAll('tbody tr');
                const removeDiacritics = s => {
                    const str = (s || '').toString();
                    try { return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-'); }
                    catch (e) { return str.replace(/\s+/g, '-').toLowerCase(); }
                };
                rows.forEach(tr => {
                    try {
                        const tds = tr.querySelectorAll('td');
                        const td = tds[typeIdx];
                        if (!td) return;
                        const raw = (td.textContent || '').trim();
                        if (!raw) return;
                        const cls = removeDiacritics(raw).replace(/[^a-z0-9\-]/g, '');
                        td.innerHTML = `<span class="type-badge type-${cls}">${raw}</span>`;
                    } catch (e) { /* ignore row errors */ }
                });
            } catch (e) { console.warn('Erro ao converter TYPE em badges', e); }
        }
        // Inicializar DataTables após renderizar
        if (window.$ && window.$.fn && window.$.fn.DataTable) {
            $('#atacksDataTable').DataTable({
                responsive: true,
                pageLength: 100,
                order: [[0, 'asc']],
                searching: false,
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json'
                }
            });
            // reaplicar badges após DataTables inicializar
            try { convertTypeBadges(); } catch (e) { /* ignore */ }
        } else {
            console.warn('DataTables não encontrado!');
            try { convertTypeBadges(); } catch (e) { /* ignore */ }
        }
        // configurar listeners dos filtros na aba Atacks
        try {
            const selT = document.getElementById('atacksFilterTipo');
            const selC = document.getElementById('atacksFilterCategoria');
            const selA = document.getElementById('atacksFilterAcao');
            const inpS = document.getElementById('atacksSearch');
            function aplicarFiltroAtacks() {
                const vT = selT ? selT.value.toString().trim() : '';
                const vC = selC ? selC.value.toString().trim() : '';
                const vA = selA ? selA.value.toString().trim() : '';
                const vS = inpS ? inpS.value.toString().trim().toLowerCase() : '';
                const normalize = s => { try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); } catch(e){ return s.toLowerCase(); } };
                const rows = document.querySelectorAll('#atacksDataTable tbody tr');
                rows.forEach(r => {
                    try {
                        const rowType = (r.getAttribute('data-type') || '').toString().trim();
                        const rowCat = (r.getAttribute('data-category') || '').toString().trim();
                        const rowAction = (r.getAttribute('data-action') || '').toString().trim();
                        const rowText = vS ? normalize(r.textContent || '') : '';
                        let show = true;
                        if (vT) show = show && (normalize(rowType) === normalize(vT));
                        if (vC) show = show && (normalize(rowCat) === normalize(vC));
                        if (vA) show = show && (normalize(rowAction) === normalize(vA));
                        if (vS) show = show && rowText.includes(normalize(vS));
                        r.style.display = show ? '' : 'none';
                    } catch (e) { }
                });
            }
            if (selT) selT.addEventListener('change', aplicarFiltroAtacks);
            if (selC) selC.addEventListener('change', aplicarFiltroAtacks);
            if (selA) selA.addEventListener('change', aplicarFiltroAtacks);
            if (inpS) inpS.addEventListener('input', aplicarFiltroAtacks);
            const clearBtn = document.getElementById('atacksClearFilters');
            if (clearBtn) clearBtn.addEventListener('click', function(){
                if (selT) selT.value='';
                if (selC) selC.value='';
                if (selA) selA.value='';
                if (inpS) inpS.value='';
                aplicarFiltroAtacks();
            });
        } catch (e) { console.warn('Erro ao configurar filtros na aba Atacks', e); }
    }

    // Garante que os dados estejam carregados, mesmo se já estiverem sendo carregados em background
    if (typeof carregarDadosAtacks === 'function') {
        // Se já estiver carregando em background, aguarda até preencher
        let tentativas = 0;
        while ((!window.todosAtacks || window.todosAtacks.length === 0) && tentativas < 20) {
            await carregarDadosAtacks();
            if (window.todosAtacks && window.todosAtacks.length > 0) break;
            await new Promise(r => setTimeout(r, 300));
            tentativas++;
        }
    }
    renderTabela();
};
// Controle de abas para stagechanges
window.setupStageTabs = function() {
    var btnStage = document.getElementById('btnStage');
    var btnEffects = document.getElementById('btnEffects');
    var btnAtacks = document.getElementById('btnAtacks');
    var btnAbilities = document.getElementById('btnAbilities');
    var stagePage = document.getElementById('stagePage');
    var effectsPage = document.getElementById('effectsPage');
    var atacksPage = document.getElementById('atacksPage');
    var abilitiesPage = document.getElementById('abilitiesPage');
    var allBtns = [btnStage, btnEffects, btnAtacks, btnAbilities].filter(Boolean);
    var allPages = [stagePage, effectsPage, atacksPage, abilitiesPage].filter(Boolean);

    function switchTab(activeBtn, activePage, loadFn) {
        allBtns.forEach(function(b) { b.classList.remove('active'); });
        allPages.forEach(function(p) { p.style.display = 'none'; });
        if (activeBtn) activeBtn.classList.add('active');
        if (activePage) activePage.style.display = 'block';
        if (typeof loadFn === 'function') loadFn();
    }

    console.log('[Tabs] Inicializando tabs:', {btnStage, btnEffects, btnAtacks, btnAbilities, stagePage, effectsPage, atacksPage, abilitiesPage});
    if (btnStage && btnEffects && btnAtacks && stagePage && effectsPage && atacksPage) {
        console.log('[Tabs] Valor de window.carregarStageOuEfeitos:', window.carregarStageOuEfeitos);
        btnStage.onclick = function(e) {
            e.preventDefault();
            console.log('[Tabs] Clicou em Stage');
            switchTab(btnStage, stagePage, function() {
                if (typeof window.carregarStageOuEfeitos === 'function') {
                    console.log('[Tabs] Chamando window.carregarStageOuEfeitos("stage")');
                    window.carregarStageOuEfeitos('stage');
                }
            });
        };
        btnEffects.onclick = function(e) {
            e.preventDefault();
            console.log('[Tabs] Clicou em Efeitos');
            switchTab(btnEffects, effectsPage, function() {
                if (typeof window.carregarStageOuEfeitos === 'function') {
                    console.log('[Tabs] Chamando window.carregarStageOuEfeitos("efeitos")');
                    window.carregarStageOuEfeitos('efeitos');
                }
            });
        };
        btnAtacks.onclick = function(e) {
            e.preventDefault();
            console.log('[Tabs] Clicou em Atacks');
            switchTab(btnAtacks, atacksPage, function() {
                if (typeof carregarAtacksParaTabela === 'function') carregarAtacksParaTabela();
            });
        };
        if (btnAbilities && abilitiesPage) {
            btnAbilities.onclick = function(e) {
                e.preventDefault();
                console.log('[Tabs] Clicou em Abilities');
                switchTab(btnAbilities, abilitiesPage, function() {
                    if (typeof window.carregarAbilitiesParaTabela === 'function') window.carregarAbilitiesParaTabela();
                });
            };
        }
        // Carregar Atacks por padrão ao abrir a página
            if (typeof carregarAtacksParaTabela === 'function') carregarAtacksParaTabela();
        // Pré-carregar Abilities em background para exibição instantânea
            if (typeof window.preCarregarAbilities === 'function') window.preCarregarAbilities();
    } else {
        console.error('[Tabs] Elementos de tabs não encontrados:', {btnStage, btnEffects, btnAtacks, stagePage, effectsPage, atacksPage});
    }
};

    // Função para carregar e renderizar a tabela STAGE (compatível com o listener)
    window.carregarStageOuEfeitos = async function(mode) {
        try {
            const m = ((mode||'').toString().toLowerCase());
            const isEfeitos = m === 'efeitos';
            const isStage = m === 'stage';

            // textos estáticos
            const stageText = `
                <p>O sistema de Stage Changes para o otPokémon permite que os jogadores alterem temporariamente os atributos de seus Pokémon através de movimentos especiais. Alguns desses movimentos podem aumentar ou diminuir os atributos de Attack, Sp Attack, Defense, Sp Def e Speed em um ou mais estágios.</p>
                <p>Essas alterações são persistentes e não são canceladas quando o Pokémon é recolhido em sua Poké Ball, permitindo que o Pokémon mantenha o bônus ou penalidade durante a batalha. Cada estágio de alteração de atributo tem uma duração de 15 segundos.</p>
                <p>Os jogadores devem usar esses movimentos estrategicamente, pois eles podem ser uma vantagem significativa em batalha. No entanto, o efeito da mudança de estágio pode ser revertido pelos movimentos que alteram os estágios opostos, portanto, os jogadores devem estar cientes das fraquezas de seus próprios Pokémon e dos adversários para obter o máximo benefício dos movimentos Stage Changes.</p>
            `;
            const efeitosText = `
                <h2>Efeitos Negativos</h2>

                <p>Ao longo de suas jornadas como treinador Pokémon, é crucial compreender os diversos efeitos negativos que seus Pokémon podem enfrentar durante as batalhas. Estes estados prejudiciais podem afetar o desempenho do seu Pokémon, exigindo ações rápidas para restaurar sua condição ideal. Abaixo estão os principais efeitos negativos e seus impactos:</p>


                <p>🧪 POISON: Causa dano periódico ao Pokémon afetado, causando a perda de 40% da vida do Pokémon ao longo de seu efeito fora da Pokébola, dura 10 segundos. Se retornar para a Pokébola, o contador reinicia.</p>

                <p>💤 SLEEP: O Pokémon entra em um sono profundo, sendo impedido de se mover e atacar, dura 5 segundos. Se retornar para a Pokébola, o contador reinicia.</p>

                <p>🔥 BURN: Causa dano periódico ao Pokémon afetado, causando a perda de 20% da vida do Pokémon ao longo de seu efeito fora da Pokébola e fazendo o Pokémon perder 50% da sua força, dura 10 segundos. Se retornar para a Pokébola, o contador reinicia.</p>

                <p>❄️ FREEZE: O Pokémon é congelado, ele fica completamente imóvel e não pode realizar nenhuma ação, dura 5 segundos. Se retornar para a Pokébola, o contador reinicia.</p>

                <p>⚡ PARALYZE: Quando um Pokémon está paralisado, sua velocidade de movimento é reduzida e há uma chance de que ele não consiga realizar uma ação, dobra o tempo de recarga dos ataques de um Pokémon afetado, dura 10 segundos. Se retornar para a Pokébola, o contador reinicia.</p>

                <p>🌀 CONFUSION: Ainda não esta no game  ( O Pokémon do oponente tem 50% de chance de não atacar. Nesse caso eles causam um dano baixo em si mesmos, proporcional ao seu stat ofensivo ).</p>

                <p>❌ Importante: Esses efeitos não funcionam em Pokémon lendários, míticos ou bosses.</p>
                <p>🛡️ A habilidade Safeguard também impede todos os efeitos negativos.</p>

                <h3>❤️ Recuperação</h3>
                <p>Para lidar com esses efeitos negativos, você pode utilizar estratégias como:</p>

                <p>Nurse Joy NPC Nurse Joy: Visite um Centro Pokémon e fale com a Enfermeira Joy para curar completamente seus Pokémon.</p>
                <p>Full Heal Potions: Use potions específicas para o efeito ou utilize uma Full Heal para curar qualquer condição.</p>
            `;
            const container = document.getElementById('stagePage');
            const containerEffects = document.getElementById('effectsPage');
            if (!container || !containerEffects) return;

            // Garantir que temos os dados de ataques no client
            if ((!window.todosAtacks || !Array.isArray(window.todosAtacks) || window.todosAtacks.length === 0) && typeof carregarDadosAtacks === 'function') {
                try { await carregarDadosAtacks(); } catch (e) { /* ignore */ }
            }

            // helper que gera tabela HTML semelhante à aba Atacks
            function gerarTabelaHtml(atacksArray, tableId) {
                const headers = ['ATACK', 'AÇÃO', 'EFEITO', 'TYPE', 'CATEGORIA', 'PP', 'POWER', 'ACCURACY', 'GEN', 'Sugestão'];
                let table = `<div style="overflow-x:auto"><table id="${tableId}" class="atk-table display" style="width:100%;border-collapse:collapse;color:#fff;font-size:14px;">`;
                table += '<thead><tr>' + headers.map(h => `<th style="padding:8px 6px;background:#23284a;color:#ffd700;border-bottom:2px solid #ffd700;">${h}</th>`).join('') + '</tr></thead>';
                table += '<tbody>';
                for (const atk of atacksArray) {
                    const atackAttr = String(atk['ATACK'] || atk.atack || '').replace(/"/g, '&quot;');
                    const tipoAttr = String(atk['TYPE'] || atk.type || '').replace(/"/g, '&quot;');
                    const acaoAttr = String(atk['AÇÃO'] || atk.acao || atk.action || '').replace(/"/g, '&quot;');
                    const categoriaAttr = String(atk['CATEGORIA'] || atk.categoria || '').replace(/"/g, '&quot;');
                    table += '<tr data-attack="' + atackAttr + '" data-type="' + tipoAttr + '" data-action="' + acaoAttr + '" data-category="' + categoriaAttr + '">';
                    table += `<td>${atk['ATACK'] || atk.atack || ''}</td>`;
                    table += `<td>${atk['AÇÃO'] || atk.acao || ''}</td>`;
                    table += `<td>${atk['EFEITO'] || atk.efeito || ''}</td>`;
                    table += `<td>${atk['TYPE'] || atk.type || ''}</td>`;
                    table += `<td>${atk['CATEGORIA'] || atk.categoria || ''}</td>`;
                    table += `<td>${atk['PP'] || atk.pp || ''}</td>`;
                    table += `<td>${atk['POWER'] || atk.power || ''}</td>`;
                    table += `<td>${atk['ACCURACY'] || atk.accuracy || ''}</td>`;
                    table += `<td>${atk['GEN'] || atk.gen || ''}</td>`;
                    table += `<td style="text-align:center;min-width:140px;">` +
                        `<button onclick="abrirModalSugestaoAtack('${(atackAttr||'').replace(/'/g,"\\'")}')">Sugerir</button>` +
                        `</td>`;
                    table += '</tr>';
                }
                table += '</tbody></table></div>';
                return table;
            }

            // função para converter TYPE em badges (mesma lógica usada na Atacks)
            function aplicarBadgesESetup(tableId) {
                try {
                    const tbl = document.getElementById(tableId);
                    if (!tbl) return;
                    const headers = Array.from(tbl.querySelectorAll('thead th')).map(h => (h.textContent || '').trim().toUpperCase());
                    const typeIdx = headers.indexOf('TYPE');
                    const removeDiacritics = s => {
                        const str = (s || '').toString();
                        try { return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-'); }
                        catch (e) { return str.replace(/\s+/g, '-').toLowerCase(); }
                    };
                    if (typeIdx !== -1) {
                        const rows = tbl.querySelectorAll('tbody tr');
                        rows.forEach(tr => {
                            try {
                                const tds = tr.querySelectorAll('td');
                                const td = tds[typeIdx];
                                if (!td) return;
                                const raw = (td.textContent || '').trim();
                                if (!raw) return;
                                const cls = removeDiacritics(raw).replace(/[^a-z0-9\-]/g, '');
                                td.innerHTML = `<span class="type-badge type-${cls}">${raw}</span>`;
                            } catch (e) { }
                        });
                    }
                    // inicializar datatables se disponível
                    if (window.$ && window.$.fn && window.$.fn.DataTable) {
                        try { $('#' + tableId).DataTable({ responsive: true, pageLength: 100, order: [[0,'asc']], language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' } }); } catch (e) { /* ignore */ }
                    }
                } catch (e) { console.warn('Erro ao aplicar badges na tabela', e); }
            }

            if (isStage) {
                const all = window.todosAtacks || [];
                const norm = s => { try { return (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); } catch(e){return (s||'').toString().toLowerCase(); } };
                const filtered = all.filter(a => norm(a['AÇÃO']||a.acao||'').includes('stage'));
                // construir select de tipos únicos a partir do conjunto filtrado
                const tiposUnicos = [...new Set(filtered.map(a => (a['TYPE']||a.type||'').toString().trim()).filter(Boolean))].sort();
                const categoriasUnicas = [...new Set(filtered.map(a => (a['CATEGORIA']||a.categoria||'').toString().trim()).filter(Boolean))].sort();
                const selectHtml = `
                    <div class="pokedex-filters-panel" style="margin-top:8px;">
                        <div class="filter-group">
                            <label class="filter-label"><i class="fas fa-fire"></i> Tipo</label>
                            <select id="stageFilterTipo" class="filter-select"><option value="">Todos</option>${tiposUnicos.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label"><i class="fas fa-list"></i> Categoria</label>
                            <select id="stageFilterCategoria" class="filter-select"><option value="">Todos</option>${categoriasUnicas.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
                        </div>
                        <button id="stageClearFilters" class="filter-clear-btn"><i class="fas fa-times"></i> Limpar Filtros</button>
                    </div>`;
                container.innerHTML = stageText + selectHtml + '<div id="stageFilteredTableWrap">Carregando tabela...</div>';
                if (!filtered || filtered.length === 0) {
                    document.getElementById('stageFilteredTableWrap').innerHTML = '<div style="color:#ff6464">Nenhum ataque com AÇÃO contendo "stage" encontrado.</div>';
                } else {
                    document.getElementById('stageFilteredTableWrap').innerHTML = gerarTabelaHtml(filtered, 'stageAtacksTable');
                    aplicarBadgesESetup('stageAtacksTable');
                    // adicionar listeners dos selects para filtrar linhas sem recarregar
                    try {
                        const selTipo = document.getElementById('stageFilterTipo');
                        const selCat = document.getElementById('stageFilterCategoria');
                        function aplicarFiltroStage() {
                            const valTipo = (selTipo && selTipo.value) ? selTipo.value.toString().trim() : '';
                            const valCat = (selCat && selCat.value) ? selCat.value.toString().trim() : '';
                            const rows = document.querySelectorAll('#stageAtacksTable tbody tr');
                            rows.forEach(r => {
                                try {
                                    const rowType = (r.getAttribute('data-type') || '').toString().trim();
                                    const rowCat = (r.getAttribute('data-category') || '').toString().trim();
                                    const normalize = s => { try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); } catch(e){ return s.toLowerCase(); } };
                                    let show = true;
                                    if (valTipo) show = show && (normalize(rowType) === normalize(valTipo));
                                    if (valCat) show = show && (normalize(rowCat) === normalize(valCat));
                                    r.style.display = show ? '' : 'none';
                                } catch (e) { }
                            });
                        }
                            if (selTipo) selTipo.addEventListener('change', aplicarFiltroStage);
                            if (selCat) selCat.addEventListener('change', aplicarFiltroStage);
                            const clearBtn = document.getElementById('stageClearFilters');
                            if (clearBtn) clearBtn.addEventListener('click', function(){ if (selTipo) selTipo.value=''; if (selCat) selCat.value=''; aplicarFiltroStage(); });
                    } catch (e) { console.warn('Erro ao configurar filtro de TYPE/CATEGORIA na Stage', e); }
                }
                return;
            }

            if (isEfeitos) {
                const all = window.todosAtacks || [];
                const removeDiacriticsUpper = s => { try { return (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); } catch(e){ return (s||'').toString().toUpperCase(); } };
                const wanted = ['POISON','SLEEP','BURN','FREEZE','PARALYZE','CONFUSION'];
                const filtered = all.filter(a => {
                    const ac = removeDiacriticsUpper(a['AÇÃO']||a.acao||'');
                    return wanted.some(w => ac.includes(w));
                });
                // construir selects únicos para AÇÃO e TYPE a partir do conjunto filtrado
                const acoesUnicas = [...new Set(filtered.map(a => (a['AÇÃO']||a.acao||'').toString().trim()).filter(Boolean))].sort();
                const tiposUnicosEf = [...new Set(filtered.map(a => (a['TYPE']||a.type||'').toString().trim()).filter(Boolean))].sort();
                const categoriasUnicasEf = [...new Set(filtered.map(a => (a['CATEGORIA']||a.categoria||'').toString().trim()).filter(Boolean))].sort();
                const selectHtml = `
                    <div class="pokedex-filters-panel" style="margin-top:8px;">
                        <div class="filter-group">
                            <label class="filter-label"><i class="fas fa-bolt"></i> Ação</label>
                            <select id="effectsFilterAcao" class="filter-select"><option value="">Todos</option>${acoesUnicas.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label"><i class="fas fa-fire"></i> Tipo</label>
                            <select id="effectsFilterTipo" class="filter-select"><option value="">Todos</option>${tiposUnicosEf.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label"><i class="fas fa-list"></i> Categoria</label>
                            <select id="effectsFilterCategoria" class="filter-select"><option value="">Todos</option>${categoriasUnicasEf.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
                        </div>
                        <button id="effectsClearFilters" class="filter-clear-btn"><i class="fas fa-times"></i> Limpar Filtros</button>
                    </div>`;
                containerEffects.innerHTML = efeitosText + selectHtml + '<div id="effectsFilteredTableWrap">Carregando tabela...</div>';
                if (!filtered || filtered.length === 0) {
                    document.getElementById('effectsFilteredTableWrap').innerHTML = '<div style="color:#ff6464">Nenhum ataque de efeito encontrado.</div>';
                } else {
                    document.getElementById('effectsFilteredTableWrap').innerHTML = gerarTabelaHtml(filtered, 'effectsAtacksTable');
                    aplicarBadgesESetup('effectsAtacksTable');
                    // adicionar listeners para os selects de AÇÃO e TYPE
                    try {
                        const selA = document.getElementById('effectsFilterAcao');
                        const selT = document.getElementById('effectsFilterTipo');
                        const selC = document.getElementById('effectsFilterCategoria');
                        function aplicarFiltroEf() {
                            const valA = (selA && selA.value) ? selA.value.toString().trim() : '';
                            const valT = (selT && selT.value) ? selT.value.toString().trim() : '';
                            const valC = (selC && selC.value) ? selC.value.toString().trim() : '';
                            const rows = document.querySelectorAll('#effectsAtacksTable tbody tr');
                            rows.forEach(r => {
                                try {
                                    const rowAction = (r.getAttribute('data-action') || '').toString().trim();
                                    const rowType = (r.getAttribute('data-type') || '').toString().trim();
                                    const rowCat = (r.getAttribute('data-category') || '').toString().trim();
                                    const normalize = s => { try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); } catch(e){ return s.toLowerCase(); } };
                                    let show = true;
                                    if (valA) show = show && (normalize(rowAction) === normalize(valA));
                                    if (valT) show = show && (normalize(rowType) === normalize(valT));
                                    if (valC) show = show && (normalize(rowCat) === normalize(valC));
                                    r.style.display = show ? '' : 'none';
                                } catch (e) { }
                            });
                        }
                        if (selA) selA.addEventListener('change', aplicarFiltroEf);
                        if (selT) selT.addEventListener('change', aplicarFiltroEf);
                        if (selC) selC.addEventListener('change', aplicarFiltroEf);
                        const clearEf = document.getElementById('effectsClearFilters');
                        if (clearEf) clearEf.addEventListener('click', function(){ if (selA) selA.value=''; if (selT) selT.value=''; if (selC) selC.value=''; aplicarFiltroEf(); });
                    } catch (e) { console.warn('Erro ao configurar filtros na Efeitos', e); }
                }
                return;
            }
        } catch (err) {
            console.error('Erro ao carregar Stage:', err);
            const container = document.getElementById('stagePage');
            if (container) container.innerHTML = '<div style="color:#ff6464">Erro ao carregar Stage.</div>';
        }
    };

    // Reconstrói uma linha TR de Stage a partir dos dados (mesma estrutura de `carregarStageOuEfeitos`)
    function criarLinhaStageFromDados(dados) {
        const tr = document.createElement('tr');
        const atackName = (dados['ATACK'] || dados.atack || dados.nomeAtack || dados.acaoAtack || '').toString().trim();
        tr.setAttribute('data-attack', atackName);

        function mkTd(field, value) {
            const td = document.createElement('td');
            td.setAttribute('data-field', field);
            const span = document.createElement('span');
            span.textContent = value === undefined || value === null ? '' : String(value);
            td.appendChild(span);
            return td;
        }

        tr.appendChild(mkTd('atack', atackName));
        tr.appendChild(mkTd('acaoAtack', dados.acaoAtack || dados.acao || dados['AÇÃO'] || ''));
        tr.appendChild(mkTd('efeito', dados.efeito || dados['EFEITO'] || ''));
        tr.appendChild(mkTd('tipo', dados.tipo || dados['TYPE'] || ''));
        tr.appendChild(mkTd('categoria', dados.categoria || dados['CATEGORIA'] || ''));
        tr.appendChild(mkTd('pp', dados.pp || dados['PP'] || ''));
        tr.appendChild(mkTd('power', dados.power || dados['POWER'] || ''));
        tr.appendChild(mkTd('accuracy', dados.accuracy || dados['ACCURACY'] || ''));
        tr.appendChild(mkTd('gen', dados.gen || dados['GEN'] || ''));
        return tr;
    }

    // Atualiza a linha do ataque no DOM substituindo-a por uma nova (similar a atualizarCardNoDom)
    function atualizarStageNoDom(nomeAtack, dados) {
        try {
            const norm = (s) => (s || '').toString().trim().toLowerCase();
            const target = Array.from(document.querySelectorAll('[data-attack]')).find(r => norm(r.getAttribute('data-attack')) === norm(nomeAtack));
            const nova = criarLinhaStageFromDados(dados || {});
            if (target && target.parentNode) {
                target.parentNode.replaceChild(nova, target);
                // flash visual
                nova.style.transition = 'background 0.25s';
                nova.style.background = 'rgba(46,204,113,0.12)';
                setTimeout(() => { nova.style.background = ''; }, 1200);
                console.log('⚡ Linha STAGE substituída no DOM:', nomeAtack);
                return true;
            }
            // Se não encontrou, tentar inserir no tbody (no topo)
            const table = document.querySelector('.stage-changes-table tbody') || document.querySelector('.stage-changes-table');
            if (table) {
                table.insertBefore(nova, table.firstChild);
                nova.style.transition = 'background 0.25s';
                nova.style.background = 'rgba(46,204,113,0.12)';
                setTimeout(() => { nova.style.background = ''; }, 1200);
                console.log('⚡ Linha STAGE inserida no DOM (fallback):', nomeAtack);
                return true;
            }
            console.warn('⚠️ atualizarStageNoDom: tabela STAGE não encontrada para inserir/substituir linha');
            return false;
        } catch (err) {
            console.error('❌ Erro ao atualizar Stage no DOM:', err);
            return false;
        }
    }

// --- Toast notifications helper (global for this module) ---
function ensureToastContainer() {
    if (document.getElementById('toastContainer')) return document.getElementById('toastContainer');
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.style.position = 'fixed';
    c.style.right = '20px';
    c.style.top = '20px';
    c.style.zIndex = 20000;
    c.style.display = 'flex';
    c.style.flexDirection = 'column';
    c.style.gap = '8px';
    document.body.appendChild(c);
    return c;
}

function showToast(message, type) {
    try {
        const container = ensureToastContainer();
        const t = document.createElement('div');
        t.textContent = message;
        t.style.background = (type === 'success') ? '#2ecc71' : (type === 'error') ? '#ff6464' : '#ffd700';
        t.style.color = '#0b1220';
        t.style.padding = '10px 14px';
        t.style.borderRadius = '8px';
        t.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
        t.style.maxWidth = '320px';
        t.style.fontSize = '14px';
        t.style.opacity = '0';
        t.style.transition = 'opacity 0.18s, transform 0.18s';
        t.style.transform = 'translateY(-6px)';
        container.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
        const timeout = 3800;
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateY(-6px)';
            setTimeout(() => t.remove(), 220);
        }, timeout);
    } catch (e) { console.warn('Toast error', e); }
}