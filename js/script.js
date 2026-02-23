// Função administrativa: limpar ataques antigos (deixar só o nome)
window.limparAtaquesAntigos = async function() {
    if (!isAdmin || !isAdmin()) {
        alert('Apenas administradores podem executar esta ação.');
        return;
    }
    if (!confirm('Tem certeza que deseja limpar todos os ataques antigos? Essa ação não pode ser desfeita!')) return;
    let alterados = 0;
    for (let i = 0; i < todosPokemons.length; i++) {
        let alterou = false;
        let pokemonOriginal = { ...todosPokemons[i] };
        for (let m = 1; m <= 10; m++) {
            const campo = `M${m}`;
            if (pokemonOriginal[campo] && pokemonOriginal[campo].includes('/')) {
                const nome = pokemonOriginal[campo].split('/')[0].trim();
                if (pokemonOriginal[campo] !== nome) {
                    todosPokemons[i][campo] = nome;
                    alterou = true;
                }
            }
        }
        // Garantir que demais campos não sejam alterados
        for (const key in pokemonOriginal) {
            if (!key.startsWith('M') && todosPokemons[i][key] !== pokemonOriginal[key]) {
                todosPokemons[i][key] = pokemonOriginal[key];
            }
        }
        if (alterou) alterados++;
    }
    // Salvar no localStorage e na planilha
    try {
        localStorage.setItem('pokemons_editados', JSON.stringify(todosPokemons));
    } catch (e) {
        console.warn('Não foi possível salvar no localStorage:', e.message);
    }
    // Atualizar todos no backend (Google Sheets)
    if (APPS_SCRIPT_URL && APPS_SCRIPT_URL.trim() !== '') {
        for (let i = 0; i < todosPokemons.length; i++) {
            const p = todosPokemons[i];
            const payload = {
                acao: 'atualizar',
                nomeOriginal: p.EV || p.POKEMON,
                pokemon: p,
                authToken: (JSON.parse(localStorage.getItem('user') || '{}')).authToken,
                adminEmail: (JSON.parse(localStorage.getItem('user') || '{}')).email
            };
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
        }
    }
    alert(`Limpeza concluída! ${alterados} Pokémon(s) tiveram ataques atualizados.`);
    // Atualizar DOM
    renderizarPokemons(todosPokemons);
};
// Adicionar botão administrativo na interface (exemplo: no topo da Pokédex)
window.addEventListener('DOMContentLoaded', function() {
    if (isAdmin && isAdmin()) {
        const btn = document.createElement('button');
        btn.textContent = 'Limpar ataques antigos';
        btn.style = 'position:fixed;top:10px;right:10px;z-index:9999;background:#ffd700;color:#1a2980;padding:10px 20px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15)';
        btn.onclick = window.limparAtaquesAntigos;
        document.body.appendChild(btn);
    }
});
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

        // 📦 Lazy load: quantos pokémons renderizar por lote
        const POKEMON_BATCH_SIZE = 100;
        const POKEMON_PAGE_SIZE = 710; // Quantos pokémons carregar por vez do servidor
        let _pokemonsAtuais = []; // Array filtrado/total atualmente exibido
        let _pokemonsRenderizados = 0; // Quantos já estão no DOM

        // �️ Pendência de deleções de sugestões — salvas em lote junto ao "Salvar"
        let _pendingSuggestionDeletes = [];

        // �📍 Cidades por região para Localização de Pokémon
        const LOC_CIDADES = {
            'Vip': ['Battle City'],
            'Kanto': ['Pallet','Viridian','Pewter','Cerulean','Saffron','Celadon','Lavender','Vermilion','Fuchsia','Cinnabar'],
            'Johto': ['New Bark','Cherrygrove','Blackthorn','Mahogany','Violet','Goldenrod','Azalea','Ecruteak','Olivine','Cianwood'],
            'Hoenn': ['Littleroot','Oldale','Slateport','Mauville','Lavaridge','Petalburg','Rustboro','Paciflidlog','Fortree','Lilycove','Sootopolis','Dewford','Mossdeep'],
            'Sinnoh': ['Twinleaf','Sandgem','Jubilife','Canavale','Oreburgh','Floaroma','Eterna','Celestic','Solaceon','Hearthome','Pastoria','Sunyshore','Veilstone'],
            'Unova': ['Nuavema','Accumula','Striaton','Nacrene','Castelia','Nimbasa','Black','Undella','Lacunosa','Opelucid','Icirrus','Driftveil','Mistralton','Virbank','Floccesy','Aspertia'],
            'Kalos': ['Kiloude','Aquacorde','Santalune','Camphrier','Ambrette','Cyllage','Shalour','Geosenge','Coumarine','Lumiose','Lavarre','Dendemille','Anistar','Snowbelle']
        };
        const LOC_DIR_ICONS = { '>': '→', '<': '←', '/\\': '↑', '\\/': '↓' };
        const LOC_DIR_LABELS = { '>': 'Direita →', '<': 'Esquerda ←', '/\\': 'Cima ↑', '\\/': 'Baixo ↓' };

        // 🍞 Toast de sucesso (sem reload)
        function mostrarToastSucesso(mensagem = 'Salvo com sucesso!') {
            const toast = document.createElement('div');
            toast.textContent = mensagem;
            toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#2ecc71,#27ae60);color:#fff;padding:14px 28px;border-radius:12px;font-weight:bold;font-size:15px;z-index:100000;box-shadow:0 8px 25px rgba(46,204,113,0.5);animation:toastIn .4s ease;pointer-events:none;';
            const style = document.createElement('style');
            style.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
            document.head.appendChild(style);
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.transition = 'opacity .4s'; toast.style.opacity = '0'; setTimeout(() => { toast.remove(); style.remove(); }, 400); }, 2500);
        }
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
            'shinygloom': 'IMAGENS/imagens-pokemon/stickers-pokemon/Gloom.png',
            
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

                console.log('⏳ Iniciando carregamento (fase 1: primeiros ' + POKEMON_PAGE_SIZE + ')...');
                const inicio = Date.now();

                // FASE 1: Carregar primeiros 710 pokémon (rápido)
                const resposta = await fetch(`${URL_DADOS}&page=1&limit=${POKEMON_PAGE_SIZE}`);
                const textoResposta = await resposta.text();

                let resultado;
                try {
                    resultado = JSON.parse(textoResposta);
                } catch (e) {
                    console.error('❌ Erro ao processar resposta do servidor:', e);
                    throw new Error('Erro ao processar resposta do servidor');
                }

                todosPokemons = resultado.data;
                todosPokemonsCompleto = [...resultado.data];
                const totalServidor = resultado.total || resultado.data.length;
                temMaisPaginas = resultado.hasMore === true;
                dadosCompletosCarregados = !temMaisPaginas;

                // Aplicar edições locais na fase 1
                _aplicarEdicoesLocais();

                const tempoFase1 = Date.now() - inicio;
                console.log(`📥 Fase 1: ${todosPokemons.length}/${totalServidor} pokémon em ${tempoFase1}ms`);

                document.getElementById('pokemonCount').textContent = todosPokemons.length + (temMaisPaginas ? '+' : '');
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('pt-BR').slice(0, 5);
                
                // Carregar TMs e Atacks em background para cross-reference na Pokédex e modal admin
                carregarDadosTMs();
                carregarDadosAtacks();
                
                renderizarPokemons(todosPokemons);
                window.todosPokemons = todosPokemons;

                // FASE 2: Carregar restante em background (se houver)
                if (temMaisPaginas) {
                    _carregarRestanteBackground(2);
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

        /**
         * Aplicar edições locais sobre os dados carregados
         */
        function _aplicarEdicoesLocais() {
            const dadosLocais = localStorage.getItem('pokemons_editados');
            if (!dadosLocais || !usuarioLogado) return;
            try {
                const editados = JSON.parse(dadosLocais);
                console.log('💾 Mesclando', editados.length, 'edições locais');
                editados.forEach(editado => {
                    const nomeEditado = normalizarNome(editado.EV || '') || normalizarNome(editado.POKEMON || '');
                    const index = todosPokemons.findIndex(p => {
                        const nomeOriginal = normalizarNome(p.EV || '') || normalizarNome(p.POKEMON || '');
                        return nomeOriginal === nomeEditado;
                    });
                    if (index !== -1) {
                        todosPokemons[index] = { ...todosPokemons[index], ...editado };
                    }
                });
                console.log('✓ Dados mesclados com edições locais');
            } catch (e) {
                console.warn('⚠️ Erro ao mesclar edições locais:', e);
            }
        }

        /**
         * Carregar páginas restantes em background
         */
        async function _carregarRestanteBackground(pagina) {
            try {
                console.log(`⏳ Fase 2: carregando página ${pagina} (background)...`);
                const resp = await fetch(`${URL_DADOS}&page=${pagina}&limit=${POKEMON_PAGE_SIZE}`);
                const texto = await resp.text();
                const res = JSON.parse(texto);

                if (res.data && res.data.length > 0) {
                    todosPokemons = todosPokemons.concat(res.data);
                    todosPokemonsCompleto = [...todosPokemons];
                    window.todosPokemons = todosPokemons;

                    _aplicarEdicoesLocais();

                    const hasMore = res.hasMore === true;
                    temMaisPaginas = hasMore;
                    dadosCompletosCarregados = !hasMore;
                    document.getElementById('pokemonCount').textContent = todosPokemons.length + (hasMore ? '+' : '');

                    // Atualizar a lista exibida
                    const searchInput = document.getElementById('searchInput');
                    const termoBusca = searchInput ? searchInput.value.trim() : '';
                    if (termoBusca) {
                        if (typeof filtrarPokemons === 'function') filtrarPokemons();
                    } else {
                        renderizarPokemons(todosPokemons);
                    }

                    console.log(`📥 Fase 2 página ${pagina}: +${res.data.length} pokémon (total: ${todosPokemons.length})`);

                    if (hasMore) {
                        _carregarRestanteBackground(pagina + 1);
                    } else {
                        console.log('✅ Carregamento completo:', todosPokemons.length, 'pokémon');
                    }
                }
            } catch (e) {
                console.error('❌ Erro no carregamento background (página ' + pagina + '):', e);
                setTimeout(() => _carregarRestanteBackground(pagina), 3000);
            }
        }
        
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

        /**
         * Formatar sugestão de localização como bullet points HTML
         * "Battle City > 1un / Fuchsia < 2un" → "• Battle City → 1un\n• Fuchsia ← 2un"
         */
        function formatarSugestaoLocHTML(texto) {
            if (!texto || !texto.trim()) return '';
            const partes = texto.split(' / ').map(s => s.trim()).filter(Boolean);
            if (partes.length === 0) return '';
            if (partes.length === 1) {
                return `<div style="line-height:1.8;">• ${_formatarEntradaLoc(partes[0])}</div>`;
            }
            return '<div style="line-height:1.8;">' + partes.map(p => `• ${_formatarEntradaLoc(p)}`).join('<br>') + '</div>';
        }

        function _formatarEntradaLoc(entry) {
            // Substituir símbolos de direção por ícones bonitos
            return entry
                .replace(/\s>\/\s?/g, ' → ')
                .replace(/(\s)>(\s)/g, '$1→$2')
                .replace(/(^|\s)>/g, '$1→')
                .replace(/\s<\/\s?/g, ' ← ')
                .replace(/(\s)<(\s)/g, '$1←$2')
                .replace(/(^|\s)</g, '$1←')
                .replace(/\/\\/g, '↑')
                .replace(/\\\/\//g, '↓')
                .replace(/\/\\/g, '↑')
                .replace(/\\\//g, '↓');
        }

        /**
         * Criar um card de Pokémon (reutilizável para lazy load)
         */
        function _criarCardPokemon(pokemon) {
            const numero = String(pokemon['PS'] ?? '');
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
            const nomeParaBusca = evolucao || nomePokemon;
            const imagemUrl = obterImagemPokemon(nomePrincipal, nomeBase);

            // ⭐ TMs da aba TMs (cross-reference) ⭐
            const tmsDoPokemons = obterTMsDoPokemon(nomePrincipal);
            const sugestoesTMs = obterSugestoesTMsParaPokemon(nomePrincipal);

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
                    ${formatarSugestaoLocHTML(sugestaoLocalizacao)}
                </div>
                ` : ''}
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

            return card;
        }

        function renderizarPokemons(dados) {
            const container = document.getElementById('pokemonContainer');
            container.innerHTML = '';
            
            // Guardar referência para lazy load
            _pokemonsAtuais = dados;
            _pokemonsRenderizados = 0;
            
            // Log para debug: mostrar as chaves do primeiro pokémon
            if (dados.length > 0) {
                console.log('🔍 Chaves do primeiro pokémon:', Object.keys(dados[0]));
                console.log('🔍 Valor sugestão:', obterSugestaoLocalizacao(dados[0]));
            }
            
            // Renderizar apenas o primeiro lote
            const lote = dados.slice(0, POKEMON_BATCH_SIZE);
            lote.forEach((pokemon) => {
                container.appendChild(_criarCardPokemon(pokemon));
            });
            
            _pokemonsRenderizados = lote.length;
            
            // Adicionar botão "Carregar mais" se houver mais dados
            _adicionarBotaoCarregarMais(container, dados.length);
            
            configurarBuscaInstantanea();
            setTimeout(() => {
                document.getElementById('searchInput').focus();
            }, 100);
            
            // Se o usuário está logado, recriar botões de admin
            if (usuarioLogado) {
                mostrarOpcoesAdmin();
            }
        }
        
        /**
         * Renderizar próximo lote de pokémons (lazy load)
         */
        function _renderizarMaisPokemons() {
            const container = document.getElementById('pokemonContainer');
            if (!container || _pokemonsRenderizados >= _pokemonsAtuais.length) return;
            
            const inicio = _pokemonsRenderizados;
            const fim = Math.min(inicio + POKEMON_BATCH_SIZE, _pokemonsAtuais.length);
            const lote = _pokemonsAtuais.slice(inicio, fim);
            
            // Remover botão "carregar mais" existente antes de adicionar cards
            const btnExistente = container.querySelector('.btn-carregar-mais-pokemon');
            if (btnExistente) btnExistente.remove();
            
            lote.forEach((pokemon) => {
                const card = _criarCardPokemon(pokemon);
                container.appendChild(card);
            });
            
            _pokemonsRenderizados = fim;
            
            // Re-adicionar botão se ainda houver mais
            _adicionarBotaoCarregarMais(container, _pokemonsAtuais.length);
            
            // Se o usuário está logado, recriar botões de admin nos novos cards
            if (usuarioLogado) {
                mostrarOpcoesAdmin();
            }
        }
        
        /**
         * Adicionar botão "Carregar mais" ao final do container
         */
        function _adicionarBotaoCarregarMais(container, totalDados) {
            // Remover botão existente
            const btnExistente = container.querySelector('.btn-carregar-mais-pokemon');
            if (btnExistente) btnExistente.remove();
            
            if (_pokemonsRenderizados >= totalDados) return;
            
            const restante = totalDados - _pokemonsRenderizados;
            const btnDiv = document.createElement('div');
            btnDiv.className = 'btn-carregar-mais-pokemon';
            btnDiv.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 30px;';
            btnDiv.innerHTML = `
                <button onclick="_renderizarMaisPokemons()" style="
                    padding: 16px 40px;
                    background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1));
                    border: 2px solid rgba(255,215,0,0.4);
                    color: #ffd700;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 700;
                    transition: all 0.3s;
                    letter-spacing: 0.5px;
                " onmouseover="this.style.background='rgba(255,215,0,0.3)';this.style.boxShadow='0 4px 20px rgba(255,215,0,0.3)'" onmouseout="this.style.background='';this.style.boxShadow=''">
                    <i class="fas fa-chevron-down"></i> Carregar mais ${Math.min(POKEMON_BATCH_SIZE, restante)} Pokémons (${restante} restantes)
                </button>
                <div style="margin-top: 10px; color: rgba(255,255,255,0.4); font-size: 13px;">
                    Exibindo ${_pokemonsRenderizados} de ${totalDados}
                </div>`;
            container.appendChild(btnDiv);
        }
        
        // Expor para onclick
        window._renderizarMaisPokemons = function() { _renderizarMaisPokemons(); };
        
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
            const fallbackLocal = 'IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png';
            
            // Itens que NÃO são pokémons (usados em tasks "Entregar")
            const itensTask = [
                'waterstone', 'screws', 'bottleofpoison', 'venomstone', 'flour',
                'seeds', 'firestone', 'smallstone', 'dragonstone', 'brokenstone',
                'futureorb', 'sugarcane', 'essencesoffire', 'watergem'
            ];
            
            const nomeNormalizado = normalizarNomeItem(nome);
            
            // Se for um item (não pokémon), usa a pasta de itens-task (lowercase)
            if (itensTask.includes(nomeNormalizado)) {
                return `IMAGENS/imagens-itens/itens-task/${nome}.png`;
            }
            
            // Pokémons especiais com nomes que não batem direto com arquivo (lowercase)
            const pokemonsEspeciais = {
                'shinygloom': 'IMAGENS/imagens-pokemon/stickers-pokemon/shinygloom.png',
                'hordeleaderpoliwrath': 'IMAGENS/imagens-pokemon/stickers-pokemon/hordeleaderpoliwrath.png',
                'shinygyarados': 'IMAGENS/imagens-pokemon/stickers-pokemon/shinygyarados.png'
            };
            
            if (pokemonsEspeciais[nomeNormalizado]) {
                return pokemonsEspeciais[nomeNormalizado];
            }
            
            // Pokémon normal - capitalizar primeira letra (stickers usam PrimeiraLetraMaiuscula.png)
            const nomeCapitalizado = nome.charAt(0).toUpperCase() + nome.slice(1);
            return `IMAGENS/imagens-pokemon/stickers-pokemon/${nomeCapitalizado}.png`;
        }

        function obterImagemItemTask(nome) {
            const nomeNormalizado = normalizarNomeItem(nome);
            
            // XP usa imagem especial (formato .webp)
            if (nomeNormalizado === 'xp') {
                return 'IMAGENS/imagens-itens/itens-task/xp.webp';
            }
            
            // Todos os itens de recompensa usam a pasta itens-task (usar nomeNormalizado para garantir lowercase)
            const caminho = `IMAGENS/imagens-itens/itens-task/${nomeNormalizado}.png`;
            console.log('[ITEM IMG]', nome, '->', caminho);
            return caminho;
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
                        categoria: (tm['TIPO DE DROP'] || tm['ORIGEM DO TM2'] || 'Spawn'),
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
                        categoria: (tm['TIPO DE DROP'] || tm['ORIGEM DO TM2'] || 'Spawn'),
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
                    const src = isXP ? 'IMAGENS/imagens-itens/itens-task/xp.webp' : obterImagemItemTask(premio.item);
                    premiosHtml += `
                        <div class="task-reward-item">
                            <img src="${src}" alt="${premio.item}" onerror="this.onerror=null;this.src='IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png'">
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
                            <img src="${imagemPokemon}" alt="${task.pokemon}" onerror="this.onerror=null;this.src='IMAGENS/imagens-pokemon/stickers-pokemon/pokebola.png'">
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
                let catRaw = (tm.categoria || '').toString().trim().toLowerCase();
                // Normalizar categorias para coincidir com os filtros
                const categoriasMap = { 'evento': 'event', 'eventos': 'event', 'chefe': 'boss', 'bosses': 'boss' };
                if (categoriasMap[catRaw]) catRaw = categoriasMap[catRaw];
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
                } else if (catRaw === 'event') {
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
                { nome: 'Senhor Skant', imagem: 'IMAGENS/imagens-itens/conta/conta cm.png' },
                { nome: 'Legenzin OBV', imagem: 'IMAGENS/imagens-itens/conta/conta cm.png' },
                { nome: 'Xxcarlosxx', imagem: 'IMAGENS/imagens-itens/conta/conta cm.png' }
            ];
            
            const membrosViceLideres = [
                { nome: 'Jllink OBV', imagem: 'IMAGENS/imagens-itens/conta/conta gm.png' },
                { nome: 'Nagi OBV', imagem: 'IMAGENS/imagens-itens/conta/conta gm.png' }
            ];
            
            const membrosMembro = [
                { nome: 'Almeidaa OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'CARVAALHO OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'César OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Loucura ÓBVIA', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Davon OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Endividado OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Freitinhasz OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'IagoMoedas OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'iRusseL OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'ISAGIII OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'lkliff OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'lRamos OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Mclovinxs OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Mgzinn OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Nialk OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Nikklaus OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Pedroh OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Rettmarlley OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Rickyziin OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'SannT OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'SensuaLize OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Tksixx OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Tonhaozinn', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'MAGO ÓBVIO', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Zeta OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'zMorpheus OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'zOrpheusZ OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'zPabloze OBV', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: '[Tutora] Insana Ju', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Riczynn', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'manodosmega mega', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' },
                { nome: 'Irmão Do Wc', imagem: 'IMAGENS/imagens-itens/conta/conta help.png' }
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
            
            // Remover listeners antigos clonando o input
            const novoInput = input.cloneNode(true);
            input.parentNode.replaceChild(novoInput, input);
            
            let _buscaDebounce = null;
            
            novoInput.addEventListener('input', function() {
                clearTimeout(_buscaDebounce);
                _buscaDebounce = setTimeout(() => {
                    const termo = this.value.toLowerCase().trim();
                    container.querySelectorAll('.no-results').forEach(m => m.remove());
                    
                    // 🔥 BUSCA MÚLTIPLA: Separar por vírgula
                    const termos = termo.split(',').map(t => t.trim()).filter(t => t !== '');
                    
                    // Se não tem busca, voltar para lazy load normal
                    if (termos.length === 0) {
                        renderizarPokemons(_pokemonsAtuais.length ? _pokemonsAtuais : todosPokemons);
                        return;
                    }
                    
                    // Buscar em TODOS os dados (não apenas nos renderizados)
                    const fonte = _pokemonsAtuais.length ? _pokemonsAtuais : todosPokemons;
                    const resultados = fonte.filter(pokemon => {
                        const nome = (pokemon['POKEMON'] || '').toLowerCase();
                        const ev = (pokemon['EV'] || '').toLowerCase();
                        const tipo1 = (pokemon['Type 1'] || '').toLowerCase();
                        const tipo2 = (pokemon['Type 2'] || '').toLowerCase();
                        const loc = (pokemon['LOCALIZAÇÃO'] || '').toLowerCase();
                        const textoCompleto = `${nome} ${ev} ${tipo1} ${tipo2} ${loc}`;
                        return termos.some(t => textoCompleto.includes(t));
                    });
                    
                    // Renderizar resultados diretamente (sem lazy load, pois busca retorna poucos)
                    container.innerHTML = '';
                    if (resultados.length === 0) {
                        const mensagem = document.createElement('div');
                        mensagem.className = 'no-results';
                        mensagem.innerHTML = `
                            <div style="color:#ffd700;font-size:3em;margin-bottom:15px">
                                <i class="fas fa-search"></i>
                            </div>
                            <h3 style="color:#ffd700;margin-bottom:10px">Nenhum Pokémon</h3>
                            <p style="color:#a0e7ff">Nenhum resultado: "${termo}"</p>`;
                        container.appendChild(mensagem);
                    } else {
                        resultados.forEach(pokemon => {
                            container.appendChild(_criarCardPokemon(pokemon));
                        });
                        if (usuarioLogado) mostrarOpcoesAdmin();
                    }
                }, 250); // debounce 250ms
            });

            // 🖼️ Re-configurar busca por imagem após clonar o input
            // (o cloneNode remove event listeners, então o paste listener precisa ser re-adicionado)
            configurarBuscaPorImagem();
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

        // ⚡ Atualizar card no DOM — substitui o card inteiro para garantir que tudo é atualizado
        function atualizarCardNoDom(nomeOriginal, pokemon) {
            try {
                const nomeNorm = normalizarNome(nomeOriginal);
                const cards = document.querySelectorAll('.pokemon-card');
                for (const card of cards) {
                    const dataNome = card.getAttribute('data-pokemon-nome');
                    if (normalizarNome(dataNome) === nomeNorm) {
                        // Substituir o card inteiro com um novo (garante que TUDO é atualizado)
                        const novoCard = _criarCardPokemon(pokemon);
                        card.replaceWith(novoCard);

                        // Re-adicionar botão de editar se admin
                        if (isAdmin()) {
                            mostrarOpcoesAdmin();
                        }

                        // Flash visual de confirmação
                        novoCard.style.transition = 'box-shadow 0.3s ease';
                        novoCard.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.6)';
                        setTimeout(() => { novoCard.style.boxShadow = ''; }, 2000);

                        console.log('⚡ Card substituído no DOM:', nomeOriginal);
                        return true;
                    }
                }
                console.warn('⚠️ Card não encontrado no DOM para:', nomeOriginal);
                return false;
            } catch (err) {
                console.error('❌ Erro ao atualizar card no DOM:', err);
                return false;
            }
        }
        
        function editarPokemon(card, pokemonData, nomeReal) {
            const nomeDisplay = card.querySelector('.pokemon-name').textContent.trim();
            const numero = pokemonData ? String(pokemonData['PS'] ?? '') : (card.querySelector('.pokemon-number')?.textContent.replace('#', '').trim() || '');
            const stats = pokemonData ? [
                pokemonData['HP'] || '0',
                pokemonData['Attack'] || '0',
                pokemonData['Defense'] || '0',
                pokemonData['Sp.Attack'] || '0',
                pokemonData['Sp.Defense'] || '0',
                pokemonData['Speed'] || '0'
            ] : Array.from(card.querySelectorAll('.stat-value')).map(el => el.textContent);
            // Ler localização diretamente dos dados da planilha (preserva formatação original)
            const localizacao = pokemonData ? (pokemonData['LOCALIZAÇÃO'] || '') : '';
            const tms = card.querySelector('.tms-content')?.textContent.trim() || '';
            
            // Abrir modal imediatamente (dados de atacks/TMs já pré-carregados na inicialização)
            // Se por algum motivo não carregaram, carrega em background sem bloquear
            if (todosAtacks.length === 0 || todosTMs.length === 0) {
                Promise.all([carregarDadosAtacks(), carregarDadosTMs()]).catch(() => {});
            }
            _pendingSuggestionDeletes = []; // Limpar pendências de modal anterior
            const modal = criarModalEdicao(nomeReal, nomeDisplay, numero, stats, localizacao, tms, pokemonData);
            document.body.appendChild(modal);
        }
        
        function criarModalEdicao(nomeReal, nomeDisplay, numero, stats, localizacao, tms, pokemonData) {
            const overlay = document.createElement('div');
            overlay.id = 'modalEdicaoOverlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;';
            
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
                    <button onclick="_pendingSuggestionDeletes=[];document.getElementById('modalEdicaoOverlay')?.remove()" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; z-index: 10;" onmouseover="this.style.background='rgba(255,75,75,0.4)';this.style.borderColor='#ff4b4b'" onmouseout="this.style.background='rgba(255,255,255,0.1)';this.style.borderColor='rgba(255,255,255,0.2)'">
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

                        <!-- SEÇÃO: LOCALIZAÇÃO (EDITOR ADMIN) -->
                        <div>
                            <label style="color: #88d3ff; display: block; margin-bottom: 5px;">Localização:</label>
                            <div id="edit-local-container" class="edit-loc-container">
                                <div id="edit-local-entries" class="edit-loc-entries"></div>
                                <button type="button" id="btnAddLocEntry" class="edit-loc-add-btn">
                                    <i class="fas fa-plus-circle"></i> Adicionar Localização
                                </button>
                                <div id="edit-local-form" class="edit-loc-form" style="display:none;">
                                    <div class="edit-loc-form-row">
                                        <div class="cla-city-select-wrapper" style="flex:2;">
                                            <input type="text" id="editLocCidade" class="cla-loc-input" placeholder="Cidade..." autocomplete="off" style="font-size:13px;padding:8px 10px;" />
                                            <div id="editLocCidadeDropdown" class="cla-city-dropdown"></div>
                                        </div>
                                        <div class="edit-loc-dir-group">
                                            <button type="button" class="cla-dir-btn edit-loc-dir-btn" data-dir=">" title="Direita" style="padding:6px;font-size:14px;">→</button>
                                            <button type="button" class="cla-dir-btn edit-loc-dir-btn" data-dir="<" title="Esquerda" style="padding:6px;font-size:14px;">←</button>
                                            <button type="button" class="cla-dir-btn edit-loc-dir-btn" data-dir="/\\" title="Cima" style="padding:6px;font-size:14px;">↑</button>
                                            <button type="button" class="cla-dir-btn edit-loc-dir-btn" data-dir="\\/" title="Baixo" style="padding:6px;font-size:14px;">↓</button>
                                        </div>
                                        <input type="hidden" id="editLocDirecao" />
                                        <div class="cla-unit-wrapper" style="flex:1;">
                                            <input type="number" id="editLocUnidade" class="cla-loc-input cla-loc-unit" placeholder="Nº" min="1" style="font-size:13px;padding:8px 10px;" />
                                            <span class="cla-unit-suffix" style="font-size:13px;">un</span>
                                        </div>
                                    </div>
                                    <div style="margin-top:6px;">
                                        <input type="text" id="editLocObs" class="cla-loc-input" placeholder="📝 Observação (opcional): ex: na safari zone..." style="font-size:12px;padding:7px 10px;width:100%;" />
                                    </div>
                                    <div style="display:flex;gap:6px;margin-top:6px;">
                                        <button type="button" id="btnConfirmLocEntry" class="edit-loc-confirm-btn"><i class="fas fa-check"></i> OK</button>
                                        <button type="button" id="btnCancelLocEntry" class="edit-loc-cancel-btn"><i class="fas fa-times"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- SEÇÃO: SUGESTÕES DOS MEMBROS -->
                        <div class="modal-suggestion-box">
                            <div class="modal-suggestion-title">
                                <i class="fas fa-users"></i> Sugestões dos Membros
                            </div>

                            <!-- Localização -->
                            <div style="margin-bottom: 10px;">
                                <div style="color: #00d4ff; font-weight: 600; font-size: 0.85em; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between;">
                                    <span><i class="fas fa-map-marker-alt"></i> Localização</span>
                                    ${sugestaoLoc ? `<button class="suggestion-clear-all-btn" onclick="apagarSugestaoLocalizacao('${nomePrincipal.replace(/'/g, "\\'")}')" title="Limpar sugestão de localização"><i class="fas fa-broom"></i> Limpar</button>` : ''}
                                </div>
                                ${sugestaoLoc 
                                    ? `<div class="modal-suggestion-item loc">
                                        <span class="suggestion-text">${formatarSugestaoLocHTML(sugestaoLoc)}</span>
                                      </div>` 
                                    : `<div class="modal-no-suggestion">Nenhuma sugestão de localização</div>`
                                }
                            </div>

                            <!-- TMs -->
                            <div style="margin-bottom: 10px;">
                                <div style="color: #a29bfe; font-weight: 600; font-size: 0.85em; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between;">
                                    <span><i class="fas fa-compact-disc"></i> TMs</span>
                                    ${sugestoesTMsHTML ? `<button class="suggestion-clear-all-btn" onclick="limparTodasSugestoesTMs('${nomePrincipal.replace(/'/g, "\\'")}')" title="Limpar todas as sugestões de TM"><i class="fas fa-broom"></i> Limpar Todas</button>` : ''}
                                </div>
                                ${sugestoesTMsHTML 
                                    ? sugestoesTMsHTML 
                                    : `<div class="modal-no-suggestion">Nenhuma sugestão de TM</div>`
                                }
                            </div>

                            <!-- Atacks sugeridos -->
                            <div>
                                <div style="color: #ff6b6b; font-weight: 600; font-size: 0.85em; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between;">
                                    <span><i class="fas fa-fist-raised"></i> Atacks</span>
                                    <button class="suggestion-clear-all-btn" id="btnLimparSugestoesAtacks" style="display:none;" onclick="limparTodasSugestoesAtacks('${nomePrincipal.replace(/'/g, "\\'")}')" title="Limpar todas as sugestões de Atacks"><i class="fas fa-broom"></i> Limpar Todas</button>
                                </div>
                                <div id="sugestoesAtacksContainer" class="modal-no-suggestion">Carregando...</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: flex-end;">
                        <button onclick="_pendingSuggestionDeletes=[];document.getElementById('modalEdicaoOverlay')?.remove()" style="padding: 12px 25px; background: rgba(255,255,255,0.1); border: 1px solid #888; color: #fff; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button onclick="salvarEdicao()" style="padding: 12px 25px; background: linear-gradient(135deg, #ffd700, #ffed4e); border: none; color: #1a2980; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </div>
            `;
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) { _pendingSuggestionDeletes = []; overlay.remove(); }
            });

            // ═══ SETUP DO EDITOR DE LOCALIZAÇÃO ESTRUTURADA ═══
            setTimeout(() => {
                _setupEditLocEntries(overlay, localizacao);
            }, 50);

            // Carregar sugestões de atacks dos membros a partir da coluna SUGESTAO_ATACKS
            setTimeout(() => {
                const atacksSugeridos = [];
                if (pokemonData) {
                    const sugestaoAtacksRaw = (pokemonData['SUGESTAO_ATACKS'] || '').toString().trim();
                    if (sugestaoAtacksRaw) {
                        const entradas = sugestaoAtacksRaw.split(' - ');
                        entradas.forEach((entrada, idx) => {
                            const partes = entrada.split(' / ').map(p => p.trim());
                            const slot = partes[0] || '';
                            const nomeMove = partes[1] || '';
                            // Formato novo: M2 / Night Slash / Dark / Físico (4 campos)
                            // Formato legacy: M2 / Night Slash / dash / Dark / Físico (5 campos)
                            let tipo = '';
                            let categoria = '';
                            if (partes.length >= 5) {
                                // Legacy: campo 2 = origem (ignorar), 3 = tipo, 4 = categoria
                                tipo = partes[3] || '';
                                categoria = partes[4] || '';
                            } else {
                                // Novo: campo 2 = tipo, 3 = categoria
                                tipo = partes[2] || '';
                                categoria = partes[3] || '';
                            }
                            if (slot && nomeMove) {
                                let descricao = `${nomeMove}`;
                                if (tipo) descricao += ` — ${tipo}`;
                                if (categoria) descricao += ` / ${categoria}`;
                                atacksSugeridos.push(`<div class="modal-suggestion-item atack suggestion-with-delete"><span class="suggestion-type atack">${slot}</span> ${descricao}<button class="suggestion-delete-btn" onclick="apagarSugestaoAtack('${nomePrincipal.replace(/'/g, "\\'")}', '${slot.replace(/'/g, "\\'")}')" title="Apagar ${slot}"><i class="fas fa-trash-alt"></i></button></div>`);
                            }
                        });
                    }
                }
                const containerSugestoes = overlay.querySelector('#sugestoesAtacksContainer');
                if (containerSugestoes) {
                    containerSugestoes.innerHTML = atacksSugeridos.length > 0 
                        ? atacksSugeridos.join('') 
                        : '<span style="color: rgba(255,255,255,0.4); font-style: italic;">Nenhum atack registrado</span>';
                    containerSugestoes.className = '';
                }
                // Mostrar botão "Limpar Todas" se houver atacks
                const btnLimpar = overlay.querySelector('#btnLimparSugestoesAtacks');
                if (btnLimpar) {
                    btnLimpar.style.display = atacksSugeridos.length > 0 ? 'inline-flex' : 'none';
                }
            }, 100);
            
            return overlay;
        }

        // ═══ EDITOR DE LOCALIZAÇÃO ESTRUTURADA (ADMIN MODAL) ═══
        function _setupEditLocEntries(overlay, locStr) {
            const container = overlay.querySelector('#edit-local-entries');
            const form = overlay.querySelector('#edit-local-form');
            const btnAdd = overlay.querySelector('#btnAddLocEntry');
            const btnConfirm = overlay.querySelector('#btnConfirmLocEntry');
            const btnCancel = overlay.querySelector('#btnCancelLocEntry');
            const cidadeInput = overlay.querySelector('#editLocCidade');
            const dropdown = overlay.querySelector('#editLocCidadeDropdown');
            const dirBtns = overlay.querySelectorAll('.edit-loc-dir-btn');
            const unidadeInput = overlay.querySelector('#editLocUnidade');
            const obsInput = overlay.querySelector('#editLocObs');

            if (!container) return;

            // Estado: array de entradas {cidade, direcao, unidade, obs}
            let entries = [];
            let editingIndex = -1; // -1 = adicionando, >= 0 = editando

            // Parsear localização existente (formato: "Cidade dir Xun obs / Cidade dir Xun")
            if (locStr && locStr.trim()) {
                locStr.split(' / ').forEach(part => {
                    part = part.trim();
                    if (!part) return;
                    // Tentar parsear formato estruturado: "Cidade > 7un observação" ou "Cidade /\ 3un"
                    const match = part.match(/^(.+?)\s*(>|<|\/\\|\\\/)\s*(\d+)un(?:\s+(.+))?$/i);
                    if (match) {
                        entries.push({ cidade: match[1].trim(), direcao: match[2], unidade: match[3], obs: (match[4] || '').trim() });
                    } else {
                        // Entrada não-estruturada: manter como texto livre na cidade
                        entries.push({ cidade: part, direcao: '', unidade: '', obs: '' });
                    }
                });
            }

            function renderEntries() {
                if (entries.length === 0) {
                    container.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-style:italic;padding:8px;font-size:13px;">Nenhuma localização definida</div>';
                    return;
                }
                container.innerHTML = entries.map((e, i) => {
                    const icon = LOC_DIR_ICONS[e.direcao] || e.direcao || '';
                    const obsDisplay = e.obs ? ` <span style="color:#aaa;font-style:italic;font-size:0.9em;">${e.obs}</span>` : '';
                    const display = e.direcao && e.unidade 
                        ? `<span style="color:#ffd700;font-weight:600;">${e.cidade}</span> <span style="color:#88d3ff;">${icon}</span> <span style="color:#a0e7ff;">${e.unidade}un</span>${obsDisplay}`
                        : `<span style="color:#ffd700;">${e.cidade}</span>${obsDisplay}`;
                    return `
                        <div class="edit-loc-entry" data-idx="${i}">
                            <span class="edit-loc-entry-text">${display}</span>
                            <div class="edit-loc-entry-actions">
                                <button type="button" class="edit-loc-entry-edit" data-idx="${i}" title="Editar"><i class="fas fa-pen"></i></button>
                                <button type="button" class="edit-loc-entry-delete" data-idx="${i}" title="Apagar"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    `;
                }).join('');

                // Bind events
                container.querySelectorAll('.edit-loc-entry-edit').forEach(btn => {
                    btn.addEventListener('click', () => startEdit(parseInt(btn.dataset.idx)));
                });
                container.querySelectorAll('.edit-loc-entry-delete').forEach(btn => {
                    btn.addEventListener('click', () => {
                        entries.splice(parseInt(btn.dataset.idx), 1);
                        renderEntries();
                    });
                });
            }

            function startEdit(idx) {
                editingIndex = idx;
                const e = entries[idx];
                cidadeInput.value = e.cidade || '';
                document.getElementById('editLocDirecao').value = e.direcao || '';
                unidadeInput.value = e.unidade || '';
                if (obsInput) obsInput.value = e.obs || '';
                dirBtns.forEach(b => b.classList.toggle('active', b.dataset.dir === e.direcao));
                form.style.display = '';
                btnAdd.style.display = 'none';
            }

            function showAddForm() {
                editingIndex = -1;
                cidadeInput.value = '';
                document.getElementById('editLocDirecao').value = '';
                unidadeInput.value = '';
                if (obsInput) obsInput.value = '';
                dirBtns.forEach(b => b.classList.remove('active'));
                form.style.display = '';
                btnAdd.style.display = 'none';
                cidadeInput.focus();
            }

            function hideForm() {
                form.style.display = 'none';
                btnAdd.style.display = '';
                editingIndex = -1;
            }

            function confirmEntry() {
                const cidade = cidadeInput.value.trim();
                const direcao = document.getElementById('editLocDirecao').value;
                const unidade = unidadeInput.value;
                const obs = obsInput ? obsInput.value.trim() : '';

                if (!cidade) { alert('Selecione uma cidade!'); return; }
                if (!direcao) { alert('Selecione uma direção!'); return; }
                if (!unidade || unidade < 1) { alert('Digite a unidade!'); return; }

                const entry = { cidade, direcao, unidade: unidade.toString(), obs };

                if (editingIndex >= 0) {
                    entries[editingIndex] = entry;
                } else {
                    entries.push(entry);
                }

                hideForm();
                renderEntries();
            }

            // Build dropdown
            let dropdownHTML = '';
            for (const [regiao, cidades] of Object.entries(LOC_CIDADES)) {
                dropdownHTML += `<div class="cla-city-region">${regiao}</div>`;
                cidades.forEach(c => {
                    dropdownHTML += `<div class="cla-city-option" data-city="${c}">${c}</div>`;
                });
            }
            dropdown.innerHTML = dropdownHTML;

            function filterEditDropdown(filter) {
                const lowerFilter = (filter || '').toLowerCase();
                dropdown.querySelectorAll('.cla-city-option').forEach(opt => {
                    opt.style.display = opt.dataset.city.toLowerCase().includes(lowerFilter) ? '' : 'none';
                });
                dropdown.querySelectorAll('.cla-city-region').forEach(region => {
                    let nextEl = region.nextElementSibling;
                    let hasVisible = false;
                    while (nextEl && !nextEl.classList.contains('cla-city-region')) {
                        if (nextEl.style.display !== 'none') hasVisible = true;
                        nextEl = nextEl.nextElementSibling;
                    }
                    region.style.display = hasVisible ? '' : 'none';
                });
            }

            cidadeInput.addEventListener('focus', () => {
                filterEditDropdown(cidadeInput.value);
                dropdown.classList.add('active');
            });
            cidadeInput.addEventListener('input', () => {
                filterEditDropdown(cidadeInput.value);
                dropdown.classList.add('active');
            });
            dropdown.querySelectorAll('.cla-city-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    cidadeInput.value = opt.dataset.city;
                    dropdown.classList.remove('active');
                });
            });
            overlay.addEventListener('click', (e) => {
                if (!e.target.closest('.cla-city-select-wrapper')) {
                    dropdown.classList.remove('active');
                }
            });

            dirBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    dirBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById('editLocDirecao').value = btn.dataset.dir;
                });
            });

            btnAdd.addEventListener('click', showAddForm);
            btnConfirm.addEventListener('click', confirmEntry);
            btnCancel.addEventListener('click', hideForm);

            // Expor função para coletar dados no salvarEdicao
            window._getEditLocEntries = function() {
                return entries.map(e => {
                    if (e.direcao && e.unidade) {
                        const base = `${e.cidade} ${e.direcao} ${e.unidade}un`;
                        return e.obs ? `${base} ${e.obs}` : base;
                    }
                    return e.obs ? `${e.cidade} ${e.obs}` : e.cidade;
                }).join(' / ');
            };

            renderEntries();
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
                localizacao: typeof window._getEditLocEntries === 'function' ? window._getEditLocEntries() : ''
            };

            // Coletar atacks M1-M10 e salvar apenas o nome do ataque
            const atacksMudados = [];
            for (let i = 1; i <= 10; i++) {
                const el = document.getElementById(`edit-m${i}`);
                if (el) {
                    const nomeAtack = el.value.trim();
                    // Sempre salva apenas o nome do ataque, sem detalhes
                    atacksMudados.push({ slot: `m${i}`, nome: nomeAtack });
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
            
            // Construir objeto com M1-M10 atualizados
            const atackUpdates = {};
            for (let i = 1; i <= 10; i++) {
                const el = document.getElementById(`edit-m${i}`);
                if (el) atackUpdates[`M${i}`] = el.value.trim();
            }

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
                'LOCALIZAÇÃO': dados.localizacao,
                ...atackUpdates
            };
            
            // Salvar no localStorage (pode falhar por quota, não bloquear o fluxo)
            try {
                localStorage.setItem('pokemons_editados', JSON.stringify(todosPokemons));
            } catch (e) {
                console.warn('⚠️ Não foi possível salvar no localStorage (quota excedida?):', e.message);
            }
            
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

                    // Requests de sugestões pendentes (marcadas para exclusão)
                    if (_pendingSuggestionDeletes && _pendingSuggestionDeletes.length > 0) {
                        console.log('🗑️ Enviando', _pendingSuggestionDeletes.length, 'exclusões de sugestões...');
                        for (const del of _pendingSuggestionDeletes) {
                            const payload = {
                                action: del.action,
                                email: adminUser.email,
                                authToken: adminUser.authToken
                            };
                            if (del.nomePokemon) payload.nomePokemon = del.nomePokemon;
                            if (del.tmNumero !== undefined) payload.tmNumero = del.tmNumero;
                            if (del.slot !== undefined) payload.slot = del.slot;
                            
                            promessas.push(
                                fetch(APPS_SCRIPT_URL, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'text/plain' },
                                    body: JSON.stringify(payload)
                                }).then(() => {
                                    console.log(`✅ Sugestão excluída: ${del.action}`);
                                }).catch(e => {
                                    console.warn(`⚠️ Erro ao excluir sugestão:`, e);
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
                        
                        // Fechar modal e atualizar card DEPOIS do save completo
                        setTimeout(() => {
                            const overlay = document.getElementById('modalEdicaoOverlay');
                            if (overlay) overlay.remove();
                            localStorage.removeItem('pokemons_editados');
                            _pendingSuggestionDeletes = [];
                            
                            // ⚡ Atualizar o card no DOM APÓS fechar o modal (mais confiável)
                            const cardAtualizado = atualizarCardNoDom(nomeOriginal, todosPokemons[index]);
                            if (!cardAtualizado) {
                                // Fallback: card não encontrado (ex: re-render por lazy load)
                                // Re-renderizar apenas os visíveis para refletir as mudanças
                                console.warn('⚠️ Card não encontrado, re-renderizando lista...');
                                const searchInput = document.getElementById('searchInput');
                                const termoBusca = searchInput ? searchInput.value.trim() : '';
                                if (!termoBusca) {
                                    // Preservar posição de scroll
                                    const scrollPos = window.scrollY;
                                    renderizarPokemons(todosPokemons);
                                    requestAnimationFrame(() => window.scrollTo(0, scrollPos));
                                }
                            }
                            mostrarToastSucesso('Alterações salvas com sucesso!');
                            console.log('✅ Edição concluída, card atualizado no DOM.');
                        }, 800);
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
                        setTimeout(() => {
                            const overlay = document.getElementById('modalEdicaoOverlay');
                            if (overlay) overlay.remove();
                            localStorage.removeItem('pokemons_editados');
                            _pendingSuggestionDeletes = [];
                            
                            // ⚡ Atualizar o card no DOM mesmo com avisos
                            const cardAtualizado = atualizarCardNoDom(nomeOriginal, todosPokemons[index]);
                            if (!cardAtualizado) {
                                console.warn('⚠️ Card não encontrado, re-renderizando lista...');
                                const searchInput = document.getElementById('searchInput');
                                const termoBusca = searchInput ? searchInput.value.trim() : '';
                                if (!termoBusca) {
                                    const scrollPos = window.scrollY;
                                    renderizarPokemons(todosPokemons);
                                    requestAnimationFrame(() => window.scrollTo(0, scrollPos));
                                }
                            }
                            mostrarToastSucesso('Salvo com avisos (verifique o console)');
                            console.log('⚠️ Edição concluída com avisos, card atualizado no DOM.');
                        }, 1200);
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
                // Atualizar card mesmo no modo offline
                atualizarCardNoDom(nomeOriginal, todosPokemons[index]);
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

            // Gerar opções de cidades agrupadas por região
            let cidadeOptionsHTML = '';
            for (const [regiao, cidades] of Object.entries(LOC_CIDADES)) {
                cidadeOptionsHTML += `<div class="cla-city-region">${regiao}</div>`;
                cidades.forEach(c => {
                    cidadeOptionsHTML += `<div class="cla-city-option" data-city="${c}">${c}</div>`;
                });
            }

            modal.innerHTML = `
                <div style="${modalStyles.box};position:relative;">
                    ${modalStyles.btnFechar}
                    ${modalStyles.selectOptionFix}
                    <h2 style="${modalStyles.title}"><i class="fas fa-map-marker-alt"></i> Sugerir Localização</h2>
                    <p style="${modalStyles.subtitle}"><strong>${nomePokemon}</strong></p>

                    <!-- Cidade -->
                    <label style="${modalStyles.label}">🏙️ Cidade:</label>
                    <div class="cla-city-select-wrapper" style="margin-bottom:15px;">
                        <input type="text" id="sugLocCidade" class="cla-loc-input" placeholder="Digite ou selecione a cidade..." autocomplete="off" />
                        <div id="sugLocCidadeDropdown" class="cla-city-dropdown">${cidadeOptionsHTML}</div>
                    </div>

                    <!-- Direção -->
                    <label style="${modalStyles.label}">🧭 Direção:</label>
                    <div class="cla-direction-btns" style="margin-bottom:15px;">
                        <button type="button" class="cla-dir-btn sug-dir-btn" data-dir=">" title="Direita">→ Direita</button>
                        <button type="button" class="cla-dir-btn sug-dir-btn" data-dir="<" title="Esquerda">← Esquerda</button>
                        <button type="button" class="cla-dir-btn sug-dir-btn" data-dir="/\\" title="Cima">↑ Cima</button>
                        <button type="button" class="cla-dir-btn sug-dir-btn" data-dir="\\/" title="Baixo">↓ Baixo</button>
                    </div>
                    <input type="hidden" id="sugLocDirecao" />

                    <!-- Unidade -->
                    <label style="${modalStyles.label}">🔢 Unidade:</label>
                    <div class="cla-unit-wrapper" style="margin-bottom:15px;">
                        <input type="number" id="sugLocUnidade" class="cla-loc-input cla-loc-unit" placeholder="Ex: 7" min="1" />
                        <span class="cla-unit-suffix">un</span>
                    </div>

                    <!-- Observação -->
                    <label style="${modalStyles.label}">📝 Observação <span style="opacity:0.5;font-size:0.85em;">(opcional)</span>:</label>
                    <input type="text" id="sugLocObs" class="cla-loc-input" placeholder="Ex: na safari zone, na leaf gale..." style="margin-bottom:15px;" />

                    <!-- Preview -->
                    <label style="${modalStyles.label}">👁️ Preview:</label>
                    <div id="sugLocPreview" class="cla-loc-preview" style="margin-bottom:15px;">—</div>

                    <div style="display:flex;gap:10px;">
                        <button id="btnSalvarSugLoc" onclick="salvarSugestaoLocalizacao('${nomePokemon.replace(/'/g, "\\'")}'  , this)" style="${modalStyles.btnSalvar}" disabled>
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        <button onclick="abrirModalSugestaoUnificado('${nomePokemon.replace(/'/g, "\\'")}')" style="${modalStyles.btnCancelar}">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                    </div>
                </div>
            `;

            // Setup eventos do formulário de sugestão de localização
            _setupSugLocForm();
        };

        // Setup dos eventos do formulário de sugestão localizacao
        function _setupSugLocForm() {
            const cidadeInput = document.getElementById('sugLocCidade');
            const dropdown = document.getElementById('sugLocCidadeDropdown');
            const dirBtns = document.querySelectorAll('.sug-dir-btn');
            const unidadeInput = document.getElementById('sugLocUnidade');

            if (!cidadeInput) return;

            function filterDropdown(filter) {
                const lowerFilter = (filter || '').toLowerCase();
                dropdown.querySelectorAll('.cla-city-option').forEach(opt => {
                    const match = opt.dataset.city.toLowerCase().includes(lowerFilter);
                    opt.style.display = match ? '' : 'none';
                });
                dropdown.querySelectorAll('.cla-city-region').forEach(region => {
                    let nextEl = region.nextElementSibling;
                    let hasVisible = false;
                    while (nextEl && !nextEl.classList.contains('cla-city-region')) {
                        if (nextEl.style.display !== 'none') hasVisible = true;
                        nextEl = nextEl.nextElementSibling;
                    }
                    region.style.display = hasVisible ? '' : 'none';
                });
            }

            cidadeInput.addEventListener('focus', () => {
                filterDropdown(cidadeInput.value);
                dropdown.classList.add('active');
            });
            cidadeInput.addEventListener('input', () => {
                filterDropdown(cidadeInput.value);
                dropdown.classList.add('active');
                _updateSugLocPreview();
            });

            dropdown.querySelectorAll('.cla-city-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    cidadeInput.value = opt.dataset.city;
                    dropdown.classList.remove('active');
                    _updateSugLocPreview();
                });
            });

            document.addEventListener('click', function _closeSugDropdown(e) {
                if (!e.target.closest('.cla-city-select-wrapper')) {
                    dropdown.classList.remove('active');
                }
                if (!document.getElementById('sugLocCidade')) {
                    document.removeEventListener('click', _closeSugDropdown);
                }
            });

            dirBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    dirBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById('sugLocDirecao').value = btn.dataset.dir;
                    _updateSugLocPreview();
                });
            });

            unidadeInput.addEventListener('input', () => {
                if (unidadeInput.value < 1) unidadeInput.value = '';
                _updateSugLocPreview();
            });

            const obsInput = document.getElementById('sugLocObs');
            if (obsInput) {
                obsInput.addEventListener('input', () => _updateSugLocPreview());
            }
        }

        function _updateSugLocPreview() {
            const cidade = document.getElementById('sugLocCidade')?.value || '';
            const direcao = document.getElementById('sugLocDirecao')?.value || '';
            const unidade = document.getElementById('sugLocUnidade')?.value || '';
            const obs = document.getElementById('sugLocObs')?.value?.trim() || '';
            const preview = document.getElementById('sugLocPreview');
            const btn = document.getElementById('btnSalvarSugLoc');

            if (cidade && direcao && unidade) {
                const icon = LOC_DIR_ICONS[direcao] || direcao;
                const obsStr = obs ? ` <span style="color:#aaa;font-style:italic;">${obs}</span>` : '';
                preview.innerHTML = `<span class="cla-loc-tag">${cidade} ${icon} ${unidade}un${obsStr}</span>`;
                preview.classList.add('filled');
                if (btn) btn.disabled = false;
            } else {
                preview.innerHTML = '—';
                preview.classList.remove('filled');
                if (btn) btn.disabled = true;
            }
        }

        window.salvarSugestaoLocalizacao = async function(nomePokemon, botao) {
            const cidade = document.getElementById('sugLocCidade')?.value?.trim();
            const direcao = document.getElementById('sugLocDirecao')?.value;
            const unidade = document.getElementById('sugLocUnidade')?.value;
            const obs = document.getElementById('sugLocObs')?.value?.trim() || '';

            if (!cidade || !direcao || !unidade) { alert('Preencha todos os campos: Cidade, Direção e Unidade!'); return; }

            // Validar cidade na lista
            const todasCidades = Object.values(LOC_CIDADES).flat();
            if (!todasCidades.some(c => c.toLowerCase() === cidade.toLowerCase())) {
                alert('Selecione uma cidade válida da lista!');
                return;
            }

            const sugestao = obs ? `${cidade} ${direcao} ${unidade}un ${obs}` : `${cidade} ${direcao} ${unidade}un`;
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            try {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'atualizarSugestao', nomePokemon, sugestao, email: user.email, authToken: user.authToken })
                });
                const texto = await resp.text();
                console.log('📥 Resposta salvarSugestaoLoc:', texto);
                let resultado;
                try { resultado = JSON.parse(texto); } catch(_e) { resultado = { sucesso: false, mensagem: 'Resposta inválida do servidor' }; }
                if (resultado.sucesso || resultado.success) {
                    // ⚡ Push imediato: atualizar dados locais e card no DOM
                    const nomeNorm = normalizarNome(nomePokemon);
                    const idx = todosPokemons.findIndex(p => {
                        const nEV = normalizarNome(p.EV || '');
                        const nPK = normalizarNome(p.POKEMON || '');
                        return (nEV && nEV === nomeNorm) || (nPK && nPK === nomeNorm);
                    });
                    console.log('🔍 Push imediato - idx:', idx, 'nomeNorm:', nomeNorm, 'totalPokemons:', todosPokemons.length);
                    if (idx !== -1) {
                        // Append à sugestão existente ou criar nova
                        const atual = obterSugestaoLocalizacao(todosPokemons[idx]);
                        const novaStr = atual ? `${atual} / ${sugestao}` : sugestao;
                        // Atualizar no array local (tentar as chaves possíveis)
                        const chave = Object.keys(todosPokemons[idx]).find(k => {
                            const ascii = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
                            return ascii.includes('SUGEST') && ascii.includes('LOCAL');
                        }) || 'SUGESTAO_LOC';
                        todosPokemons[idx][chave] = novaStr;
                        // Também atualizar SUGESTAO_LOC (chave ASCII usada pelo backend)
                        todosPokemons[idx]['SUGESTAO_LOC'] = novaStr;
                        // Sincronizar todosPokemonsCompleto
                        if (todosPokemonsCompleto && todosPokemonsCompleto !== todosPokemons) {
                            const idx2 = todosPokemonsCompleto.findIndex(p => {
                                const nEV = normalizarNome(p.EV || '');
                                const nPK = normalizarNome(p.POKEMON || '');
                                return (nEV && nEV === nomeNorm) || (nPK && nPK === nomeNorm);
                            });
                            if (idx2 !== -1) {
                                todosPokemonsCompleto[idx2][chave] = novaStr;
                                todosPokemonsCompleto[idx2]['SUGESTAO_LOC'] = novaStr;
                            }
                        }
                        console.log('✅ Sugestão local atualizada:', chave, '=', novaStr);
                        atualizarCardNoDom(nomePokemon, todosPokemons[idx]);
                    } else {
                        console.warn('⚠️ Pokémon não encontrado no array para push:', nomePokemon);
                        console.warn('Primeiros 5 pokémons:', todosPokemons.slice(0, 5).map(p => ({EV: p.EV, POKEMON: p.POKEMON})));
                    }
                    document.getElementById('modalSugestao')?.remove();
                    mostrarToastSucesso('Sugestão de localização enviada!');
                } else {
                    alert('Erro: ' + (resultado.mensagem || resultado.message));
                    botao.disabled = false; botao.innerHTML = '<i class="fas fa-save"></i> Salvar';
                }
            } catch (e) {
                console.error('❌ Erro salvarSugestaoLocalizacao:', e);
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
            const slot = document.getElementById('slotAtack').value.toUpperCase(); // ex: M1
            const nomeAtack = document.getElementById('nomeAtackInput').value.trim();
            if (!nomeAtack) { alert('Digite o nome do atack!'); return; }
            
            // Buscar tipo e categoria do atack na base local (auto-fill)
            let tipoAtack = '';
            let categoriaAtack = '';
            const atackInfo = todosAtacks.find(a => (a['ATACK'] || '').toLowerCase() === nomeAtack.toLowerCase());
            if (atackInfo) {
                tipoAtack = (atackInfo['TYPE'] || '').toString().trim();
                categoriaAtack = (atackInfo['CATEGORIA'] || '').toString().trim();
            }
            
            // Formato: M2 / Night Slash / Dark / Físico
            const sugestaoFormatada = `${slot} / ${nomeAtack} / ${tipoAtack} / ${categoriaAtack}`;
            
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            try {
                const resp = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'salvarSugestaoAtack', nomePokemon, sugestao: sugestaoFormatada, email: user.email, authToken: user.authToken })
                });
                const resultado = JSON.parse(await resp.text());
                if (resultado.sucesso || resultado.success) {
                    // ⚡ Push imediato: atualizar SUGESTAO_ATACKS no array local
                    const nomeNorm = normalizarNome(nomePokemon);
                    const idx = todosPokemons.findIndex(p => {
                        const nEV = normalizarNome(p.EV || '');
                        const nPK = normalizarNome(p.POKEMON || '');
                        return (nEV && nEV === nomeNorm) || (nPK && nPK === nomeNorm);
                    });
                    if (idx !== -1) {
                        const valorAtual = (todosPokemons[idx]['SUGESTAO_ATACKS'] || '').toString().trim();
                        todosPokemons[idx]['SUGESTAO_ATACKS'] = valorAtual ? valorAtual + ' - ' + sugestaoFormatada : sugestaoFormatada;
                    }
                    document.getElementById('modalSugestao')?.remove();
                    mostrarToastSucesso('Sugestão de atack enviada!');
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
                    // ⚡ Push imediato: atualizar card no DOM
                    const nomeNorm = normalizarNome(nomePokemon);
                    const idx = todosPokemons.findIndex(p => {
                        const nEV = normalizarNome(p.EV || '');
                        const nPK = normalizarNome(p.POKEMON || '');
                        return (nEV && nEV === nomeNorm) || (nPK && nPK === nomeNorm);
                    });
                    if (idx !== -1) {
                        atualizarCardNoDom(nomePokemon, todosPokemons[idx]);
                    }
                    document.getElementById('modalSugestao')?.remove();
                    mostrarToastSucesso('Sugestão de TM enviada!');
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
                    document.getElementById('modalSugestao').remove();
                    mostrarToastSucesso('Novo TM adicionado com sucesso!');
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

        window.aplicarFiltrosPokedex = function() {
            const container = document.getElementById('pokemonContainer');
            if (!container) return;

            const genFiltro = (document.getElementById('filterGen') || {}).value || '';
            const typeFiltro = ((document.getElementById('filterType') || {}).value || '').toLowerCase();
            const evFiltro = ((document.getElementById('filterEV') || {}).value || '').toLowerCase();
            const sugestaoFiltro = ((document.getElementById('filterSugestao') || {}).value || '').toLowerCase();

            const temFiltroAtivo = genFiltro || typeFiltro || evFiltro || sugestaoFiltro;

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

        // ⭐ Apagar sugestão de localização (admin) — apenas marca para apagar, salva junto ao "Salvar"
        window.apagarSugestaoLocalizacao = function(nomePokemon) {
            if (!confirm(`Apagar a sugestão de localização de "${nomePokemon}"?`)) return;
            
            // Registrar pendência para enviar ao clicar em Salvar
            _pendingSuggestionDeletes.push({
                action: 'limparSugestaoLoc',
                nomePokemon: nomePokemon
            });
            
            // Atualizar UI imediatamente (sem backend)
            const modal = document.getElementById('modalEdicaoOverlay');
            if (modal) {
                const locContainer = modal.querySelector('.modal-suggestion-item.loc');
                if (locContainer) {
                    locContainer.outerHTML = '<div class="modal-no-suggestion" style="color:#ffa500;">Sugestão marcada para exclusão (salve para confirmar)</div>';
                }
                // Esconder botão "Limpar" 
                const btnLimpar = modal.querySelector('.suggestion-clear-all-btn[onclick*="apagarSugestaoLocalizacao"]');
                if (btnLimpar) btnLimpar.style.display = 'none';
            }
            // Atualizar array local — limpar TODAS as chaves possíveis de sugestão de localização
            if (window.todosPokemons) {
                const pokLocal = window.todosPokemons.find(p => (p.EV || p.POKEMON || '').toLowerCase() === nomePokemon.toLowerCase());
                if (pokLocal) {
                    pokLocal['SUGESTAO_LOC'] = '';        // chave ASCII do backend (prioridade em obterSugestaoLocalizacao)
                    pokLocal['SUGESTÃO LOC'] = '';
                    pokLocal['SUGESTÃO LOCALIZAÇÃO'] = '';
                    pokLocal['SUGESTÃO DE LOCALIZAÇÃO'] = '';
                    pokLocal['SUGESTAO LOCALIZACAO'] = '';
                }
            }
        };

        // ⭐ Apagar sugestão de TM (admin) — apenas marca para apagar, salva junto ao "Salvar"
        window.apagarSugestaoTM = function(tmNumero) {
            if (!confirm(`Apagar a sugestão do TM${tmNumero}?`)) return;
            
            // Registrar pendência
            _pendingSuggestionDeletes.push({
                action: 'limparSugestaoTM',
                tmNumero: tmNumero
            });
            
            // Atualizar UI imediatamente
            const modal = document.getElementById('modalEdicaoOverlay');
            if (modal) {
                const tmItems = modal.querySelectorAll('.modal-suggestion-item.tm');
                tmItems.forEach(item => {
                    const numFormatado = 'TM' + String(tmNumero).padStart(2, '0');
                    if (item.textContent.includes(numFormatado)) {
                        item.outerHTML = '<div class="modal-no-suggestion" style="color:#ffa500;">Sugestão do ' + numFormatado + ' marcada para exclusão</div>';
                    }
                });
            }
            // Atualizar array local de TMs para que o card não re-renderize a sugestão antiga
            if (window.todosTMs) {
                const tmObj = todosTMs.find(t => String(t.numero) === String(tmNumero));
                if (tmObj) tmObj.sugestao = '';
            }
        };

        // ⭐ Limpar TODAS as sugestões de TMs de um Pokémon (admin) — marca para apagar em lote
        window.limparTodasSugestoesTMs = function(nomePokemon) {
            if (!confirm(`Limpar TODAS as sugestões de TMs de "${nomePokemon}"?`)) return;
            
            const nomeNorm = normalizarNome(nomePokemon);
            
            // Buscar todos os TMs que têm sugestão mencionando este Pokémon
            const tmsComSugestao = todosTMs.filter(tm => {
                if (!tm.sugestao) return false;
                const sugestaoNorm = normalizarNome(tm.sugestao);
                return sugestaoNorm.includes(nomeNorm);
            });
            
            const tmsDoPokemon = obterTMsDoPokemon(nomePokemon).filter(tm => tm.sugestao);
            const todosComSugestao = [...new Map([...tmsDoPokemon, ...tmsComSugestao].map(tm => [tm.numero, tm])).values()];
            
            if (todosComSugestao.length === 0) {
                alert('Nenhuma sugestão de TM encontrada.');
                return;
            }
            
            // Registrar pendência para cada TM
            todosComSugestao.forEach(tm => {
                _pendingSuggestionDeletes.push({
                    action: 'limparSugestaoTM',
                    tmNumero: tm.numero
                });
            });
            
            // Atualizar UI imediatamente
            const modal = document.getElementById('modalEdicaoOverlay');
            if (modal) {
                const tmItems = modal.querySelectorAll('.modal-suggestion-item.tm');
                tmItems.forEach(item => {
                    item.outerHTML = '<div class="modal-no-suggestion" style="color:#ffa500;">Sugestão marcada para exclusão</div>';
                });
                const btnLimpar = modal.querySelector('.suggestion-clear-all-btn[onclick*="limparTodasSugestoesTMs"]');
                if (btnLimpar) btnLimpar.style.display = 'none';
            }
            // Atualizar array local de TMs para que o card não re-renderize sugestões antigas
            todosComSugestao.forEach(tm => { tm.sugestao = ''; });
        };

        // ⭐ Apagar sugestão individual de Atack (admin) — marca para apagar, salva junto ao "Salvar"
        window.apagarSugestaoAtack = function(nomePokemon, slot) {
            if (!confirm(`Apagar a sugestão de atack "${slot}" de "${nomePokemon}"?`)) return;
            
            // Registrar pendência
            _pendingSuggestionDeletes.push({
                action: 'limparSugestaoAtack',
                nomePokemon: nomePokemon,
                slot: slot
            });
            
            // Atualizar UI imediatamente
            const modal = document.getElementById('modalEdicaoOverlay');
            if (modal) {
                const atackItems = modal.querySelectorAll('.modal-suggestion-item.atack');
                atackItems.forEach(item => {
                    if (item.querySelector('.suggestion-type')?.textContent?.trim().toUpperCase() === slot.toUpperCase()) {
                        item.outerHTML = '<div class="modal-no-suggestion" style="color:#ffa500;">Sugestão ' + slot + ' marcada para exclusão</div>';
                    }
                });
                // Esconder botão "Limpar Todas" se não sobrou nenhuma sugestão
                const restantes = modal.querySelectorAll('.modal-suggestion-item.atack');
                if (restantes.length === 0) {
                    const btnLimpar = modal.querySelector('#btnLimparSugestoesAtacks');
                    if (btnLimpar) btnLimpar.style.display = 'none';
                }
            }
            // Atualizar array local
            if (window.todosPokemons) {
                const pokLocal = window.todosPokemons.find(p => (p.EV || p.POKEMON || '').toLowerCase() === nomePokemon.toLowerCase());
                if (pokLocal) {
                    const valorAtual = (pokLocal['SUGESTAO_ATACKS'] || '').toString().trim();
                    if (valorAtual) {
                        const entradas = valorAtual.split(' - ').filter(e => !e.trim().toUpperCase().startsWith(slot.toUpperCase() + ' /'));
                        pokLocal['SUGESTAO_ATACKS'] = entradas.join(' - ');
                    }
                }
            }
        };

        // ⭐ Limpar TODAS as sugestões de atacks de um Pokémon — marca para apagar em lote
        window.limparTodasSugestoesAtacks = function(nomePokemon) {
            if (!confirm(`Limpar TODAS as sugestões de atacks de "${nomePokemon}"?`)) return;
            
            // Registrar pendência — slot vazio = limpar todas
            _pendingSuggestionDeletes.push({
                action: 'limparSugestaoAtack',
                nomePokemon: nomePokemon,
                slot: ''
            });
            
            // Atualizar UI imediatamente
            const modal = document.getElementById('modalEdicaoOverlay');
            if (modal) {
                const container = modal.querySelector('#sugestoesAtacksContainer');
                if (container) {
                    container.innerHTML = '<span style="color: #ffa500; font-style: italic;">Sugestões marcadas para exclusão (salve para confirmar)</span>';
                }
                const btnLimpar = modal.querySelector('#btnLimparSugestoesAtacks');
                if (btnLimpar) btnLimpar.style.display = 'none';
            }
            // Atualizar array local
            if (window.todosPokemons) {
                const pokLocal = window.todosPokemons.find(p => (p.EV || p.POKEMON || '').toLowerCase() === nomePokemon.toLowerCase());
                if (pokLocal) pokLocal['SUGESTAO_ATACKS'] = '';
            }
        };