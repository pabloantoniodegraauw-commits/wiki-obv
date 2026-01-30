// 👥 Módulo Clã - WIKI OBV

function initCla() {
    try {
        console.log('👥 Inicializando Clã...');
        // Clã é estático, já vem no HTML
        // Nenhuma ação necessária
        console.log('✅ Clã carregado (conteúdo estático)');
    } catch (erro) {
        console.error('❌ Erro ao inicializar Clã:', erro);
    }
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('cla', initCla);
    console.log('✅ Inicializador Clã registrado');
}
