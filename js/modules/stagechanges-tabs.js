// Controle de abas para stagechanges
window.setupStageTabs = function() {
    var btnStage = document.getElementById('btnStage');
    var btnEffects = document.getElementById('btnEffects');
    var btnAtacks = document.getElementById('btnAtacks');
    var stagePage = document.getElementById('stagePage');
    var effectsPage = document.getElementById('effectsPage');
    var atacksPage = document.getElementById('atacksPage');
    console.log('[Tabs] Inicializando tabs:', {btnStage, btnEffects, btnAtacks, stagePage, effectsPage, atacksPage});
    if (btnStage && btnEffects && btnAtacks && stagePage && effectsPage && atacksPage) {
        console.log('[Tabs] Valor de window.carregarStageOuEfeitos:', window.carregarStageOuEfeitos);
        btnStage.onclick = function(e) {
            e.preventDefault();
            console.log('[Tabs] Clicou em Stage');
            btnStage.classList.add('active');
            btnEffects.classList.remove('active');
            btnAtacks.classList.remove('active');
            stagePage.style.display = 'block';
            effectsPage.style.display = 'none';
            atacksPage.style.display = 'none';
            if (typeof window.carregarStageOuEfeitos === 'function') {
                console.log('[Tabs] Chamando window.carregarStageOuEfeitos("stage")');
                window.carregarStageOuEfeitos('stage');
            }
        };
        btnEffects.onclick = function(e) {
            e.preventDefault();
            console.log('[Tabs] Clicou em Efeitos');
            btnEffects.classList.add('active');
            btnStage.classList.remove('active');
            btnAtacks.classList.remove('active');
            stagePage.style.display = 'none';
            effectsPage.style.display = 'block';
            atacksPage.style.display = 'none';
            if (typeof window.carregarStageOuEfeitos === 'function') {
                console.log('[Tabs] Chamando window.carregarStageOuEfeitos("efeitos")');
                window.carregarStageOuEfeitos('efeitos');
            }
        };
        btnAtacks.onclick = function(e) {
            e.preventDefault();
            console.log('[Tabs] Clicou em Atacks');
            btnAtacks.classList.add('active');
            btnStage.classList.remove('active');
            btnEffects.classList.remove('active');
            stagePage.style.display = 'none';
            effectsPage.style.display = 'none';
            atacksPage.style.display = 'block';
            if (typeof carregarAtacksParaTabela === 'function') carregarAtacksParaTabela();
        };
        // Carregar Stage por padrão ao abrir a página
        if (typeof carregarStageOuEfeitos === 'function') carregarStageOuEfeitos('stage');
    } else {
        console.error('[Tabs] Elementos de tabs não encontrados:', {btnStage, btnEffects, btnAtacks, stagePage, effectsPage, atacksPage});
    }
};