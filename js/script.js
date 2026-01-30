const PLANILHA_ID = '1UZzLa4x2sdDXpE6J2CKh1LLsPUbUfDSVBuHayHydoVQ';
        const URL_DADOS = `https://opensheet.elk.sh/${PLANILHA_ID}/1`;
        
        // 🔧 URL DO GOOGLE APPS SCRIPT - Configurado!
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFAaBL2Ry838LANazibZnrX0LKMrA9_4zvwt9Bqs4gyZKw0CJzdKSOtf7t5ah9CA0f/exec';
        
        let todosPokemons = [];
        let todosTMs = [];
        let todasTasks = [];
        let usuarioLogado = null;
        let usarStickers = false; // false = database, true = stickers
        
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
            'Female': 'indeedee-female',
            'Male': 'indeedee-male',
            'Male': 'basculegion-male',
            'Female': 'basculegion-female',
            'Male': 'oinkologne-male',
            'Female': 'oinkologne-female',
            
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
                // Verificar se existe dados editados no localStorage
                const dadosLocais = localStorage.getItem('pokemons_editados');
                
                if (dadosLocais) {
                    todosPokemons = JSON.parse(dadosLocais);
                    document.getElementById('pokemonCount').textContent = todosPokemons.length;
                    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('pt-BR').slice(0, 5);
                    renderizarPokemons(todosPokemons);
                    
                    // Mostrar aviso de que está usando dados locais
                    if (usuarioLogado) {
                        console.log('✓ Usando dados editados localmente');
                    }
                    return;
                }
                
                const resposta = await fetch(URL_DADOS);
                const dados = await resposta.json();
                todosPokemons = dados;
                document.getElementById('pokemonCount').textContent = dados.length;
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('pt-BR').slice(0, 5);
                renderizarPokemons(dados);
            } catch (erro) {
                document.getElementById('pokemonContainer').innerHTML = `
                    <div class="error">
                        <h3><i class="fas fa-exclamation-triangle"></i> Erro</h3>
                        <p>${erro.message}</p>
                        <button onclick="location.reload()" style="margin-top:20px;padding:10px 25px;background:#ffd700;color:#1a2980;border:none;border-radius:25px;font-weight:bold;cursor:pointer">
                            <i class="fas fa-redo"></i> Tentar
                        </button>
                    </div>`;
            }
        }
        
        function renderizarPokemons(dados) {
            const container = document.getElementById('pokemonContainer');
            container.innerHTML = '';
            
            dados.forEach((pokemon, index) => {
                const numero = pokemon['PS'] || '';
                const nomePokemon = pokemon['POKEMON'] || 'Desconhecido';
                const tipo1 = pokemon['Type 1'] || 'Normal';
                const tipo2 = pokemon['Type 2'] || '';
                const evolucao = pokemon['EV'] || '';
                const localizacao = pokemon['LOCALIZAÇÃO'] || 'Não informado';
                const hp = pokemon['HP'] || '0';
                const ataque = pokemon['Attack'] || '0';
                const defesa = pokemon['Defense'] || '0';
                const ataqueEsp = pokemon['Sp.Attack'] || '0';
                const defesaEsp = pokemon['Sp.Defense'] || '0';
                const velocidade = pokemon['Speed'] || '0';
                
                // ⭐ NOVOS DADOS: TMs ⭐
                const tmNumero = pokemon['TM'] || '';
                const tmNome = pokemon['Nome do TM'] || '';
                const tmCategoria = pokemon['Categoria'] || '';
                const tmsTexto = tmNumero ? `${tmNumero} - ${tmNome}` : 'Sem TMs registradas';
                
                const nomePrincipal = evolucao || nomePokemon;
                const nomeBase = evolucao ? nomePokemon : '';
                const imagemUrl = obterImagemPokemon(nomePrincipal, nomeBase);
                
                const card = document.createElement('div');
                card.className = 'pokemon-card';
                card.innerHTML = `
                    <div class="img-container">
                        <img class="pokemon-img" src="${imagemUrl}" alt="${nomePrincipal}" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
                    </div>
                    ${numero ? `<div class="pokemon-number">#${numero}</div>` : ''}
                    <h3 class="pokemon-name">
                        ${nomePrincipal}
                        ${evolucao ? `<span class="pokemon-evolution-badge">EV</span>` : ''}
                    </h3>
                    ${nomeBase ? `<div class="pokemon-base">Forma base: ${nomeBase}</div>` : ''}
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
                        <div>${localizacao}</div>
                    </div>
                    <!-- ⭐ NOVA SEÇÃO: TMs / Moves ⭐ -->
                    <div class="pokemon-tms">
                        <div class="tms-title">
                            <i class="fas fa-compact-disc"></i> TMs / Moves
                        </div>
                        <div class="tms-content">
                            ${tmsTexto}
                        </div>
                    </div>`;
                
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
        
        function obterImagemPokemon(nomePrincipal, nomeBase, forceStickers = false) {
            if (nomePrincipal) {
                nomePrincipal = nomePrincipal.replace(/^Boss\s+/i, '').trim();
            }
            if (nomeBase) {
                nomeBase = nomeBase.replace(/^Boss\s+/i, '').trim();
            }
            
            // Formatar nome para URL
            const nomeFallback = (nomeBase || nomePrincipal)
                .toLowerCase()
                .replace(/'/g, '')
                .replace(/\./g, '')
                .replace(/♀/g, '-f')
                .replace(/♂/g, '-m')
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            
            // Se forceStickers ativo ou usarStickers ativo, usar stickers da wiki
            if (forceStickers || usarStickers) {
                return `https://wiki.pokememories.com/images/pokemons/${nomeFallback}.png`;
            }
            
            // Tentar usar mapeamento especial primeiro
            if (mapeamentoImagens[nomePrincipal]) {
                const nomeDB = mapeamentoImagens[nomePrincipal];
                return `https://img.pokemondb.net/sprites/scarlet-violet/icon/avif/${nomeDB}.avif`;
            }
            
            if (nomeBase && nomeBase !== nomePrincipal) {
                const combinacao = `${nomeBase} ${nomePrincipal}`;
                if (mapeamentoImagens[combinacao]) {
                    const nomeDB = mapeamentoImagens[combinacao];
                    return `https://img.pokemondb.net/sprites/scarlet-violet/icon/avif/${nomeDB}.avif`;
                }
            }
            
            // Fallback para pokemondb
            return `https://img.pokemondb.net/sprites/scarlet-violet/icon/avif/${nomeFallback}.avif`;
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
        
        function carregarTMs() {
            todosTMs = [
                { numero: 'TM02', nome: 'Dragon Claw', pokemon: 'Dragonite', categoria: 'spawn' },
                { numero: 'TM03', nome: 'Psyshock', pokemon: 'Exeggutor', categoria: 'spawn' },
                { numero: 'TM04', nome: 'Calm Mind', pokemon: 'Alakazam', categoria: 'spawn' },
                { numero: 'TM06', nome: 'Toxic', pokemon: 'Muk', categoria: 'spawn' },
                { numero: 'TM07', nome: 'Hail', pokemon: 'Walrein', categoria: 'spawn' },
                { numero: 'TM08', nome: 'Bulk Up', pokemon: 'Machamp', categoria: 'spawn' },
                { numero: 'TM09', nome: 'Venoshock', pokemon: 'Seviper', categoria: 'spawn' },
                { numero: 'TM10', nome: 'Hidden Power', pokemon: 'Reuniclus', categoria: 'spawn' },
                { numero: 'TM11', nome: 'Sunny Day', pokemon: 'Magmar', categoria: 'spawn' },
                { numero: 'TM13', nome: 'Ice Beam', pokemon: 'Cloyster', categoria: 'spawn' },
                { numero: 'TM14', nome: 'Blizzard', pokemon: 'Regice', categoria: 'spawn' },
                { numero: 'TM15', nome: 'Hyper Beam', pokemon: 'Snorlax', categoria: 'spawn' },
                { numero: 'TM16', nome: 'Light Screen', pokemon: 'Girafarig', categoria: 'spawn' },
                { numero: 'TM17', nome: 'Protect', pokemon: 'Bastiodon', categoria: 'spawn' },
                { numero: 'TM18', nome: 'Rain Dance', pokemon: 'Ludicolo', categoria: 'spawn' },
                { numero: 'TM19', nome: 'Roost', pokemon: 'Pidgeot', categoria: 'spawn' },
                { numero: 'TM20', nome: 'Safeguard', pokemon: 'Shuckle', categoria: 'spawn' },
                { numero: 'TM21', nome: 'Frustration', pokemon: 'Buneary', categoria: 'spawn' },
                { numero: 'TM22', nome: 'Solar Beam', pokemon: 'Venusaur', categoria: 'spawn' },
                { numero: 'TM23', nome: 'Smack Down', pokemon: 'Rhydon', categoria: 'spawn' },
                { numero: 'TM24', nome: 'Thunderbolt', pokemon: 'Electabuzz', categoria: 'spawn' },
                { numero: 'TM25', nome: 'Thunder', pokemon: 'Minun', categoria: 'spawn' },
                { numero: 'TM26', nome: 'Earthquake', pokemon: 'Regirock', categoria: 'spawn' },
                { numero: 'TM27', nome: 'Return', pokemon: 'Lopunny', categoria: 'spawn' },
                { numero: 'TM28', nome: 'Leech Life', pokemon: 'Victreebel', categoria: 'spawn' },
                { numero: 'TM29', nome: 'Psychic', pokemon: 'Hypno', categoria: 'spawn' },
                { numero: 'TM30', nome: 'Shadow Ball', pokemon: 'Gengar', categoria: 'spawn' },
                { numero: 'TM31', nome: 'Brick Break', pokemon: 'Hitmonlee', categoria: 'spawn' },
                { numero: 'TM33', nome: 'Reflect', pokemon: 'Wobbuffet', categoria: 'spawn' },
                { numero: 'TM34', nome: 'Sludge Wave', pokemon: 'Garbodor', categoria: 'spawn' },
                { numero: 'TM35', nome: 'Flamethrower', pokemon: 'Emboar', categoria: 'spawn' },
                { numero: 'TM36', nome: 'Sludge Bomb', pokemon: 'Scolipede', categoria: 'spawn' },
                { numero: 'TM37', nome: 'Sandstorm', pokemon: 'Boldore', categoria: 'spawn' },
                { numero: 'TM38', nome: 'Fire Blast', pokemon: 'Heatmor', categoria: 'spawn' },
                { numero: 'TM39', nome: 'Rock Tomb', pokemon: 'Gurdurr', categoria: 'spawn' },
                { numero: 'TM40', nome: 'Aerial Ace', pokemon: 'Braviary', categoria: 'spawn' },
                { numero: 'TM41', nome: 'Torment', pokemon: 'Krookodile', categoria: 'spawn' },
                { numero: 'TM42', nome: 'Facade', pokemon: 'Scraggy', categoria: 'spawn' },
                { numero: 'TM43', nome: 'Flame Charge', pokemon: 'Rapidash', categoria: 'spawn' },
                { numero: 'TM44', nome: 'Rest', pokemon: 'Desconhecido', categoria: 'spawn' },
                { numero: 'TM45', nome: 'Knock Off', pokemon: 'Evento Halloween', categoria: 'event' },
                { numero: 'TM46', nome: 'Avalanche', pokemon: 'Avalugg', categoria: 'spawn' },
                { numero: 'TM47', nome: 'Low Sweep', pokemon: 'Sawk', categoria: 'spawn' },
                { numero: 'TM48', nome: 'Round', pokemon: 'Jigglypuff', categoria: 'spawn' },
                { numero: 'TM49', nome: 'Echoed Voice', pokemon: 'Minccino', categoria: 'spawn' },
                { numero: 'TM50', nome: 'Overheat', pokemon: 'Typhlosion', categoria: 'spawn' },
                { numero: 'TM51', nome: 'Steel Wing', pokemon: 'Boss Dialga', categoria: 'boss' },
                { numero: 'TM52', nome: 'Focus Blast', pokemon: 'Cassino Roleta', categoria: 'spawn' },
                { numero: 'TM53', nome: 'Energy Ball', pokemon: 'Cradily', categoria: 'spawn' },
                { numero: 'TM55', nome: 'Scald', pokemon: 'Kingdra', categoria: 'spawn' },
                { numero: 'TM59', nome: 'Brutal Swing', pokemon: 'Drapion', categoria: 'spawn' },
                { numero: 'TM60', nome: 'Drain Punch', pokemon: 'Pangoro', categoria: 'spawn' },
                { numero: 'TM61', nome: 'Water Pulse', pokemon: 'Poliwag', categoria: 'spawn' },
                { numero: 'TM62', nome: 'Acrobatics', pokemon: 'Evento Halloween', categoria: 'event' },
                { numero: 'TM65', nome: 'Shadow Claw', pokemon: 'Sableye', categoria: 'spawn' },
                { numero: 'TM66', nome: 'Payback', pokemon: 'Shiftry', categoria: 'spawn' },
                { numero: 'TM67', nome: 'Smart Strike', pokemon: 'Donphan', categoria: 'spawn' },
                { numero: 'TM68', nome: 'Giga Impact', pokemon: 'Tauros', categoria: 'spawn' },
                { numero: 'TM69', nome: 'Rock Polish', pokemon: 'Golem', categoria: 'spawn' },
                { numero: 'TM71', nome: 'Stone Edge', pokemon: 'Ursaring', categoria: 'spawn' },
                { numero: 'TM72', nome: 'Volt Switch', pokemon: 'Emolga', categoria: 'spawn' },
                { numero: 'TM73', nome: 'Thunder Wave', pokemon: 'Raichu', categoria: 'spawn' },
                { numero: 'TM74', nome: 'Gyro Ball', pokemon: 'Hitmontop', categoria: 'spawn' },
                { numero: 'TM75', nome: 'Swords Dance', pokemon: 'Bisharp', categoria: 'spawn' },
                { numero: 'TM76', nome: 'Rock Blast', pokemon: 'Barbaracle', categoria: 'spawn' },
                { numero: 'TM78', nome: 'Bulldoze', pokemon: 'Hippowdon', categoria: 'spawn' },
                { numero: 'TM80', nome: 'Rock Slide', pokemon: 'Sudowoodo', categoria: 'spawn' },
                { numero: 'TM84', nome: 'Poison Jab', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM85', nome: 'Dream Eater', pokemon: 'Evento Dia das Crianças', categoria: 'event' },
                { numero: 'TM86', nome: 'Grass Knot', pokemon: 'Shiny Celebi', categoria: 'spawn' },
                { numero: 'TM87', nome: 'Draining Kiss', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM89', nome: 'Misty Terrain', pokemon: 'Evento Temporada 1', categoria: 'event' },
                { numero: 'TM91', nome: 'Flash Cannon', pokemon: 'Boss Heatran', categoria: 'boss' },
                { numero: 'TM93', nome: 'Wild Charge', pokemon: 'Manectric', categoria: 'spawn' },
                { numero: 'TM94', nome: 'Surf', pokemon: 'Lapras', categoria: 'spawn' },
                { numero: 'TM95', nome: 'Snarl', pokemon: 'Mightyena', categoria: 'spawn' },
                { numero: 'TM97', nome: 'Dark Pulse', pokemon: 'Tyranitar', categoria: 'spawn' },
                { numero: 'TM98', nome: 'Waterfall', pokemon: 'Feraligatr', categoria: 'spawn' },
                { numero: 'TM99', nome: 'Dazzling Gleam', pokemon: 'Clefable', categoria: 'spawn' },
                { numero: 'TM100', nome: 'Will-O-Wisp', pokemon: 'Ho-Oh', categoria: 'spawn' },
                { numero: 'TM101', nome: 'Charm', pokemon: 'Evento Dia das Mães', categoria: 'event' },
                { numero: 'TM102', nome: 'Ancient Power', pokemon: 'Aerodactyl', categoria: 'spawn' },
                { numero: 'TM103', nome: 'Psywave', pokemon: 'Shiny Celebi', categoria: 'spawn' },
                { numero: 'TM104', nome: 'Assurance', pokemon: 'Boss Darkrai', categoria: 'boss' },
                { numero: 'TM105', nome: 'Confusion', pokemon: 'Evento Dia das Crianças', categoria: 'event' },
                { numero: 'TM106', nome: 'Phantom Force', pokemon: 'Evento Halloween', categoria: 'event' },
                { numero: 'TM107', nome: 'Hurricane', pokemon: 'Boss Ho-Oh', categoria: 'boss' },
                { numero: 'TM108', nome: 'Dragon Breath', pokemon: 'Boss Palkia', categoria: 'boss' },
                { numero: 'TM109', nome: 'Outrage', pokemon: 'Boss Giratina', categoria: 'boss' },
                { numero: 'TM110', nome: 'Dragon Pulse', pokemon: 'Boss Dialga', categoria: 'boss' },
                { numero: 'TM111', nome: 'Hydro Pump', pokemon: 'Boss Palkia', categoria: 'boss' },
                { numero: 'TM112', nome: 'Hex', pokemon: 'Boss Giratina', categoria: 'boss' },
                { numero: 'TM113', nome: 'Iron Head', pokemon: 'Boss Cobalion', categoria: 'boss' },
                { numero: 'TM114', nome: 'Magical Leaf', pokemon: 'Boss Virizion', categoria: 'boss' },
                { numero: 'TM115', nome: 'Stealth Rock', pokemon: 'Boss Terrakion', categoria: 'boss' },
                { numero: 'TM116', nome: 'Metronome', pokemon: 'Evento Aniversário', categoria: 'event' },
                { numero: 'TM117', nome: 'Incinerate', pokemon: 'Boss Heatran', categoria: 'boss' },
                { numero: 'TM118', nome: 'Zen Headbutt', pokemon: 'Evento Páscoa', categoria: 'event' },
                { numero: 'TM119', nome: 'Dive', pokemon: 'Boss Phione/Manaphy', categoria: 'boss' },
                { numero: 'TM120', nome: 'Air Cutter', pokemon: 'Boss Shaymin Sky', categoria: 'boss' },
                { numero: 'TM121', nome: 'Hyper Voice', pokemon: 'Evento Dia das Mães', categoria: 'event' },
                { numero: 'TM122', nome: 'Fire Spin', pokemon: 'Evento São João', categoria: 'event' },
                { numero: 'TM123', nome: 'Liquidation', pokemon: 'Evento São João', categoria: 'event' },
                { numero: 'TM124', nome: 'Icy Wind', pokemon: 'Evento Temporada 1', categoria: 'event' },
                { numero: 'TM125', nome: 'Disarming Voice', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM126', nome: 'Psybeam', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM127', nome: 'Play Rough', pokemon: 'Aromatisse', categoria: 'spawn' },
                { numero: 'TM128', nome: 'X-Scissor', pokemon: 'Scizor', categoria: 'spawn' },
                { numero: 'TM129', nome: 'Dragon Tail', pokemon: 'Goodra', categoria: 'spawn' },
                { numero: 'TM130', nome: 'Electro Ball', pokemon: 'Dedenne', categoria: 'spawn' },
                { numero: 'TM131', nome: 'Giga Drain', pokemon: 'Chesnaught', categoria: 'spawn' },
                { numero: 'TM132', nome: 'Metal Claw', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM133', nome: 'Night Shade', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM134', nome: 'Reversal', pokemon: 'Evento São João', categoria: 'event' },
                { numero: 'TM135', nome: 'Heat Wave', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM136', nome: 'Beat Up', pokemon: 'Evento Temporada 2', categoria: 'event' },
                { numero: 'TM159', nome: 'Leaf Storm', pokemon: 'Boss Shaymin Sky', categoria: 'boss' },
                { numero: 'TM164', nome: 'Brave Bird', pokemon: 'Talonflame', categoria: 'spawn' },
                { numero: 'TM167', nome: 'Close Combat', pokemon: 'Hariyama', categoria: 'spawn' },
                { numero: 'TM186', nome: 'High Horsepower', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM192', nome: 'Focus Punch', pokemon: 'Conkeldurr', categoria: 'spawn' },
                { numero: 'TM198', nome: 'Poltergeist', pokemon: 'Evento Temporada 2', categoria: 'event' },
                { numero: 'TM199', nome: 'Lash Out', pokemon: 'Malamar', categoria: 'spawn' },
                { numero: 'TM206', nome: 'Petal Blizzard', pokemon: 'Craft', categoria: 'craft' },
                { numero: 'TM208', nome: 'Whirlpool', pokemon: 'Craft', categoria: 'craft' }
            ];
            renderizarTMs(todosTMs);
            carregarTasks();
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
            container.innerHTML = '';

            if (dados.length === 0) {
                container.innerHTML = '<div class="no-results"><p>Nenhum TM encontrado</p></div>';
                return;
            }

            dados.forEach((tm) => {
                const imagemUrl = obterImagemPokemon(tm.pokemon, '', true); // Forçar stickers
                const card = document.createElement('div');
                card.className = 'tm-card';
                card.dataset.categoria = tm.categoria;
                
                let tipoIcon = '⚡';
                if (tm.categoria === 'boss') tipoIcon = '👑';
                else if (tm.categoria === 'event') tipoIcon = '🎉';
                else if (tm.categoria === 'spawn') tipoIcon = '✓';
                else if (tm.categoria === 'craft') tipoIcon = '🔧';
                
                let imagemHtml;
                if (tm.categoria === 'craft') {
                    imagemHtml = `<div class="tm-pokemon-placeholder"><i class="fas fa-cog"></i></div>`;
                } else if (tm.categoria === 'event') {
                    imagemHtml = `<img src="https://wiki.pokememories.com/images/pokemons/eventos.png" alt="Evento" class="tm-pokemon-image">`;
                } else {
                    imagemHtml = `<img src="${imagemUrl}" alt="${tm.pokemon}" class="tm-pokemon-image">`;
                }

                card.innerHTML = `
                    <div class="tm-number">
                        <span class="tm-type-icon">${tipoIcon}</span>
                        <span class="tm-number-text">${tm.numero}</span>
                    </div>
                    <h3 class="tm-name">${tm.nome}</h3>
                    <div class="tm-footer">
                        ${imagemHtml}
                        <div class="tm-pokemon-name">${tm.pokemon}</div>
                    </div>
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

        function switchTab(tabName) {
            // Esconder todas as abas
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remover active de todos os botões
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Mostrar aba selecionada
            document.getElementById(tabName).classList.add('active');
            
            // Marcar botão como ativo
            event.target.classList.add('active');

            // Carregar TMs na primeira vez
            if (tabName === 'tms' && todosTMs.length === 0) {
                carregarTMs();
            }
        }
        
        function configurarBuscaInstantanea() {
            const input = document.getElementById('searchInput');
            const container = document.getElementById('pokemonContainer');
            
            input.addEventListener('input', function() {
                const termo = this.value.toLowerCase().trim();
                const cards = container.querySelectorAll('.pokemon-card');
                container.querySelectorAll('.no-results').forEach(m => m.remove());
                let encontrados = 0;
                
                cards.forEach(card => {
                    const corresponde = card.textContent.toLowerCase().includes(termo);
                    if (corresponde || termo === '') {
                        card.style.display = 'block';
                        encontrados++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                if (termo && encontrados === 0) {
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
            
            let filtroCategoria = 'todos';
            
            // Configurar botões de filtro
            filterBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    filtroCategoria = this.dataset.categoria;
                    aplicarFiltros();
                });
            });
            
            function aplicarFiltros() {
                const termo = input.value.toLowerCase().trim();
                const cards = container.querySelectorAll('.tm-card');
                let encontrados = 0;
                
                cards.forEach(card => {
                    const textoBusca = card.textContent.toLowerCase();
                    const categoria = card.dataset.categoria;
                    
                    const correspondeTexto = textoBusca.includes(termo) || termo === '';
                    const correspondeCategoria = filtroCategoria === 'todos' || categoria === filtroCategoria;
                    
                    if (correspondeTexto && correspondeCategoria) {
                        card.style.display = 'block';
                        encontrados++;
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                if (encontrados === 0) {
                    container.querySelectorAll('.no-results').forEach(m => m.remove());
                    const mensagem = document.createElement('div');
                    mensagem.className = 'no-results';
                    mensagem.innerHTML = `<p>Nenhum TM encontrado</p>`;
                    container.appendChild(mensagem);
                }
            }
            
            input.addEventListener('input', aplicarFiltros);
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            carregarDados();
            carregarTMs();
            configurarBuscaTMs();
            renderizarMembrosClã();
            inicializarGoogle();
        });

        function inicializarGoogle() {
            google.accounts.id.initialize({
                client_id: '294066496258-ojjgv3m4n3qkouq9lg5sg72ms7tlhi34.apps.googleusercontent.com',
                callback: aoFazerLogin
            });
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
            // Decodificar JWT
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

            atualizarTelaLogin();
        }

        function atualizarTelaLogin() {
            const btnLogin = document.getElementById('loginBtn');
            const userInfo = document.getElementById('userInfo');

            if (usuarioLogado) {
                btnLogin.style.display = 'none';
                userInfo.style.display = 'flex';
                document.getElementById('userName').textContent = usuarioLogado.nome;
                document.getElementById('userPic').src = usuarioLogado.foto;
            } else {
                btnLogin.style.display = 'block';
                userInfo.style.display = 'none';
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
            
            carregarDados();
            carregarTMs();
            configurarBuscaTMs();
            renderizarMembrosClã();
            inicializarGoogle();
        });

        function inicializarGoogle() {
            google.accounts.id.initialize({
                client_id: '294066496258-ojjgv3m4n3qkouq9lg5sg72ms7tlhi34.apps.googleusercontent.com',
                callback: aoFazerLogin
            });
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
                            const pokemonNome = card.querySelector('.pokemon-name').textContent.trim();
                            const pokemonData = todosPokemons.find(p => {
                                const nomeDisplay = (p.EV || p.POKEMON || '').trim();
                                return nomeDisplay === pokemonNome;
                            });
                            editarPokemon(card, pokemonData);
                        });
                        card.style.position = 'relative';
                        card.appendChild(btnEdit);
                    }
                });
                
                // Botão Adicionar - remover existente antes de criar novo
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
        
        function editarPokemon(card, pokemonData) {
            const nomeDisplay = card.querySelector('.pokemon-name').textContent.trim();
            const nomeReal = pokemonData ? (pokemonData.POKEMON || nomeDisplay) : nomeDisplay;
            const numero = card.querySelector('.pokemon-number')?.textContent.replace('#', '').trim() || '';
            const stats = Array.from(card.querySelectorAll('.stat-value')).map(el => el.textContent);
            const localizacao = card.querySelector('.pokemon-location div:last-child')?.textContent.trim() || '';
            const tms = card.querySelector('.tms-content')?.textContent.trim() || '';
            
            const modal = criarModalEdicao(nomeReal, nomeDisplay, numero, stats, localizacao, tms);
            document.body.appendChild(modal);
        }
        
        function criarModalEdicao(nomeReal, nomeDisplay, numero, stats, localizacao, tms) {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;';
            
            overlay.innerHTML = `
                <div style="background: linear-gradient(145deg, #1a2980, #0f3460); border-radius: 20px; padding: 30px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid #ffd700;" data-nome-real="${nomeReal}">
                    <h2 style="color: #ffd700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
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
                        
                        <div>
                            <label style="color: #88d3ff; display: block; margin-bottom: 5px;">TMs:</label>
                            <textarea id="edit-tms" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ffd700; background: rgba(0,0,0,0.3); color: #fff; font-size: 14px; min-height: 60px;">${tms}</textarea>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: flex-end;">
                        <button onclick="this.closest('[style*=fixed]').remove()" style="padding: 12px 25px; background: rgba(255,255,255,0.1); border: 1px solid #888; color: #fff; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;">
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
            
            return overlay;
        }
        
        async function salvarEdicao() {
            const nomeOriginal = document.querySelector('[style*=fixed] div[data-nome-real]').getAttribute('data-nome-real');
            
            const dados = {
                nome: document.getElementById('edit-nome').value,
                numero: document.getElementById('edit-numero').value,
                hp: document.getElementById('edit-hp').value,
                atk: document.getElementById('edit-atk').value,
                def: document.getElementById('edit-def').value,
                spatk: document.getElementById('edit-spatk').value,
                spdef: document.getElementById('edit-spdef').value,
                speed: document.getElementById('edit-speed').value,
                localizacao: document.getElementById('edit-local').value,
                tms: document.getElementById('edit-tms').value
            };
            
            // Atualizar no array local
            const index = todosPokemons.findIndex(p => {
                const nomePok = (p.POKEMON || '').toLowerCase().trim();
                return nomePok === nomeOriginal.toLowerCase().trim();
            });
            
            const ehNovo = index === -1;
            
            if (!ehNovo) {
                // Atualizar Pokémon existente
                todosPokemons[index] = {
                    ...todosPokemons[index],
                    POKEMON: dados.nome,
                    EV: dados.nome,
                    PS: dados.numero,
                    HP: dados.hp,
                    Attack: dados.atk,
                    Defense: dados.def,
                    'Sp.Attack': dados.spatk,
                    'Sp.Defense': dados.spdef,
                    Speed: dados.speed,
                    'LOCALIZAÇÃO': dados.localizacao,
                    TM: dados.tms.split(' - ')[0] || todosPokemons[index].TM || '',
                    'Nome do TM': dados.tms.split(' - ')[1] || todosPokemons[index]['Nome do TM'] || ''
                };
            } else {
                // Novo Pokémon
                const novoPokemon = {
                    POKEMON: dados.nome,
                    EV: dados.nome,
                    PS: dados.numero,
                    HP: dados.hp,
                    Attack: dados.atk,
                    Defense: dados.def,
                    'Sp.Attack': dados.spatk,
                    'Sp.Defense': dados.spdef,
                    Speed: dados.speed,
                    'LOCALIZAÇÃO': dados.localizacao,
                    TM: dados.tms.split(' - ')[0] || '',
                    'Nome do TM': dados.tms.split(' - ')[1] || '',
                    'Type 1': 'Normal',
                    'Type 2': ''
                };
                
                todosPokemons.push(novoPokemon);
            }
            
            // Salvar no localStorage
            localStorage.setItem('pokemons_editados', JSON.stringify(todosPokemons));
            
            // Re-renderizar
            renderizarPokemons(todosPokemons);
            
            // 🚀 SALVAR NO GOOGLE SHEETS
            if (APPS_SCRIPT_URL && APPS_SCRIPT_URL.trim() !== '') {
                try {
                    const payload = {
                        acao: ehNovo ? 'adicionar' : 'atualizar',
                        nomeOriginal: nomeOriginal,
                        pokemon: dados
                    };
                    
                    const resposta = await fetch(APPS_SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors', // Necessário para Apps Script
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    // Como usamos no-cors, não podemos ler a resposta
                    // Mas se chegou aqui, a requisição foi enviada
                    console.log('✅ Requisição enviada ao Google Sheets');
                    alert(`✅ ${ehNovo ? 'Novo Pokémon adicionado' : 'Pokémon atualizado'} com sucesso!\n\n📡 Dados enviados ao Google Sheets!\n\n⏳ A planilha será atualizada em alguns segundos.\n\n💾 Dados também salvos localmente.`);
                    
                } catch (erro) {
                    console.error('Erro ao salvar no Google Sheets:', erro);
                    alert(`✅ ${ehNovo ? 'Pokémon adicionado' : 'Pokémon atualizado'} localmente!\n\n⚠️ Não foi possível conectar ao Google Sheets.\n\n💾 Dados salvos no navegador.\n\n🔄 Tente novamente ou verifique a conexão.`);
                }
            } else {
                alert(`✅ ${ehNovo ? 'Novo Pokémon adicionado' : 'Pokémon atualizado'}!\n\n⚠️ Google Apps Script não configurado.\n\nPara salvar no Google Sheets:\n1. Siga as instruções no arquivo google-apps-script.gs\n2. Cole a URL no script.js\n\nDados salvos localmente no navegador.`);
            }
            
            document.querySelector('[style*=fixed]').remove();
        }
        
        function abrirModalAddPokemon() {
            const modal = criarModalEdicao('Novo Pokémon', '', ['0','0','0','0','0','0'], '', '');
            document.body.appendChild(modal);
        }
