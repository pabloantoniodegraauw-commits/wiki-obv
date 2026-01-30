// ✅ Módulo Tasks - WIKI OBV

function initTasks() {
    console.log('✅ Inicializando Tasks...');
    
    if (todasTasks.length === 0) {
        carregarTasks();
    } else {
        renderizarTasks(todasTasks);
    }
}

// Registrar inicializador
if (typeof registerPageInitializer !== 'undefined') {
    registerPageInitializer('tasks', initTasks);
}
