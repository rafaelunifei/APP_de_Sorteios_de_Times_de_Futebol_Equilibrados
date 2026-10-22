// ============================================================================
// app.js — Lógica principal do Sorteador de Times
// ============================================================================

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Constantes
  // --------------------------------------------------------------------------
  const STORAGE_KEY_PLAYERS = 'sorteador_players';
  const STORAGE_KEY_CONFIG = 'sorteador_config';

  const TEAM_COLORS = [
    { name: 'Azul',    emoji: '🔵', hex: '#3b82f6' },
    { name: 'Vermelho', emoji: '🔴', hex: '#ef4444' },
    { name: 'Verde',   emoji: '🟢', hex: '#22c55e' },
    { name: 'Amarelo', emoji: '🟡', hex: '#f59e0b' },
    { name: 'Roxo',    emoji: '🟣', hex: '#a855f7' },
    { name: 'Rosa',    emoji: '🟠', hex: '#ec4899' },
    { name: 'Ciano',   emoji: '🔵', hex: '#14b8a6' },
    { name: 'Laranja', emoji: '🟠', hex: '#f97316' },
  ];

  const ROLE_ICONS = {
    goalkeeper: '🧤',
    defense: '🛡️',
    attack: '⚽',
  };

  const PREF_LABELS = {
    attack: '⚽ Ataque',
    defense: '🛡️ Defesa',
    goalkeeper: '🧤 Goleiro',
    any: '🔄 Indiferente',
  };

  // --------------------------------------------------------------------------
  // Estado da aplicação
  // --------------------------------------------------------------------------
  let players = [];
  let config = { numTeams: 2, playersPerTeam: 5 };
  let lastResult = null;
  let editingPlayerId = null;

  // --------------------------------------------------------------------------
  // Utilitários de armazenamento
  // --------------------------------------------------------------------------
  function savePlayers() {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    } catch (e) {
      console.warn('Erro ao salvar jogadores:', e);
    }
  }

  function loadPlayers() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PLAYERS);
      if (data) {
        players = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Erro ao carregar jogadores:', e);
      players = [];
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('Erro ao salvar configuração:', e);
    }
  }

  function loadConfig() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (data) {
        config = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Erro ao carregar configuração:', e);
    }
  }

  // --------------------------------------------------------------------------
  // Gerador de ID
  // --------------------------------------------------------------------------
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // --------------------------------------------------------------------------
  // Navegação entre telas
  // --------------------------------------------------------------------------
  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((s) => {
      s.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Atualizar dados ao entrar em certas telas
    if (screenId === 'players-screen') {
      renderPlayersList();
    } else if (screenId === 'config-screen') {
      updateConfigScreen();
    } else if (screenId === 'home-screen') {
      updateHomeBadge();
    }
  }

  // --------------------------------------------------------------------------
  // Tela Inicial
  // --------------------------------------------------------------------------
  function updateHomeBadge() {
    const badge = document.getElementById('player-count-badge');
    if (badge) {
      badge.textContent = players.length;
      badge.style.display = players.length > 0 ? 'flex' : 'none';
    }
  }

  // --------------------------------------------------------------------------
  // Tela de Jogadores — Formulário
  // --------------------------------------------------------------------------
  const formState = { attack: 3, defense: 3, goalkeeper: 3, preference: 'any' };

  function resetForm() {
    document.getElementById('player-name').value = '';
    formState.attack = 3;
    formState.defense = 3;
    formState.goalkeeper = 3;
    formState.preference = 'any';
    editingPlayerId = null;
    document.getElementById('editing-player-id').value = '';
    document.getElementById('form-title').textContent = 'Adicionar Jogador';
    document.getElementById('btn-save-player').textContent = 'ADICIONAR';
    document.getElementById('btn-cancel-edit').style.display = 'none';
    updateStarDisplays();
    updatePrefDisplay();
  }

  function updateStarDisplays() {
    ['attack', 'defense', 'goalkeeper'].forEach((skill) => {
      const container = document.querySelector(`.star-rating[data-skill="${skill}"]`);
      if (!container) return;
      const stars = container.querySelectorAll('.star');
      stars.forEach((star) => {
        const val = parseInt(star.getAttribute('data-value'));
        star.classList.toggle('active', val <= formState[skill]);
      });
    });
  }

  function updatePrefDisplay() {
    document.querySelectorAll('.pref-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-pref') === formState.preference);
    });
  }

  function initFormListeners() {
    // Estrelas
    document.querySelectorAll('.star-rating').forEach((container) => {
      const skill = container.getAttribute('data-skill');
      container.addEventListener('click', (e) => {
        const star = e.target.closest('.star');
        if (!star) return;
        formState[skill] = parseInt(star.getAttribute('data-value'));
        updateStarDisplays();
      });
    });

    // Preferência
    document.querySelectorAll('.pref-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        formState.preference = btn.getAttribute('data-pref');
        updatePrefDisplay();
      });
    });

    // Botão "3⭐ em tudo"
    document.getElementById('btn-fill-median').addEventListener('click', () => {
      formState.attack = 3;
      formState.defense = 3;
      formState.goalkeeper = 3;
      formState.preference = 'any';
      updateStarDisplays();
      updatePrefDisplay();
    });

    // Salvar jogador
    document.getElementById('btn-save-player').addEventListener('click', savePlayer);

    // Cancelar edição
    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
      resetForm();
    });

    // Limpar todos
    document.getElementById('btn-clear-all').addEventListener('click', () => {
      if (players.length === 0) return;
      showConfirm('Deseja apagar TODOS os jogadores? Esta ação não pode ser desfeita.', () => {
        players = [];
        savePlayers();
        renderPlayersList();
        updateHomeBadge();
      });
    });

    // Enter para salvar
    document.getElementById('player-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        savePlayer();
      }
    });
  }

  function savePlayer() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      nameInput.style.borderColor = '#ef4444';
      setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
      return;
    }

    if (editingPlayerId) {
      // Editar existente
      const idx = players.findIndex((p) => p.id === editingPlayerId);
      if (idx >= 0) {
        players[idx] = {
          ...players[idx],
          name,
          attack: formState.attack,
          defense: formState.defense,
          goalkeeper: formState.goalkeeper,
          preference: formState.preference,
        };
      }
    } else {
      // Adicionar novo
      players.push({
        id: generateId(),
        name,
        attack: formState.attack,
        defense: formState.defense,
        goalkeeper: formState.goalkeeper,
        preference: formState.preference,
      });
    }

    savePlayers();
    resetForm();
    renderPlayersList();
    updateHomeBadge();

    // Focar no campo nome para facilitar o cadastro rápido
    nameInput.focus();
  }

  // --------------------------------------------------------------------------
  // Tela de Jogadores — Lista
  // --------------------------------------------------------------------------
  function renderPlayersList() {
    const listContainer = document.getElementById('players-list');
    const emptyMsg = document.getElementById('empty-players-msg');

    if (players.length === 0) {
      listContainer.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    listContainer.innerHTML = players
      .map((p) => {
        const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
        return `
        <div class="player-item" data-id="${p.id}">
          <div class="player-info">
            <div class="player-name">${escapeHtml(p.name)}</div>
            <div class="player-skills">
              <span>⚽${p.attack}</span>
              <span>🛡️${p.defense}</span>
              <span>🧤${p.goalkeeper}</span>
            </div>
            <div class="player-pref">${PREF_LABELS[p.preference] || '🔄 Indiferente'}</div>
          </div>
          <div class="player-actions">
            <button class="btn-edit" data-id="${p.id}" title="Editar">✏️</button>
            <button class="btn-delete" data-id="${p.id}" title="Excluir">❌</button>
          </div>
        </div>`;
      })
      .join('');

    // Event listeners para editar e excluir
    listContainer.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => editPlayer(btn.getAttribute('data-id')));
    });
    listContainer.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => deletePlayer(btn.getAttribute('data-id')));
    });
  }

  function editPlayer(id) {
    const player = players.find((p) => p.id === id);
    if (!player) return;

    editingPlayerId = id;
    document.getElementById('player-name').value = player.name;
    document.getElementById('editing-player-id').value = id;
    formState.attack = player.attack;
    formState.defense = player.defense;
    formState.goalkeeper = player.goalkeeper;
    formState.preference = player.preference;

    document.getElementById('form-title').textContent = 'Editar Jogador';
    document.getElementById('btn-save-player').textContent = 'SALVAR';
    document.getElementById('btn-cancel-edit').style.display = 'block';

    updateStarDisplays();
    updatePrefDisplay();

    // Scroll para o formulário
    document.getElementById('player-form').scrollIntoView({ behavior: 'smooth' });
  }

  function deletePlayer(id) {
    const player = players.find((p) => p.id === id);
    if (!player) return;

    showConfirm(`Remover "${player.name}" da lista?`, () => {
      players = players.filter((p) => p.id !== id);
      savePlayers();
      renderPlayersList();
      updateHomeBadge();
    });
  }

  // --------------------------------------------------------------------------
  // Tela de Configuração
  // --------------------------------------------------------------------------
  function updateConfigScreen() {
    const numTeamsEl = document.getElementById('num-teams');
    const pptEl = document.getElementById('players-per-team');
    numTeamsEl.textContent = config.numTeams;
    pptEl.textContent = config.playersPerTeam;
    updateConfigSummary();
  }

  function updateConfigSummary() {
    const needed = config.numTeams * config.playersPerTeam;
    const available = players.length;
    const summaryEl = document.getElementById('config-summary');
    const errorEl = document.getElementById('config-error');
    const sortBtn = document.getElementById('btn-sort');
    const selectionArea = document.getElementById('player-selection-area');

    summaryEl.innerHTML = `
      <div class="summary-item">
        <span>Jogadores necessários</span>
        <span class="value">${needed}</span>
      </div>
      <div class="summary-item">
        <span>Jogadores cadastrados</span>
        <span class="value">${available}</span>
      </div>
    `;

    if (available < needed) {
      const faltam = needed - available;
      errorEl.innerHTML = `⚠️ Faltam <strong>${faltam}</strong> jogador${faltam > 1 ? 'es' : ''} para sortear.`;
      errorEl.style.display = 'block';
      sortBtn.disabled = true;
      sortBtn.style.opacity = '0.5';
      selectionArea.style.display = 'none';
    } else {
      errorEl.style.display = 'none';
      sortBtn.disabled = false;
      sortBtn.style.opacity = '1';

      if (available > needed) {
        // Mostrar seleção de jogadores
        selectionArea.style.display = 'block';
        renderPlayerCheckboxes();
      } else {
        selectionArea.style.display = 'none';
      }
    }
  }

  function renderPlayerCheckboxes() {
    const container = document.getElementById('player-checkboxes');
    const needed = config.numTeams * config.playersPerTeam;

    container.innerHTML = players
      .map(
        (p) => `
      <div class="player-checkbox-item">
        <input type="checkbox" id="chk-${p.id}" data-id="${p.id}" checked>
        <label for="chk-${p.id}">${escapeHtml(p.name)} 
          <span style="color:#64748b;font-size:0.8rem">(⚽${p.attack} 🛡️${p.defense} 🧤${p.goalkeeper})</span>
        </label>
      </div>`
      )
      .join('');

    updateSelectedCount();

    container.querySelectorAll('input[type="checkbox"]').forEach((chk) => {
      chk.addEventListener('change', updateSelectedCount);
    });
  }

  function updateSelectedCount() {
    const needed = config.numTeams * config.playersPerTeam;
    const checked = document.querySelectorAll('#player-checkboxes input:checked').length;
    const countEl = document.getElementById('selected-count');
    const sortBtn = document.getElementById('btn-sort');

    countEl.textContent = `Selecionados: ${checked} / Necessários: ${needed}`;

    if (checked < needed) {
      countEl.style.color = '#ef4444';
      sortBtn.disabled = true;
      sortBtn.style.opacity = '0.5';
    } else if (checked > needed) {
      countEl.style.color = '#f59e0b';
      countEl.textContent += ` (${checked - needed} a mais — serão selecionados aleatoriamente)`;
      sortBtn.disabled = false;
      sortBtn.style.opacity = '1';
    } else {
      countEl.style.color = '#22c55e';
      sortBtn.disabled = false;
      sortBtn.style.opacity = '1';
    }
  }

  function getSelectedPlayers() {
    const needed = config.numTeams * config.playersPerTeam;

    if (players.length === needed) {
      return [...players];
    }

    const selectionArea = document.getElementById('player-selection-area');
    if (selectionArea.style.display !== 'none') {
      const checkedIds = [];
      document.querySelectorAll('#player-checkboxes input:checked').forEach((chk) => {
        checkedIds.push(chk.getAttribute('data-id'));
      });

      let selected = players.filter((p) => checkedIds.includes(p.id));

      if (selected.length > needed) {
        // Embaralhar e pegar apenas os necessários
        selected = shuffleArray(selected).slice(0, needed);
      }

      return selected;
    }

    return [...players].slice(0, needed);
  }

  function initConfigListeners() {
    // Steppers
    document.querySelectorAll('.stepper-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        const action = btn.getAttribute('data-action');
        const key = target === 'num-teams' ? 'numTeams' : 'playersPerTeam';

        if (action === 'inc') {
          config[key] = Math.min(config[key] + 1, key === 'numTeams' ? 8 : 15);
        } else {
          config[key] = Math.max(config[key] - 1, 2);
        }

        document.getElementById(target).textContent = config[key];
        saveConfig();
        updateConfigSummary();
      });
    });

    // Sortear
    document.getElementById('btn-sort').addEventListener('click', () => {
      performSort();
    });
  }

  // --------------------------------------------------------------------------
  // Sorteio
  // --------------------------------------------------------------------------
  function performSort() {
    const selected = getSelectedPlayers();
    const needed = config.numTeams * config.playersPerTeam;

    if (selected.length < needed) {
      alert(`Selecione pelo menos ${needed} jogadores.`);
      return;
    }

    // Mostrar animação
    const overlay = document.getElementById('sorting-overlay');
    overlay.style.display = 'flex';

    // Executar algoritmo com um pequeno atraso para a animação aparecer
    setTimeout(() => {
      try {
        const result = window.TeamAlgorithm.generateBalancedTeams(
          selected,
          { numTeams: config.numTeams, playersPerTeam: config.playersPerTeam },
          lastResult ? lastResult.teams : null
        );

        lastResult = result;
        renderResults(result);
        overlay.style.display = 'none';
        showScreen('results-screen');
      } catch (err) {
        console.error('Erro no sorteio:', err);
        overlay.style.display = 'none';
        alert('Ocorreu um erro ao sortear os times. Tente novamente.');
      }
    }, 600);
  }

  // --------------------------------------------------------------------------
  // Tela de Resultados
  // --------------------------------------------------------------------------
  function renderResults(result) {
    const container = document.getElementById('teams-container');
    const balanceEl = document.getElementById('balance-indicator');

    // Indicador de equilíbrio
    const bp = result.balancePercent;
    let balanceColor = '#22c55e';
    if (bp < 70) balanceColor = '#ef4444';
    else if (bp < 85) balanceColor = '#f59e0b';

    balanceEl.innerHTML = `
      <div class="balance-label">Equilíbrio</div>
      <div class="balance-value" style="color:${balanceColor}">${bp}%</div>
    `;

    // Times
    container.innerHTML = result.teams
      .map((team, idx) => {
        const color = TEAM_COLORS[idx % TEAM_COLORS.length];
        const score = result.teamScores[idx];

        const playersHtml = team
          .map((entry) => {
            const p = entry.player;
            const icon = ROLE_ICONS[entry.role] || '⚽';
            const mainSkill =
              entry.role === 'goalkeeper'
                ? p.goalkeeper
                : entry.role === 'defense'
                ? p.defense
                : p.attack;
            const starsStr = '★'.repeat(mainSkill) + '☆'.repeat(5 - mainSkill);

            return `
            <div class="team-player">
              <span class="role-icon">${icon}</span>
              <span class="tp-name">${escapeHtml(p.name)}</span>
              <span class="tp-stars">${starsStr}</span>
            </div>`;
          })
          .join('');

        return `
        <div class="team-card" style="border-color:${color.hex};">
          <div class="team-header">
            <div class="team-color" style="background:${color.hex}"></div>
            <span class="team-name">${color.emoji} TIME ${idx + 1}</span>
          </div>
          ${playersHtml}
          <div class="team-stats">
            <div class="team-stat">
              <div class="stat-label">⚽ Ataque</div>
              <div class="stat-value">${score.attackStrength.toFixed(1)}</div>
            </div>
            <div class="team-stat">
              <div class="stat-label">🛡️ Defesa</div>
              <div class="stat-value">${score.defenseStrength.toFixed(1)}</div>
            </div>
            <div class="team-stat">
              <div class="stat-label">🧤 Goleiro</div>
              <div class="stat-value">${score.goalkeeperStrength.toFixed(1)}</div>
            </div>
            <div class="team-stat total">
              <div class="stat-label">💪 Força Total</div>
              <div class="stat-value">${score.totalStrength.toFixed(1)}</div>
            </div>
          </div>
        </div>`;
      })
      .join('');
  }

  function initResultsListeners() {
    document.getElementById('btn-sort-again').addEventListener('click', () => {
      performSort();
    });

    document.getElementById('btn-share').addEventListener('click', () => {
      shareResults();
    });
  }

  // --------------------------------------------------------------------------
  // Compartilhamento
  // --------------------------------------------------------------------------
  function shareResults() {
    if (!lastResult) return;

    let text = '⚽ TIMES DA PELADA\n\n';

    lastResult.teams.forEach((team, idx) => {
      const color = TEAM_COLORS[idx % TEAM_COLORS.length];
      text += `${color.emoji} TIME ${idx + 1}\n`;
      team.forEach((entry) => {
        const icon = ROLE_ICONS[entry.role] || '⚽';
        text += `${icon} ${entry.player.name}\n`;
      });
      text += '\n';
    });

    text += `⚖️ Equilíbrio: ${lastResult.balancePercent}%`;

    if (navigator.share) {
      navigator
        .share({ title: 'Sorteador de Times', text })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            fallbackCopy(text);
          }
        });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado para a área de transferência!');
      }).catch(() => {
        showToast('Não foi possível copiar.');
      });
    } else {
      // Fallback: criar textarea temporário
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        showToast('Copiado para a área de transferência!');
      } catch (e) {
        showToast('Não foi possível copiar.');
      }
      document.body.removeChild(ta);
    }
  }

  // --------------------------------------------------------------------------
  // Toast simples
  // --------------------------------------------------------------------------
  function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #334155;
        color: #f1f5f9;
        padding: 12px 24px;
        border-radius: 10px;
        font-size: 0.9rem;
        z-index: 300;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
        text-align: center;
        max-width: 300px;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.opacity = '0';
    }, 2500);
  }

  // --------------------------------------------------------------------------
  // Modal de confirmação
  // --------------------------------------------------------------------------
  let confirmCallback = null;

  function showConfirm(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-message').textContent = message;
    modal.style.display = 'flex';
    confirmCallback = onConfirm;
  }

  function initModalListeners() {
    document.getElementById('confirm-ok').addEventListener('click', () => {
      document.getElementById('confirm-modal').style.display = 'none';
      if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
      }
    });

    document.getElementById('confirm-cancel').addEventListener('click', () => {
      document.getElementById('confirm-modal').style.display = 'none';
      confirmCallback = null;
    });
  }

  // --------------------------------------------------------------------------
  // Navegação global
  // --------------------------------------------------------------------------
  function initNavigation() {
    // Botões com data-screen
    document.querySelectorAll('[data-screen]').forEach((btn) => {
      btn.addEventListener('click', () => {
        showScreen(btn.getAttribute('data-screen'));
      });
    });

    // Botão Sobre
    document.getElementById('btn-about').addEventListener('click', () => {
      showScreen('about-screen');
    });

    // Botão voltar do navegador
    window.addEventListener('popstate', () => {
      showScreen('home-screen');
    });
  }

  // --------------------------------------------------------------------------
  // Utilitários
  // --------------------------------------------------------------------------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // --------------------------------------------------------------------------
  // Inicialização
  // --------------------------------------------------------------------------
  function init() {
    loadPlayers();
    loadConfig();

    initNavigation();
    initFormListeners();
    initConfigListeners();
    initResultsListeners();
    initModalListeners();

    resetForm();
    updateHomeBadge();
  }

  // Aguardar o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
