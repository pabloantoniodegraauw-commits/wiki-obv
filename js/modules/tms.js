// 💿 Módulo TMs - WIKI OBV

function initTMs() {
    console.log('💿 Inicializando TMs...');
    
    if (todosTMs.length === 0) {
        carregarTMs();
    } else {
        renderizarTMs(todosTMs);
        configurarBuscaTMs();
        configurarFiltrosTMs();
    }
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('tms', initTMs);
}
