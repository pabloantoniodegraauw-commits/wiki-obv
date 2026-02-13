// 📋 Módulo Mural de Vendas - WIKI OBV

const MURAL_BASE_URL = "https://script.google.com/macros/s/AKfycbxCK2_MelvUHTVvvGfvx0M9QfflATDhr4sZjH5nAVgE4kgfvdRo1pFaVGQGZjk_PG5rdg/exec";

let muralVendas = [];
let muralVendasFiltradas = [];

// ── Inicialização ───────────────────────────────
function initMural() {
    console.log('📋 Inicializando Mural de Vendas...');
    carregarVendasMural();
}

// ── Carregar vendas ─────────────────────────────
async function carregarVendasMural() {
    const grid = document.getElementById('muralGrid');
    if (!grid) return;

    grid.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Carregando vendas...</p></div>`;

    try {
        const response = await fetch(MURAL_BASE_URL + '?acao=obter_vendas');
        const resultado = await response.json();

        if (resultado.success && resultado.data) {
            muralVendas = resultado.data;
            console.log('✅ Vendas carregadas:', muralVendas.length);
        } else {
            muralVendas = [];
        }

        filtrarMural();
    } catch (err) {
        console.error('❌ Erro ao carregar vendas:', err);
        grid.innerHTML = `<div class="loading"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar vendas</p></div>`;
    }
}

// ── Filtrar ─────────────────────────────────────
function filtrarMural() {
    const busca = (document.getElementById('muralSearchInput')?.value || '').toLowerCase().trim();
    const filtroTipo = document.getElementById('muralFilterTipo')?.value || '';

    muralVendasFiltradas = muralVendas.filter(venda => {
        const texto = (venda.textoVenda || '').toLowerCase();
        const nick = (venda.usuarioNickname || '').toLowerCase();

        let matchBusca = true;
        if (busca) {
            matchBusca = texto.includes(busca) || nick.includes(busca);
        }

        let matchTipo = true;
        if (filtroTipo) {
            try {
                const dados = JSON.parse(venda.dadosJSON || '[]');
                matchTipo = dados.some(item => item.tipo === filtroTipo);
            } catch {
                matchTipo = texto.includes(filtroTipo);
            }
        }

        return matchBusca && matchTipo;
    });

    renderizarMural();
}

// ── Renderizar ──────────────────────────────────
function renderizarMural() {
    const grid = document.getElementById('muralGrid');
    if (!grid) return;

    if (muralVendasFiltradas.length === 0) {
        grid.innerHTML = `<div class="loading"><i class="fas fa-store-slash"></i><p>Nenhuma venda encontrada</p></div>`;
        return;
    }

    // Verificar se o usuário logado é admin ou dono
    let userEmail = '', userRole = '';
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        userEmail = (user.email || '').toLowerCase();
        userRole = user.role || '';
    } catch {}

    grid.innerHTML = muralVendasFiltradas.map(venda => {
        const isDono = userEmail && userEmail === (venda.usuarioEmail || '').toLowerCase();
        const isAdmin = userRole === 'admin';
        const canDelete = isDono || isAdmin;

        // Tentar parsear dados do carrinho para mostrar ícones
        let tiposVenda = [];
        try {
            const dados = JSON.parse(venda.dadosJSON || '[]');
            tiposVenda = [...new Set(dados.map(d => d.tipo))];
        } catch {}

        const tipoIcons = {
            pokemon: '<i class="fas fa-paw" title="Pokémon"></i>',
            tm: '<i class="fas fa-compact-disc" title="TM"></i>',
            item: '<i class="fas fa-box-open" title="Item"></i>',
            conta: '<i class="fas fa-user-circle" title="Conta"></i>'
        };
        const badgesHTML = tiposVenda.map(t => tipoIcons[t] || '').join(' ');

        // Formatar data
        let dataStr = '';
        if (venda.timestamp) {
            try {
                const d = new Date(venda.timestamp);
                dataStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            } catch { dataStr = ''; }
        }

        // Formatar telefone
        const telefoneHTML = venda.telefone
            ? `<div class="mural-sale-phone"><i class="fas fa-phone"></i> ${venda.telefone}</div>`
            : '';

        // Texto da venda (preservar quebras de linha)
        const textoHTML = (venda.textoVenda || '').replace(/\n/g, '<br>');

        return `
            <div class="mural-sale-card">
                <div class="mural-sale-header">
                    <div class="mural-sale-user">
                        <i class="fas fa-user"></i>
                        <span class="mural-sale-nickname">${venda.usuarioNickname || 'Anônimo'}</span>
                        <span class="mural-sale-badges">${badgesHTML}</span>
                    </div>
                    <span class="mural-sale-date">${dataStr}</span>
                </div>
                <div class="mural-sale-body">
                    <pre class="mural-sale-text">${textoHTML}</pre>
                </div>
                ${telefoneHTML}
                <div class="mural-sale-actions">
                    <button class="btn-mural-copy" onclick="copiarTextoMural(${venda.id})" title="Copiar texto">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                    ${isDono ? `
                        <button class="btn-mural-edit" onclick="editarVendaMural(${venda.id})" title="Editar venda">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn-mural-delete" onclick="excluirVendaMural(${venda.id})" title="Excluir venda">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ── Copiar texto de uma venda ───────────────────
function copiarTextoMural(vendaId) {
    const venda = muralVendas.find(v => v.id === vendaId);
    if (!venda) return;

    const texto = venda.textoVenda || '';

    navigator.clipboard.writeText(texto).then(() => {
        // Feedback visual
        const btn = event?.target?.closest('button');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            setTimeout(() => { btn.innerHTML = original; }, 2000);
        }
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = texto;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        alert('Texto copiado!');
    });
}

// ── Excluir venda ───────────────────────────────
async function excluirVendaMural(vendaId) {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    let authToken = '';
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        authToken = user.token || '';
    } catch {}

    try {
        const body = new URLSearchParams();
        body.append('action', 'excluirVenda');
        body.append('vendaIndex', String(vendaId));
        body.append('authToken', authToken);

        const response = await fetch(MURAL_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        const resultado = await response.json();

        if (resultado.success) {
            alert('✅ Venda excluída!');
            carregarVendasMural();
        } else {
            alert('❌ ' + (resultado.message || 'Erro ao excluir'));
        }
    } catch (err) {
        console.error('❌ Erro ao excluir venda:', err);
        alert('Erro ao excluir venda.');
    }
}

// ── Editar venda (carregar no Market) ───────────
function editarVendaMural(vendaId) {
    const venda = muralVendas.find(v => v.id === vendaId);
    if (!venda) return;

    // Tentar carregar dados do carrinho salvo
    let dadosCarrinho = [];
    try {
        dadosCarrinho = JSON.parse(venda.dadosJSON || '[]');
    } catch {
        alert('Não foi possível carregar os dados desta venda para edição.');
        return;
    }

    if (dadosCarrinho.length === 0) {
        alert('Esta venda não possui dados editáveis (formato antigo).');
        return;
    }

    // Reconstruir itens do carrinho com campos necessários
    const carrinhoReconstruido = dadosCarrinho.map(item => {
        const cartItem = {
            tipo: item.tipo,
            nome: item.nome,
            dados: item.dados,
            precos: item.precos || {},
            timestamp: Date.now()
        };

        // Reconstruir imagem e texto
        switch (item.tipo) {
            case 'pokemon': {
                // Tentar buscar sprite real pelo nome do Pokémon
                const nomePk = item.dados?.nome || item.nome || '';
                let imgFound = '';
                // Buscar no array global de pokémons
                const allPk = (typeof todosPokemonsCompleto !== 'undefined' && todosPokemonsCompleto.length > 0)
                    ? todosPokemonsCompleto
                    : (typeof todosPokemons !== 'undefined' ? todosPokemons : []);
                const pkData = allPk.find(p => {
                    const ev = (p['EV'] || '').trim();
                    const pk = (p['POKEMON'] || '').trim();
                    return (ev || pk) === nomePk;
                });
                if (pkData && typeof obterImagemPokemonMarket === 'function') {
                    imgFound = obterImagemPokemonMarket(pkData);
                } else if (pkData && typeof obterImagemPokemon === 'function') {
                    const ev = pkData['EV'] || '';
                    const pk = pkData['POKEMON'] || '';
                    imgFound = obterImagemPokemon(ev || pk, ev ? pk : '');
                } else {
                    imgFound = `IMAGENS/imagens-pokemon/sprite-pokemon/${nomePk.trim()}.png`;
                }
                cartItem.imagem = imgFound;
                break;
            }
            case 'tm':
                cartItem.imagem = typeof obterImagemTM === 'function' ? obterImagemTM(item.dados?.tipagem || 'Normal') : `IMAGENS/imagens-itens/tipagens de tm/${(item.dados?.tipagem || 'Normal').trim()}_type_tm_disk.png`;
                break;
            case 'item':
                cartItem.imagem = typeof obterImagemItem === 'function' ? obterImagemItem(item.dados?.nome || item.nome, item.dados?.tipo || '') : '';
                break;
            case 'conta':
                cartItem.imagem = '';
                break;
        }

        cartItem.texto = typeof gerarTextoItemCarrinho === 'function' ? gerarTextoItemCarrinho(cartItem) : '';
        return cartItem;
    });

    // Salvar no sessionStorage e marcar que estamos editando uma venda existente
    sessionStorage.setItem('marketCarrinho', JSON.stringify(carrinhoReconstruido));
    sessionStorage.setItem('muralEditVendaId', String(vendaId));

    // Navegar para aba Market
    if (typeof loadPage === 'function') {
        loadPage('market');
    }

    // Feedback
    setTimeout(() => {
        alert('📝 Venda carregada no Market para edição. Faça as alterações e salve novamente.');
    }, 500);
}

// ── Registrar Página ────────────────────────────
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('mural', initMural);
    console.log('✅ Inicializador Mural registrado');
}
