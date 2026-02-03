// 📘 Módulo Pokédex - WIKI OBV

function initPokedex() {
    try {
        console.log('📘 Inicializando Pokédex...');
        
        // Se os dados já foram carregados, apenas renderizar
        if (typeof window.todosPokemons !== 'undefined' && window.todosPokemons.length > 0) {
            console.log('✅ Dados já carregados, renderizando...');
            window.renderizarPokemons(window.todosPokemons);
            window.configurarBuscaInstantanea();
        } else {
            // Carregar dados pela primeira vez
            console.log('🔄 Carregando dados da planilha...');
            window.carregarDados();
        }
    } catch (erro) {
        console.error('❌ Erro ao inicializar Pokédex:', erro);
    }
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('pokedex', initPokedex);
    console.log('✅ Inicializador Pokédex registrado');
}
