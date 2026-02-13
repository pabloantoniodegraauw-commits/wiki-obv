// 👥 Módulo Clã - WIKI OBV

function initCla() {
    console.log('👥 Inicializando Clã...');
    console.log('✅ Clã carregado (conteúdo estático)');
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('cla', initCla);
    console.log('✅ Inicializador Clã registrado');
}
