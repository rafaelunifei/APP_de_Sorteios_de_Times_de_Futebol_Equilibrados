/**
 * ============================================================
 * algorithm.js — Algoritmo de Balanceamento de Times
 * ============================================================
 * 
 * Módulo responsável por gerar times equilibrados para partidas
 * de futebol, levando em conta habilidades individuais,
 * preferências de posição e distribuição justa de goleiros.
 * 
 * Exporta via window.TeamAlgorithm:
 *   - generateBalancedTeams(players, config, previousTeams)
 *   - classifyPlayer(player)
 *   - assignTeamRoles(teamPlayers)
 *   - selectPlayers(allPlayers, count)
 *   - getAlgorithmExplanation()
 * ============================================================
 */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // Flag de depuração — altere para true para ver logs
  // ──────────────────────────────────────────────
  const DEBUG = false;

  function log(...args) {
    if (DEBUG) console.log('[TeamAlgorithm]', ...args);
  }

  // ──────────────────────────────────────────────
  // Constantes de peso por posição
  // ──────────────────────────────────────────────
  const WEIGHT_ATTACK = 1;
  const WEIGHT_DEFENSE = 2;
  const WEIGHT_GOALKEEPER = 3;

  // Contribuição secundária (jogadores fora de posição)
  const SECONDARY_CONTRIBUTION = 0.2;

  // Limites de iteração para otimização local
  const MAX_SWAP_ITERATIONS = 1000;

  // Quantidade máxima de soluções armazenadas
  const MAX_STORED_SOLUTIONS = 100;

  // ──────────────────────────────────────────────
  // Utilitários matemáticos
  // ──────────────────────────────────────────────

  function arrMin(arr) {
    let m = Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < m) m = arr[i];
    }
    return m;
  }

  function arrMax(arr) {
    let m = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > m) m = arr[i];
    }
    return m;
  }

  function arrSum(arr) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s;
  }

  function arrMean(arr) {
    return arr.length === 0 ? 0 : arrSum(arr) / arr.length;
  }

  function arrStdDev(arr) {
    if (arr.length <= 1) return 0;
    const mean = arrMean(arr);
    let sumSq = 0;
    for (let i = 0; i < arr.length; i++) {
      const diff = arr[i] - mean;
      sumSq += diff * diff;
    }
    return Math.sqrt(sumSq / arr.length);
  }

  /**
   * Embaralha um array in-place usando Fisher-Yates.
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Cria uma cópia profunda simples (para objetos sem funções/datas).
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ──────────────────────────────────────────────
  // Classificação de jogadores
  // ──────────────────────────────────────────────

  /**
   * Classifica um jogador com base nas suas habilidades.
   * 
   * @param {Object} player - Objeto do jogador com attack, defense, goalkeeper, preference.
   * @returns {Object} Classificação detalhada do jogador.
   */
  function classifyPlayer(player) {
    const atk = player.attack || 1;
    const def = player.defense || 1;
    const gk = player.goalkeeper || 1;

    // Verifica se é goleiro de elite, bom ou potencial
    const isEliteGoalkeeper = gk === 5;
    const isGoodGoalkeeper = gk >= 4;
    const isPotentialGoalkeeper = gk >= 3;

    // Determina qual é a habilidade mais forte
    const skills = { attack: atk, defense: def, goalkeeper: gk };
    let primaryStrength = 'attack';
    let maxSkill = atk;

    if (def > maxSkill) {
      primaryStrength = 'defense';
      maxSkill = def;
    }
    if (gk > maxSkill) {
      primaryStrength = 'goalkeeper';
      maxSkill = gk;
    }

    // Se houver empate entre habilidades, prioriza conforme preferência
    if (atk === maxSkill && player.preference === 'attack') primaryStrength = 'attack';
    if (def === maxSkill && player.preference === 'defense') primaryStrength = 'defense';
    if (gk === maxSkill && player.preference === 'goalkeeper') primaryStrength = 'goalkeeper';

    // Verifica se o jogador é versátil (pouca variação entre habilidades)
    const minSkill = Math.min(atk, def, gk);
    const isVersatile = (maxSkill - minSkill) <= 1;

    // Pontuação ponderada (goleiro tem mais peso, defesa segundo)
    const weightedScore = atk * WEIGHT_ATTACK + def * WEIGHT_DEFENSE + gk * WEIGHT_GOALKEEPER;

    return {
      player,
      isEliteGoalkeeper,
      isGoodGoalkeeper,
      isPotentialGoalkeeper,
      primaryStrength,
      isVersatile,
      weightedScore,
      maxSkill,
      minSkill,
      attack: atk,
      defense: def,
      goalkeeper: gk
    };
  }

  // ──────────────────────────────────────────────
  // Atribuição de papéis dentro de um time
  // ──────────────────────────────────────────────

  /**
   * Dado um array de jogadores para um time, determina o melhor
   * papel (ataque, defesa, goleiro) para cada um.
   * 
   * Regras:
   *  - No máximo 1 goleiro por time
   *  - Restante dividido entre ataque e defesa
   *  - Tenta respeitar preferências e habilidades
   * 
   * @param {Array} teamPlayers - Array de objetos de jogadores.
   * @returns {Array} Array de { player, role }.
   */
  function assignTeamRoles(teamPlayers) {
    if (!teamPlayers || teamPlayers.length === 0) return [];

    const n = teamPlayers.length;

    // Classificar todos os jogadores do time
    const classified = teamPlayers.map(p => ({
      ...classifyPlayer(p),
      originalPlayer: p
    }));

    // ── Etapa 1: Escolher o goleiro ──
    let goalkeeperIdx = -1;

    // Candidatos a goleiro: preferência explícita OU habilidade >= 4
    const gkCandidates = classified
      .map((c, idx) => ({ ...c, idx }))
      .filter(c => c.originalPlayer.preference === 'goalkeeper' || c.isGoodGoalkeeper);

    if (gkCandidates.length > 0) {
      // Ordena: quem prefere goleiro primeiro, depois por habilidade de goleiro decrescente
      gkCandidates.sort((a, b) => {
        const aPref = a.originalPlayer.preference === 'goalkeeper' ? 1 : 0;
        const bPref = b.originalPlayer.preference === 'goalkeeper' ? 1 : 0;
        if (bPref !== aPref) return bPref - aPref;
        return b.goalkeeper - a.goalkeeper;
      });
      goalkeeperIdx = gkCandidates[0].idx;
    } else {
      // Se ninguém é bom goleiro, verifica se alguém é potencial (>= 3)
      const potentialGKs = classified
        .map((c, idx) => ({ ...c, idx }))
        .filter(c => c.isPotentialGoalkeeper);

      if (potentialGKs.length > 0) {
        potentialGKs.sort((a, b) => b.goalkeeper - a.goalkeeper);
        goalkeeperIdx = potentialGKs[0].idx;
      }
      // Se ninguém tem >= 3, o time fica sem goleiro dedicado
      // Escolhemos quem tem a maior habilidade de goleiro
      if (goalkeeperIdx === -1 && n >= 3) {
        let bestGKSkill = 0;
        let bestIdx = -1;
        for (let i = 0; i < classified.length; i++) {
          if (classified[i].goalkeeper > bestGKSkill) {
            bestGKSkill = classified[i].goalkeeper;
            bestIdx = i;
          }
        }
        goalkeeperIdx = bestIdx;
      }
    }

    // ── Etapa 2: Distribuir restante entre ataque e defesa ──
    const fieldPlayerIndices = [];
    for (let i = 0; i < n; i++) {
      if (i !== goalkeeperIdx) fieldPlayerIndices.push(i);
    }

    const numField = fieldPlayerIndices.length;
    // Tenta dividir igualmente; se ímpar, um a mais para defesa (mais impactante)
    const targetAttackers = Math.floor(numField / 2);
    const targetDefenders = numField - targetAttackers;

    // Pontua cada jogador de campo para cada papel
    const fieldScored = fieldPlayerIndices.map(idx => {
      const c = classified[idx];
      const pref = c.originalPlayer.preference;

      // Pontuação para ataque: habilidade + bônus de preferência
      let atkScore = c.attack;
      if (pref === 'attack') atkScore += 2;
      else if (pref === 'any') atkScore += 0.5;

      // Pontuação para defesa: habilidade + bônus de preferência
      let defScore = c.defense;
      if (pref === 'defense') defScore += 2;
      else if (pref === 'any') defScore += 0.5;

      return { idx, atkScore, defScore, pref };
    });

    // Estratégia gulosa: atribui quem tem maior diferença (atk - def) como atacante
    // Quem tem maior diferença (def - atk) como defensor
    fieldScored.sort((a, b) => {
      const diffA = a.atkScore - a.defScore;
      const diffB = b.atkScore - b.defScore;
      return diffB - diffA; // Mais positivo = mais adequado ao ataque
    });

    const roles = new Array(n).fill(null);

    if (goalkeeperIdx !== -1) {
      roles[goalkeeperIdx] = 'goalkeeper';
    }

    // Os primeiros targetAttackers ficam no ataque, o resto na defesa
    for (let i = 0; i < fieldScored.length; i++) {
      const entry = fieldScored[i];
      roles[entry.idx] = i < targetAttackers ? 'attack' : 'defense';
    }

    // Monta o resultado
    return teamPlayers.map((p, i) => ({
      player: p,
      role: roles[i] || 'defense' // fallback
    }));
  }

  // ──────────────────────────────────────────────
  // Cálculo de força de um time
  // ──────────────────────────────────────────────

  /**
   * Calcula as métricas de força de um time com papéis atribuídos.
   * 
   * @param {Array} teamWithRoles - Array de { player, role }.
   * @returns {Object} Métricas do time.
   */
  function computeTeamScore(teamWithRoles) {
    let attackPower = 0;
    let defensePower = 0;
    let goalkeeperPower = 0;
    let secondaryAttack = 0;
    let secondaryDefense = 0;

    for (const entry of teamWithRoles) {
      const p = entry.player;
      const atk = p.attack || 1;
      const def = p.defense || 1;
      const gk = p.goalkeeper || 1;

      switch (entry.role) {
        case 'attack':
          attackPower += atk;
          // Atacantes contribuem um pouco para a defesa
          secondaryDefense += def * SECONDARY_CONTRIBUTION;
          break;
        case 'defense':
          defensePower += def;
          // Defensores contribuem um pouco para o ataque
          secondaryAttack += atk * SECONDARY_CONTRIBUTION;
          break;
        case 'goalkeeper':
          goalkeeperPower += gk;
          break;
      }
    }

    const effectiveAttack = attackPower + secondaryAttack;
    const effectiveDefense = defensePower + secondaryDefense;
    const effectiveGoalkeeper = goalkeeperPower;

    const totalStrength =
      effectiveAttack * WEIGHT_ATTACK +
      effectiveDefense * WEIGHT_DEFENSE +
      effectiveGoalkeeper * WEIGHT_GOALKEEPER;

    return {
      attackStrength: Math.round(effectiveAttack * 100) / 100,
      defenseStrength: Math.round(effectiveDefense * 100) / 100,
      goalkeeperStrength: effectiveGoalkeeper,
      totalStrength: Math.round(totalStrength * 100) / 100
    };
  }

  // ──────────────────────────────────────────────
  // Pontuação de preferências
  // ──────────────────────────────────────────────

  /**
   * Calcula a pontuação de satisfação das preferências de um jogador.
   * 
   * @param {Object} player - Jogador.
   * @param {string} assignedRole - Papel atribuído.
   * @returns {number} Pontuação (+2 = perfeito, -2 = totalmente ignorado).
   */
  function preferenceScore(player, assignedRole) {
    const pref = player.preference;

    if (!pref || pref === 'any') return 1; // Indiferente — sem problemas

    if (pref === assignedRole) return 2; // Preferência atendida

    // Preferência ignorada de forma drástica (ex.: quer ataque, virou goleiro)
    if (
      (pref === 'attack' && assignedRole === 'goalkeeper') ||
      (pref === 'goalkeeper' && assignedRole !== 'goalkeeper')
    ) {
      return -2;
    }

    // Preferência não atendida, mas papel razoável (ataque ↔ defesa)
    return 0;
  }

  // ──────────────────────────────────────────────
  // Pontuação da divisão (quanto menor, mais equilibrado)
  // ──────────────────────────────────────────────

  /**
   * Avalia o quão equilibrada é uma divisão de times.
   * Pontuação menor = times mais equilibrados.
   * 
   * @param {Array} teamsWithRoles - Array de arrays de { player, role }.
   * @returns {number} Pontuação da divisão.
   */
  function scoreDivision(teamsWithRoles) {
    const numTeams = teamsWithRoles.length;
    if (numTeams <= 1) return 0;

    const teamScores = teamsWithRoles.map(computeTeamScore);

    // Extrair métricas
    const totals = teamScores.map(t => t.totalStrength);
    const attacks = teamScores.map(t => t.attackStrength);
    const defenses = teamScores.map(t => t.defenseStrength);
    const goalkeepers = teamScores.map(t => t.goalkeeperStrength);

    // Amplitude (range) de cada métrica
    const totalRange = arrMax(totals) - arrMin(totals);
    const attackRange = arrMax(attacks) - arrMin(attacks);
    const defenseRange = arrMax(defenses) - arrMin(defenses);
    const gkRange = arrMax(goalkeepers) - arrMin(goalkeepers);

    // Penalidade por distribuição desigual de goleiros de elite
    const eliteGKsPerTeam = teamsWithRoles.map(team =>
      team.filter(e => (e.player.goalkeeper || 1) === 5).length
    );
    const gkDistPenalty = (arrMax(eliteGKsPerTeam) - arrMin(eliteGKsPerTeam)) * 50;

    // Penalidade por composição desbalanceada (contagem de papéis)
    const attackCounts = teamsWithRoles.map(team =>
      team.filter(e => e.role === 'attack').length
    );
    const defenseCounts = teamsWithRoles.map(team =>
      team.filter(e => e.role === 'defense').length
    );
    const compPenalty =
      (arrMax(attackCounts) - arrMin(attackCounts)) * 5 +
      (arrMax(defenseCounts) - arrMin(defenseCounts)) * 5;

    // Satisfação de preferências (bônus — subtrai da pontuação)
    let totalPrefScore = 0;
    for (const team of teamsWithRoles) {
      for (const entry of team) {
        totalPrefScore += preferenceScore(entry.player, entry.role);
      }
    }

    // Pontuação combinada (menor = melhor)
    const score =
      totalRange * 10 +
      gkRange * 15 +
      defenseRange * 5 +
      attackRange * 3 +
      gkDistPenalty +
      compPenalty -
      totalPrefScore * 2;

    return score;
  }

  // ──────────────────────────────────────────────
  // Distribuição "snake draft"
  // ──────────────────────────────────────────────

  /**
   * Gera a ordem de seleção no formato cobra (snake draft).
   * Ex. para 3 times: 0,1,2,2,1,0,0,1,2,...
   * 
   * @param {number} numTeams - Número de times.
   * @param {number} totalPicks - Total de seleções.
   * @returns {Array} Ordem dos times.
   */
  function snakeDraftOrder(numTeams, totalPicks) {
    const order = [];
    let forward = true;
    let idx = 0;

    while (order.length < totalPicks) {
      order.push(idx);

      if (forward) {
        if (idx === numTeams - 1) {
          forward = false;
        } else {
          idx++;
        }
      } else {
        if (idx === 0) {
          forward = true;
        } else {
          idx--;
        }
      }
    }

    return order;
  }

  // ──────────────────────────────────────────────
  // Estratégias de distribuição inicial
  // ──────────────────────────────────────────────

  /**
   * Distribui jogadores em times usando snake draft ordenado por força.
   */
  function distributionSnakeSorted(remainingPlayers, numTeams, playersPerTeam) {
    const sorted = [...remainingPlayers].sort((a, b) => {
      const ca = classifyPlayer(a);
      const cb = classifyPlayer(b);
      return cb.weightedScore - ca.weightedScore;
    });

    const teams = Array.from({ length: numTeams }, () => []);
    const totalSlots = numTeams * playersPerTeam;
    const order = snakeDraftOrder(numTeams, Math.min(sorted.length, totalSlots));

    for (let i = 0; i < order.length && i < sorted.length; i++) {
      const teamIdx = order[i];
      if (teams[teamIdx].length < playersPerTeam) {
        teams[teamIdx].push(sorted[i]);
      }
    }

    return teams;
  }

  /**
   * Distribui jogadores em times usando snake draft com ordem embaralhada.
   */
  function distributionSnakeShuffled(remainingPlayers, numTeams, playersPerTeam) {
    const sorted = [...remainingPlayers].sort((a, b) => {
      const ca = classifyPlayer(a);
      const cb = classifyPlayer(b);
      return cb.weightedScore - ca.weightedScore;
    });

    // Embaralha a ordem inicial dos times
    const teamOrder = Array.from({ length: numTeams }, (_, i) => i);
    shuffle(teamOrder);

    const teams = Array.from({ length: numTeams }, () => []);
    const totalSlots = numTeams * playersPerTeam;

    // Monta snake com ordem embaralhada
    const order = [];
    let forward = true;
    let idx = 0;
    while (order.length < Math.min(sorted.length, totalSlots)) {
      order.push(teamOrder[idx]);
      if (forward) {
        if (idx === numTeams - 1) forward = false;
        else idx++;
      } else {
        if (idx === 0) forward = true;
        else idx--;
      }
    }

    for (let i = 0; i < order.length && i < sorted.length; i++) {
      const teamIdx = order[i];
      if (teams[teamIdx].length < playersPerTeam) {
        teams[teamIdx].push(sorted[i]);
      }
    }

    return teams;
  }

  /**
   * Distribui jogadores aleatoriamente.
   */
  function distributionRandom(remainingPlayers, numTeams, playersPerTeam) {
    const shuffled = shuffle([...remainingPlayers]);
    const teams = Array.from({ length: numTeams }, () => []);

    let teamIdx = 0;
    for (const p of shuffled) {
      // Encontra o próximo time que ainda tem vaga
      let attempts = 0;
      while (teams[teamIdx].length >= playersPerTeam && attempts < numTeams) {
        teamIdx = (teamIdx + 1) % numTeams;
        attempts++;
      }
      if (teams[teamIdx].length < playersPerTeam) {
        teams[teamIdx].push(p);
      }
      teamIdx = (teamIdx + 1) % numTeams;
    }

    return teams;
  }

  /**
   * Distribui por faixas de habilidade (tiers).
   * Jogadores são agrupados em tiers e cada tier é distribuído uniformemente.
   */
  function distributionTierBased(remainingPlayers, numTeams, playersPerTeam) {
    const classified = remainingPlayers.map(p => ({
      player: p,
      ws: classifyPlayer(p).weightedScore
    }));

    // Ordena por pontuação ponderada
    classified.sort((a, b) => b.ws - a.ws);

    // Divide em tiers do tamanho do número de times
    const teams = Array.from({ length: numTeams }, () => []);
    const totalSlots = numTeams * playersPerTeam;

    for (let i = 0; i < classified.length && i < totalSlots; i += numTeams) {
      // Pega o tier (grupo de numTeams jogadores)
      const tier = classified.slice(i, Math.min(i + numTeams, classified.length));
      shuffle(tier); // Embaralha dentro do tier

      for (let j = 0; j < tier.length; j++) {
        // Encontra o time com menos jogadores (ou o próximo em ordem)
        let bestTeam = -1;
        let minSize = Infinity;
        for (let t = 0; t < numTeams; t++) {
          if (teams[t].length < playersPerTeam && teams[t].length < minSize) {
            minSize = teams[t].length;
            bestTeam = t;
          }
        }
        if (bestTeam !== -1) {
          teams[bestTeam].push(tier[j].player);
        }
      }
    }

    return teams;
  }

  // ──────────────────────────────────────────────
  // Otimização local por troca de pares
  // ──────────────────────────────────────────────

  /**
   * Otimiza a divisão de times trocando jogadores entre pares de times.
   * Mantém as trocas que melhoram a pontuação da divisão.
   * 
   * @param {Array} teamsWithRoles - Array de arrays de { player, role }.
   * @returns {Array} Times otimizados.
   */
  function localOptimize(teamsWithRoles) {
    let currentTeams = deepClone(teamsWithRoles);
    let currentScore = scoreDivision(currentTeams);
    let improved = true;
    let iterations = 0;

    while (improved && iterations < MAX_SWAP_ITERATIONS) {
      improved = false;
      iterations++;

      for (let i = 0; i < currentTeams.length && !improved; i++) {
        for (let j = i + 1; j < currentTeams.length && !improved; j++) {
          for (let pi = 0; pi < currentTeams[i].length && !improved; pi++) {
            for (let pj = 0; pj < currentTeams[j].length && !improved; pj++) {
              // Tenta trocar jogador pi do time i com jogador pj do time j
              const candidate = deepClone(currentTeams);

              // Troca os jogadores (mantém apenas o player, reassina roles depois)
              const tempPlayer = candidate[i][pi].player;
              candidate[i][pi].player = candidate[j][pj].player;
              candidate[j][pj].player = tempPlayer;

              // Reatribui papéis nos dois times afetados
              const teamIPlayers = candidate[i].map(e => e.player);
              const teamJPlayers = candidate[j].map(e => e.player);

              candidate[i] = assignTeamRoles(teamIPlayers);
              candidate[j] = assignTeamRoles(teamJPlayers);

              const candidateScore = scoreDivision(candidate);

              if (candidateScore < currentScore - 0.01) {
                currentTeams = candidate;
                currentScore = candidateScore;
                improved = true;
                log(`Troca melhorou: time ${i} jogador ${pi} ↔ time ${j} jogador ${pj} | Nova pontuação: ${candidateScore.toFixed(2)}`);
              }
            }
          }
        }
      }
    }

    log(`Otimização local finalizada após ${iterations} iterações. Pontuação final: ${currentScore.toFixed(2)}`);
    return currentTeams;
  }

  // ──────────────────────────────────────────────
  // Cálculo de percentual de equilíbrio
  // ──────────────────────────────────────────────

  /**
   * Calcula uma métrica amigável de equilíbrio entre 50% e 100%.
   * Usa o coeficiente de variação das forças totais dos times.
   * 
   * @param {Array} teamScores - Array de objetos com totalStrength.
   * @returns {number} Percentual de equilíbrio (50-100).
   */
  function calculateBalancePercent(teamScores) {
    if (teamScores.length <= 1) return 100;

    const totals = teamScores.map(t => t.totalStrength);
    const mean = arrMean(totals);

    if (mean === 0) return 100;

    const stdDev = arrStdDev(totals);
    const cv = stdDev / mean; // Coeficiente de variação

    // Converte para percentual (CV = 0 → 100%, CV alto → menor %)
    let balancePercent = Math.round((1 - cv) * 100);

    // Limita entre 50 e 100
    balancePercent = Math.max(50, Math.min(100, balancePercent));

    return balancePercent;
  }

  // ──────────────────────────────────────────────
  // Seleção aleatória de jogadores
  // ──────────────────────────────────────────────

  /**
   * Seleciona aleatoriamente `count` jogadores de uma lista.
   * 
   * @param {Array} allPlayers - Lista completa de jogadores.
   * @param {number} count - Quantidade a selecionar.
   * @returns {Array} Jogadores selecionados.
   */
  function selectPlayers(allPlayers, count) {
    if (!allPlayers || allPlayers.length === 0) return [];
    if (count >= allPlayers.length) return [...allPlayers];

    const shuffled = shuffle([...allPlayers]);
    return shuffled.slice(0, count);
  }

  // ──────────────────────────────────────────────
  // Gera hash simples de uma solução (para evitar duplicatas)
  // ──────────────────────────────────────────────

  /**
   * Gera uma string hash que representa uma solução,
   * para identificar soluções duplicadas.
   */
  function solutionHash(teamsWithRoles) {
    // Ordena jogadores dentro de cada time pelo ID, depois ordena times
    const normalized = teamsWithRoles.map(team => {
      const sorted = [...team].sort((a, b) =>
        String(a.player.id).localeCompare(String(b.player.id))
      );
      return sorted.map(e => `${e.player.id}:${e.role}`).join(',');
    });
    normalized.sort();
    return normalized.join('|');
  }

  // ──────────────────────────────────────────────
  // Função principal: gerar times equilibrados
  // ──────────────────────────────────────────────

  /**
   * Gera times equilibrados a partir de uma lista de jogadores.
   * 
   * @param {Array} players - Array de jogadores selecionados.
   *   Cada jogador: { id, name, attack, defense, goalkeeper, preference }
   * @param {Object} config - { numTeams, playersPerTeam }
   * @param {Object|null} previousTeams - Resultado anterior para evitar repetição.
   * @returns {Object} { teams, teamScores, balancePercent, solutionCount }
   */
  function generateBalancedTeams(players, config, previousTeams) {
    if (previousTeams === undefined) previousTeams = null;

    const { numTeams, playersPerTeam } = config;
    const totalNeeded = numTeams * playersPerTeam;

    // ── Validação de entrada ──
    if (!players || players.length === 0) {
      log('Erro: nenhum jogador fornecido.');
      return {
        teams: [],
        teamScores: [],
        balancePercent: 0,
        solutionCount: 0,
        error: 'Nenhum jogador fornecido.'
      };
    }

    if (players.length < totalNeeded) {
      log(`Erro: jogadores insuficientes. Necessário: ${totalNeeded}, disponível: ${players.length}`);
      return {
        teams: [],
        teamScores: [],
        balancePercent: 0,
        solutionCount: 0,
        error: `Jogadores insuficientes. São necessários ${totalNeeded}, mas apenas ${players.length} foram fornecidos.`
      };
    }

    if (numTeams < 2) {
      log('Erro: é necessário pelo menos 2 times.');
      return {
        teams: [],
        teamScores: [],
        balancePercent: 0,
        solutionCount: 0,
        error: 'É necessário pelo menos 2 times.'
      };
    }

    log(`Iniciando geração: ${players.length} jogadores → ${numTeams} times de ${playersPerTeam}`);

    // Usa exatamente totalNeeded jogadores (caso venham mais, pega os primeiros)
    const selectedPlayers = players.slice(0, totalNeeded);

    // ── Classificação dos jogadores ──
    const classifiedAll = selectedPlayers.map(classifyPlayer);
    log('Jogadores classificados:', classifiedAll.map(c =>
      `${c.player.name}: ws=${c.weightedScore}, primary=${c.primaryStrength}`
    ));

    // ── Separar goleiros de elite ──
    // Goleiros de elite: habilidade 5 E preferência de goleiro (ou maior habilidade é goleiro)
    const eliteGKs = [];
    const nonEliteGKs = [];

    for (const p of selectedPlayers) {
      const c = classifyPlayer(p);
      if (c.isEliteGoalkeeper && (p.preference === 'goalkeeper' || c.primaryStrength === 'goalkeeper')) {
        eliteGKs.push(p);
      } else {
        nonEliteGKs.push(p);
      }
    }

    log(`Goleiros de elite: ${eliteGKs.length}, demais jogadores: ${nonEliteGKs.length}`);

    // ── Determinar número de reinícios ──
    let numRestarts;
    if (selectedPlayers.length <= 20) {
      numRestarts = 200;
    } else if (selectedPlayers.length <= 30) {
      numRestarts = 100;
    } else {
      numRestarts = 50;
    }

    log(`Número de reinícios: ${numRestarts}`);

    // ── Coletar soluções ──
    const allSolutions = []; // { teams, score, hash }
    const seenHashes = new Set();

    // Array de funções de distribuição para variar
    const distributionStrategies = [
      distributionSnakeSorted,
      distributionSnakeShuffled,
      distributionRandom,
      distributionTierBased
    ];

    for (let restart = 0; restart < numRestarts; restart++) {
      // ── Fase 1: Distribuir goleiros de elite ──
      const teamsRaw = Array.from({ length: numTeams }, () => []);
      const usedEliteGKs = new Set();

      if (eliteGKs.length > 0) {
        // Embaralha goleiros de elite para variação entre reinícios
        const shuffledEliteGKs = shuffle([...eliteGKs]);

        for (let i = 0; i < shuffledEliteGKs.length; i++) {
          const teamIdx = i % numTeams;
          teamsRaw[teamIdx].push(shuffledEliteGKs[i]);
          usedEliteGKs.add(shuffledEliteGKs[i].id);
        }
      }

      // ── Fase 2: Distribuir jogadores restantes ──
      const remainingPlayers = nonEliteGKs.filter(p => !usedEliteGKs.has(p.id));

      // Calcula quantos slots restam por time
      const slotsPerTeam = teamsRaw.map(t => playersPerTeam - t.length);
      const totalRemainingSlots = arrSum(slotsPerTeam);

      // Escolhe estratégia de distribuição
      const strategyIdx = restart % distributionStrategies.length;
      const strategy = distributionStrategies[strategyIdx];

      // Distribui restantes em times temporários
      const tempTeams = strategy(remainingPlayers, numTeams, playersPerTeam);

      // Mescla com goleiros já distribuídos
      for (let t = 0; t < numTeams; t++) {
        const slotsLeft = playersPerTeam - teamsRaw[t].length;
        for (let p = 0; p < Math.min(tempTeams[t].length, slotsLeft); p++) {
          teamsRaw[t].push(tempTeams[t][p]);
        }
      }

      // Verifica se todos os times estão completos
      // Se algum time ficou com menos jogadores, redistribui dos que têm mais
      const allAssigned = new Set();
      for (const team of teamsRaw) {
        for (const p of team) {
          allAssigned.add(p.id);
        }
      }

      // Jogadores que ficaram fora
      const unassigned = selectedPlayers.filter(p => !allAssigned.has(p.id));
      if (unassigned.length > 0) {
        let uIdx = 0;
        for (let t = 0; t < numTeams && uIdx < unassigned.length; t++) {
          while (teamsRaw[t].length < playersPerTeam && uIdx < unassigned.length) {
            teamsRaw[t].push(unassigned[uIdx]);
            uIdx++;
          }
        }
      }

      // ── Atribuir papéis ──
      let teamsWithRoles = teamsRaw.map(team => assignTeamRoles(team));

      // ── Fase 3: Otimização local ──
      teamsWithRoles = localOptimize(teamsWithRoles);

      // ── Armazenar solução ──
      const score = scoreDivision(teamsWithRoles);
      const hash = solutionHash(teamsWithRoles);

      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        allSolutions.push({
          teams: teamsWithRoles,
          score,
          hash
        });
      }
    }

    // ── Ordenar soluções por pontuação (menor = melhor) ──
    allSolutions.sort((a, b) => a.score - b.score);

    // Manter apenas as melhores
    const topSolutions = allSolutions.slice(0, MAX_STORED_SOLUTIONS);

    log(`Soluções únicas encontradas: ${allSolutions.length}, mantendo top ${topSolutions.length}`);

    if (topSolutions.length === 0) {
      // Caso extremo: todas duplicadas; gera uma solução simples
      log('Nenhuma solução única — gerando distribuição padrão.');
      const fallbackTeams = distributionSnakeSorted(selectedPlayers, numTeams, playersPerTeam);
      const fallbackWithRoles = fallbackTeams.map(t => assignTeamRoles(t));
      const fallbackScores = fallbackWithRoles.map(computeTeamScore);

      return {
        teams: fallbackWithRoles,
        teamScores: fallbackScores,
        balancePercent: calculateBalancePercent(fallbackScores),
        solutionCount: 1
      };
    }

    // ── Fase 5: Selecionar solução ──
    let chosenSolution;

    if (previousTeams && previousTeams.teams) {
      // Tenta evitar repetir a solução anterior
      const prevHash = solutionHash(previousTeams.teams);
      const different = topSolutions.filter(s => s.hash !== prevHash);

      if (different.length > 0) {
        // Escolhe aleatoriamente entre as top 10% melhores que são diferentes
        const topCount = Math.max(1, Math.ceil(different.length * 0.1));
        const candidates = different.slice(0, topCount);
        chosenSolution = candidates[Math.floor(Math.random() * candidates.length)];
        log('Solução diferente da anterior selecionada.');
      } else {
        // Todas são iguais à anterior; escolhe a melhor mesmo assim
        const topCount = Math.max(1, Math.ceil(topSolutions.length * 0.1));
        const candidates = topSolutions.slice(0, topCount);
        chosenSolution = candidates[Math.floor(Math.random() * candidates.length)];
        log('Não foi possível evitar repetição — usando melhor solução disponível.');
      }
    } else {
      // Escolhe aleatoriamente entre as top 10% melhores
      const topCount = Math.max(1, Math.ceil(topSolutions.length * 0.1));
      const candidates = topSolutions.slice(0, topCount);
      chosenSolution = candidates[Math.floor(Math.random() * candidates.length)];
    }

    // ── Calcular métricas finais ──
    const finalTeams = chosenSolution.teams;
    const finalScores = finalTeams.map(computeTeamScore);
    const balancePercent = calculateBalancePercent(finalScores);

    log(`Solução final — Equilíbrio: ${balancePercent}%, Pontuação: ${chosenSolution.score.toFixed(2)}`);
    log('Times:', finalTeams.map((team, i) =>
      `Time ${i + 1}: ${team.map(e => `${e.player.name}(${e.role})`).join(', ')}`
    ));

    return {
      teams: finalTeams,
      teamScores: finalScores,
      balancePercent,
      solutionCount: topSolutions.length
    };
  }

  // ──────────────────────────────────────────────
  // Explicação do algoritmo (para UI "Como funciona")
  // ──────────────────────────────────────────────

  /**
   * Retorna uma explicação em português de como o algoritmo funciona.
   * @returns {string}
   */
  function getAlgorithmExplanation() {
    return 'O sorteio não considera apenas a quantidade de estrelas. ' +
      'Ele analisa ataque, defesa, goleiro, preferências e a composição de cada time. ' +
      'Bons goleiros recebem maior peso porque são mais raros e têm maior impacto no equilíbrio da partida.';
  }

  // ──────────────────────────────────────────────
  // Exportação global
  // ──────────────────────────────────────────────

  window.TeamAlgorithm = {
    generateBalancedTeams,
    classifyPlayer,
    assignTeamRoles,
    selectPlayers,
    getAlgorithmExplanation
  };

  log('Módulo TeamAlgorithm carregado com sucesso.');
})();
