// 💿 Módulo TMs - WIKI OBV

function initTMs() {
    try {
        console.log('💿 Inicializando TMs...');
        
        if (typeof todosTMs === 'undefined' || todosTMs.length === 0) {
            console.log('🔄 Carregando TMs...');
            if (typeof carregarTMs === 'function') {
                carregarTMs();
            } else {
                console.error('❌ Função carregarTMs não encontrada');
            }
        } else {
            console.log('✅ TMs já carregados, renderizando...');
            renderizarTMs(todosTMs);
            configurarBuscaTMs();
        }
    } catch (erro) {
        console.error('❌ Erro ao inicializar TMs:', erro);
    }
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('tms', initTMs);
    console.log('✅ Inicializador TMs registrado');
}
