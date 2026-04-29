// =============================================
// MÓDULO ABILITIES - Carrega e exibe abilities
// =============================================

(function () {
    'use strict';

    const SCRIPT_URL = window.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';

    // Cache global das abilities carregadas
    window.todasAbilities = [];
    let abilitiesCarregadas = false;

    // --- Helpers ---

    // Normaliza string removendo acentos e convertendo para lowercase
    function norm(s) {
        try { return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
        catch (e) { return (s || '').toString().toLowerCase().trim(); }
    }

    // Gera caminho da imagem de um Pokémon (sticker)
    function pokemonImgSrc(nome) {
        const n = (nome || '').toString().trim();
        if (!n) return 'IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png';
        return 'IMAGENS/imagens-pokemon/stickers-pokemon/' + n + '.png';
    }

    // Fallback para imagem quebrada
    function imgFallback() {
        return "this.onerror=null;this.src='IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png';";
    }

    // Divide string de pokémons separados por vírgula e limpa espaços
    function splitPokemons(str) {
        return (str || '').toString().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    // --- Render: bloco colapsável de Pokémons com imagem e nome ---
    function renderCollapsiblePokemons(pokemonsStr, uniqueId) {
        var pokes = splitPokemons(pokemonsStr);
        if (!pokes.length) return '<span style="color:#888">—</span>';

        // Montar grid 3 colunas com nome + imagem
        var rows = [];
        for (var i = 0; i < pokes.length; i += 3) {
            var nameRow = '<tr>';
            var imgRow = '<tr>';
            for (var j = i; j < i + 3; j++) {
                var poke = pokes[j] || '';
                if (poke) {
                    nameRow += '<td style="width:200px;text-align:center;padding:4px 2px;color:#ffd700;font-size:0.92em;">' + poke + '</td>';
                    imgRow += '<td style="width:200px;text-align:center;padding:4px 2px;">' +
                        '<img src="' + pokemonImgSrc(poke) + '" alt="' + poke + '" ' +
                        'onerror="' + imgFallback() + '" ' +
                        'style="width:50px;height:50px;object-fit:contain;">' +
                        '</td>';
                } else {
                    nameRow += '<td style="width:200px;"></td>';
                    imgRow += '<td style="width:200px;"></td>';
                }
            }
            nameRow += '</tr>';
            imgRow += '</tr>';
            rows.push(nameRow);
            rows.push(imgRow);
        }

        return '<div class="collapsible-ability" onclick="toggleAbilityCollapse(this)">' +
            '<span class="collapsible-ability-label">Revelar (' + pokes.length + ')</span>' +
            '<i class="fas fa-chevron-down collapsible-ability-icon"></i>' +
            '</div>' +
            '<div class="collapsible-ability-content" style="display:none;max-height:400px;overflow-y:auto;">' +
            '<table align="center" style="margin:0 auto;">' +
            '<tbody>' + rows.join('') + '</tbody></table></div>';
    }

    // --- Render: bloco colapsável de EXTRA (texto livre) ---
    function renderCollapsibleExtra(extraStr, uniqueId) {
        var txt = (extraStr || '').toString().trim();
        if (!txt) return '<span style="color:#888">—</span>';

        return '<div class="collapsible-ability" onclick="toggleAbilityCollapse(this)">' +
            '<span class="collapsible-ability-label">Revelar detalhes</span>' +
            '<i class="fas fa-chevron-down collapsible-ability-icon"></i>' +
            '</div>' +
            '<div class="collapsible-ability-content" style="display:none;padding:10px;">' +
            '<div style="color:#e0e0e0;font-size:0.95em;line-height:1.5;">' + txt.replace(/\n/g, '<br>') + '</div>' +
            '</div>';
    }

    // --- Render: imagem do Pokémon de origem ---
    function renderOrigemPokemon(origemStr) {
        var nome = (origemStr || '').toString().trim();
        if (!nome) return '<span style="color:#888">—</span>';
        return '<div style="text-align:center;">' +
            '<img src="' + pokemonImgSrc(nome) + '" alt="' + nome + '" ' +
            'onerror="' + imgFallback() + '" ' +
            'style="width:50px;height:50px;object-fit:contain;">' +
            '<div style="font-size:0.85em;color:#ffd700;margin-top:2px;">' + nome + '</div></div>';
    }

    // Toggle global para colapsáveis
    window.toggleAbilityCollapse = function (el) {
        var content = el.nextElementSibling;
        var icon = el.querySelector('.collapsible-ability-icon');
        if (!content) return;
        if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            if (icon) icon.classList.add('rotated');
        } else {
            content.style.display = 'none';
            if (icon) icon.classList.remove('rotated');
        }
    };

    // --- Gera tabela HTML de abilities ---
    function gerarTabelaAbilities(abilities) {
        var isADM = window.isAdmin && window.isAdmin();

        var html = '<div style="overflow-x:auto;">' +
            '<table id="abilitiesTable" class="atk-table abilities-table" style="width:100%;border-collapse:collapse;color:#fff;font-size:14px;">' +
            '<thead><tr>' +
            '<th style="padding:8px 6px;background:#23284a;color:#ffd700;border-bottom:2px solid #ffd700;">ABILITY</th>' +
            '<th style="padding:8px 6px;background:#23284a;color:#ffd700;border-bottom:2px solid #ffd700;">DESCRIÇÃO</th>' +
            '<th style="padding:8px 6px;background:#23284a;color:#ffd700;border-bottom:2px solid #ffd700;">POKÉMON QUE APRENDE</th>' +
            '<th style="padding:8px 6px;background:#23284a;color:#ffd700;border-bottom:2px solid #ffd700;">EXTRA</th>' +
            '<th style="padding:8px 6px;background:#23284a;color:#ffd700;border-bottom:2px solid #ffd700;">ORIGEM POKÉMON</th>' +
            '<th style="padding:8px 6px;background:#23284a;color:#ffd700;border-bottom:2px solid #ffd700;min-width:180px;">SUGESTÃO</th>' +
            '</tr></thead><tbody>';

        for (var i = 0; i < abilities.length; i++) {
            var ab = abilities[i];
            var ability = ab['ABILITY'] || ab['ability'] || '';
            var descricao = ab['DESCRIÇÃO'] || ab['DESCRICAO'] || ab['descricao'] || '';
            var pokemonQueAprende = ab['POKEMON QUE APRENDE'] || ab['pokemon_que_aprende'] || '';
            var extra = ab['EXTRA'] || ab['extra'] || '';
            var origemPokemon = ab['ORIGEM POKEMON'] || ab['origem_pokemon'] || '';
            var sugestao = ab['SUGESTAO'] || ab['sugestao'] || '';
            var uid = 'ab_' + i;
            var abilityEsc = ability.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            // data attributes para filtros
            html += '<tr data-ability="' + norm(ability) + '" data-pokemons="' + norm(pokemonQueAprende) + '" data-origem="' + norm(origemPokemon) + '">';
            html += '<td style="padding:8px 6px;font-weight:600;color:#ffd700;">' + ability + '</td>';
            html += '<td style="padding:8px 6px;">' + descricao + '</td>';
            html += '<td style="padding:8px 6px;">' + renderCollapsiblePokemons(pokemonQueAprende, uid + '_poke') + '</td>';
            html += '<td style="padding:8px 6px;">' + renderCollapsibleExtra(extra, uid + '_extra') + '</td>';
            html += '<td style="padding:8px 6px;">' + renderOrigemPokemon(origemPokemon) + '</td>';

            // Coluna Sugestão
            var sugestoesHtml = '';
            if (sugestao) {
                var sugestArr = sugestao.split(' - ');
                if (isADM) {
                    sugestoesHtml = sugestArr.map(function(s, idx) {
                        return '<div style="margin-bottom:2px;font-size:12px;color:#ffd700;">' + s +
                            ' <button style="margin-left:4px;padding:1px 6px;border-radius:4px;background:#2ecc71;color:#fff;font-size:11px;cursor:pointer;" onclick="aprovarSugestaoAbility(\'' + abilityEsc + '\',' + idx + ')">Aprovar</button></div>';
                    }).join('');
                } else {
                    sugestoesHtml = sugestArr.map(function(s) {
                        return '<div style="margin-bottom:2px;font-size:12px;color:#ffd700;">' + s + '</div>';
                    }).join('');
                }
            }
            var adminHtml = '';
            if (isADM && sugestao) {
                adminHtml = '<div style="margin-top:4px;"><span style="color:#2ecc71;font-size:11px;">(ADM)</span></div>';
            }
            var actionBtn = '';
            if (isADM) {
                actionBtn = '<button class="btn-copiar-loc" style="background:rgba(255,215,0,0.15);border-color:rgba(255,215,0,0.4);color:#ffd700;" onclick="abrirModalEdicaoAbility(\'' + abilityEsc + '\')">' + '<i class="fas fa-edit"></i> Editar</button>';
            } else {
                actionBtn = '<button class="btn-copiar-loc" style="background:rgba(255,215,0,0.15);border-color:rgba(255,215,0,0.4);color:#ffd700;" onclick="abrirModalSugestaoAbility(\'' + abilityEsc + '\')">' + '<i class="fas fa-lightbulb"></i> Sugerir</button>';
            }
            var _abParts = [];
            var _sanitize = function(s) { return (s || '').toString().replace(/<[^>]*>/g, '').replace(/"/g, '"').replace(/'/g, "'").replace(/\n|\r/g, ' ').trim(); };
            if (ability) _abParts.push('ABILITY-' + _sanitize(ability));
            if (descricao) _abParts.push('DESCRIÇÃO-' + _sanitize(descricao));
            if (pokemonQueAprende) _abParts.push('POKÉMON QUE APRENDE-' + _sanitize(pokemonQueAprende));
            if (extra) _abParts.push('EXTRA-' + _sanitize(extra));
            if (origemPokemon) _abParts.push('ORIGEM POKÉMON-' + _sanitize(origemPokemon));
            var _abCopyText = _abParts.join('  ');
            var copyBtnAb = '<button class="btn-copiar-loc" onclick="(function(btn){var t=\'' + _abCopyText.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\';navigator.clipboard&&navigator.clipboard.writeText(t).then(function(){var i=btn.querySelector(\'i\');i.className=\'fas fa-check\';btn.classList.add(\'copiado\');setTimeout(function(){i.className=\'fas fa-copy\';btn.classList.remove(\'copiado\');},2000)}).catch(function(){var ta=document.createElement(\'textarea\');ta.value=t;ta.style.position=\'fixed\';ta.style.opacity=\'0\';document.body.appendChild(ta);ta.select();document.execCommand(\'copy\');document.body.removeChild(ta);var i=btn.querySelector(\'i\');i.className=\'fas fa-check\';btn.classList.add(\'copiado\');setTimeout(function(){i.className=\'fas fa-copy\';btn.classList.remove(\'copiado\');},2000)})})(this)" title="Copiar"><i class="fas fa-copy"></i> Copiar</button>';
            html += '<td style="padding:6px 4px;border-bottom:1px solid #23284a;text-align:center;min-width:180px;">' + sugestoesHtml + adminHtml + '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' + actionBtn + copyBtnAb + '</div></td>';

            html += '</tr>';
        }

        html += '</tbody></table></div>';
        return html;
    }

    // --- Popula filtros ---
    function popularFiltros(abilities) {
        // Filtro POKÉMON QUE APRENDE — extrai todos os Pokémon únicos de todas as abilities
        var pokemonSet = {};
        var origemSet = {};
        for (var i = 0; i < abilities.length; i++) {
            var ab = abilities[i];
            var pokes = splitPokemons(ab['POKEMON QUE APRENDE'] || ab['pokemon_que_aprende'] || '');
            for (var j = 0; j < pokes.length; j++) {
                pokemonSet[pokes[j]] = true;
            }
            var origem = (ab['ORIGEM POKEMON'] || ab['origem_pokemon'] || '').toString().trim();
            if (origem) origemSet[origem] = true;
        }

        var selPokemon = document.getElementById('abilityFilterPokemon');
        var selOrigem = document.getElementById('abilityFilterOrigem');

        if (selPokemon) {
            var sortedPokes = Object.keys(pokemonSet).sort();
            selPokemon.innerHTML = '<option value="">Todos</option>' +
                sortedPokes.map(function (p) { return '<option value="' + p + '">' + p + '</option>'; }).join('');
        }

        if (selOrigem) {
            var sortedOrigens = Object.keys(origemSet).sort();
            selOrigem.innerHTML = '<option value="">Todos</option>' +
                sortedOrigens.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join('');
        }
    }

    // --- Filtros e pesquisa ---
    function aplicarFiltros() {
        var searchVal = norm(document.getElementById('abilitySearch') ? document.getElementById('abilitySearch').value : '');
        var filterPokemon = (document.getElementById('abilityFilterPokemon') || {}).value || '';
        var filterOrigem = (document.getElementById('abilityFilterOrigem') || {}).value || '';

        var rows = document.querySelectorAll('#abilitiesTable tbody tr');
        rows.forEach(function (tr) {
            var abilityName = tr.getAttribute('data-ability') || '';
            var pokemons = tr.getAttribute('data-pokemons') || '';
            var origem = tr.getAttribute('data-origem') || '';

            var show = true;

            // Pesquisa texto livre (nome ability ou nome pokemon)
            if (searchVal) {
                show = show && (abilityName.indexOf(searchVal) !== -1 || pokemons.indexOf(searchVal) !== -1);
            }

            // Filtro Pokémon
            if (filterPokemon) {
                show = show && pokemons.indexOf(norm(filterPokemon)) !== -1;
            }

            // Filtro Origem
            if (filterOrigem) {
                show = show && origem === norm(filterOrigem);
            }

            tr.style.display = show ? '' : 'none';
        });
    }

    // --- Carregar dados do Google Sheets ---
    async function fetchAbilities() {
        try {
            var response = await fetch(SCRIPT_URL + '?acao=obter_abilities');
            var resultado = await response.json();
            if (resultado.success && resultado.data && resultado.data.length > 0) {
                window.todasAbilities = resultado.data;
                console.log('✅ Abilities carregadas:', window.todasAbilities.length);
            } else {
                window.todasAbilities = [];
                console.warn('⚠️ Nenhuma ability retornada:', resultado);
            }
        } catch (e) {
            window.todasAbilities = [];
            console.warn('⚠️ Erro ao carregar abilities:', e);
        }
    }

    // --- Pré-carregamento em background (chamado no setupStageTabs) ---
    window.preCarregarAbilities = async function () {
        if (window.todasAbilities && window.todasAbilities.length > 0) return;
        console.log('[Abilities] Pré-carregando dados em background...');
        await fetchAbilities();
        if (window.todasAbilities && window.todasAbilities.length > 0) {
            console.log('[Abilities] Dados pré-carregados:', window.todasAbilities.length, 'abilities');
        }
    };

    // --- Renderiza a tabela (dados já devem estar carregados) ---
    function renderAbilitiesTabela() {
        var wrap = document.getElementById('abilitiesTableWrap');
        if (!wrap) return;

        if (!window.todasAbilities || window.todasAbilities.length === 0) {
            wrap.innerHTML = '<div style="color:#ff6464">Nenhuma ability encontrada. Verifique se a aba ABILITYS existe na planilha.</div>';
            return;
        }

        wrap.innerHTML = gerarTabelaAbilities(window.todasAbilities);
        popularFiltros(window.todasAbilities);
        abilitiesCarregadas = true;

        // Vincular eventos de filtro e pesquisa
        var searchInput = document.getElementById('abilitySearch');
        var selPokemon = document.getElementById('abilityFilterPokemon');
        var selOrigem = document.getElementById('abilityFilterOrigem');
        var clearBtn = document.getElementById('abilityClearFilters');

        if (searchInput) searchInput.addEventListener('input', aplicarFiltros);
        if (selPokemon) selPokemon.addEventListener('change', aplicarFiltros);
        if (selOrigem) selOrigem.addEventListener('change', aplicarFiltros);
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                if (searchInput) searchInput.value = '';
                if (selPokemon) selPokemon.value = '';
                if (selOrigem) selOrigem.value = '';
                aplicarFiltros();
            });
        }

        console.log('[Abilities] Tabela renderizada com', window.todasAbilities.length, 'abilities');
    }

    // --- Função principal de carregamento e render ---
    window.carregarAbilitiesParaTabela = async function () {
        var wrap = document.getElementById('abilitiesTableWrap');
        if (!wrap) return;

        // Re-renderizar se o DOM foi recriado (tabela não existe mais no wrap)
        var tabelaExiste = wrap.querySelector('#abilitiesTable');
        if (abilitiesCarregadas && window.todasAbilities.length > 0 && tabelaExiste) return;

        // Se dados já foram pré-carregados, renderizar direto (instantâneo)
        if (window.todasAbilities && window.todasAbilities.length > 0) {
            renderAbilitiesTabela();
            return;
        }

        // Fallback: se ainda não carregou, mostrar loading e buscar
        wrap.innerHTML = '<div style="color:#ffd700"><i class="fas fa-spinner fa-spin"></i> Carregando abilities...</div>';
        await fetchAbilities();
        renderAbilitiesTabela();
    };

    // =============================================
    // EDIÇÃO / SUGESTÃO DE ABILITIES
    // =============================================

    // Helper para limpar aspas e barras invertidas
    function limparValor(val) {
        if (typeof val !== 'string') return val;
        try { return val.replace(/^\s*\\?"|\\?"\s*$/g, '').replace(/\\"/g, '"'); }
        catch (e) { return val; }
    }

    // --- Modal de sugestão (usuário comum) ---
    window.abrirModalSugestaoAbility = function (abilityName) {
        var user = {};
        try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { }
        if (!user.email) {
            showToast('Você precisa estar logado para sugerir!', 'error');
            return;
        }
        var modal = document.createElement('div');
        modal.id = 'modalSugestaoAbility';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML =
            '<div style="background:#23284a;padding:30px;border-radius:20px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:2px solid #ffd700;position:relative;">' +
            '<button onclick="document.getElementById(\'modalSugestaoAbility\').remove()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:#ffd700;font-size:24px;cursor:pointer;padding:5px 10px;line-height:1;z-index:10;" title="Fechar"><i class="fas fa-times"></i></button>' +
            '<h2 style="color:#ffd700;margin-bottom:18px;font-size:20px;">Sugerir alteração para: <br><span style="color:#fff">' + abilityName + '</span></h2>' +
            '<input id="inputSugestaoAbility" type="text" placeholder="Descreva sua sugestão..." style="width:100%;padding:12px;border-radius:10px;border:2px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:18px;">' +
            '<button id="btnEnviarSugestaoAbility" style="width:100%;padding:12px;background:#ffd700;color:#23284a;font-weight:bold;border:none;border-radius:10px;font-size:16px;cursor:pointer;">Enviar Sugestão</button>' +
            '</div>';
        document.body.appendChild(modal);
        document.getElementById('btnEnviarSugestaoAbility').onclick = function () {
            window.enviarSugestaoAbility(abilityName);
        };
    };

    // --- Enviar sugestão ---
    window.enviarSugestaoAbility = async function (abilityName) {
        var input = document.getElementById('inputSugestaoAbility');
        if (!input) return;
        var sugestao = input.value.trim();
        if (!sugestao) { showToast('Digite uma sugestão antes de enviar.', 'error'); return; }
        var user = {};
        try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { }
        if (!user.email) { showToast('Você precisa estar logado.', 'error'); return; }

        var btn = document.getElementById('btnEnviarSugestaoAbility');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'; }

        try {
            var form = new URLSearchParams();
            form.append('action', 'salvarSugestaoAbility');
            form.append('ability', abilityName);
            form.append('sugestao', sugestao);
            form.append('email', user.email || '');
            form.append('authToken', user.authToken || '');
            var resp = await fetch(SCRIPT_URL, { method: 'POST', body: form });
            var json = {};
            try { json = await resp.json(); } catch (e) { try { json = JSON.parse(await resp.text()); } catch (_) { } }
            if (json.sucesso || json.success) {
                var el = document.getElementById('modalSugestaoAbility');
                if (el) el.remove();
                showToast('Sugestão enviada com sucesso!', 'success');
                // Atualizar cache local
                var ab = (window.todasAbilities || []).find(function (a) { return (a['ABILITY'] || '') === abilityName; });
                if (ab) {
                    var atual = ab['SUGESTAO'] || '';
                    var txt = user.email + ': ' + sugestao;
                    ab['SUGESTAO'] = atual ? atual + ' - ' + txt : txt;
                }
                abilitiesCarregadas = false;
                renderAbilitiesTabela();
            } else {
                showToast('Erro: ' + (json.mensagem || json.message || 'desconhecido'), 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = 'Enviar Sugestão'; }
            }
        } catch (e) {
            showToast('Erro ao enviar. Tente novamente.', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Enviar Sugestão'; }
        }
    };

    // --- Modal de edição (ADM) ---
    window.abrirModalEdicaoAbility = function (abilityName) {
        var ab = (window.todasAbilities || []).find(function (a) { return (a['ABILITY'] || '') === abilityName; });
        if (!ab) { showToast('Ability não encontrada!', 'error'); return; }

        var descricao = limparValor(ab['DESCRIÇÃO'] || ab['DESCRICAO'] || '');
        var pokemonQueAprende = limparValor(ab['POKEMON QUE APRENDE'] || ab['pokemon_que_aprende'] || '');
        var extra = limparValor(ab['EXTRA'] || ab['extra'] || '');
        var origemPokemon = limparValor(ab['ORIGEM POKEMON'] || ab['origem_pokemon'] || '');
        var sugestao = ab['SUGESTAO'] || ab['sugestao'] || '';

        // Listas únicas para datalists
        var getUnique = function (key) {
            var s = {};
            (window.todasAbilities || []).forEach(function (a) { var v = (a[key] || '').toString().trim(); if (v) s[v] = true; });
            return Object.keys(s).sort();
        };
        var origens = getUnique('ORIGEM POKEMON');

        var sugestoesHtml = '';
        var abilityEsc = abilityName.replace(/'/g, "\\'");
        if (sugestao) {
            sugestoesHtml = '<div style="margin-bottom:10px;font-size:13px;color:#ffd700;"><b>Sugestões pendentes:</b><br>' +
                sugestao.split(' - ').map(function (s, idx) {
                    return '<div style="margin-bottom:2px;">' + s +
                        ' <button style="margin-left:4px;padding:1px 6px;border-radius:4px;background:#2ecc71;color:#fff;font-size:11px;cursor:pointer;" onclick="aprovarSugestaoAbility(\'' + abilityEsc + '\',' + idx + ')">Aprovar</button></div>';
                }).join('') + '</div>';
        }

        var modal = document.createElement('div');
        modal.id = 'modalEdicaoAbility';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
        modal.innerHTML =
            '<div style="background:#23284a;padding:30px;border-radius:20px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:2px solid #ffd700;position:relative;max-height:90vh;overflow-y:auto;">' +
            '<button onclick="document.getElementById(\'modalEdicaoAbility\').remove()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:#ffd700;font-size:24px;cursor:pointer;padding:5px 10px;line-height:1;z-index:10;" title="Fechar"><i class="fas fa-times"></i></button>' +
            '<h2 style="color:#ffd700;margin-bottom:18px;font-size:20px;">Editar ability: <span style="color:#fff">' + abilityName + '</span></h2>' +
            sugestoesHtml +
            '<label style="color:#ffd700;font-size:14px;">Descrição:</label>' +
            '<textarea id="editDescAbility" rows="3" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;resize:vertical;">' + descricao + '</textarea>' +
            '<label style="color:#ffd700;font-size:14px;">Pokémon que aprende (separados por vírgula):</label>' +
            '<textarea id="editPokemonsAbility" rows="3" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;resize:vertical;">' + pokemonQueAprende + '</textarea>' +
            '<label style="color:#ffd700;font-size:14px;">Extra:</label>' +
            '<textarea id="editExtraAbility" rows="2" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:10px;resize:vertical;">' + extra + '</textarea>' +
            '<label style="color:#ffd700;font-size:14px;">Origem Pokémon:</label>' +
            '<input id="editOrigemAbility" type="text" value="' + origemPokemon.replace(/"/g, '&quot;') + '" list="datalistOrigemAbility" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ffd700;background:#181c2a;color:#fff;font-size:15px;margin-bottom:18px;">' +
            '<datalist id="datalistOrigemAbility">' + origens.map(function (v) { return '<option value="' + v + '">'; }).join('') + '</datalist>' +
            '<button id="btnSalvarEdicaoAbility" style="width:100%;padding:12px;background:#ffd700;color:#23284a;font-weight:bold;border:none;border-radius:10px;font-size:16px;cursor:pointer;">Salvar Alterações</button>' +
            '</div>';
        document.body.appendChild(modal);
        document.getElementById('btnSalvarEdicaoAbility').onclick = function () {
            window.salvarEdicaoAbility(abilityName);
        };
    };

    // --- Salvar edição (ADM) ---
    window.salvarEdicaoAbility = async function (abilityName) {
        var descricao = (document.getElementById('editDescAbility') || {}).value || '';
        var pokemonQueAprende = (document.getElementById('editPokemonsAbility') || {}).value || '';
        var extra = (document.getElementById('editExtraAbility') || {}).value || '';
        var origemPokemon = (document.getElementById('editOrigemAbility') || {}).value || '';

        descricao = descricao.trim();
        pokemonQueAprende = pokemonQueAprende.trim();
        extra = extra.trim();
        origemPokemon = origemPokemon.trim();

        var user = {};
        try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { }
        if (!user.email) { showToast('ADM não autenticado!', 'error'); return; }

        var btn = document.getElementById('btnSalvarEdicaoAbility');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }

        try {
            var form = new URLSearchParams();
            form.append('action', 'atualizarAbility');
            form.append('ability', abilityName);
            form.append('descricao', descricao);
            form.append('pokemonQueAprende', pokemonQueAprende);
            form.append('extra', extra);
            form.append('origemPokemon', origemPokemon);
            form.append('email', user.email || '');
            form.append('authToken', user.authToken || '');
            var resp = await fetch(SCRIPT_URL, { method: 'POST', body: form });
            var json = {};
            try { json = await resp.json(); } catch (e) { try { json = JSON.parse(await resp.text()); } catch (_) { } }
            if (json.sucesso || json.success) {
                var el = document.getElementById('modalEdicaoAbility');
                if (el) el.remove();
                showToast('Alterações salvas com sucesso!', 'success');
                // Atualizar cache local
                var ab = (window.todasAbilities || []).find(function (a) { return (a['ABILITY'] || '') === abilityName; });
                if (ab) {
                    ab['DESCRIÇÃO'] = descricao;
                    ab['POKEMON QUE APRENDE'] = pokemonQueAprende;
                    ab['EXTRA'] = extra;
                    ab['ORIGEM POKEMON'] = origemPokemon;
                }
                abilitiesCarregadas = false;
                renderAbilitiesTabela();
            } else {
                showToast('Erro ao salvar: ' + (json.mensagem || json.message || 'desconhecido'), 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = 'Salvar Alterações'; }
            }
        } catch (e) {
            showToast('Erro ao salvar. Tente novamente.', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Salvar Alterações'; }
        }
    };

    // --- Aprovar sugestão (ADM) ---
    window.aprovarSugestaoAbility = async function (abilityName, idx) {
        if (!window.isAdmin || !window.isAdmin()) {
            showToast('Apenas ADM pode aprovar sugestões.', 'error');
            return;
        }
        if (!confirm('Aprovar e remover esta sugestão?')) return;

        var user = {};
        try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { }

        try {
            var form = new URLSearchParams();
            form.append('action', 'aprovarSugestaoAbility');
            form.append('ability', abilityName);
            form.append('idx', idx);
            form.append('email', user.email || '');
            form.append('authToken', user.authToken || '');
            var resp = await fetch(SCRIPT_URL, { method: 'POST', body: form });
            var json = {};
            try { json = await resp.json(); } catch (e) { try { json = JSON.parse(await resp.text()); } catch (_) { } }
            if (json.sucesso || json.success) {
                showToast('Sugestão aprovada!', 'success');
                // Atualizar cache local
                var ab = (window.todasAbilities || []).find(function (a) { return (a['ABILITY'] || '') === abilityName; });
                if (ab) {
                    var arr = (ab['SUGESTAO'] || '').split(' - ');
                    arr.splice(idx, 1);
                    ab['SUGESTAO'] = arr.join(' - ');
                }
                abilitiesCarregadas = false;
                renderAbilitiesTabela();
            } else {
                showToast('Erro: ' + (json.mensagem || json.message || 'desconhecido'), 'error');
            }
        } catch (e) {
            showToast('Erro ao aprovar. Tente novamente.', 'error');
        }
    };

})();
