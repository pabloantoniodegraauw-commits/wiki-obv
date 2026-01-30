// 📘 Módulo Pokédex - WIKI OBV

function initPokedex() {
    console.log('📘 Inicializando Pokédex...');
    
    // Se os dados já foram carregados, apenas renderizar
    if (todosPokemons.length > 0) {
        renderizarPokemons(todosPokemons);
        configurarBuscaInstantanea();
    } else {
        // Carregar dados pela primeira vez
        carregarDados();
    }
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('pokedex', initPokedex);
}
