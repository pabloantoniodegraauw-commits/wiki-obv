// 👥 Módulo Clã - WIKI OBV

function initCla() {
    console.log('👥 Inicializando Clã...');
    // Clã é estático, já vem no HTML
    // Nenhuma ação necessária
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('cla', initCla);
}
