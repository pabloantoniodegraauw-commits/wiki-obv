// ✅ Módulo Tasks - WIKI OBV

function initTasks() {
    try {
        console.log('✅ Inicializando Tasks...');
        
        if (typeof todasTasks === 'undefined' || todasTasks.length === 0) {
            console.log('🔄 Carregando Tasks...');
            if (typeof carregarTasks === 'function') {
                carregarTasks();
            } else {
                console.error('❌ Função carregarTasks não encontrada');
            }
        } else {
            console.log('✅ Tasks já carregados, renderizando...');
            renderizarTasks(todasTasks);
        }
    } catch (erro) {
        console.error('❌ Erro ao inicializar Tasks:', erro);
    }
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('tasks', initTasks);
    console.log('✅ Inicializador Tasks registrado');
}
