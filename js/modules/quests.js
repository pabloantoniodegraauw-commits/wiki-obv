/**
 * js/modules/quests.js
 * Controlador da página Quests (sub-tabs: Quests + Tasks)
 */

(function() {
    'use strict';

    function initQuests() {
        // Sub-tab buttons
        const btnQuestsList = document.getElementById('btnQuestsList');
        const btnTasksList  = document.getElementById('btnTasksList');
        const questsPage    = document.getElementById('questsListPage');
        const tasksPage     = document.getElementById('tasksListPage');

        if (!btnQuestsList || !btnTasksList) return;

        function showQuestsPage() {
            questsPage.style.display = 'block';
            tasksPage.style.display  = 'none';
            btnQuestsList.classList.add('active');
            btnTasksList.classList.remove('active');
            // Carregar quests se ainda não foram carregadas
            if (window.todasQuests === undefined || window.todasQuests === null) {
                if (typeof window.carregarQuests === 'function') {
                    window.carregarQuests();
                }
            }
        }

        function showTasksPage() {
            questsPage.style.display = 'none';
            tasksPage.style.display  = 'block';
            btnQuestsList.classList.remove('active');
            btnTasksList.classList.add('active');
            // Carregar tasks se o container estiver vazio ou com loading
            const cont = document.getElementById('tasksContainer');
            if (cont && cont.querySelector('.loading')) {
                if (typeof window.carregarTasks === 'function') {
                    window.carregarTasks();
                }
            }
        }

        btnQuestsList.addEventListener('click', showQuestsPage);
        btnTasksList.addEventListener('click', showTasksPage);

        // Mostrar botão ADM quando for admin
        function atualizarBotoesAdmin() {
            const wrapQuest = document.getElementById('btnAdicionarQuestWrap');
            const wrapTask  = document.getElementById('btnAdicionarTaskWrap');
            const isAdm = (typeof window.isAdmin === 'function') ? window.isAdmin() : false;
            if (wrapQuest) wrapQuest.style.display = isAdm ? 'block' : 'none';
            if (wrapTask)  wrapTask.style.display  = isAdm ? 'block' : 'none';
        }

        // Carregar quests na inicialização
        atualizarBotoesAdmin();
        if (typeof window.carregarQuests === 'function') {
            window.carregarQuests();
        }
    }

    // Registrar inicializador de página
    if (typeof window.registerPageInitializer === 'function') {
        window.registerPageInitializer('quests', initQuests);
    } else {
        // Fallback: aguardar navigation.js estar pronto
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof window.registerPageInitializer === 'function') {
                window.registerPageInitializer('quests', initQuests);
            }
        });
    }
})();
