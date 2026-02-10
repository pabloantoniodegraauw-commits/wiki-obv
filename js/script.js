// 🔧 URL DO GOOGLE APPS SCRIPT - Configurado!
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec';
        
        // 🤖 OCR COM TESSERACT.JS - Totalmente gratuito e local!
        // Roda direto no navegador, sem APIs externas ou chaves
        // Carregado via CDN: https://cdn.jsdelivr.net/npm/tesseract.js
        
        // 🚀 Usando apenas Apps Script (ID da planilha protegido no servidor)
        const URL_DADOS = APPS_SCRIPT_URL + '?acao=obter_todos';
        
        let todosPokemons = [];
        let todosPokemonsCompleto = []; // Array com TODOS os dados para busca
        let todosTMs = [];
        let todosAtacks = [];
        let todasTasks = [];
        let usuarioLogado = null;
        let paginaAtual = 1;
        let carregandoMais = false;
        let temMaisPaginas = true;
        let dadosCompletosCarregados = false;
        let usarStickers = false; // false = database, true = stickers

        function isAdmin() {
            try {
                const u = JSON.parse(localStorage.getItem('user') || '{}');
                return !!u && u.role === 'admin';
            } catch (e) {
                return false;
            }
        }
        
        // 🔧 Função para normalizar nomes (remover acentos, espaços extras, etc)
        function normalizarNome(nome) {
            if (!nome) return '';
            return nome.toString()
                .toLowerCase()
                .trim()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                .replace(/\s+/g, ' '); // Remove espaços extras
        }
        
        const mapeamentoImagens = {
            // ESPECIAIS
            'Phione/Manaphy': 'manaphy',
            'Shiny Gloom': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',
            'shinygloom': 'https://wiki.pokememories.com/images/pokemons/shinygloom.png',
            
            // GALARIAN (usa -galarian)
            'Galarian Meowth': 'meowth-galarian',
            'Galarian Articuno': 'articuno-galarian',
            'Galarian Corsola': 'corsola-galarian',
            'Galarian Darumaka': 'darumaka-galarian',
            "Galarian Farfetch'd": 'farfetchd-galarian',
            'Galarian Linoone': 'linoone-galarian',
            'Galarian Moltres': 'moltres-galarian',
            'Galarian Mr. Mime': 'mrmime-galarian',
            'Galarian Ponyta': 'ponyta-galarian',
            'Galarian Rapidash': 'rapidash-galarian',
            'Galarian Slowbro': 'slowbro-galarian',
            'Galarian Slowking': 'slowking-galarian',
            'Galarian Slowpoke': 'slowpoke-galarian',
            'Galarian Standard Mode': 'darmanitan-galarian-standard',
            'Galarian Stunfisk': 'stunfisk-galarian',
            'Galarian Weezing': 'weezing-galarian',
            'Galarian Yamask': 'yamask-galarian',
            'Galarian Zapdos': 'zapdos-galarian',
            'Galarian Zen Mode': 'darmanitan-galarian-zen',
            'Galarian Zigzagoon': 'zigzagoon-galarian',
            
            // MEGAS (alguns usam /artwork/tmp/)
            'Mega Victreebel': 'victreebel-mega',
            'Mega Dragonite': 'dragonite-mega',
            'Mega Abomasnow': 'abomasnow-mega',
            'Mega Absol': 'absol-mega',
            'Mega Aerodactyl': 'aerodactyl-mega',
            'Mega Aggron': 'aggron-mega',
            'Mega Alakazam': 'alakazam-mega',
            'Mega Altaria': 'altaria-mega',
            'Mega Ampharos': 'ampharos-mega',
            'Mega Audino': 'audino-mega',
            'Mega Banette': 'banette-mega',
            'Mega Beedrill': 'beedrill-mega',
            'Mega Blastoise': 'blastoise-mega',
            'Mega Blaziken': 'blaziken-mega',
            'Mega Camerupt': 'camerupt-mega',
            'Mega Charizard X': 'charizard-mega-x',
            'Mega Charizard Y': 'charizard-mega-y',
            'Mega Diancie': 'diancie-mega',
            'Mega Gallade': 'gallade-mega',
            'Mega Garchomp': 'garchomp-mega',
            'Mega Gardevoir': 'gardevoir-mega',
            'Mega Gengar': 'gengar-mega',
            'Mega Glalie': 'glalie-mega',
            'Mega Gyarados': 'gyarados-mega',
            'Mega Heracross': 'heracross-mega',
            'Mega Houndoom': 'houndoom-mega',
            'Mega Kangaskhan': 'kangaskhan-mega',
            'Mega Latias': 'latias-mega',
            'Mega Latios': 'latios-mega',
            'Mega Lopunny': 'lopunny-mega',
            'Mega Lucario': 'lucario-mega',
            'Mega Manectric': 'manectric-mega',
            // ESPECIAIS
            'Phione/Manaphy': 'manaphy',
            'Mega Mawile': 'mawile-mega',
            'Mega Medicham': 'medicham-mega',
            'Mega Metagross': 'metagross-mega',
            'Mega Mewtwo X': 'mewtwo-mega-x',
            'Mega Mewtwo Y': 'mewtwo-mega-y',
            'Mega Pidgeot': 'pidgeot-mega',
            'Mega Pinsir': 'pinsir-mega',
            'Mega Rayquaza': 'rayquaza-mega',
            'Mega Sableye': 'sableye-mega',
            'Mega Salamence': 'salamence-mega',
            'Mega Sceptile': 'sceptile-mega',
            'Mega Scizor': 'scizor-mega',
            'Mega Sharpedo': 'sharpedo-mega',
            'Mega Slowbro': 'slowbro-mega',
            'Mega Steelix': 'steelix-mega',
            'Mega Swampert': 'swampert-mega',
            'Mega Tyranitar': 'tyranitar-mega',
            'Mega Venusaur': 'venusaur-mega',
            
            // FORMAS COM GÊNERO
            'Indeedee Female': 'indeedee-female',
            'Indeedee Male': 'indeedee-male',
            'Basculegion Male': 'basculegion-male',
            'Basculegion Female': 'basculegion-female',
            'Oinkologne Male': 'oinkologne-male',
            'Oinkologne Female': 'oinkologne-female',
            
            // OUTROS
            'Family of Four': 'maushold-family4',
            'Family of Three': 'maushold',
            'Nidoran♀': 'nidoran-f',
            'Nidoran♂': 'nidoran-m',
            "Farfetch'd": 'farfetchd',
            "Sirfetch'd": 'sirfetchd',
            'Combat Breed': 'tauros-paldean-combat',
            'Blaze Breed': 'tauros-paldean-blaze',
            'Aqua Breed': 'tauros-paldean-aqua',
            'Paldean Wooper': 'wooper-paldean',
            'Ice Rider': 'calyrex-ice-rider',
            'Shadow Rider': 'calyrex-shadow-rider',
            'Meganium': 'meganium'
        };
        
        async function carregarDados() {
            try {
                // Mostrar loading
                const container = document.getElementById('pokemonContainer');
                container.innerHTML = '<div style="text-align:center;padding:50px;color:#ffd700;"><i class="fas fa-spinner fa-spin" style="font-size:48px;"></i><p style="margin-top:20px;">Carregando Pokémons...</p></div>';

                console.log('⏳ Iniciando carregamento (paginado)...');
                const inicio = Date.now();

                // Carregar primeira página
                paginaAtual = 1;
                console.log('🚀 Carregando página 1...');
                console.log('🌐 URL usada para fetch:', `${URL_DADOS}&page=1&limit=100`);
                const resposta = await fetch(`${URL_DADOS}&page=1&limit=100`);
                console.log('🔎 Status da resposta:', resposta.status, resposta.statusText);
                const textoResposta = await resposta.text();
                console.log('📦 Conteúdo da resposta:', textoResposta.slice(0, 300));

                // Verificar se é JSON válido
                let resultado;
                try {
                    resultado = JSON.parse(textoResposta);
                    console.log('✅ Apps Script OK! JSON válido:', resultado);
                } catch (e) {
                    console.error('❌ Erro ao processar resposta do servidor:', e, textoResposta);
                    throw new Error('Erro ao processar resposta do servidor');
                }

                todosPokemons = resultado.data;
                temMaisPaginas = resultado.hasMore;

                const tempoDecorrido = Date.now() - inicio;
                console.log(`📥 Primeira página carregada em ${tempoDecorrido}ms:`, todosPokemons.length, 'de', resultado.total);

                // Se tem dados locais editados, aplicar as edições sobre os dados da planilha
                const dadosLocais = localStorage.getItem('pokemons_editados');
                if (dadosLocais && usuarioLogado) {
                    const editados = JSON.parse(dadosLocais);
                    console.log('💾 Mesclando', editados.length, 'edições locais');

                    // Mesclar edições locais com dados atualizados da planilha
                    editados.forEach(editado => {
                        const nomeEV = normalizarNome(editado.EV || '');
                        const nomePokemon = normalizarNome(editado.POKEMON || '');
                        const nomeEditado = nomeEV || nomePokemon;

                        const index = todosPokemons.findIndex(p => {
                            const nomeEVOriginal = normalizarNome(p.EV || '');
                            const nomePokemonOriginal = normalizarNome(p.POKEMON || '');
                            const nomeOriginal = nomeEVOriginal || nomePokemonOriginal;
                            return nomeOriginal === nomeEditado;
                        });

                        if (index !== -1) {
                            todosPokemons[index] = { ...todosPokemons[index], ...editado };
                        }
                    });

                    console.log('✓ Dados mesclados com edições locais');
                }

                document.getElementById('pokemonCount').textContent = resultado.total;
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('pt-BR').slice(0, 5);
                
                // Carregar TMs da aba TMs para cross-reference na Pokédex
                await carregarDadosTMs();
                
                renderizarPokemons(todosPokemons);

                // Configurar infinite scroll após primeiro carregamento
                if (temMaisPaginas) {
                    configurarInfiniteScroll();
                }
            } catch (erro) {
                const container = document.getElementById('pokemonContainer');
                if (!container) return; // Sair se o elemento não existir

                console.error('❌ Erro no carregamento dos dados:', erro);
                container.innerHTML = `
                    <div class="error">
                        <h3><i class="fas fa-exclamation-triangle"></i> Erro</h3>
                        <p>${erro.message}</p>
                        <button onclick="location.reload()" style="margin-top:20px;padding:10px 25px;background:#ffd700;color:#1a2980;border:none;border-radius:25px;font-weight:bold;cursor:pointer">
                            <i class="fas fa-redo"></i> Tentar novamente
                        </button>
                    </div>
                `;
            }
        }
        
        // ⭐ Tornar carregarDados acessível globalmente
        window.carregarDados = carregarDados;
        
        // Função auxiliar para buscar sugestão de localização independente do nome exato da coluna
        function obterSugestaoLocalizacao(pokemon) {
            // Chave ASCII limpa enviada pelo backend (coluna F, índice 5) - MAIS CONFIÁVEL
            if (pokemon['SUGESTAO_LOC']) return pokemon['SUGESTAO_LOC'];
            // Fallbacks por nome da coluna com acentos
            if (pokemon['SUGEST\u00C3O LOCALIZA\u00C7\u00C3O']) return pokemon['SUGEST\u00C3O LOCALIZA\u00C7\u00C3O'];
            if (pokemon['SUGEST\u00C3O DE LOCALIZA\u00C7\u00C3O']) return pokemon['SUGEST\u00C3O DE LOCALIZA\u00C7\u00C3O'];
            if (pokemon['SUGESTAO LOCALIZACAO']) return pokemon['SUGESTAO LOCALIZACAO'];
            // Busca genérica: remover acentos e comparar
            const chave = Object.keys(pokemon).find(k => {
                const ascii = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
                return ascii.includes('SUGEST') && ascii.includes('LOCAL');
            });
            return chave ? pokemon[chave] : '';
        }

        function renderizarPokemons(dados) {
            const container = document.getElementById('pokemonContainer');
            container.innerHTML = '';
            
            // Log para debug: mostrar as chaves do primeiro pokémon
            if (dados.length > 0) {
                console.log('🔍 Chaves do primeiro pokémon:', Object.keys(dados[0]));
                console.log('🔍 Valor sugestão:', obterSugestaoLocalizacao(dados[0]));
            }
            
            dados.forEach((pokemon, index) => {
                const numero = pokemon['PS'] || '';
                const nomePokemon = pokemon['POKEMON'] || 'Desconhecido';
                const tipo1 = pokemon['Type 1'] || 'Normal';
                const tipo2 = pokemon['Type 2'] || '';
                const evolucao = pokemon['EV'] || '';
                const localizacao = pokemon['LOCALIZAÇÃO'] || 'Não informado';
                const sugestaoLocalizacao = obterSugestaoLocalizacao(pokemon);
                const hp = pokemon['HP'] || '0';
                const ataque = pokemon['Attack'] || '0';
                const defesa = pokemon['Defense'] || '0';
                const ataqueEsp = pokemon['Sp.Attack'] || '0';
                const defesaEsp = pokemon['Sp.Defense'] || '0';
                const velocidade = pokemon['Speed'] || '0';
                
                // 📍 PROCESSAR LOCALIZAÇÃO COM FORMATAÇÃO
                let localizacaoHTML = '';
                if (localizacao && localizacao !== 'Não informado') {
                    const locais = localizacao.split(' / ');
                    let total = 0;
                    
                    localizacaoHTML = '<div style="line-height: 1.8;">';
                    locais.forEach(local => {
                        const match = local.match(/(\d+)un/);
                        if (match) total += parseInt(match[1]);
                        localizacaoHTML += `• ${local}<br>`;
                    });
                    if (total > 0) {
                        localizacaoHTML += `<br><strong style="color: #ffd700;">Total: ${total}un</strong>`;
                    }
                    localizacaoHTML += '</div>';
                } else {
                    localizacaoHTML = 'Não informado';
                }
                
                // LÓGICA: Se tem EV, usa EV. Senão, usa POKEMON
                const nomePrincipal = evolucao || nomePokemon;
                const nomeBase = evolucao ? nomePokemon : '';
                const nomeParaBusca = evolucao || nomePokemon;  // Nome usado para buscar/atualizar
                const imagemUrl = obterImagemPokemon(nomePrincipal, nomeBase);
                
                // ⭐ TMs da aba TMs (cross-reference) ⭐
                const tmsDoPokemons = obterTMsDoPokemon(nomePrincipal);
                // ⭐ Sugestões de TMs da comunidade (onde sugeriram este Pokémon)
                const sugestoesTMs = obterSugestoesTMsParaPokemon(nomePrincipal);
                
                const card = document.createElement('div');
                card.className = 'pokemon-card';
                card.setAttribute('data-pokemon-nome', nomeParaBusca);  // Nome para buscar (EV se tiver, senão POKEMON)
                card.innerHTML = `
                    ${evolucao ? `<span class="pokemon-evolution-badge">EV</span>` : ''}
                    <div class="img-container">
                        <img class="pokemon-img" src="${imagemUrl}" alt="${nomePrincipal}" onerror="this.onerror=null;this.src='IMAGENS/imagens-pokemon/sprite-pokemon/placeholder.png'">
                    </div>
                    ${numero ? `<div class="pokemon-number">#${numero}</div>` : ''}
                    <h3 class="pokemon-name">
                        ${nomePrincipal}
                    </h3>
                    ${nomeBase ? `<div class="pokemon-base">Forma base: ${nomeBase}</div>` : ''}
                    <div class="pokemon-types">
                        <span class="type-badge type-${tipo1.toLowerCase()}">${tipo1}</span>
                        ${tipo2 ? `<span class="type-badge type-${tipo2.toLowerCase()}">${tipo2}</span>` : ''}
                    </div>
                    <div class="pokemon-stats">
                        <div class="stat">
                            <div class="stat-value">${hp}</div>
                            <div class="stat-label">HP</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${ataque}</div>
                            <div class="stat-label">Ataque</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${defesa}</div>
                            <div class="stat-label">Defesa</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${ataqueEsp}</div>
                            <div class="stat-label">Sp.Atk</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${defesaEsp}</div>
                            <div class="stat-label">Sp.Def</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${velocidade}</div>
                            <div class="stat-label">Velocidade</div>
                        </div>
                    </div>
                    <div class="pokemon-location">
                        <div class="location-title">
                            <i class="fas fa-map-marker-alt"></i> Localização
                        </div>
                        ${localizacaoHTML}
                    </div>
                    ${sugestaoLocalizacao ? `
                    <div class="pokemon-suggestion">
                        <div class="suggestion-title">
                            <i class="fas fa-lightbulb"></i> Sugestão da Comunidade
                        </div>
                        <div>${sugestaoLocalizacao}</div>
                    </div>
                    ` : ''}
                    <!-- ⭐ SEÇÃO: TMs / Moves (da aba TMs) ⭐ -->
                    <div class="pokemon-tms">
                        <div class="tms-title">
                            <i class="fas fa-compact-disc"></i> TMs / Moves
                        </div>
                        <div class="tms-content">
                            ${gerarTMsHTML(tmsDoPokemons)}
                        </div>
                    </div>
                    ${gerarSugestoesTMsHTML(sugestoesTMs)}
                    <button class="btn-sugerir" onclick="abrirModalSugestaoUnificado('${nomeParaBusca.replace(/'/g, "\\'")}')">
                        <i class="fas fa-lightbulb"></i> Sugerir
                    </button>`;
                
                container.appendChild(card);
            });
            
            configurarBuscaInstantanea();
            setTimeout(() => {
                document.getElementById('searchInput').focus();
            }, 100);
            
            // Se o usuário está logado, recriar botões de admin
            if (usuarioLogado) {
                mostrarOpcoesAdmin();
            }
        }
        
        // Nova função: Infinite Scroll
        async function carregarMaisPokemos() {
            if (carregandoMais || !temMaisPaginas) return;
            
            carregandoMais = true;
            paginaAtual++;
            
            // Mostrar loading no final da página
            const container = document.getElementById('pokemonContainer');
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'loadingMore';
            loadingDiv.style.cssText = 'text-align:center;padding:30px;color:#ffd700;grid-column:1/-1;';
            loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:36px;"></i><p style="margin-top:15px;">Carregando mais...</p>';
            container.appendChild(loadingDiv);
            
            try {
                console.log(`🔄 Carregando página ${paginaAtual}...`);
                const inicio = Date.now();
                
                const resposta = await fetch(`${URL_DADOS}&page=${paginaAtual}&limit=100`);
                const resultado = await resposta.json();
                
                const tempoDecorrido = Date.now() - inicio;
                console.log(`📥 Página ${paginaAtual} carregada em ${tempoDecorrido}ms:`, resultado.data.length);
                
                // Adicionar novos pokémons ao array existente
                todosPokemons = todosPokemons.concat(resultado.data);
                temMaisPaginas = resultado.hasMore;
                
                // Remover loading
                loadingDiv.remove();
                
                // Renderizar apenas os novos pokémons
                resultado.data.forEach((pokemon) => {
                    const numero = pokemon['PS'] || '';
                    const nomePokemon = pokemon['POKEMON'] || 'Desconhecido';
                    const tipo1 = pokemon['Type 1'] || 'Normal';
                    const tipo2 = pokemon['Type 2'] || '';
                    const evolucao = pokemon['EV'] || '';
                    const localizacao = pokemon['LOCALIZAÇÃO'] || 'Não informado';
                    const sugestaoLocalizacao = obterSugestaoLocalizacao(pokemon);
                    const hp = pokemon['HP'] || '0';
                    const ataque = pokemon['Attack'] || '0';
                    const defesa = pokemon['Defense'] || '0';
                    const ataqueEsp = pokemon['Sp.Attack'] || '0';
                    const defesaEsp = pokemon['Sp.Defense'] || '0';
                    const velocidade = pokemon['Speed'] || '0';
                    const nomePrincipal = evolucao || nomePokemon;
                    const nomeBase = evolucao ? nomePokemon : '';
                    const nomeParaBusca = evolucao || nomePokemon;
                    const imagemUrl = obterImagemPokemon(nomePrincipal, nomeBase);
                    const tmsDoPokemons = obterTMsDoPokemon(nomePrincipal);
                    const sugestoesTMs = obterSugestoesTMsParaPokemon(nomePrincipal);
                    
                    // 📍 PROCESSAR LOCALIZAÇÃO COM FORMATAÇÃO
                    let localizacaoHTML = '';
                    if (localizacao && localizacao !== 'Não informado') {
                        const locais = localizacao.split(' / ');
                        let total = 0;
                        localizacaoHTML = '<div style="line-height: 1.8;">';
                        locais.forEach(local => {
                            const match = local.match(/(\d+)un/);
                            if (match) total += parseInt(match[1]);
                            localizacaoHTML += `• ${local}<br>`;
                        });
                        if (total > 0) {
                            localizacaoHTML += `<br><strong style="color: #ffd700;">Total: ${total}un</strong>`;
                        }
                        localizacaoHTML += '</div>';
                    } else {
                        localizacaoHTML = 'Não informado';
                    }
                    
                    const card = document.createElement('div');
                    card.className = 'pokemon-card';
                    card.setAttribute('data-pokemon-nome', nomeParaBusca);
                    card.innerHTML = `
                        ${evolucao ? `<span class="pokemon-evolution-badge">EV</span>` : ''}
                        <div class="img-container">
                            <img class="pokemon-img" src="${imagemUrl}" alt="${nomePrincipal}" onerror="this.onerror=null;this.src='IMAGENS/imagens-pokemon/sprite-pokemon/placeholder.png'">
                        </div>
                        ${numero ? `<div class="pokemon-number">#${numero}</div>` : ''}
                        <h3 class="pokemon-name">
                            ${nomePrincipal}
                        </h3>
                        ${nomeBase ? `<div class="pokemon-base">Forma base: ${nomeBase}</div>` : ''}
                        <div class="pokemon-types">
                            <span class="type-badge type-${tipo1.toLowerCase()}">${tipo1}</span>
                            ${tipo2 ? `<span class="type-badge type-${tipo2.toLowerCase()}">${tipo2}</span>` : ''}
                        </div>
                        <div class="pokemon-stats">
                            <div class="stat">
                                <div class="stat-value">${hp}</div>
                                <div class="stat-label">HP</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${ataque}</div>
                                <div class="stat-label">Ataque</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${defesa}</div>
                                <div class="stat-label">Defesa</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${ataqueEsp}</div>
                                <div class="stat-label">Sp.Atk</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${defesaEsp}</div>
                                <div class="stat-label">Sp.Def</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${velocidade}</div>
                                <div class="stat-label">Velocidade</div>
                            </div>
                        </div>
                        <div class="pokemon-location">
                            <div class="location-title">
                                <i class="fas fa-map-marker-alt"></i> Localização
                            </div>
                            ${localizacaoHTML}
                        </div>
                        ${sugestaoLocalizacao ? `
                        <div class="pokemon-suggestion">
                            <div class="suggestion-title">
                                <i class="fas fa-lightbulb"></i> Sugestão da Comunidade
                            </div>
                            <div>${sugestaoLocalizacao}</div>
                        </div>
                        ` : ''}
                        <!-- ⭐ SEÇÃO: TMs / Moves (da aba TMs) ⭐ -->
                        <div class="pokemon-tms">
                            <div class="tms-title">
                                <i class="fas fa-compact-disc"></i> TMs / Moves
                            </div>
                            <div class="tms-content">
                                ${gerarTMsHTML(tmsDoPokemons)}
                            </div>
                        </div>
                        ${gerarSugestoesTMsHTML(sugestoesTMs)}
                        <button class="btn-sugerir" onclick="abrirModalSugestaoUnificado('${nomeParaBusca.replace(/'/g, "\\'")}')"> 
                            <i class="fas fa-lightbulb"></i> Sugerir
                        </button>
                        ${isAdmin() ? `
                        <button class="btn-edit" onclick="abrirModalEdicao('${nomeParaBusca.replace(/'/g, "\\'")}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ` : ''}
                    `;
                    container.appendChild(card);
                });
                
                document.getElementById('pokemonCount').textContent = todosPokemons.length;
                
                console.log(`✅ Total de Pokémons: ${todosPokemons.length}`);
                
            } catch (erro) {
                console.error('❌ Erro ao carregar mais:', erro);
                if (loadingDiv.parentNode) {
                    loadingDiv.innerHTML = '<p style="color:#ff4444;">Erro ao carregar mais. <button onclick="carregarMaisPokemos()" style="margin-left:10px;padding:5px 15px;background:#ffd700;color:#1a2980;border:none;border-radius:15px;cursor:pointer;">Tentar novamente</button></p>';
                }
            } finally {
                carregandoMais = false;
            }
        }
        
        function configurarInfiniteScroll() {
            window.addEventListener('scroll', () => {
                if (carregandoMais || !temMaisPaginas) return;
                
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight;
                const clientHeight = document.documentElement.clientHeight;
                
                // Carregar mais quando chegar a 500px do final
                if (scrollTop + clientHeight >= scrollHeight - 500) {
                    carregarMaisPokemos();
                }
            });
        }
        
        function obterImagemPokemon(nomePrincipal, nomeBase, forceStickers = false) {
            // Remove "Boss " do início, se houver
            if (nomePrincipal) {
                nomePrincipal = nomePrincipal.replace(/^Boss\s+/i, '').trim();
            }
            if (nomeBase) {
                nomeBase = nomeBase.replace(/^Boss\s+/i, '').trim();
            }

            // Se forceStickers ativo ou usarStickers ativo, usar stickers locais
            // Stickers são salvos apenas com o nome do POKEMON (sem EV)
            if (forceStickers || usarStickers) {
                // Usa nomeBase (nome base do Pokémon, sem EV) se disponível, senão nomePrincipal
                const nomeSticker = (nomeBase || nomePrincipal).trim();
                return `IMAGENS/imagens-pokemon/stickers-pokemon/${nomeSticker}.png`;
            }

            // Buscar imagem local na pasta IMAGENS/imagens-pokemon/sprite-pokemon/
            // Formato: POKEMON.png (sem EV) ou POKEMON-EV.png (com EV)
            // Exemplos: Charizard.png, Charizard-Mega-Charizard-Y.png, Charizard-Shiny-Charizard.png
            let nomeArquivo;
            if (nomeBase && nomeBase !== '' && nomeBase !== nomePrincipal) {
                // Tem EV: formato é POKEMON-EV (espaços viram hífens)
                nomeArquivo = `${nomeBase}-${nomePrincipal.replace(/ /g, '-')}`;
            } else {
                // Sem EV: apenas o nome principal
                nomeArquivo = nomePrincipal;
            }
            nomeArquivo = nomeArquivo.trim();
            return `IMAGENS/imagens-pokemon/sprite-pokemon/${nomeArquivo}.png`;
        }
        
        function alternarTipoImagem() {
            usarStickers = !usarStickers;
            const btn = document.getElementById('toggleImagesBtn');
            
            if (usarStickers) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-image"></i> Database';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-image"></i> Stickers';
            }
            
            // Recarregar apenas Pokédex
            renderizarPokemons(todosPokemons);
        }
        
        function normalizarNomeItem(nome) {
            // Converte nomes com espaços e caracteres especiais em nomes de arquivo
            return nome.toLowerCase()
                .replace(/'/g, '') // Remove apóstrofos
                .replace(/\./g, '') // Remove pontos
                .replace(/\s+/g, '') // Remove espaços
                .replace(/[^a-z0-9]/g, ''); // Remove caracteres especiais
        }
        
        function obterImagemTarefa(nome) {
            // Lista de itens que parecem pokémon nas tasks
            const itensEspeciais = {
                'waterstone': 'https://wiki.pokememories.com/images/pokemons/waterstone.png',
                'screws': 'https://wiki.pokememories.com/images/pokemons/screws.png',
                'bottleofpoison': 'https://wiki.pokememories.com/images/pokemons/bottleofpoison.png',
                'venomstone': 'https://wiki.pokememories.com/images/pokemons/venomstone.png',
                'flour': 'https://wiki.pokememories.com/images/pokemons/flour.png',
                'seeds': 'https://wiki.pokememories.com/images/pokemons/seeds.png',
                'firestone': 'https://wiki.pokememories.com/images/pokemons/firestone.png',
                'smallstone': 'https://wiki.pokememories.com/images/pokemons/smallstone.png',
                'dragonstone': 'https://wiki.pokememories.com/images/pokemons/dragonstone.png',
                'watergem': 'https://wiki.pokememories.com/images/pokemons/watergem.png',
                'brokenstone': 'https://wiki.pokememories.com/images/pokemons/brokenstone.png',
                'futureorb': 'https://wiki.pokememories.com/images/pokemons/futureorb.png',
                'sugarcane': 'https://wiki.pokememories.com/images/pokemons/sugarcane.png',
                'shinygloom': 'https://wiki.pokememories.com/images/pokemons/gloom.png',
                'hordeleaderpoliwrath': 'https://wiki.pokememories.com/images/pokemons/hordeleaderpoliwrath.png',
                'shinygyarados': 'https://wiki.pokememories.com/images/pokemons/pokebola.png',
                'essencesoffire': 'https://wiki.pokememories.com/images/pokemons/essencesoffire.png'
            };
            
            const nomeNormalizado = normalizarNomeItem(nome);
            
            // Se for um item especial, retorna a URL do item
            if (itensEspeciais[nomeNormalizado]) {
                return itensEspeciais[nomeNormalizado];
            }
            
            // Se não, trata como pokémon normal (forçar stickers)
            return obterImagemPokemon(nome, '', true);
        }

        function obterImagemItem(nome) {
            const mapeamentoEspecial = {
                'waterstone': 'https://wiki.pokememories.com/images/pokemons/waterstone.png',
                'xp': 'https://wiki.pokememories.com/images/tasks/xp.webp',
                'screws': 'https://wiki.pokememories.com/images/pokemons/screws.png',
                'bottleofpoison': 'https://wiki.pokememories.com/images/pokemons/bottleofpoison.png',
                'venomstone': 'https://wiki.pokememories.com/images/pokemons/venomstone.png',
                'flour': 'https://wiki.pokememories.com/images/pokemons/flour.png',
                'seeds': 'https://wiki.pokememories.com/images/pokemons/seeds.png',
                'firestone': 'https://wiki.pokememories.com/images/pokemons/firestone.png',
                'smallstone': 'https://wiki.pokememories.com/images/pokemons/smallstone.png',
                'dragonstone': 'https://wiki.pokememories.com/images/pokemons/dragonstone.png',
                'watergem': 'https://wiki.pokememories.com/images/pokemons/watergem.png',
                'brokenstone': 'https://wiki.pokememories.com/images/pokemons/brokenstone.png',
                'futureorb': 'https://wiki.pokememories.com/images/pokemons/futureorb.png',
                'sugarcane': 'https://wiki.pokememories.com/images/pokemons/sugarcane.png'
            };
            
            const nomeNormalizado = normalizarNomeItem(nome);
            
            if (mapeamentoEspecial[nomeNormalizado]) {
                return mapeamentoEspecial[nomeNormalizado];
            }
            
            return `https://wiki.pokememories.com/images/itens/${nomeNormalizado}.png`;
        }

        function obterImagemMembro(nomeMembro) {
            // Tenta extrair um nome de Pokémon do nome do membro
            // Se não encontrar, tenta usar o primeiro nome como referência
            const partesNome = nomeMembro.split(' ');
            const primeiroNome = partesNome[0].toLowerCase();
            
            // Mapeamento especial de membros para Pokémon específicos
            const mapeamentoMembros = {
                'senhor': 'arcanine',
                'legenzin': 'charizard',
                'xxcarlosxx': 'alakazam',
                'jllink': 'dragonite',
                'nagi': 'gyarados',
                'almeidaa': 'steelix',
                'carvaalho': 'rhydon',
                'césar': 'machamp',
                'loucura': 'gengar',
                'davon': 'lapras',
                'endividado': 'snorlax',
                'freitinhasz': 'articuno',
                'iagmoedas': 'zapdos',
                'irussel': 'moltres',
                'isagiii': 'mewtwo',
                'lkliff': 'dragonite',
                'lramos': 'gyarados',
                'mclovinxs': 'blastoise',
                'mgzinn': 'venusaur',
                'nialk': 'pikachu',
                'nikklaus': 'charizard',
                'pedroh': 'arcanine',
                'rettmarlley': 'alakazam',
                'rickyziin': 'dragonite',
                'sannt': 'gyarados',
                'sensualiz': 'articuno',
                'tksixx': 'zapdos',
                'tonhaozinn': 'moltres',
                'mago': 'mewtwo',
                'zeta': 'blastoise',
                'zmorpheus': 'venusaur',
                'zorpheusz': 'pikachu',
                'zpabloze': 'charizard',
                'insana': 'lapras',
                'riczynn': 'snorlax',
                'manodosmega': 'gengar',
                'irmão': 'alakazam'
            };
            
            if (mapeamentoMembros[primeiroNome]) {
                return obterImagemPokemon(mapeamentoMembros[primeiroNome], '', true);
            }
            
            // Se não encontrar mapeamento, tenta usar o primeiro nome como Pokémon
            return obterImagemPokemon(primeiroNome, '', true);
        }
        
        async function carregarTMs() {
            const container = document.getElementById('tmsContainer');
            if (!container) return;

            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Carregando TMs...</p></div>';

            try {
                const SHEETS_TMS_URL = "https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec?acao=obter_tms";
                const response = await fetch(SHEETS_TMS_URL);
                const resultado = await response.json();

                if (resultado.success && resultado.data && resultado.data.length > 0) {
                    todosTMs = resultado.data.map(tm => ({
                        tipo: (tm['TIPO DE ITEM'] || 'TM'),
                        numero: String(tm['NUMERO DO TM'] || ''),
                        nome: (tm['NOME DO TM'] || ''),
                        tipagem: (tm['TIPAGEM DO TM'] || 'Normal'),
                        pokemon: (tm['ORIGEM DO TM'] || ''),
                        categoria: (tm['ORIGEM DO TM2'] || 'Spawn'),
                        sugestao: (tm['SUGESTÃO DE TM/POKEMON'] || tm['SUGESTÃO DE POKEMON'] || '')
                    }));
                    console.log('✅ TMs carregados da planilha:', todosTMs.length);
                } else {
                    console.warn('⚠️ Nenhum TM encontrado na planilha, usando dados locais');
                    todosTMs = [];
                }

                renderizarTMs(todosTMs);
                configurarBuscaTMs();
            } catch (erro) {
                console.error('❌ Erro ao carregar TMs da planilha:', erro);
                container.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar TMs</p></div>';
            }
        }

        // ⭐ Carregar dados de TMs para Pokédex (sem renderizar)
        async function carregarDadosTMs() {
            if (todosTMs.length > 0) return;
            try {
                const response = await fetch(APPS_SCRIPT_URL + '?acao=obter_tms');
                const resultado = await response.json();
                if (resultado.success && resultado.data && resultado.data.length > 0) {
                    todosTMs = resultado.data.map(tm => ({
                        tipo: (tm['TIPO DE ITEM'] || 'TM'),
                        numero: String(tm['NUMERO DO TM'] || ''),
                        nome: (tm['NOME DO TM'] || ''),
                        tipagem: (tm['TIPAGEM DO TM'] || 'Normal'),
                        pokemon: (tm['ORIGEM DO TM'] || ''),
                        categoria: (tm['ORIGEM DO TM2'] || 'Spawn'),
                        sugestao: (tm['SUGESTÃO DE TM/POKEMON'] || tm['SUGESTÃO DE POKEMON'] || '')
                    }));
                    console.log('✅ TMs carregados para Pokédex:', todosTMs.length);
                }
            } catch (e) {
                console.warn('⚠️ Erro ao carregar TMs para Pokédex:', e);
            }
        }

        // ⭐ Buscar TMs de um Pokémon específico (cross-reference com aba TMs)
        function obterTMsDoPokemon(nomePokemon) {
            if (!todosTMs || todosTMs.length === 0) return [];
            const nomeNorm = normalizarNome(nomePokemon);
            return todosTMs.filter(tm => {
                const origemNorm = normalizarNome(tm.pokemon);
                return origemNorm === nomeNorm;
            });
        }

        // ⭐ Buscar TMs onde a comunidade sugeriu que este Pokémon dropa (cross-reference na coluna de sugestão)
        function obterSugestoesTMsParaPokemon(nomePokemon) {
            if (!todosTMs || todosTMs.length === 0) return [];
            const nomeNorm = normalizarNome(nomePokemon);
            return todosTMs.filter(tm => {
                if (!tm.sugestao) return false;
                // Já aparece via obterTMsDoPokemon (ORIGEM DO TM)? Pular para não duplicar
                const origemNorm = normalizarNome(tm.pokemon);
                if (origemNorm === nomeNorm) return false;
                // Verificar se o nome do Pokémon aparece na sugestão
                const sugestaoNorm = normalizarNome(tm.sugestao);
                return sugestaoNorm.includes(nomeNorm);
            });
        }

        // ⭐ Gerar HTML das sugestões de TMs da comunidade para o card
        function gerarSugestoesTMsHTML(sugestoesTMs) {
            if (!sugestoesTMs || sugestoesTMs.length === 0) return '';
            var html = '<div class="pokemon-suggestion" style="margin-top:10px;">';
            html += '<div class="suggestion-title"><i class="fas fa-lightbulb"></i> Sugestões de TMs (Comunidade)</div>';
            sugestoesTMs.forEach(function(tm) {
                var numFormatado = tm.tipo === 'HM' 
                    ? 'HM' + String(tm.numero).padStart(2, '0')
                    : 'TM' + String(tm.numero).padStart(2, '0');
                html += '<div style="padding:4px 0;font-size:0.9em;color:#a8e6cf;">';
                html += '<strong style="color:#ffd700;">' + numFormatado + '</strong> ' + tm.nome;
                html += ' <span style="font-style:italic;opacity:0.8;"> — ' + tm.sugestao + '</span>';
                html += '</div>';
            });
            html += '</div>';
            return html;
        }

        // ⭐ Gerar HTML dos TMs para o card da Pokédex
        function gerarTMsHTML(tmsDoPokemons) {
            if (!tmsDoPokemons || tmsDoPokemons.length === 0) {
                return '<span class="sem-tms">Sem TMs registradas</span>';
            }
            return tmsDoPokemons.map(function(tm) {
                var numFormatado = tm.tipo === 'HM' 
                    ? 'HM' + String(tm.numero).padStart(2, '0')
                    : 'TM' + String(tm.numero).padStart(2, '0');
                var tipagem = (tm.tipagem || 'Normal').toLowerCase();
                var discoSrc = 'IMAGENS/imagens-itens/tipagens de tm/' + (tm.tipagem || 'Normal').replace(/ /g, '_') + '_type_tm_disk.png';
                var html = '<div class="pokedex-tm-item">';
                html += '<img class="pokedex-tm-disco" src="' + discoSrc + '" alt="' + numFormatado + '" onerror="this.src=\'IMAGENS/imagens-itens/tipagens de tm/Normal_type_tm_disk.png\'">';
                html += '<span class="pokedex-tm-numero">' + numFormatado + '</span>';
                html += '<span class="pokedex-tm-nome">' + tm.nome + '</span>';
                html += '<span class="type-badge type-' + tipagem + '" style="font-size:0.7em;padding:2px 8px;">' + tm.tipagem + '</span>';
                if (tm.sugestao) {
                    html += '<div class="pokedex-tm-sugestao"><i class="fas fa-lightbulb"></i> ' + tm.sugestao + '</div>';
                }
                html += '</div>';
                return html;
            }).join('');
        }

        function carregarTasks() {
            todasTasks = [
                { id: '01', missao: 'Derrotar: 20', pokemon: 'magikarp', premios: [{ item: 'pokeballs', qtd: '50' }] },
                { id: '02', missao: 'Derrotar: 30', pokemon: 'rattata', premios: [{ item: 'hds', qtd: '5' }] },
                { id: '03', missao: 'Capturar: 10', pokemon: 'caterpie', premios: [{ item: 'superpotion', qtd: '40' }] },
                { id: '04', missao: 'Derrotar: 30', pokemon: 'zubat', premios: [{ item: 'ultrapotion', qtd: '30' }] },
                { id: '05', missao: 'Capturar: 10', pokemon: 'geodude', premios: [{ item: 'greatballs', qtd: '40' }, { item: 'pokeballs', qtd: '10' }] },
                { id: '06', missao: 'Derrotar: 40', pokemon: 'vulpix', premios: [{ item: 'xp', qtd: '9000', isxp: true }] },
                { id: '07', missao: 'Capturar: 1', pokemon: 'gloom', premios: [{ item: 'venomstone', qtd: '1' }, { item: 'leafstone', qtd: '1' }] },
                { id: '08', missao: 'Derrotar: 30', pokemon: 'burmy', premios: [{ item: 'hyperpotion', qtd: '40' }] },
                { id: '09', missao: 'Capturar: 1', pokemon: 'abra', premios: [{ item: 'superballs', qtd: '40' }] },
                { id: '10', missao: 'Derrotar: 50', pokemon: 'cacturne', premios: [{ item: 'tds', qtd: '2' }] },
                { id: '11', missao: 'Capturar: 1', pokemon: 'dratini', premios: [{ item: 'xp', qtd: '30000', isxp: true }] },
                { id: '12', missao: 'Derrotar: 50', pokemon: 'hitmonchan', premios: [{ item: 'hyperpotion', qtd: '50' }] },
                { id: '13', missao: 'Capturar: 1', pokemon: 'tangela', premios: [{ item: 'superballs', qtd: '50' }] },
                { id: '14', missao: 'Derrotar: 50', pokemon: 'staravia', premios: [{ item: 'tds', qtd: '3' }] },
                { id: '15', missao: 'Derrotar: 50', pokemon: 'growlithe', premios: [{ item: 'growlithedoll', qtd: '1' }] },
                { id: '16', missao: 'Capturar: 1', pokemon: 'arcanine', premios: [{ item: 'snorlaxdoll', qtd: '1' }] },
                { id: '17', missao: 'Derrotar: 100', pokemon: 'gengar', premios: [{ item: 'bluecarpet', qtd: '5' }] },
                { id: '18', missao: 'Capturar: 1', pokemon: 'duskull', premios: [{ item: 'redskulltapestry', qtd: '1' }] },
                { id: '19', missao: 'Derrotar: 100', pokemon: 'duskull', premios: [{ item: 'purpleskulltapestry', qtd: '1' }] },
                { id: '20', missao: 'Capturar: 1', pokemon: 'ursaring', premios: [{ item: 'bearoutfit', qtd: '1' }] },
                { id: '21', missao: 'Capturar: 25', pokemon: 'drifloon', premios: [{ item: 'xp', qtd: '120000', isxp: true }] },
                { id: '22', missao: 'Derrotar: 15', pokemon: 'ralts', premios: [{ item: 'tds', qtd: '1' }] },
                { id: '23', missao: 'Capturar: 1', pokemon: 'hypno', premios: [{ item: 'mewtwotapestry', qtd: '1' }] },
                { id: '24', missao: 'Derrotar: 100', pokemon: 'froslass', premios: [{ item: 'denturebackpack', qtd: '1' }] },
                { id: '25', missao: 'Capturar: 1', pokemon: 'ursaring', premios: [{ item: 'rockstone', qtd: '1' }, { item: 'cocoonstone', qtd: '1' }] },
                { id: '26', missao: 'Derrotar: 250', pokemon: 'venusaur', premios: [{ item: 'ultraballs', qtd: '100' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '27', missao: 'Derrotar: 125', pokemon: 'electabuzz', premios: [{ item: 'xp', qtd: '200000', isxp: true }] },
                { id: '28', missao: 'Capturar: 1', pokemon: 'manectric', premios: [{ item: 'tds', qtd: '2' }] },
                { id: '29', missao: 'Derrotar: 350', pokemon: 'venomoth', premios: [{ item: 'vip', qtd: '5' }] },
                { id: '30', missao: 'Capturar: 10', pokemon: 'buneary', premios: [{ item: 'tm27return', qtd: '1' }] },
                { id: '31', missao: 'Derrotar: 500', pokemon: 'gyarados', premios: [{ item: 'dragonstone', qtd: '5' }, { item: 'tds', qtd: '10' }] },
                { id: '32', missao: 'Derrotar: 20', pokemon: 'buizel', premios: [{ item: 'incubator', qtd: '1' }, { item: 'tds', qtd: '5' }] },
                { id: '33', missao: 'Capturar: 30', pokemon: 'beedrill', premios: [{ item: 'honey', qtd: '5' }, { item: 'tds', qtd: '10' }] },
                { id: '34', missao: 'Derrotar: 1000', pokemon: 'charizard', premios: [{ item: 'ultraballs', qtd: '500' }, { item: 'tds', qtd: '5' }] },
                { id: '35', missao: 'Capturar: 10', pokemon: 'cyndaquil', premios: [{ item: 'addonboxsuper', qtd: '1' }] },
                { id: '36', missao: 'Derrotar: 1', pokemon: 'hordeleaderpoliwrath', premios: [{ item: 'waterstone', qtd: '5' }, { item: 'tds', qtd: '5' }] },
                { id: '37', missao: 'Derrotar: 350', pokemon: 'ludicolo', premios: [{ item: 'watercarpet', qtd: '50' }, { item: 'tds', qtd: '10' }] },
                { id: '38', missao: 'Derrotar: 10', pokemon: 'shinygyarados', premios: [{ item: 'bikeazul', qtd: '1' }, { item: 'tds', qtd: '5' }] },
                { id: '39', missao: 'Derrotar: 500', pokemon: 'blastoise', premios: [{ item: 'bluecarpet', qtd: '50' }, { item: 'tds', qtd: '5' }] },
                { id: '40', missao: 'Capturar: 1', pokemon: 'hoothoot', premios: [{ item: 'ultraballs', qtd: '500' }] },
                { id: '41', missao: 'Derrotar: 50', pokemon: 'tropius', premios: [{ item: 'leafstone', qtd: '5' }, { item: 'tds', qtd: '10' }] },
                { id: '42', missao: 'Derrotar: 300', pokemon: 'flygon', premios: [{ item: 'dragonstone', qtd: '5' }, { item: 'tds', qtd: '5' }] },
                { id: '43', missao: 'Capturar: 20', pokemon: 'phanpy', premios: [{ item: 'ultraballs', qtd: '500' }] },
                { id: '44', missao: 'Derrotar: 1000', pokemon: 'drapion', premios: [{ item: 'booststone', qtd: '1' }, { item: 'tds', qtd: '10' }] },
                { id: '45', missao: 'Capturar: 5', pokemon: 'sneasel', premios: [{ item: 'vip', qtd: '10' }] },
                { id: '46', missao: 'Derrotar: 1000', pokemon: 'abomasnow', premios: [{ item: 'pinkapricorns', qtd: '5' }, { item: 'tds', qtd: '10' }] },
                { id: '47', missao: 'Derrotar: 20', pokemon: 'gible', premios: [{ item: 'redapricorns', qtd: '5' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '48', missao: 'Capturar: 10', pokemon: 'misdreavus', premios: [{ item: 'blueapricorns', qtd: '5' }, { item: 'booststone', qtd: '1' }] },
                { id: '49', missao: 'Derrotar: 1000', pokemon: 'torterra', premios: [{ item: 'greenapricorns', qtd: '5' }, { item: 'tds', qtd: '10' }] },
                { id: '50', missao: 'Capturar: 10', pokemon: 'chansey', premios: [{ item: 'incubator', qtd: '1' }, { item: 'berrypot', qtd: '1' }] },
                { id: '51', missao: 'Derrotar: 1000', pokemon: 'stantler', premios: [{ item: 'booststone', qtd: '1' }, { item: 'tds', qtd: '20' }] },
                { id: '52', missao: 'Capturar: 5', pokemon: 'bellossom', premios: [{ item: 'bikeverde', qtd: '1' }, { item: 'booststone', qtd: '1' }] },
                { id: '53', missao: 'Entregar: 100', pokemon: 'waterstone', premios: [{ item: 'addonboxsuper', qtd: '1' }, { item: 'tds', qtd: '20' }] },
                { id: '54', missao: 'Derrotar: 2000', pokemon: 'arcanine', premios: [{ item: 'booststone', qtd: '1' }, { item: 'premierball', qtd: '100' }] },
                { id: '55', missao: 'Capturar: 5', pokemon: 'jigglypuff', premios: [{ item: 'bikerosa', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '56', missao: 'Derrotar: 100', pokemon: 'forretress', premios: [{ item: 'booststone', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '57', missao: 'Capturar: 5', pokemon: 'wobbuffet', premios: [{ item: 'shinycharm', qtd: '1' }, { item: 'booststone', qtd: '1' }] },
                { id: '58', missao: 'Derrotar: 2000', pokemon: 'raichu', premios: [{ item: 'booststone', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '59', missao: 'Entregar: 10000', pokemon: 'screws', premios: [{ item: 'bikeamarela', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '60', missao: 'Derrotar: 20', pokemon: 'regice', premios: [{ item: 'depotbox', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '61', missao: 'Derrotar: 100', pokemon: 'nosepass', premios: [{ item: 'booststone', qtd: '1' }, { item: 'tds', qtd: '10' }] },
                { id: '62', missao: 'Derrotar: 3000', pokemon: 'arbok', premios: [{ item: 'costumeboxshapechanger', qtd: '1' }, { item: 'tds', qtd: '10' }] },
                { id: '63', missao: 'Entregar: 10000', pokemon: 'bottleofpoison', premios: [{ item: 'booststone', qtd: '1' }, { item: 'tds', qtd: '20' }] },
                { id: '64', missao: 'Entregar: 100', pokemon: 'venomstone', premios: [{ item: 'shinycharm', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '65', missao: 'Capturar: 50', pokemon: 'meowth', premios: [{ item: 'booststone', qtd: '1' }, { item: 'premierball', qtd: '100' }] },
                { id: '66', missao: 'Derrotar: 2000', pokemon: 'girafarig', premios: [{ item: 'booststone', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '67', missao: 'Derrotar: 3000', pokemon: 'pidgeot', premios: [{ item: 'tds', qtd: '100' }] },
                { id: '68', missao: 'Entregar: 100', pokemon: 'flour', premios: [{ item: 'addonbox', qtd: '1' }] },
                { id: '69', missao: 'Capturar: 10', pokemon: 'primeape', premios: [{ item: 'costumeboxshapechanger', qtd: '1' }, { item: 'premierball', qtd: '100' }] },
                { id: '70', missao: 'Derrotar: 10', pokemon: 'regirock', premios: [{ item: 'pokehouse', qtd: '1' }, { item: 'booststone', qtd: '1' }] },
                { id: '71', missao: 'Derrotar: 3000', pokemon: 'meganium', premios: [{ item: 'tds', qtd: '30' }] },
                { id: '72', missao: 'Entregar: 10000', pokemon: 'seeds', premios: [{ item: 'booststone', qtd: '1' }, { item: 'premierball', qtd: '100' }] },
                { id: '73', missao: 'Capturar: 1', pokemon: 'farfetchd', premios: [{ item: 'vip', qtd: '15' }] },
                { id: '74', missao: 'Derrotar: 50', pokemon: 'cradily', premios: [{ item: 'shinycharm', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '75', missao: 'Derrotar: 500', pokemon: 'vulpix', premios: [{ item: 'bikevermelha', qtd: '1' }, { item: 'booststone', qtd: '1' }] },
                { id: '76', missao: 'Entregar: 100', pokemon: 'firestone', premios: [{ item: 'premierball', qtd: '300' }] },
                { id: '77', missao: 'Derrotar: 2000', pokemon: 'ledian', premios: [{ item: 'addonbox', qtd: '1' }] },
                { id: '78', missao: 'Capturar: 30', pokemon: 'miltank', premios: [{ item: 'costumeboxshapechanger', qtd: '1' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '79', missao: 'Derrotar: 5000', pokemon: 'staryu', premios: [{ item: 'tds', qtd: '50' }] },
                { id: '80', missao: 'Derrotar: 20', pokemon: 'registeel', premios: [{ item: 'xp', qtd: '20000000', isxp: true }] },
                { id: '81', missao: 'Capturar: 10', pokemon: 'slugma', premios: [{ item: 'premierball', qtd: '300' }, { item: 'addonboxsuper', qtd: '1' }] },
                { id: '82', missao: 'Entregar: 20000', pokemon: 'smallstone', premios: [{ item: 'addonboxsuper', qtd: '1' }, { item: 'tds', qtd: '30' }] },
                { id: '83', missao: 'Derrotar: 500', pokemon: 'ponyta', premios: [{ item: 'vip', qtd: '20' }] },
                { id: '84', missao: 'Derrotar: 3000', pokemon: 'emboar', premios: [{ item: 'shinycharm', qtd: '1' }, { item: 'booststone', qtd: '1' }] },
                { id: '85', missao: 'Capturar: 5', pokemon: 'magcargo', premios: [{ item: 'booststone', qtd: '1' }, { item: 'tds', qtd: '30' }] },
                { id: '86', missao: 'Entregar: 30000', pokemon: 'essencesoffire', premios: [{ item: 'addonboxsuper', qtd: '1' }, { item: 'tds', qtd: '50' }] },
                { id: '87', missao: 'Capturar: 50', pokemon: 'whismur', premios: [{ item: 'premierball', qtd: '500' }] },
                { id: '88', missao: 'Derrotar: 5000', pokemon: 'caterpie', premios: [{ item: 'addonbox', qtd: '1' }] },
                { id: '89', missao: 'Entregar: 30000', pokemon: 'watergem', premios: [{ item: 'bikeice', qtd: '1' }, { item: 'booststone', qtd: '1' }] },
                { id: '90', missao: 'Entregar: 100', pokemon: 'dragonstone', premios: [{ item: 'seledbox', qtd: '1' }] },
                { id: '91', missao: 'Entregar: 500', pokemon: 'brokenstone', premios: [{ item: 'blessamulet', qtd: '1' }, { item: 'tds', qtd: '50' }] },
                { id: '92', missao: 'Derrotar: 5000', pokemon: 'gloom', premios: [{ item: 'berrypot', qtd: '1' }, { item: 'booststone', qtd: '1' }] },
                { id: '93', missao: 'Entregar: 10000', pokemon: 'futureorb', premios: [{ item: 'vip', qtd: '25' }] },
                { id: '94', missao: 'Capturar: 10', pokemon: 'zangoose', premios: [{ item: 'premierball', qtd: '1000' }] },
                { id: '95', missao: 'Capturar: 10', pokemon: 'heracross', premios: [{ item: 'tds', qtd: '50' }] },
                { id: '96', missao: 'Derrotar: 100', pokemon: 'kangaskhan', premios: [{ item: 'pokemonegg', qtd: '1000' }] },
                { id: '97', missao: 'Entregar: 100', pokemon: 'sugarcane', premios: [{ item: 'dreamball', qtd: '1' }, { item: 'tds', qtd: '100' }] },
                { id: '98', missao: 'Capturar: 1', pokemon: 'shinygloom', premios: [{ item: 'addonbox', qtd: '1' }] },
                { id: '99', missao: 'Derrotar: 5000', pokemon: 'ursaring', premios: [{ item: 'pikachuwomanoutfit', qtd: '1' }, { item: 'tds', qtd: '100' }, { item: 'xp', qtd: '50000000', isxp: true }, { item: 'vip', qtd: '30' }] },
                { id: '100', missao: 'Capturar: 1', pokemon: 'gible', premios: [{ item: 'incubator', qtd: '1' }] }
            ];
            renderizarTasks(todasTasks);
        }

        function renderizarTasks(dados) {
            const container = document.getElementById('tasksContainer');
            if (!container) return; // Sair se o elemento não existir
            
            container.innerHTML = '';
            
            dados.forEach((task) => {
                const card = document.createElement('div');
                card.className = 'task-card';
                
                // Obter imagem usando a função que detecta itens
                const imagemPokemon = obterImagemTarefa(task.pokemon);
                
                // Gerar recompensas HTML
                let premiosHtml = '';
                task.premios.forEach(premio => {
                    const isXP = premio.isxp;
                    const src = isXP ? 'https://wiki.pokememories.com/images/tasks/xp.webp' : obterImagemItem(premio.item);
                    premiosHtml += `
                        <div class="task-reward-item">
                            <img src="${src}" alt="${premio.item}" onerror="this.src='images/pokemons/pokebola.png'">
                            <div class="task-reward-name">${premio.item}</div>
                            <div class="task-reward-quantity">x${premio.qtd}</div>
                        </div>
                    `;
                });
                
                card.innerHTML = `
                    <div class="task-header">
                        <div class="task-header-left">
                            <div class="task-id">Task #${task.id}</div>
                        </div>
                        <div class="task-header-right">
                            <div style="color: #ffd700; font-weight: bold; font-size: 1.1em;">RECOMPENSAS:</div>
                        </div>
                    </div>
                    <div class="task-content-left">
                        <div class="task-mission">${task.missao}</div>
                        <div class="task-pokemon-large">
                            <img src="${imagemPokemon}" alt="${task.pokemon}" onerror="this.src='images/pokemons/pokebola.png'">
                        </div>
                        <div class="task-pokemon-large-name">${task.pokemon.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').toUpperCase()}</div>
                    </div>
                    <div class="task-content-right">
                        <div class="task-rewards">${premiosHtml}</div>
                    </div>
                `;
                
                container.appendChild(card);
            });
        }

        function renderizarTMs(dados) {
            const container = document.getElementById('tmsContainer');
            if (!container) return;
            
            container.innerHTML = '';

            if (!dados || dados.length === 0) {
                container.innerHTML = '<div class="no-results"><p>Nenhum TM encontrado</p></div>';
                return;
            }

            dados.forEach((tm) => {
                const card = document.createElement('div');
                card.className = 'tm-card';
                const pokeLower = (tm.pokemon || '').toLowerCase().replace(/ /g, '-');
                card.dataset.poke = pokeLower;
                const catRaw = (tm.categoria || '').toString().trim().toLowerCase();
                card.dataset.cat = catRaw;

                // Número formatado: TM02, TM15, TM120 etc.
                const numFormatado = tm.tipo === 'HM'
                    ? `HM${String(tm.numero).padStart(2, '0')}`
                    : `TM${String(tm.numero).padStart(2, '0')}`;

                // Imagem do disco de tipagem
                const tipagem = (tm.tipagem || 'Normal').replace(/ /g, '_');
                const discoSrc = `IMAGENS/imagens-itens/tipagens de tm/${tipagem}_type_tm_disk.png`;

                // Imagem sticker: depende da categoria (ORIGEM DO TM2)
                let stickerSrc;
                let stickerAlt = tm.pokemon;
                if (catRaw === 'craft') {
                    stickerSrc = 'IMAGENS/imagens-pokemon/stickers-pokemon/craft.png';
                    stickerAlt = 'Craft';
                } else if (catRaw === 'desconhecido') {
                    stickerSrc = 'IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png';
                    stickerAlt = 'Desconhecido';
                } else if (catRaw === 'event' || catRaw === 'evento') {
                    stickerSrc = 'IMAGENS/imagens-pokemon/stickers-pokemon/eventos.png';
                    stickerAlt = 'Evento';
                } else {
                    stickerSrc = `IMAGENS/imagens-pokemon/stickers-pokemon/${tm.pokemon}.png`;
                }
                const fallbackImg = `this.src='IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png'`;

                card.innerHTML = `
                    <img src="${discoSrc}" alt="${numFormatado}" class="tm-disk-image" onerror="this.src='IMAGENS/imagens-itens/tipagens de tm/Normal_type_tm_disk.png'">
                    <div class="tm-number-text">${numFormatado}</div>
                    <div class="tm-name">${tm.nome}</div>
                    <img src="${stickerSrc}" alt="${stickerAlt}" class="tm-pokemon-image" onerror="${fallbackImg}">
                    <div class="tm-pokemon-name">${tm.pokemon}</div>
                `;
                container.appendChild(card);
            });
        }

        function renderizarMembrosClã() {
            const membrosLideres = [
                { nome: 'Senhor Skant', imagem: 'https://wiki.pokememories.com/images/cm.png' },
                { nome: 'Legenzin OBV', imagem: 'https://wiki.pokememories.com/images/cm.png' },
                { nome: 'Xxcarlosxx', imagem: 'https://wiki.pokememories.com/images/cm.png' }
            ];
            
            const membrosViceLideres = [
                { nome: 'Jllink OBV', imagem: 'https://wiki.pokememories.com/images/gm.png' },
                { nome: 'Nagi OBV', imagem: 'https://wiki.pokememories.com/images/gm.png' }
            ];
            
            const membrosMembro = [
                { nome: 'Almeidaa OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'CARVAALHO OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'César OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Loucura ÓBVIA', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Davon OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Endividado OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Freitinhasz OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'IagoMoedas OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'iRusseL OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'ISAGIII OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'lkliff OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'lRamos OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Mclovinxs OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Mgzinn OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Nialk OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Nikklaus OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Pedroh OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Rettmarlley OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Rickyziin OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'SannT OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'SensuaLize OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Tksixx OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Tonhaozinn', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'MAGO ÓBVIO', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Zeta OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'zMorpheus OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'zOrpheusZ OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'zPabloze OBV', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: '[Tutora] Insana Ju', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Riczynn', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'manodosmega mega', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' },
                { nome: 'Irmão Do Wc', imagem: 'https://wiki.pokememories.com/images/itens/flyoutfit.png' }
            ];
            
            // Renderizar líderes
            const containerLideres = document.querySelectorAll('#claContainer > div')[0].querySelector('.clan-members-grid');
            containerLideres.innerHTML = '';
            membrosLideres.forEach(membro => {
                const card = document.createElement('div');
                card.className = 'member-card';
                card.innerHTML = `
                    <div class="member-avatar leader">
                        <img src="${membro.imagem}" alt="${membro.nome}" onerror="this.style.display='none'">
                    </div>
                    <p class="member-name">${membro.nome}</p>
                `;
                containerLideres.appendChild(card);
            });
            
            // Renderizar vice-líderes
            const containerVice = document.querySelectorAll('#claContainer > div')[1].querySelector('.clan-members-grid');
            containerVice.innerHTML = '';
            membrosViceLideres.forEach(membro => {
                const card = document.createElement('div');
                card.className = 'member-card';
                card.innerHTML = `
                    <div class="member-avatar vice">
                        <img src="${membro.imagem}" alt="${membro.nome}" onerror="this.style.display='none'">
                    </div>
                    <p class="member-name">${membro.nome}</p>
                `;
                containerVice.appendChild(card);
            });
            
            // Renderizar membros
            const containerMembros = document.querySelectorAll('#claContainer > div')[2].querySelector('.clan-members-grid');
            containerMembros.innerHTML = '';
            membrosMembro.forEach(membro => {
                const card = document.createElement('div');
                card.className = 'member-card';
                card.innerHTML = `
                    <div class="member-avatar">
                        <img src="${membro.imagem}" alt="${membro.nome}" onerror="this.style.display='none'">
                    </div>
                    <p class="member-name">${membro.nome}</p>
                `;
                containerMembros.appendChild(card);
            });
        }

        // ❌ DEPRECATED: switchTab removido - usar sistema modular de navegação
        // A navegação agora é gerenciada por js/modules/navigation.js
        function switchTab(tabName) {
            console.warn('⚠️ switchTab() deprecated - usando sistema modular');
            // Compatibilidade temporária
            if (typeof loadPage !== 'undefined') {
                loadPage(tabName);
            }
        }
        
        async function configurarBuscaInstantanea() {
            const input = document.getElementById('searchInput');
            const container = document.getElementById('pokemonContainer');
            
            input.addEventListener('input', async function() {
                const termo = this.value.toLowerCase().trim();
                container.querySelectorAll('.no-results').forEach(m => m.remove());
                
                // 🔥 BUSCA MÚLTIPLA: Separar por vírgula
                const termos = termo.split(',').map(t => t.trim()).filter(t => t !== '');
                
                // Se não tem busca, mostrar apenas os cards já carregados
                if (termos.length === 0) {
                    const cards = container.querySelectorAll('.pokemon-card');
                    cards.forEach(card => card.style.display = 'block');
                    return;
                }
                
                // Se tem busca e ainda não carregou todos os dados, carregar agora
                if (!dadosCompletosCarregados) {
                    console.log('🔍 Carregando todos os dados para busca...');
                    container.innerHTML = '<div style="text-align:center;padding:50px;color:#ffd700;"><i class="fas fa-spinner fa-spin" style="font-size:48px;"></i><p style="margin-top:20px;">Carregando todos os Pokémons para busca...</p></div>';
                    
                    try {
                        // Carregar TODOS os dados sem paginação (limit alto)
                        const resposta = await fetch(`${URL_DADOS}&page=1&limit=9999`);
                        const resultado = await resposta.json();
                        todosPokemonsCompleto = resultado.data;
                        dadosCompletosCarregados = true;
                        console.log('✅ Todos os dados carregados:', todosPokemonsCompleto.length);
                        
                        // Renderizar todos
                        renderizarPokemons(todosPokemonsCompleto);
                        todosPokemons = todosPokemonsCompleto;
                        temMaisPaginas = false; // Desabilitar infinite scroll
                    } catch (erro) {
                        console.error('❌ Erro ao carregar dados completos:', erro);
                        return;
                    }
                }
                
                // Agora buscar nos cards
                const cards = container.querySelectorAll('.pokemon-card');
                let encontrados = 0;
                
                cards.forEach(card => {
                    const textoCard = card.textContent.toLowerCase();
                    const corresponde = termos.some(t => textoCard.includes(t));
                    
                    if (corresponde) {
                        card.style.display = 'block';
                        encontrados++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                if (encontrados === 0) {
                    const mensagem = document.createElement('div');
                    mensagem.className = 'no-results';
                    mensagem.innerHTML = `
                        <div style="color:#ffd700;font-size:3em;margin-bottom:15px">
                            <i class="fas fa-search"></i>
                        </div>
                        <h3 style="color:#ffd700;margin-bottom:10px">Nenhum Pokémon</h3>
                        <p style="color:#a0e7ff">Nenhum resultado: "${termo}"</p>`;
                    container.appendChild(mensagem);
                }
            });
        }

        function configurarBuscaTMs() {
            const input = document.getElementById('searchInputTMs');
            const container = document.getElementById('tmsContainer');
            const filterBtns = document.querySelectorAll('.filter-btn');
            
            if (!input || !container) return;
            
            let filtroCategoria = 'todos';
            
            filterBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    filtroCategoria = this.dataset.categoria.toLowerCase();
                    aplicarFiltros();
                });
            });
            
            function aplicarFiltros() {
                const termo = input.value.toLowerCase().trim();
                const cards = container.querySelectorAll('.tm-card');
                let encontrados = 0;
                
                // Remover mensagens anteriores
                container.querySelectorAll('.no-results').forEach(m => m.remove());
                
                cards.forEach(card => {
                    const textoBusca = card.textContent.toLowerCase();
                    const categoria = card.dataset.cat || '';
                    
                    const correspondeTexto = textoBusca.includes(termo) || termo === '';
                    const correspondeCategoria = filtroCategoria === 'todos' || categoria === filtroCategoria;
                    
                    if (correspondeTexto && correspondeCategoria) {
                        card.style.display = '';
                        encontrados++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                if (encontrados === 0) {
                    const mensagem = document.createElement('div');
                    mensagem.className = 'no-results';
                    mensagem.innerHTML = `<p>Nenhum TM encontrado</p>`;
                    container.appendChild(mensagem);
                }
            }
            
            input.addEventListener('input', aplicarFiltros);
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            // Restaurar login se existir
            const loginSalvo = localStorage.getItem('usuario_logado');
            if (loginSalvo) {
                try {
                    usuarioLogado = JSON.parse(loginSalvo);
                    atualizarTelaLogin();
                    // Aguardar carregar dados antes de mostrar opções admin
                    setTimeout(() => {
                        if (usuarioLogado) mostrarOpcoesAdmin();
                    }, 1000);
                } catch (e) {
                    localStorage.removeItem('usuario_logado');
                }
            }

            // Compatibilidade com novo sistema de login (localStorage "user")
            if (!usuarioLogado) {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const userObj = JSON.parse(userStr);
                        // Mapear para estrutura usada pelo script.js
                        usuarioLogado = {
                            nome: userObj.nome || userObj.nickname || '',
                            email: userObj.email || '',
                            foto: userObj.foto || ''
                        };
                        atualizarTelaLogin();
                        setTimeout(() => {
                            if (usuarioLogado) mostrarOpcoesAdmin();
                        }, 1000);
                    } catch (e) {
                        // Se der erro ao ler, limpar e seguir sem login
                        console.error('Erro ao ler usuário (user):', e);
                        localStorage.removeItem('user');
                    }
                }
            }
            
            // Executar apenas se os elementos correspondentes existirem
            if (document.getElementById('pokemonContainer')) {
                carregarDados();
            }
            if (document.getElementById('tmsContainer')) {
                carregarTMs();
            }
            if (document.getElementById('tasksContainer')) {
                carregarTasks();
            }
            if (document.getElementById('membrosContainer')) {
                renderizarMembrosClã();
            }
            inicializarGoogle();
        });

        function inicializarGoogle() {
            // Verificar se o Google Identity Services está carregado
            if (typeof google === 'undefined' || !google.accounts) {
                console.log('⏳ Google Identity Services ainda não carregado');
                return;
            }
            
            google.accounts.id.initialize({
                client_id: '294066496258-ojjgv3m4n3qkouq9lg5sg72ms7tlhi34.apps.googleusercontent.com',
                callback: aoFazerLogin
            });
        }

        function atualizarTelaLogin() {
            const btnLogin = document.getElementById('loginBtn');
            const userInfo = document.getElementById('userInfo');
            const userNameEl = document.getElementById('userName');
            const userPicEl = document.getElementById('userPic');

            // Guardas: algumas páginas não possuem estes elementos
            if (!btnLogin || !userInfo) {
                return;
            }

            if (usuarioLogado) {
                btnLogin.style.display = 'none';
                userInfo.style.display = 'flex';
                if (userNameEl) userNameEl.textContent = usuarioLogado.nome || '';
                if (userPicEl) userPicEl.src = usuarioLogado.foto || '';
            } else {
                btnLogin.style.display = 'block';
                userInfo.style.display = 'none';
                if (userNameEl) userNameEl.textContent = '';
                if (userPicEl) userPicEl.src = '';
            }
        }

        function fazerLogout() {
            google.accounts.id.disableAutoSelect();
            usuarioLogado = null;
            localStorage.removeItem('usuario_logado');
            
            // Remover botões de admin
            const btnAdd = document.getElementById('btnAddPokemon');
            const btnReset = document.getElementById('btnResetData');
            if (btnAdd) btnAdd.remove();
            if (btnReset) btnReset.remove();
            
            // Remover botões de editar dos cards
            document.querySelectorAll('.btn-edit-pokemon').forEach(btn => btn.remove());
            
            atualizarTelaLogin();
        }

        function iniciarLogin() {
            google.accounts.id.renderButton(
                document.getElementById('loginBtn'),
                { 
                    theme: 'dark', 
                    size: 'medium',
                    type: 'standard',
                    text: 'signin_with'
                }
            );
            google.accounts.id.prompt();
        }

        function aoFazerLogin(response) {
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const dados = JSON.parse(jsonPayload);
            usuarioLogado = {
                nome: dados.name,
                email: dados.email,
                foto: dados.picture
            };

            // Salvar login no localStorage para persistir
            localStorage.setItem('usuario_logado', JSON.stringify(usuarioLogado));

            atualizarTelaLogin();
            mostrarOpcoesAdmin();
        }
        
        function mostrarOpcoesAdmin() {
            // Exibir opções somente para administradores
            if (!isAdmin()) return;
            setTimeout(() => {
                const pokemonCards = document.querySelectorAll('.pokemon-card');
                pokemonCards.forEach(card => {
                    if (!card.querySelector('.btn-edit-pokemon')) {
                        const btnEdit = document.createElement('button');
                        btnEdit.className = 'btn-edit-pokemon';
                        btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
                        btnEdit.style.cssText = 'position: absolute; top: 10px; right: 10px; padding: 8px 12px; background: rgba(255, 215, 0, 0.3); border: 1px solid #ffd700; color: #ffd700; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.3s; z-index: 10;';
                        btnEdit.addEventListener('mouseenter', function() {
                            this.style.background = 'rgba(255, 215, 0, 0.5)';
                        });
                        btnEdit.addEventListener('mouseleave', function() {
                            this.style.background = 'rgba(255, 215, 0, 0.3)';
                        });
                        btnEdit.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const nomeReal = card.getAttribute('data-pokemon-nome');
                            console.log('🎯 Clicou para editar:', nomeReal);
                            
                            const nomeNormalizado = normalizarNome(nomeReal);
                            const pokemonData = todosPokemons.find(p => {
                                const nomeEV = normalizarNome(p.EV || '');
                                const nomePokemon = normalizarNome(p.POKEMON || '');
                                const nomeParaComparar = nomeEV || nomePokemon;
                                return nomeParaComparar === nomeNormalizado;
                            });
                            
                            if (pokemonData) {
                                console.log('✅ Dados do Pokémon encontrados:', pokemonData);
                            } else {
                                console.error('❌ Pokémon não encontrado no array!');
                            }
                            
                            editarPokemon(card, pokemonData, nomeReal);
                        });
                        card.style.position = 'relative';
                        card.appendChild(btnEdit);
                    }
                });
                
                // Botão Adicionar - DESABILITADO (apenas editar Pokémons existentes)
                /*
                const btnAddExistente = document.getElementById('btnAddPokemon');
                if (btnAddExistente) {
                    btnAddExistente.remove();
                }
                
                const btnAdd = document.createElement('button');
                btnAdd.id = 'btnAddPokemon';
                btnAdd.innerHTML = '<i class="fas fa-plus"></i> Adicionar';
                btnAdd.style.cssText = 'position: fixed; bottom: 30px; right: 30px; padding: 15px 30px; background: linear-gradient(135deg, #ffd700, #ffed4e); color: #1a2980; border: none; border-radius: 50px; cursor: pointer; font-size: 16px; font-weight: bold; box-shadow: 0 8px 20px rgba(255, 215, 0, 0.4); transition: all 0.3s; z-index: 1000;';
                btnAdd.addEventListener('click', () => abrirModalAddPokemon());
                btnAdd.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.1)';
                    this.style.boxShadow = '0 12px 30px rgba(255, 215, 0, 0.6)';
                });
                btnAdd.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 8px 20px rgba(255, 215, 0, 0.4)';
                });
                document.body.appendChild(btnAdd);
                */
                
                // Botão Reset - remover existente antes de criar novo
                const btnResetExistente = document.getElementById('btnResetData');
                if (btnResetExistente) {
                    btnResetExistente.remove();
                }
                
                const btnReset = document.createElement('button');
                btnReset.id = 'btnResetData';
                btnReset.innerHTML = '<i class="fas fa-sync"></i>';
                btnReset.title = 'Restaurar dados originais do Google Sheets';
                btnReset.style.cssText = 'position: fixed; bottom: 100px; right: 30px; padding: 15px; background: rgba(255, 100, 100, 0.3); color: #ff6464; border: 2px solid #ff6464; border-radius: 50%; cursor: pointer; font-size: 18px; box-shadow: 0 8px 20px rgba(255, 100, 100, 0.4); transition: all 0.3s; z-index: 1000; width: 55px; height: 55px;';
                btnReset.addEventListener('click', () => {
                    if (confirm('🔄 Restaurar dados originais?\n\nIsso vai descartar todas as edições locais e recarregar os dados do Google Sheets.\n\nDeseja continuar?')) {
                        localStorage.removeItem('pokemons_editados');
                        location.reload();
                    }
                });
                btnReset.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.1) rotate(180deg)';
                    this.style.background = 'rgba(255, 100, 100, 0.5)';
                });
                btnReset.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1) rotate(0deg)';
                    this.style.background = 'rgba(255, 100, 100, 0.3)';
                });
                document.body.appendChild(btnReset);
            }, 500);
        }
        
        function editarPokemon(card, pokemonData, nomeReal) {
            const nomeDisplay = card.querySelector('.pokemon-name').textContent.trim();
            const numero = card.querySelector('.pokemon-number')?.textContent.replace('#', '').trim() || '';
            const stats = Array.from(card.querySelectorAll('.stat-value')).map(el => el.textContent);
            const localizacao = card.querySelector('.pokemon-location div:last-child')?.textContent.trim() || '';
            const tms = card.querySelector('.tms-content')?.textContent.trim() || '';
            
            // Carregar atacks e TMs antes de abrir o modal
            Promise.all([carregarDadosAtacks(), carregarDadosTMs()]).then(() => {
                const modal = criarModalEdicao(nomeReal, nomeDisplay, numero, stats, localizacao, tms, pokemonData);
                document.body.appendChild(modal);
            });
        }
        
        function criarModalEdicao(nomeReal, nomeDisplay, numero, stats, localizacao, tms, pokemonData) {
            const overlay = document.createElement('div');
            overlay.id = 'modalEdicaoOverlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;';
            
            // Debug: verificar chaves do pokemonData
            if (pokemonData) {
                console.log('📋 Chaves do pokemonData:', Object.keys(pokemonData).filter(k => k.toLowerCase().startsWith('m')));
                for (let d = 1; d <= 10; d++) {
                    const v = pokemonData[`M${d}`] || pokemonData[`m${d}`] || '';
                    if (v) console.log(`  M${d}:`, v);
                }
            }
            
            // Obter moves atuais do pokémon (M1-M10 da planilha)
            let movesHTML = '';
            const atackDatalistOptions = todosAtacks.map(a => `<option value="${(a['ATACK'] || a.ATACK || '')}">`).join('');
            
            for (let i = 1; i <= 10; i++) {
                const slotKey = `M${i}`;
                // Tentar encontrar o valor do slot nos dados do pokémon (vários formatos possíveis)
                let currentMove = '';
                if (pokemonData) {
                    currentMove = (
                        pokemonData[slotKey] || 
                        pokemonData[`m${i}`] || 
                        pokemonData[` M${i}`] ||
                        pokemonData[`M${i} `] ||
                        // Buscar chave case-insensitive
                        pokemonData[Object.keys(pokemonData).find(k => k.trim().toLowerCase() === `m${i}`)] ||
                        ''
                    ).toString().trim();
                }
                movesHTML += `
                    <div class="modal-atack-row">
                        <span class="modal-atack-slot">M${i}</span>
                        <input type="text" 
                            id="edit-m${i}" 
                            value="${currentMove}" 
                            list="datalistAtacks"
                            placeholder="Selecione o atack..." 
                            class="modal-atack-input"
                            autocomplete="off">
                        <button class="modal-clear-btn" onclick="this.parentElement.querySelector('input').value='';" title="Limpar atack">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>`;
            }

            // Obter sugestões dos membros
            const sugestaoLoc = pokemonData ? obterSugestaoLocalizacao(pokemonData) : '';
            const nomePrincipal = pokemonData ? ((pokemonData.EV || pokemonData.POKEMON || '').toString().trim()) : nomeReal;

            // ===== TMs do Pokémon (para edição) =====
            const tmsDoPokemonEdit = obterTMsDoPokemon(nomePrincipal);
            const tmDatalistOptions = todosTMs.map(tm => {
                const numF = tm.tipo === 'HM' ? 'HM' + String(tm.numero).padStart(2,'0') : 'TM' + String(tm.numero).padStart(2,'0');
                return `<option value="${numF} - ${tm.nome}">`;
            }).join('');
            
            let tmsEditHTML = '';
            // Mostrar TMs já gravados com opção de alterar
            if (tmsDoPokemonEdit.length > 0) {
                tmsDoPokemonEdit.forEach((tm, idx) => {
                    const numF = tm.tipo === 'HM' ? 'HM' + String(tm.numero).padStart(2,'0') : 'TM' + String(tm.numero).padStart(2,'0');
                    tmsEditHTML += `
                        <div class="modal-atack-row">
                            <span class="modal-atack-slot" style="background: rgba(162,155,254,0.15); color: #a29bfe;">TM</span>
                            <input type="text" 
                                class="modal-atack-input modal-tm-input"
                                value="${numF} - ${tm.nome}" 
                                list="datalistTMs"
                                data-tm-numero-original="${tm.numero}"
                                placeholder="Selecione o TM..." 
                                autocomplete="off">
                            <button class="modal-clear-btn" onclick="this.parentElement.querySelector('input').value='';" title="Limpar TM">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`;
                });
            }
            // Campo vazio para adicionar novo TM
            tmsEditHTML += `
                <div class="modal-atack-row">
                    <span class="modal-atack-slot" style="background: rgba(162,155,254,0.15); color: #a29bfe;">+</span>
                    <input type="text" 
                        class="modal-atack-input modal-tm-input modal-tm-new"
                        value="" 
                        list="datalistTMs"
                        placeholder="Adicionar TM..." 
                        autocomplete="off">
                </div>`;
            
            // Sugestões de TMs
            const sugestoesTMs = obterSugestoesTMsParaPokemon(nomePrincipal);
            const tmsDoPokemon = obterTMsDoPokemon(nomePrincipal);
            
            let sugestoesTMsHTML = '';
            // TMs com sugestões da comunidade
            [...tmsDoPokemon, ...sugestoesTMs].forEach(tm => {
                if (tm.sugestao) {
                    const numFormatado = tm.tipo === 'HM' 
                        ? 'HM' + String(tm.numero).padStart(2, '0')
                        : 'TM' + String(tm.numero).padStart(2, '0');
                    sugestoesTMsHTML += `
                        <div class="modal-suggestion-item tm suggestion-with-delete">
                            <span class="suggestion-text">
                                <span class="suggestion-type tm">TM</span>
                                <strong>${numFormatado} ${tm.nome}</strong> — ${tm.sugestao}
                            </span>
                            <button class="suggestion-delete-btn" onclick="apagarSugestaoTM('${String(tm.numero).replace(/'/g, "\\'")}')" 
                                title="Apagar sugestão do ${numFormatado}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>`;
                }
            });

            overlay.innerHTML = `
                <div style="background: linear-gradient(145deg, #1a2980, #0f3460); border-radius: 20px; padding: 30px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid #ffd700; position: relative;" data-nome-real="${nomeReal}">
                    <button onclick="document.getElementById('modalEdicaoOverlay')?.remove()" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; z-index: 10;" onmouseover="this.style.background='rgba(255,75,75,0.4)';this.style.borderColor='#ff4b4b'" onmouseout="this.style.background='rgba(255,255,255,0.1)';this.style.borderColor='rgba(255,255,255,0.2)'">
                        <i class="fas fa-times"></i>
                    </button>
                    <h2 style="color: #ffd700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; padding-right: 40px;">
                        <i class="fas fa-edit"></i> Editando: ${nomeDisplay}
                    </h2>
                    
                    <div style="display: grid; gap: 15px;">
                        <div>
                            <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Nome do Pokémon:</label>
                            <input type="text" id="edit-nome" value="${nomeReal}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff; font-size: 16px;">
                        </div>
                        
                        <div>
                            <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Número:</label>
                            <input type="text" id="edit-numero" value="${numero}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff; font-size: 16px;">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <div>
                                <label style="color: #88d3ff; display: block; margin-bottom: 5px;">HP:</label>
                                <input type="number" id="edit-hp" value="${stats[0] || 0}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff;">
                            </div>
                            <div>
                                <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Ataque:</label>
                                <input type="number" id="edit-atk" value="${stats[1] || 0}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff;">
                            </div>
                            <div>
                                <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Defesa:</label>
                                <input type="number" id="edit-def" value="${stats[2] || 0}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff;">
                            </div>
                            <div>
                                <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Sp.Atk:</label>
                                <input type="number" id="edit-spatk" value="${stats[3] || 0}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff;">
                            </div>
                            <div>
                                <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Sp.Def:</label>
                                <input type="number" id="edit-spdef" value="${stats[4] || 0}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff;">
                            </div>
                            <div>
                                <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Velocidade:</label>
                                <input type="number" id="edit-speed" value="${stats[5] || 0}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff;">
                            </div>
                        </div>
                        
                        <div>
                            <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Localização:</label>
                            <textarea id="edit-local" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff; font-size: 14px; min-height: 60px;">${localizacao}</textarea>
                        </div>

                        <!-- SEÇÃO: EDIÇÃO DE ATACKS M1-M10 -->
                        <div class="modal-section">
                            <div class="modal-section-title">
                                <i class="fas fa-fist-raised"></i> Atacks (M1 - M10)
                            </div>
                            <datalist id="datalistAtacks">
                                ${atackDatalistOptions}
                            </datalist>
                            ${movesHTML}
                        </div>

                        <!-- SEÇÃO: EDIÇÃO DE TMs -->
                        <div class="modal-section">
                            <div class="modal-section-title" style="color: #a29bfe;">
                                <i class="fas fa-compact-disc"></i> TMs do Pokémon
                            </div>
                            <datalist id="datalistTMs">
                                ${tmDatalistOptions}
                            </datalist>
                            ${tmsEditHTML}
                        </div>

                        <!-- SEÇÃO: SUGESTÕES DOS MEMBROS -->
                        <div class="modal-suggestion-box">
                            <div class="modal-suggestion-title">
                                <i class="fas fa-users"></i> Sugestões dos Membros
                            </div>

                            <!-- Localização -->
                            <div style="margin-bottom: 10px;">
                                <div style="color: #00d4ff; font-weight: 600; font-size: 0.85em; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    <i class="fas fa-map-marker-alt"></i> Localização
                                </div>
                                ${sugestaoLoc 
                                    ? `<div class="modal-suggestion-item loc suggestion-with-delete">
                                        <span class="suggestion-text">${sugestaoLoc}</span>
                                        <button class="suggestion-delete-btn" onclick="apagarSugestaoLocalizacao('${nomePrincipal.replace(/'/g, "\\'")}')"
                                            title="Apagar sugestão de localização">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                      </div>` 
                                    : `<div class="modal-no-suggestion">Nenhuma sugestão de localização</div>`
                                }
                            </div>

                            <!-- TMs -->
                            <div style="margin-bottom: 10px;">
                                <div style="color: #a29bfe; font-weight: 600; font-size: 0.85em; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    <i class="fas fa-compact-disc"></i> TMs
                                </div>
                                ${sugestoesTMsHTML 
                                    ? sugestoesTMsHTML 
                                    : `<div class="modal-no-suggestion">Nenhuma sugestão de TM</div>`
                                }
                            </div>

                            <!-- Atacks sugeridos -->
                            <div>
                                <div style="color: #ff6b6b; font-weight: 600; font-size: 0.85em; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    <i class="fas fa-fist-raised"></i> Atacks
                                </div>
                                <div id="sugestoesAtacksContainer" class="modal-no-suggestion">Carregando...</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: flex-end;">
                        <button onclick="document.getElementById('modalEdicaoOverlay')?.remove()" style="padding: 12px 25px; background: rgba(255,255,255,0.1); border: 1px solid #888; color: #fff; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button onclick="salvarEdicao()" style="padding: 12px 25px; background: linear-gradient(135deg, #ffd700, #ffed4e); border: none; color: #1a2980; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </div>
            `;
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });

            // Carregar sugestões de atacks dos membros (verificar se moves foram atribuídos por membros)
            setTimeout(() => {
                const atacksSugeridos = [];
                if (pokemonData) {
                    for (let i = 1; i <= 10; i++) {
                        const move = (pokemonData[`M${i}`] || pokemonData[`m${i}`] || '').toString().trim();
                        if (move) {
                            atacksSugeridos.push(`<div class="modal-suggestion-item atack"><span class="suggestion-type atack">M${i}</span> ${move}</div>`);
                        }
                    }
                }
                const containerSugestoes = overlay.querySelector('#sugestoesAtacksContainer');
                if (containerSugestoes) {
                    containerSugestoes.innerHTML = atacksSugeridos.length > 0 
                        ? atacksSugeridos.join('') 
                        : '<span style="color: rgba(255,255,255,0.4); font-style: italic;">Nenhum atack registrado</span>';
                    containerSugestoes.className = '';
                }
            }, 100);
            
            return overlay;
        }
        
        async function salvarEdicao() {
            const nomeOriginal = document.querySelector('#modalEdicaoOverlay div[data-nome-real]').getAttribute('data-nome-real');
            
            const dados = {
                nome: document.getElementById('edit-nome').value,
                numero: document.getElementById('edit-numero').value,
                hp: document.getElementById('edit-hp').value,
                atk: document.getElementById('edit-atk').value,
                def: document.getElementById('edit-def').value,
                spatk: document.getElementById('edit-spatk').value,
                spdef: document.getElementById('edit-spdef').value,
                speed: document.getElementById('edit-speed').value,
                localizacao: document.getElementById('edit-local').value
            };

            // Coletar atacks M1-M10
            const atacksMudados = [];
            for (let i = 1; i <= 10; i++) {
                const el = document.getElementById(`edit-m${i}`);
                if (el) {
                    const novoAtack = el.value.trim();
                    atacksMudados.push({ slot: `m${i}`, nome: novoAtack });
                }
            }

            // Coletar TMs alterados
            const tmsMudados = [];
            document.querySelectorAll('#modalEdicaoOverlay .modal-tm-input').forEach(input => {
                const valor = input.value.trim();
                const numOriginal = input.getAttribute('data-tm-numero-original') || '';
                const isNew = input.classList.contains('modal-tm-new');
                
                if (valor) {
                    // Extrair número do TM do valor (formato: "TM01 - Nome" ou "HM01 - Nome")
                    const match = valor.match(/^(TM|HM)(\d+)\s*-\s*(.+)$/i);
                    if (match) {
                        const tmNumero = match[2];
                        const tmNome = match[3].trim();
                        if (isNew) {
                            // Novo TM: atualizar ORIGEM DO TM para este pokémon
                            tmsMudados.push({ numero: tmNumero, nome: tmNome, tipo: 'novo' });
                        } else if (numOriginal && numOriginal !== tmNumero) {
                            // TM alterado: remover do antigo, adicionar ao novo
                            tmsMudados.push({ numero: numOriginal, nome: '', tipo: 'remover' });
                            tmsMudados.push({ numero: tmNumero, nome: tmNome, tipo: 'novo' });
                        }
                    }
                } else if (numOriginal && !isNew) {
                    // TM foi apagado (campo vazio) - remover associação
                    tmsMudados.push({ numero: numOriginal, nome: '', tipo: 'remover', pokemonRemover: nomeOriginal });
                }
            });
            
            // Buscar Pokémon no array local pela coluna EV ou POKEMON
            console.log('🔍 Buscando Pokémon:', nomeOriginal);
            console.log('📊 Total de Pokémons no array:', todosPokemons.length);
            
            const nomeNormalizado = normalizarNome(nomeOriginal);
            console.log('🔤 Nome normalizado:', nomeNormalizado);
            
            const index = todosPokemons.findIndex(p => {
                const nomeEV = normalizarNome(p.EV || '');
                const nomePokemon = normalizarNome(p.POKEMON || '');
                const nomeParaComparar = nomeEV || nomePokemon;
                const match = nomeParaComparar === nomeNormalizado;
                
                if (match) {
                    console.log('✅ ENCONTRADO!', {
                        nomeEV: p.EV,
                        nomePokemon: p.POKEMON,
                        nomeParaComparar,
                        nomeNormalizado
                    });
                }
                
                return match;
            });
            
            if (index === -1) {
                console.error('❌ Pokémon NÃO encontrado no array!');
                console.log('Primeiros 10 Pokémons do array:', todosPokemons.slice(0, 10).map(p => ({
                    POKEMON: p.POKEMON,
                    EV: p.EV,
                    normalizado: normalizarNome(p.EV || p.POKEMON)
                })));
                alert('❌ Erro: Pokémon não encontrado!\n\nNome buscado: ' + nomeOriginal + '\nNome normalizado: ' + nomeNormalizado);
                return;
            }
            
            console.log('✅ Pokémon encontrado no índice:', index);
            
            // Atualizar Pokémon existente (NUNCA adicionar novo)
            const temEV = todosPokemons[index].EV && todosPokemons[index].EV.trim() !== '';
            
            todosPokemons[index] = {
                ...todosPokemons[index],
                // Se tem EV, atualiza coluna D. Senão, atualiza coluna C
                ...(temEV ? { EV: dados.nome } : { POKEMON: dados.nome }),
                PS: dados.numero,
                HP: dados.hp,
                Attack: dados.atk,
                Defense: dados.def,
                'Sp.Attack': dados.spatk,
                'Sp.Defense': dados.spdef,
                Speed: dados.speed,
                'LOCALIZAÇÃO': dados.localizacao
            };
            
            // Salvar no localStorage
            localStorage.setItem('pokemons_editados', JSON.stringify(todosPokemons));
            
            // Re-renderizar
            renderizarPokemons(todosPokemons);
            
            // 🚀 SALVAR NO GOOGLE SHEETS
            if (APPS_SCRIPT_URL && APPS_SCRIPT_URL.trim() !== '') {
                try {
                    const payload = {
                        acao: 'atualizar',  // SEMPRE atualizar, nunca adicionar
                        nomeOriginal: nomeOriginal,
                        pokemon: dados
                    };
                    
                    console.log('📤 Enviando para Apps Script:', {
                        url: APPS_SCRIPT_URL,
                        acao: payload.acao,
                        nomeOriginal: payload.nomeOriginal,
                        pokemon: payload.pokemon
                    });
                    
                    // Desabilitar botão e mostrar loading
                    const btnSalvar = document.querySelector('#modalEdicaoOverlay button[style*="background"]');
                    if (btnSalvar) {
                        btnSalvar.disabled = true;
                        btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
                        btnSalvar.style.opacity = '0.7';
                    }
                    
                    const inicio = Date.now();
                    // Incluir credenciais do admin para validação no backend
                    const adminUser = JSON.parse(localStorage.getItem('user') || '{}');
                    payload.authToken = adminUser.authToken;
                    payload.adminEmail = adminUser.email;

                    // Disparar TODAS as requests em paralelo (principal + atacks)
                    const promessas = [];

                    // Request principal (dados do Pokémon)
                    promessas.push(
                        fetch(APPS_SCRIPT_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain' },
                            body: JSON.stringify(payload)
                        }).then(r => r.text()).then(t => {
                            console.log('✅ Dados principais salvos');
                            return t;
                        })
                    );

                    // Requests de atacks M1-M10 em paralelo
                    if (atacksMudados && atacksMudados.length > 0) {
                        console.log('🎯 Salvando atacks M1-M10 em paralelo...');
                        for (const atack of atacksMudados) {
                            if (atack.nome !== undefined) {
                                promessas.push(
                                    fetch(APPS_SCRIPT_URL, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'text/plain' },
                                        body: JSON.stringify({
                                            action: 'atualizarAtack',
                                            nomePokemon: nomeOriginal,
                                            slot: atack.slot,
                                            nomeAtack: atack.nome,
                                            email: adminUser.email,
                                            authToken: adminUser.authToken
                                        })
                                    }).then(() => {
                                        console.log(`✅ ${atack.slot} salvo: ${atack.nome}`);
                                    }).catch(e => {
                                        console.warn(`⚠️ Erro ao salvar ${atack.slot}:`, e);
                                    })
                                );
                            }
                        }
                    }

                    // Requests de TMs alterados em paralelo
                    if (tmsMudados && tmsMudados.length > 0) {
                        console.log('💾 Salvando TMs em paralelo...');
                        for (const tm of tmsMudados) {
                            promessas.push(
                                fetch(APPS_SCRIPT_URL, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'text/plain' },
                                    body: JSON.stringify({
                                        action: 'atualizarOrigemTM',
                                        tmNumero: tm.numero,
                                        nomePokemon: tm.tipo === 'remover' ? '' : nomeOriginal,
                                        nomePokemonRemover: tm.pokemonRemover || nomeOriginal,
                                        email: adminUser.email,
                                        authToken: adminUser.authToken
                                    })
                                }).then(() => {
                                    console.log(`✅ TM${tm.numero} ${tm.tipo === 'remover' ? 'removido' : 'salvo'}`);
                                }).catch(e => {
                                    console.warn(`⚠️ Erro ao salvar TM${tm.numero}:`, e);
                                })
                            );
                        }
                    }

                    // Aguardar TODAS as requests antes de fechar
                    try {
                        await Promise.all(promessas);
                        const tempoDecorrido = Date.now() - inicio;
                        console.log(`✅ Todas as alterações salvas em ${tempoDecorrido}ms`);
                        
                        // Mostrar mensagem de sucesso no modal
                        const modalContent = document.querySelector('#modalEdicaoOverlay div[data-nome-real]');
                        if (modalContent) {
                            const successMsg = document.createElement('div');
                            successMsg.className = 'modal-success-msg';
                            successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Alterações salvas com sucesso!';
                            modalContent.appendChild(successMsg);
                        }
                        
                        // Fechar modal após breve delay e recarregar dados da planilha
                        setTimeout(async () => {
                            const overlay = document.getElementById('modalEdicaoOverlay');
                            if (overlay) overlay.remove();
                            // Limpar cache local e recarregar dados frescos da planilha
                            localStorage.removeItem('pokemons_editados');
                            console.log('🔄 Recarregando dados da planilha...');
                            await carregarDados();
                        }, 1500);
                    } catch (err) {
                        console.error('⚠️ Erro parcial ao salvar:', err);
                        // Mesmo com erro parcial, mostrar aviso e fechar
                        const modalContent = document.querySelector('#modalEdicaoOverlay div[data-nome-real]');
                        if (modalContent) {
                            const warnMsg = document.createElement('div');
                            warnMsg.className = 'modal-success-msg';
                            warnMsg.style.background = 'rgba(255, 165, 0, 0.15)';
                            warnMsg.style.borderColor = 'rgba(255, 165, 0, 0.4)';
                            warnMsg.style.color = '#ffa500';
                            warnMsg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Salvo com avisos (verifique o console)';
                            modalContent.appendChild(warnMsg);
                        }
                        setTimeout(async () => {
                            const overlay = document.getElementById('modalEdicaoOverlay');
                            if (overlay) overlay.remove();
                            // Recarregar mesmo com avisos
                            localStorage.removeItem('pokemons_editados');
                            console.log('🔄 Recarregando dados da planilha...');
                            await carregarDados();
                        }, 2000);
                    }
                    
                } catch (erro) {
                    console.error('❌ Erro ao salvar no Google Sheets:', erro);
                    alert('❌ Erro ao salvar: ' + erro.message);
                    // Reabilitar botão salvar
                    const btnSalvar2 = document.querySelector('#modalEdicaoOverlay button[style*="background"]');
                    if (btnSalvar2) {
                        btnSalvar2.disabled = false;
                        btnSalvar2.innerHTML = '<i class="fas fa-save"></i> Salvar';
                        btnSalvar2.style.opacity = '1';
                    }
                }
            } else {
                const overlay = document.getElementById('modalEdicaoOverlay');
                if (overlay) overlay.remove();
            }
        }
        
        function abrirModalAddPokemon() {
            const modal = criarModalEdicao('Novo Pokémon', '', ['0','0','0','0','0','0'], '', '');
            document.body.appendChild(modal);
        }

        // ========================
        // 💡 SISTEMA UNIFICADO DE SUGESTÕES
        // ========================

        // Carregar base de atacks
        async function carregarDadosAtacks() {
            if (todosAtacks.length > 0) return;
            try {
                const response = await fetch(APPS_SCRIPT_URL + '?acao=obter_atacks');
                const resultado = await response.json();
                if (resultado.success && resultado.data && resultado.data.length > 0) {
                    todosAtacks = resultado.data;
                    console.log('✅ Atacks carregados:', todosAtacks.length);
                }
            } catch (e) {
                console.warn('⚠️ Erro ao carregar Atacks:', e);
            }
        }

        // Estilos inline reutilizáveis para o modal
        const modalStyles = {
            overlay: 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;',
            box: 'background:linear-gradient(135deg, #1a2980 0%, #0f3460 100%);padding:30px;border-radius:20px;max-width:650px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:2px solid rgba(255,215,0,0.3);max-height:90vh;overflow-y:auto;',
            title: 'color:#ffd700;margin:0 0 20px 0;font-size:22px;display:flex;align-items:center;gap:10px;',
            label: 'color:#ffd700;display:block;margin-bottom:8px;font-weight:600;font-size:14px;',
            select: 'width:100%;padding:12px;border-radius:10px;border:2px solid rgba(255,215,0,0.3);background:rgba(255,255,255,0.1);color:#fff;font-size:14px;margin-bottom:15px;font-family:Arial;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23ffd700\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;',
            input: 'width:100%;padding:12px;border-radius:10px;border:2px solid rgba(255,215,0,0.3);background:rgba(255,255,255,0.1);color:#fff;font-size:14px;margin-bottom:15px;font-family:Arial;box-sizing:border-box;',
            textarea: 'width:100%;padding:12px;border-radius:10px;border:2px solid rgba(255,215,0,0.3);background:rgba(255,255,255,0.1);color:#fff;font-size:14px;min-height:80px;resize:vertical;font-family:Arial;margin-bottom:15px;box-sizing:border-box;',
            btnSalvar: 'flex:1;padding:12px;background:linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);border:none;border-radius:10px;color:#000;font-weight:700;cursor:pointer;font-size:15px;transition:all 0.3s;',
            btnCancelar: 'flex:1;padding:12px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.3);border-radius:10px;color:#fff;font-weight:600;cursor:pointer;font-size:15px;transition:all 0.3s;',
            btnAdd: 'padding:10px 20px;background:linear-gradient(135deg, #00b894 0%, #00cec9 100%);border:none;border-radius:10px;color:#fff;font-weight:700;cursor:pointer;font-size:14px;margin-top:10px;transition:all 0.3s;display:inline-flex;align-items:center;gap:6px;',
            btnOpcao: 'flex:1;padding:16px;background:rgba(255,255,255,0.08);border:2px solid rgba(255,215,0,0.3);border-radius:15px;color:#fff;font-weight:600;cursor:pointer;font-size:15px;transition:all 0.3s;display:flex;flex-direction:column;align-items:center;gap:10px;',
            selectOptionFix: '<style>select option{color:#000!important;background:#fff!important;} select{color:#fff;} input[list]::-webkit-calendar-picker-indicator{filter:invert(1);} input::placeholder{color:rgba(255,255,255,0.5);} textarea::placeholder{color:rgba(255,255,255,0.5);}</style>',
            subtitle: 'color:#fff;margin-bottom:20px;font-size:15px;',
            divider: 'border:none;border-top:1px solid rgba(255,215,0,0.2);margin:15px 0;',
            btnFechar: '<button onclick="document.getElementById(\'modalSugestao\').remove()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:#ffd700;font-size:24px;cursor:pointer;padding:5px 10px;line-height:1;z-index:10;" title="Fechar"><i class="fas fa-times"></i></button>'
        };

        window.abrirModalSugestaoUnificado = function(nomePokemon) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (!user.email) {
                alert('Você precisa estar logado para fazer sugestões!');
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'modalSugestao';
            modal.style.cssText = modalStyles.overlay;
            modal.innerHTML = `
                <div style="${modalStyles.box};position:relative;">
                    ${modalStyles.btnFechar}
                    ${modalStyles.selectOptionFix}
                    <h2 style="${modalStyles.title}"><i class="fas fa-lightbulb"></i> Sugerir - ${nomePokemon}</h2>
                    <p style="${modalStyles.subtitle}">Selecione o tipo de sugestão:</p>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;">
                        <button onclick="mostrarFormLocalizacao('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnOpcao}">
                            <i class="fas fa-map-marker-alt" style="font-size:28px;color:#ffd700;"></i>
                            Localização
                        </button>
                        <button onclick="mostrarFormAtacks('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnOpcao}">
                            <i class="fas fa-fist-raised" style="font-size:28px;color:#ff6b6b;"></i>
                            Atacks
                        </button>
                        <button onclick="mostrarFormTMs('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnOpcao}">
                            <i class="fas fa-compact-disc" style="font-size:28px;color:#a29bfe;"></i>
                            TMs
                        </button>
                    </div>
                    <div style="display:flex;gap:10px;margin-top:20px;">
                        <button onclick="this.closest('#modalSugestao').remove()" style="${modalStyles.btnCancelar};width:100%;">
                            <i class="fas fa-times"></i> Fechar
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        };

        // ===== 1. LOCALIZAÇÃO =====
        window.mostrarFormLocalizacao = function(nomePokemon) {
            const modal = document.getElementById('modalSugestao');
            if (!modal) return;
            modal.innerHTML = `
                <div style="${modalStyles.box};position:relative;">
                    ${modalStyles.btnFechar}
                    ${modalStyles.selectOptionFix}
                    <h2 style="${modalStyles.title}"><i class="fas fa-map-marker-alt"></i> Sugerir Localização</h2>
                    <p style="${modalStyles.subtitle}"><strong>${nomePokemon}</strong></p>
                    <label style="${modalStyles.label}">📍 Sua sugestão de localização:</label>
                    <textarea id="sugestaoLocInput" placeholder="Ex: Encontrado na rota 5, próximo ao lago..." style="${modalStyles.textarea}"></textarea>
                    <div style="display:flex;gap:10px;">
                        <button onclick="salvarSugestaoLocalizacao('${nomePokemon.replace(/'/g, "\\'")}'  , this)" style="${modalStyles.btnSalvar}">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        <button onclick="abrirModalSugestaoUnificado('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnCancelar}">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                </div>
            `;
        };

        window.salvarSugestaoLocalizacao = async function(nomePokemon, botao) {
            const sugestao = document.getElementById('sugestaoLocInput').value.trim();
            if (!sugestao) { alert('Digite uma sugestão!'); return; }
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            try {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'atualizarSugestao', nomePokemon, sugestao, email: user.email, authToken: user.authToken })
                });
                const resultado = JSON.parse(await resp.text());
                if (resultado.sucesso || resultado.success) {
                    document.getElementById('modalSugestao').remove();
                    setTimeout(() => location.reload(), 300);
                } else {
                    alert('Erro: ' + (resultado.mensagem || resultado.message));
                    botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar';
                }
            } catch (e) {
                alert('Erro ao salvar. Tente novamente.');
                botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar';
            }
        };

        // ===== 2. ATACKS =====
        window.mostrarFormAtacks = async function(nomePokemon) {
            const modal = document.getElementById('modalSugestao');
            if (!modal) return;
            
            // Carregar atacks se necessário
            await carregarDadosAtacks();
            
            let slotsHTML = '';
            for (let i = 1; i <= 10; i++) {
                slotsHTML += `<option value="m${i}">M${i}</option>`;
            }
            
            modal.innerHTML = `
                <div style="${modalStyles.box};position:relative;">
                    ${modalStyles.btnFechar}
                    ${modalStyles.selectOptionFix}
                    <h2 style="${modalStyles.title}"><i class="fas fa-fist-raised"></i> Sugerir Atack</h2>
                    <p style="${modalStyles.subtitle}"><strong>${nomePokemon}</strong></p>
                    
                    <label style="${modalStyles.label}">🎯 Slot do Atack:</label>
                    <select id="slotAtack" style="${modalStyles.select}">
                        ${slotsHTML}
                    </select>
                    
                    <label style="${modalStyles.label}">⚔️ Nome do Atack:</label>
                    <input id="nomeAtackInput" type="text" list="listaAtacks" placeholder="Digite o nome do atack..." style="${modalStyles.input}">
                    <datalist id="listaAtacks">
                        ${todosAtacks.map(a => '<option value="' + (a['ATACK'] || a.ATACK || '') + '">').join('')}
                    </datalist>
                    
                    <div style="display:flex;gap:10px;">
                        <button onclick="salvarSugestaoAtack('${nomePokemon.replace(/'/g, "\\'")}'  , this)" style="${modalStyles.btnSalvar}">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        <button onclick="abrirModalSugestaoUnificado('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnCancelar}">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                    <hr style="${modalStyles.divider}">
                    <p style="color:#a0e7ff;font-size:13px;margin-bottom:10px;">Atack não existe na base? Adicione:</p>
                    <button onclick="mostrarFormAdicionarAtack('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnAdd}">
                        <i class="fas fa-plus"></i> Adicionar novo Atack
                    </button>
                </div>
            `;
        };

        window.salvarSugestaoAtack = async function(nomePokemon, botao) {
            const slot = document.getElementById('slotAtack').value;
            const nomeAtack = document.getElementById('nomeAtackInput').value.trim();
            if (!nomeAtack) { alert('Digite o nome do atack!'); return; }
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            try {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'atualizarAtack', nomePokemon, slot, nomeAtack, email: user.email, authToken: user.authToken })
                });
                const resultado = JSON.parse(await resp.text());
                if (resultado.sucesso || resultado.success) {
                    document.getElementById('modalSugestao').remove();
                    setTimeout(() => location.reload(), 300);
                } else {
                    alert('Erro: ' + (resultado.mensagem || resultado.message));
                    botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar';
                }
            } catch (e) {
                alert('Erro ao salvar. Tente novamente.');
                botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar';
            }
        };

        // Formulário para adicionar novo atack à base
        window.mostrarFormAdicionarAtack = function(nomePokemon) {
            const modal = document.getElementById('modalSugestao');
            if (!modal) return;
            
            const tiposOptions = ['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'].map(t => '<option value="'+t+'">'+t+'</option>').join('');
            
            modal.innerHTML = `
                <div style="${modalStyles.box};position:relative;">
                    ${modalStyles.btnFechar}
                    ${modalStyles.selectOptionFix}
                    <h2 style="${modalStyles.title}"><i class="fas fa-plus-circle"></i> Adicionar Novo Atack</h2>
                    
                    <label style="${modalStyles.label}">Nome do Atack:</label>
                    <input id="novoAtackNome" type="text" placeholder="Ex: Solar Blade" style="${modalStyles.input}">
                    
                    <label style="${modalStyles.label}">Tipo:</label>
                    <select id="novoAtackType" style="${modalStyles.select}">
                        ${tiposOptions}
                    </select>
                    
                    <label style="${modalStyles.label}">Categoria:</label>
                    <select id="novoAtackCategoria" style="${modalStyles.select}">
                        <option value="Physical">Physical</option>
                        <option value="Special">Special</option>
                        <option value="Status">Status</option>
                    </select>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                        <div>
                            <label style="${modalStyles.label}">PP:</label>
                            <input id="novoAtackPP" type="number" placeholder="PP" style="${modalStyles.input}">
                        </div>
                        <div>
                            <label style="${modalStyles.label}">Power:</label>
                            <input id="novoAtackPower" type="number" placeholder="Power" style="${modalStyles.input}">
                        </div>
                        <div>
                            <label style="${modalStyles.label}">Accuracy:</label>
                            <input id="novoAtackAccuracy" type="number" placeholder="Accuracy" style="${modalStyles.input}">
                        </div>
                    </div>
                    
                    <label style="${modalStyles.label}">GEN:</label>
                    <input id="novoAtackGen" type="number" placeholder="Ex: 1, 2, 3..." style="${modalStyles.input}">
                    
                    <div style="display:flex;gap:10px;">
                        <button onclick="salvarNovoAtack('${nomePokemon.replace(/'/g, "\\'")}'  , this)" style="${modalStyles.btnSalvar}">
                            <i class="fas fa-save"></i> Salvar Atack
                        </button>
                        <button onclick="mostrarFormAtacks('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnCancelar}">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                </div>
            `;
        };

        window.salvarNovoAtack = async function(nomePokemon, botao) {
            const nome = document.getElementById('novoAtackNome').value.trim();
            if (!nome) { alert('Digite o nome do atack!'); return; }
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            try {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'adicionarAtack',
                        atack: nome,
                        type: document.getElementById('novoAtackType').value,
                        categoria: document.getElementById('novoAtackCategoria').value,
                        pp: document.getElementById('novoAtackPP').value || '',
                        power: document.getElementById('novoAtackPower').value || '',
                        accuracy: document.getElementById('novoAtackAccuracy').value || '',
                        gen: document.getElementById('novoAtackGen').value || '',
                        email: user.email,
                        authToken: user.authToken
                    })
                });
                const resultado = JSON.parse(await resp.text());
                if (resultado.sucesso || resultado.success) {
                    alert('Atack adicionado com sucesso!');
                    todosAtacks.push({ ATACK: nome }); // Atualizar cache local
                    mostrarFormAtacks(nomePokemon); // Voltar ao form de atacks
                } else {
                    alert('Erro: ' + (resultado.mensagem || resultado.message));
                    botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar Atack';
                }
            } catch (e) {
                alert('Erro ao salvar. Tente novamente.');
                botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar Atack';
            }
        };

        // ===== 3. TMs =====
        window.mostrarFormTMs = async function(nomePokemon) {
            const modal = document.getElementById('modalSugestao');
            if (!modal) return;
            await carregarDadosTMs();
            
            modal.innerHTML = `
                <div style="${modalStyles.box};position:relative;">
                    ${modalStyles.btnFechar}
                    ${modalStyles.selectOptionFix}
                    <h2 style="${modalStyles.title}"><i class="fas fa-compact-disc"></i> Sugerir TM</h2>
                    <p style="${modalStyles.subtitle}"><strong>${nomePokemon}</strong></p>
                    <p style="${modalStyles.subtitle}">O TM já existe na base?</p>
                    <div style="display:flex;gap:12px;">
                        <button onclick="mostrarFormTMExistente('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnOpcao}">
                            <i class="fas fa-check-circle" style="font-size:24px;color:#00b894;"></i>
                            TM Existente
                        </button>
                        <button onclick="mostrarFormTMNovo('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnOpcao}">
                            <i class="fas fa-plus-circle" style="font-size:24px;color:#fdcb6e;"></i>
                            Novo TM
                        </button>
                    </div>
                    <div style="display:flex;gap:10px;margin-top:15px;">
                        <button onclick="abrirModalSugestaoUnificado('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnCancelar};width:100%;">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                </div>
            `;
        };

        // TM Existente - sugerir pokémon que dropa
        window.mostrarFormTMExistente = function(nomePokemon) {
            const modal = document.getElementById('modalSugestao');
            if (!modal) return;
            
            const tmDatalistOptions = todosTMs.map(function(tm) {
                const numFormatado = tm.tipo === 'HM' 
                    ? 'HM' + String(tm.numero).padStart(2, '0')
                    : 'TM' + String(tm.numero).padStart(2, '0');
                return '<option value="' + numFormatado + ' - ' + tm.nome + ' (' + tm.tipagem + ')">';
            }).join('');

            // Gerar datalist de Pokémons
            const pokemonDatalistOptions = todosPokemons.map(function(p) {
                const nome = (p['EV'] || p['POKEMON'] || '').toString().trim();
                return nome ? '<option value="' + nome + '">' : '';
            }).filter(Boolean).join('');

            modal.innerHTML = `
                <div style="${modalStyles.box};position:relative;">
                    ${modalStyles.btnFechar}
                    ${modalStyles.selectOptionFix}
                    <h2 style="${modalStyles.title}"><i class="fas fa-compact-disc"></i> Sugerir Pokémon para TM</h2>
                    <p style="${modalStyles.subtitle}"><strong>${nomePokemon}</strong></p>
                    
                    <label style="${modalStyles.label}">💿 Selecione o TM:</label>
                    <input id="tmSelecionado" type="text" list="listaTMsExistente" placeholder="Digite ou selecione um TM..." style="${modalStyles.input}" autocomplete="off">
                    <datalist id="listaTMsExistente">
                        ${tmDatalistOptions}
                    </datalist>
                    
                    <label style="${modalStyles.label}">🐾 Pokémon que dropa / Sugestão:</label>
                    <input id="sugestaoTMInput" type="text" list="listaPokemonsTM" placeholder="Digite o nome do Pokémon..." style="${modalStyles.input}" autocomplete="off">
                    <datalist id="listaPokemonsTM">
                        ${pokemonDatalistOptions}
                    </datalist>
                    
                    <div style="display:flex;gap:10px;">
                        <button onclick="salvarSugestaoTMExistente('${nomePokemon.replace(/'/g, "\\'")}'  , this)" style="${modalStyles.btnSalvar}">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        <button onclick="mostrarFormTMs('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnCancelar}">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                </div>
            `;
        };

        window.salvarSugestaoTMExistente = async function(nomePokemon, botao) {
            const tmTexto = document.getElementById('tmSelecionado').value.trim();
            // Extrair número do TM do texto selecionado (ex: "TM02 - Dragon Claw (Dragon)" -> "02")
            const tmMatch = tmTexto.match(/^(?:TM|HM)(\d+)/i);
            const tmNumero = tmMatch ? tmMatch[1] : '';
            const sugestao = document.getElementById('sugestaoTMInput').value.trim();
            if (!tmNumero) { alert('Selecione um TM válido! (Ex: TM02 - Dragon Claw)'); return; }
            if (!sugestao) { alert('Digite a sugestão!'); return; }
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            try {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'atualizarSugestaoTM', tmNumero, sugestao, nomePokemon, email: user.email, authToken: user.authToken })
                });
                const resultado = JSON.parse(await resp.text());
                if (resultado.sucesso || resultado.success) {
                    document.getElementById('modalSugestao').remove();
                    setTimeout(() => location.reload(), 300);
                } else {
                    alert('Erro: ' + (resultado.mensagem || resultado.message));
                    botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar';
                }
            } catch (e) {
                alert('Erro ao salvar. Tente novamente.');
                botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar';
            }
        };

        // Novo TM - adicionar à base de TMs
        window.mostrarFormTMNovo = function(nomePokemon) {
            const modal = document.getElementById('modalSugestao');
            if (!modal) return;
            
            const tiposOptions = ['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'].map(t => '<option value="'+t+'">'+t+'</option>').join('');

            modal.innerHTML = `
                <div style="${modalStyles.box};position:relative;">
                    ${modalStyles.btnFechar}
                    ${modalStyles.selectOptionFix}
                    <h2 style="${modalStyles.title}"><i class="fas fa-plus-circle"></i> Adicionar Novo TM</h2>
                    
                    <label style="${modalStyles.label}">Tipo de Item:</label>
                    <input type="text" value="TM" disabled style="${modalStyles.input};opacity:0.6;">
                    
                    <label style="${modalStyles.label}">Número do TM:</label>
                    <input id="novoTMNumero" type="number" placeholder="Ex: 12" style="${modalStyles.input}">
                    
                    <label style="${modalStyles.label}">Nome do TM:</label>
                    <input id="novoTMNome" type="text" placeholder="Ex: Solar Blade" style="${modalStyles.input}">
                    
                    <label style="${modalStyles.label}">Tipagem do TM:</label>
                    <select id="novoTMTipagem" style="${modalStyles.select}">
                        ${tiposOptions}
                    </select>
                    
                    <label style="${modalStyles.label}">Tipo de Drop:</label>
                    <select id="novoTMTipoDrop" style="${modalStyles.select}">
                        <option value="Spawn">Spawn</option>
                        <option value="Craft">Craft</option>
                        <option value="Event">Event</option>
                        <option value="desconhecido">Desconhecido</option>
                    </select>
                    
                    <label style="${modalStyles.label}">Sugestão de Pokémon:</label>
                    <input id="novoTMSugestao" type="text" list="listaPokemonsNovoTM" placeholder="Digite o nome do Pokémon..." style="${modalStyles.input}" autocomplete="off">
                    <datalist id="listaPokemonsNovoTM">
                        ${todosPokemons.map(function(p) { const nome = (p['EV'] || p['POKEMON'] || '').toString().trim(); return nome ? '<option value="' + nome + '">' : ''; }).filter(Boolean).join('')}
                    </datalist>
                    
                    <div style="display:flex;gap:10px;">
                        <button onclick="salvarNovoTM('${nomePokemon.replace(/'/g, "\\'")}'  , this)" style="${modalStyles.btnSalvar}">
                            <i class="fas fa-save"></i> Salvar TM
                        </button>
                        <button onclick="mostrarFormTMs('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnCancelar}">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                </div>
            `;
        };

        window.salvarNovoTM = async function(nomePokemon, botao) {
            const numero = document.getElementById('novoTMNumero').value.trim();
            const nome = document.getElementById('novoTMNome').value.trim();
            if (!numero || !nome) { alert('Preencha número e nome do TM!'); return; }
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            try {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'adicionarTM',
                        tipoItem: 'TM',
                        numero: numero,
                        nome: nome,
                        tipagem: document.getElementById('novoTMTipagem').value,
                        origem: '',
                        tipoDrop: document.getElementById('novoTMTipoDrop').value,
                        sugestao: document.getElementById('novoTMSugestao').value.trim(),
                        email: user.email,
                        authToken: user.authToken
                    })
                });
                const resultado = JSON.parse(await resp.text());
                if (resultado.sucesso || resultado.success) {
                    alert('TM adicionado com sucesso!');
                    document.getElementById('modalSugestao').remove();
                    setTimeout(() => location.reload(), 300);
                } else {
                    alert('Erro: ' + (resultado.mensagem || resultado.message));
                    botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar TM';
                }
            } catch (e) {
                alert('Erro ao salvar. Tente novamente.');
                botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar TM';
            }
        };

        /* ============================================
           🤖 BUSCA POR IMAGEM COM IA (GEMINI VISION)
           ============================================ */

        // Configurar busca por imagem ao colar (Ctrl+V)
        async function configurarBuscaPorImagem() {
            const searchInput = document.getElementById('searchInput');
            
            if (!searchInput) {
                console.warn('⚠️ searchInput não encontrado. Tentando novamente em 1s...');
                setTimeout(configurarBuscaPorImagem, 1000);
                return;
            }

            console.log('✅ Busca por imagem configurada no input:', searchInput);

            searchInput.addEventListener('paste', async (e) => {
                console.log('📋 Evento paste detectado!', e);
                const items = e.clipboardData?.items;
                if (!items) return;

                // Procurar por imagem no clipboard
                console.log('🔍 Clipboard items:', items.length);
                for (let item of items) {
                    console.log('📦 Item type:', item.type);
                    if (item.type.indexOf('image') !== -1) {
                        console.log('🖼️ Imagem detectada!');
                        e.preventDefault(); // Evitar colar a imagem como texto
                        
                        const file = item.getAsFile();
                        console.log('📁 File:', file);
                        if (!file) {
                            console.warn('⚠️ Não foi possível obter arquivo');
                            continue;
                        }

                        // Feedback visual
                        const placeholderOriginal = searchInput.placeholder;
                        searchInput.placeholder = "🤖 IA processando imagem...";
                        searchInput.disabled = true;
                        searchInput.style.background = "rgba(102, 126, 234, 0.1)";

                        try {
                            // Processar imagem com IA
                            const nomes = await extrairNomesPokemonComIA(file);
                            
                            if (nomes && nomes.length > 0) {
                                // Preencher busca automaticamente
                                searchInput.value = nomes.join(', ');
                                searchInput.placeholder = placeholderOriginal;
                                searchInput.disabled = false;
                                searchInput.style.background = "";
                                
                                // Aplicar busca (simular evento input)
                                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                                
                                // Feedback sucesso
                                searchInput.style.borderColor = "#4caf50";
                                setTimeout(() => {
                                    searchInput.style.borderColor = "";
                                }, 2000);
                            } else {
                                throw new Error('Nenhum Pokémon detectado na imagem');
                            }
                        } catch (erro) {
                            console.error('Erro ao processar imagem:', erro);
                            searchInput.placeholder = "❌ Erro ao processar. Tente novamente...";
                            searchInput.disabled = false;
                            searchInput.style.background = "";
                            searchInput.style.borderColor = "#f44336";
                            
                            setTimeout(() => {
                                searchInput.placeholder = placeholderOriginal;
                                searchInput.style.borderColor = "";
                            }, 3000);
                        }
                        
                        break; // Processar apenas primeira imagem
                    }
                }
            });

            console.log('🤖 Busca por imagem configurada! Cole uma imagem com Ctrl+V');
        }

        // Extrair nomes de Pokémon da imagem usando OCR (Tesseract.js)
        async function extrairNomesPokemonComIA(imageFile) {
            try {
                console.log('🔍 Iniciando OCR com Tesseract.js...');
                
                // Verificar se Tesseract está carregado
                if (typeof Tesseract === 'undefined') {
                    throw new Error('⚠️ Tesseract.js não foi carregado. Verifique a conexão com internet.');
                }
                
                const imageUrl = URL.createObjectURL(imageFile);
                
                // 🎯 ESTRATÉGIA HÍBRIDA: Tentar múltiplas abordagens
                console.log('🎯 Tentativa 1: OCR padrão...');
                let text = await tryOCR(imageUrl, false);
                
                // Se não encontrou nada, tentar com pré-processamento
                if (!text || text.trim().length < 3) {
                    console.log('🎯 Tentativa 2: OCR com pré-processamento...');
                    const processedUrl = await preprocessImage(imageFile);
                    text = await tryOCR(processedUrl, true);
                    URL.revokeObjectURL(processedUrl);
                }
                
                // Limpar URL temporária
                URL.revokeObjectURL(imageUrl);
                
                console.log('📝 Texto extraído final:', text);
                
                // Processar texto extraído
                return processarERetornarNomes(text);
                
            } catch (erro) {
                console.error('❌ Erro no OCR:', erro);
                throw erro;
            }
        }

        /**
         * Tentar OCR na imagem
         * @param {string} imageUrl - URL da imagem
         * @param {boolean} isProcessed - Se é imagem pré-processada
         * @returns {Promise<string>} - Texto extraído
         */
        async function tryOCR(imageUrl, isProcessed) {
            const { data: { text } } = await Tesseract.recognize(
                imageUrl,
                'eng',
                {
                    logger: info => {
                        if (info.status === 'recognizing text') {
                            console.log(`🔄 OCR Progresso: ${Math.round(info.progress * 100)}%`);
                        }
                    }
                }
            );
            console.log(`${isProcessed ? '🎨' : '📄'} Texto detectado (${isProcessed ? 'processado' : 'original'}):`, text);
            return text;
        }

        /**
         * Pré-processar imagem para melhorar OCR
         * - Inverte cores (branco → preto)
         * - Aumenta contraste
         * - Binariza (preto e branco puro)
         * @param {File} imageFile - Arquivo de imagem
         * @returns {Promise<string>} - URL da imagem processada
         */
        async function preprocessImage(imageFile) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                img.onload = () => {
                    // Definir tamanho do canvas
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Desenhar imagem original
                    ctx.drawImage(img, 0, 0);
                    
                    // Obter dados dos pixels
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    
                    // Processar cada pixel
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        
                        // Calcular luminosidade (escala de cinza)
                        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                        
                        // � AUMENTAR CONTRASTE (fator 2.0 - mais agressivo)
                        let contrastedLuminance = (luminance - 128) * 2.0 + 128;
                        contrastedLuminance = Math.max(0, Math.min(255, contrastedLuminance));
                        
                        // 🔄 INVERTER se fundo escuro (maioria dos pixels escuros)
                        // Detectar automaticamente se precisa inverter
                        let finalLuminance = contrastedLuminance;
                        
                        // ⚫⚪ BINARIZAR (limiar adaptativo 140): preto ou branco puro
                        const binarized = finalLuminance > 140 ? 255 : 0;
                        
                        // Aplicar valores processados
                        data[i] = binarized;     // R
                        data[i + 1] = binarized; // G
                        data[i + 2] = binarized; // B
                        // data[i + 3] = alpha (não mexer)
                    }
                    
                    // Aplicar dados processados de volta ao canvas
                    ctx.putImageData(imageData, 0, 0);
                    
                    // Converter canvas para blob e criar URL
                    canvas.toBlob(blob => {
                        const processedUrl = URL.createObjectURL(blob);
                        console.log('✅ Imagem pré-processada com sucesso');
                        resolve(processedUrl);
                    }, 'image/png');
                };
                
                img.onerror = () => {
                    reject(new Error('Erro ao carregar imagem para processamento'));
                };
                
                // Carregar imagem
                img.src = URL.createObjectURL(imageFile);
            });
        }

        /**
         * Processar texto extraído do OCR e filtrar nomes de Pokémon
         * @param {string} textoExtraido - Texto extraído pela OCR
         * @returns {Array<string>} - Array com nomes dos Pokémon detectados
         */
        function processarERetornarNomes(textoExtraido) {
            try {
                console.log('📦 Processando texto:', textoExtraido);
                
                // Verificar se há texto
                if (!textoExtraido || textoExtraido.trim().length === 0) {
                    console.warn('⚠️ Nenhum texto extraído');
                    return [];
                }
                
                // Dividir texto em linhas e palavras
                const palavras = textoExtraido.split(/[\s,;|\n\r]+/);
                
                console.log('📝 Palavras encontradas:', palavras);
                
                // Filtrar e limpar palavras que podem ser nomes de Pokémon
                const namesArray = palavras
                    .map(word => word.trim())
                    .filter(name => {
                        // Remove entradas vazias, números e texto indesejado
                        return name && 
                               name.length > 2 && 
                               !/^\d+$/.test(name) &&              // Remove números puros
                               !/^(lv|lvl|level|hp|atk|def|spa|spd)(\s*\d*)?$/i.test(name) && // Remove stats
                               !/^(male|female|shiny|★|♂|♀)$/i.test(name); // Remove outros textos
                    })
                    .map(name => {
                        // Capitalizar primeira letra
                        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
                    });
                
                console.log('✅ Nomes extraídos:', namesArray);
                
                return namesArray;
                
            } catch (erro) {
                console.error('❌ Erro ao processar texto:', erro);
                return [];
            }
        }

        // Converter arquivo para base64
        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        // Inicializar busca por imagem quando página carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', configurarBuscaPorImagem);
        } else {
            configurarBuscaPorImagem();
        }

        // ⭐ EXPORT GLOBAL DE FUNÇÕES PARA MÓDULOS
        window.renderizarPokemons = renderizarPokemons;
        window.configurarBuscaInstantanea = configurarBuscaInstantanea;
        window.todosPokemons = todosPokemons;

        // ============================================
        // 🔍 FILTROS AVANÇADOS DA POKÉDEX
        // ============================================

        window.toggleFiltrosPokedex = function() {
            const panel = document.getElementById('filtersPanel');
            const btn = document.getElementById('toggleFilters');
            if (!panel) return;
            if (panel.style.display === 'none') {
                panel.style.display = 'flex';
                btn.classList.add('active');
            } else {
                panel.style.display = 'none';
                btn.classList.remove('active');
            }
        };

        window.limparFiltrosPokedex = function() {
            document.getElementById('filterGen').value = '';
            document.getElementById('filterType').value = '';
            document.getElementById('filterEV').value = '';
            document.getElementById('filterSugestao').value = '';
            aplicarFiltrosPokedex();
        };

        window.aplicarFiltrosPokedex = async function() {
            const container = document.getElementById('pokemonContainer');
            if (!container) return;

            const genFiltro = (document.getElementById('filterGen') || {}).value || '';
            const typeFiltro = ((document.getElementById('filterType') || {}).value || '').toLowerCase();
            const evFiltro = ((document.getElementById('filterEV') || {}).value || '').toLowerCase();
            const sugestaoFiltro = ((document.getElementById('filterSugestao') || {}).value || '').toLowerCase();

            const temFiltroAtivo = genFiltro || typeFiltro || evFiltro || sugestaoFiltro;

            // Se algum filtro ativo e dados incompletos, carregar tudo
            if (temFiltroAtivo && !dadosCompletosCarregados) {
                container.innerHTML = '<div style="text-align:center;padding:50px;color:#ffd700;"><i class="fas fa-spinner fa-spin" style="font-size:48px;"></i><p style="margin-top:20px;">Carregando todos os Pokémons para filtrar...</p></div>';
                try {
                    const resposta = await fetch(`${URL_DADOS}&page=1&limit=9999`);
                    const resultado = await resposta.json();
                    todosPokemonsCompleto = resultado.data;
                    dadosCompletosCarregados = true;
                    todosPokemons = todosPokemonsCompleto;
                    temMaisPaginas = false;
                } catch (e) {
                    console.error('Erro ao carregar dados para filtro:', e);
                    return;
                }
            }

            // Se nenhum filtro, re-renderizar tudo
            if (!temFiltroAtivo) {
                renderizarPokemons(todosPokemons);
                return;
            }

            const pokemonsFiltrados = todosPokemons.filter(pokemon => {
                // FILTRO DE GERAÇÃO
                if (genFiltro) {
                    const gen = String(pokemon['GEN'] || '').trim();
                    if (gen !== genFiltro) return false;
                }

                // FILTRO DE TIPAGEM
                if (typeFiltro) {
                    const type1 = (pokemon['Type 1'] || '').toLowerCase().trim();
                    const type2 = (pokemon['Type 2'] || '').toLowerCase().trim();
                    if (type1 !== typeFiltro && type2 !== typeFiltro) return false;
                }

                // FILTRO DE FORMA/EV
                if (evFiltro) {
                    const ev = (pokemon['EV'] || '').toString().toLowerCase().trim();
                    const hasEV = ev !== '';

                    if (evFiltro === 'sem_ev') {
                        if (hasEV) return false;
                    } else if (evFiltro === 'com_ev') {
                        if (!hasEV) return false;
                    } else if (evFiltro === 'mega') {
                        if (!ev.includes('mega')) return false;
                    } else if (evFiltro === 'shiny') {
                        if (!ev.includes('shiny')) return false;
                    } else if (evFiltro === 'alolan') {
                        if (!ev.includes('alol')) return false;
                    } else if (evFiltro === 'galarian') {
                        if (!ev.includes('galar')) return false;
                    } else if (evFiltro === 'hisuian') {
                        if (!ev.includes('hisu')) return false;
                    } else if (evFiltro === 'paldean') {
                        if (!ev.includes('palde')) return false;
                    } else if (evFiltro === 'boss') {
                        if (!ev.includes('boss')) return false;
                    }
                }

                // FILTRO DE SUGESTÃO
                if (sugestaoFiltro) {
                    const sugestao = obterSugestaoLocalizacao(pokemon).toString().trim();
                    if (sugestaoFiltro === 'com_sugestao' && !sugestao) return false;
                    if (sugestaoFiltro === 'sem_sugestao' && sugestao) return false;
                }

                return true;
            });

            renderizarPokemons(pokemonsFiltrados);

            // Atualizar contador
            const countEl = document.getElementById('pokemonCount');
            if (countEl) countEl.textContent = pokemonsFiltrados.length;
        };

        // ⭐ Apagar sugestão de localização (admin)
        window.apagarSugestaoLocalizacao = async function(nomePokemon) {
            if (!confirm(`Apagar a sugestão de localização de "${nomePokemon}"?`)) return;
            
            try {
                const adminUser = JSON.parse(localStorage.getItem('user') || '{}');
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'atualizarSugestao',
                        nomePokemon: nomePokemon,
                        sugestao: '',
                        authToken: adminUser.authToken || '',
                        email: adminUser.email || ''
                    })
                });
                const result = await response.json();
                if (result.sucesso || result.success) {
                    // Atualizar a UI: remover o item da sugestão e colocar "Nenhuma sugestão"
                    const modal = document.getElementById('modalEdicaoOverlay');
                    if (modal) {
                        const locContainer = modal.querySelector('.modal-suggestion-item.loc');
                        if (locContainer) {
                            locContainer.outerHTML = '<div class="modal-no-suggestion">Sugestão apagada ✓</div>';
                        }
                    }
                    alert('Sugestão de localização apagada com sucesso!');
                } else {
                    alert('Erro: ' + (result.mensagem || result.message || 'Erro desconhecido'));
                }
            } catch (erro) {
                alert('Erro ao apagar sugestão: ' + erro.message);
            }
        };

        // ⭐ Apagar sugestão de TM (admin)
        window.apagarSugestaoTM = async function(tmNumero) {
            if (!confirm(`Apagar a sugestão do TM${tmNumero}?`)) return;
            
            try {
                const adminUser = JSON.parse(localStorage.getItem('user') || '{}');
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'limparSugestaoTM',
                        tmNumero: tmNumero,
                        authToken: adminUser.authToken || '',
                        email: adminUser.email || ''
                    })
                });
                const result = await response.json();
                if (result.success) {
                    // Remover o item da sugestão na UI
                    const modal = document.getElementById('modalEdicaoOverlay');
                    if (modal) {
                        const tmItems = modal.querySelectorAll('.modal-suggestion-item.tm');
                        tmItems.forEach(item => {
                            const numFormatado = 'TM' + String(tmNumero).padStart(2, '0');
                            if (item.textContent.includes(numFormatado)) {
                                item.outerHTML = '<div class="modal-no-suggestion">Sugestão do ' + numFormatado + ' apagada ✓</div>';
                            }
                        });
                    }
                    alert('Sugestão do TM' + tmNumero + ' apagada com sucesso!');
                } else {
                    alert('Erro: ' + (result.message || 'Erro desconhecido'));
                }
            } catch (erro) {
                alert('Erro ao apagar sugestão: ' + erro.message);
            }
        };