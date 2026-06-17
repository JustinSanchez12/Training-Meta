// ============================================================
// ui.js - UI Rendering Helpers & Animations
// ============================================================

function showScreen(screenId) {
  const previousScreen = document.querySelector('.screen.active');
  const previousId = previousScreen ? previousScreen.id : '(none)';
  console.log(`[UI] Screen transition: ${previousId} → ${screenId}`);
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    console.log('[UI] Screen', screenId, 'is now active');
  } else {
    console.error('[UI] Screen not found:', screenId);
  }
}

function renderStatsGrid(stats, container) {
  console.log('[UI] Rendering stats grid with', Object.keys(stats).length, 'stats');
  container.innerHTML = '';

  STAT_ORDER.forEach(key => {
    const def = STAT_DEFINITIONS[key];
    const statData = stats[key] || { xp: 0 };
    const progress = getXpProgress(statData.xp);
    const level = progress.level;

    const cell = document.createElement('div');
    cell.className = 'stat-cell';
    cell.setAttribute('data-stat', key);
    cell.innerHTML = `
      <div class="stat-icon">${def.icon}</div>
      <div class="stat-name">${def.name}</div>
      <div class="stat-level">${level}</div>
      <div class="stat-xp-bar">
        <div class="stat-xp-fill" style="width: ${level >= MAX_LEVEL ? 100 : progress.progress * 100}%"></div>
      </div>
    `;

    cell.addEventListener('click', () => {
      console.log('[UI] Stat cell tapped:', def.name, '(Level', level, ')');
      showStatDetail(key, stats);
    });
    container.appendChild(cell);
  });
}

function showStatDetail(statKey, stats) {
  const def = STAT_DEFINITIONS[statKey];
  const statData = stats[statKey] || { xp: 0 };
  console.log('[UI] Showing stat detail for:', statKey);
  console.log('[UI]   Name:', def.name);
  console.log('[UI]   XP:', statData.xp);
  console.log('[UI]   Level:', getLevelFromXp(statData.xp));
  console.log('[UI]   Category:', def.category);

  const progress = getXpProgress(statData.xp);

  const detailPanel = document.getElementById('stat-detail-panel');
  if (!detailPanel) return;

  detailPanel.innerHTML = `
    <div class="stat-detail-header">
      <button class="back-btn" onclick="closeStatDetail()">← Back</button>
      <span class="stat-detail-icon">${def.icon}</span>
      <h2>${def.name}</h2>
    </div>
    <div class="stat-detail-body">
      <div class="stat-detail-level">
        <span class="label">Level</span>
        <span class="value">${progress.level}</span>
      </div>
      <div class="stat-detail-xp-section">
        <div class="xp-bar-large">
          <div class="xp-fill-large" style="width: ${progress.level >= MAX_LEVEL ? 100 : progress.progress * 100}%"></div>
        </div>
        <div class="xp-text">
          ${progress.level >= MAX_LEVEL
            ? '<span class="max-level">MAX LEVEL</span>'
            : `<span>${progress.xpIntoLevel} / ${progress.xpForNext} XP</span>`
          }
        </div>
      </div>
      <div class="stat-detail-info">
        <div class="info-row"><span>Total XP</span><span>${progress.currentXp}</span></div>
        <div class="info-row"><span>Category</span><span>${def.category}</span></div>
        <div class="info-row"><span>XP Rule</span><span>${def.xpDescription}</span></div>
      </div>
    </div>
  `;

  detailPanel.classList.add('active');
}

function closeStatDetail() {
  console.log('[UI] Closing stat detail panel');
  const detailPanel = document.getElementById('stat-detail-panel');
  if (detailPanel) {
    detailPanel.classList.remove('active');
  }
}

function renderWorkoutLog(workoutLog, container) {
  console.log('[UI] Rendering workout log,', workoutLog.length, 'entries');
  if (workoutLog.length > 0) {
    const totalXpAll = workoutLog.reduce((sum, e) => sum + e.totalXp, 0);
    console.log('[UI] Total XP across all workouts:', totalXpAll);
  }
  container.innerHTML = '';

  if (workoutLog.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📜</div>
        <p>No quests completed yet.</p>
        <p>Begin your journey by logging a workout!</p>
      </div>
    `;
    return;
  }

  workoutLog.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'workout-log-card';

    const exerciseList = entry.exercises.map(ex =>
      `<div class="log-exercise">
        <span>${ex.icon} ${ex.name}</span>
        <span class="log-exercise-detail">${formatExerciseData(ex.stat, ex.data)}</span>
        <span class="xp-badge">+${ex.xpGained} XP</span>
      </div>`
    ).join('');

    card.innerHTML = `
      <div class="log-header">
        <span class="log-date">📅 ${formatDate(entry.date)}</span>
        <span class="log-total-xp">+${entry.totalXp} XP</span>
      </div>
      <div class="log-exercises">${exerciseList}</div>
    `;

    container.appendChild(card);
  });
}

function renderExerciseSelector(container, onSelect) {
  console.log('[UI] Rendering exercise selector with', STAT_ORDER.length, 'exercises');
  container.innerHTML = '';

  const categories = {};
  STAT_ORDER.forEach(key => {
    const def = STAT_DEFINITIONS[key];
    if (!categories[def.category]) categories[def.category] = [];
    categories[def.category].push({ key, ...def });
  });

  Object.entries(categories).forEach(([category, exercises]) => {
    const section = document.createElement('div');
    section.className = 'exercise-category';
    section.innerHTML = `<h3 class="category-title">${capitalize(category)}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'exercise-grid';

    exercises.forEach(ex => {
      const btn = document.createElement('button');
      btn.className = 'exercise-btn';
      btn.innerHTML = `<span class="ex-icon">${ex.icon}</span><span class="ex-name">${ex.name}</span>`;
      btn.addEventListener('click', () => {
        console.log('[UI] Exercise button tapped:', ex.name, '(' + ex.key + ')');
        onSelect(ex.key);
      });
      grid.appendChild(btn);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

function renderExerciseForm(statKey, container, onSubmit) {
  console.log('[UI] Rendering exercise form for:', statKey, '-', STAT_DEFINITIONS[statKey]?.name);
  console.log('[UI] Form fields:', getExerciseFormFields(statKey).map(f => f.id).join(', '));

  const def = STAT_DEFINITIONS[statKey];
  const fields = getExerciseFormFields(statKey);

  container.innerHTML = `
    <div class="exercise-form-header">
      <button class="back-btn" id="exercise-form-back">← Back</button>
      <span>${def.icon} ${def.name}</span>
    </div>
    <div class="exercise-form-info">
      <span class="xp-rule">${def.xpDescription}</span>
    </div>
    <form id="exercise-form" class="exercise-form-fields">
      ${fields.map(f => `
        <div class="form-group">
          <label for="field-${f.id}">${f.label}</label>
          <input type="${f.type}" id="field-${f.id}" name="${f.id}"
            placeholder="${f.placeholder || ''}"
            ${f.min !== undefined ? `min="${f.min}"` : ''}
            ${f.step ? `step="${f.step}"` : ''}
            ${f.type === 'number' ? 'inputmode="decimal"' : ''}
            required>
        </div>
      `).join('')}
      <button type="submit" class="btn-primary btn-log">⚔️ Log Exercise</button>
    </form>
  `;

  document.getElementById('exercise-form-back').addEventListener('click', () => {
    console.log('[UI] Exercise form back button tapped');
    showWorkoutScreen();
  });

  document.getElementById('exercise-form').addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('[UI] Exercise form submitted');
    const formData = {};
    fields.forEach(f => {
      const val = document.getElementById(`field-${f.id}`).value;
      formData[f.id] = f.type === 'number' ? parseFloat(val) : val;
      console.log(`[UI]   Field ${f.id}:`, formData[f.id]);
    });
    const previewXp = calculateXpGain(statKey, formData);
    console.log('[UI]   Calculated XP gain:', previewXp);
    onSubmit(statKey, formData);
  });
}

function showXpGainAnimation(xpGained, statName) {
  console.log('[UI] Showing XP gain animation: +' + xpGained + ' XP for', statName);
  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.innerHTML = `+${xpGained} XP<br><small>${statName}</small>`;
  document.body.appendChild(popup);

  requestAnimationFrame(() => {
    popup.classList.add('show');
  });

  setTimeout(() => {
    popup.classList.add('fade');
    setTimeout(() => popup.remove(), 500);
  }, 1500);
}

function showLevelUpAnimation(levelUps) {
  console.log('[UI] showLevelUpAnimation called with', levelUps.length, 'level ups');
  if (levelUps.length === 0) return;
  levelUps.forEach(lu => {
    console.log(`[UI]   Level Up: ${lu.name} ${lu.previousLevel} → ${lu.newLevel}`);
  });

  const overlay = document.createElement('div');
  overlay.className = 'levelup-overlay';

  const content = levelUps.map(lu => `
    <div class="levelup-item">
      <span class="levelup-icon">${lu.icon}</span>
      <span class="levelup-name">${lu.name}</span>
      <span class="levelup-levels">${lu.previousLevel} → ${lu.newLevel}</span>
    </div>
  `).join('');

  overlay.innerHTML = `
    <div class="levelup-modal">
      <div class="levelup-title">⚔️ LEVEL UP! ⚔️</div>
      ${content}
      <button class="btn-primary levelup-dismiss" onclick="this.closest('.levelup-overlay').remove()">Continue</button>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function renderSessionExercises(container) {
  const session = getCurrentSession();
  console.log('[UI] Rendering session exercises:', session.length, 'items');
  container.innerHTML = '';

  if (session.length === 0) {
    container.innerHTML = '<p class="session-empty">No exercises added yet. Select an exercise above.</p>';
    return;
  }

  session.forEach((ex, idx) => {
    const item = document.createElement('div');
    item.className = 'session-exercise-item';
    item.innerHTML = `
      <span class="session-ex-info">${ex.icon} ${ex.name} — ${formatExerciseData(ex.stat, ex.data)}</span>
      <span class="session-ex-xp">+${ex.xpGained} XP</span>
      <button class="session-remove-btn" data-idx="${idx}">✕</button>
    `;
    item.querySelector('.session-remove-btn').addEventListener('click', () => {
      console.log('[UI] Remove exercise button tapped, index:', idx, '- exercise:', ex.name);
      removeExerciseFromSession(idx);
      renderSessionExercises(container);
      updateSessionTotal();
    });
    container.appendChild(item);
  });
}

function updateSessionTotal() {
  const summary = getSessionSummary();
  console.log('[UI] Session total updated:', summary.totalXp, 'XP,', summary.exerciseCount, 'exercises');
  const el = document.getElementById('session-total-xp');
  if (el) {
    el.textContent = `Total: +${summary.totalXp} XP (${summary.exerciseCount} exercises)`;
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderProfileScreen(playerData, container) {
  console.log('[UI] Rendering profile screen');
  const p = playerData.player;
  const totalLvl = getTotalLevel(playerData.stats);
  const overallLvl = getOverallLevel(playerData.stats);
  console.log('[UI]   Name:', p.name, '| Level:', overallLvl, '| Total:', totalLvl);

  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">${p.gender === 'male' ? '🧙‍♂️' : p.gender === 'female' ? '🧙‍♀️' : '🧙'}</div>
      <h2 class="profile-name">${p.name}</h2>
      <div class="profile-title">Level ${overallLvl} Adventurer</div>
    </div>
    <div class="profile-stats">
      <div class="profile-stat-row"><span>Total Level</span><span>${totalLvl}</span></div>
      <div class="profile-stat-row"><span>Gender</span><span>${capitalize(p.gender)}</span></div>
      <div class="profile-stat-row"><span>Age</span><span>${p.age}</span></div>
      <div class="profile-stat-row"><span>Starting Weight</span><span>${p.startWeight} ${p.weightUnit}</span></div>
      <div class="profile-stat-row"><span>Current Weight</span><span>${p.currentWeight} ${p.weightUnit}</span></div>
      <div class="profile-stat-row"><span>Member Since</span><span>${formatDate(p.createdAt.split('T')[0])}</span></div>
      <div class="profile-stat-row"><span>Daily Streak</span><span>🔥 ${playerData.dailyStreak}</span></div>
      <div class="profile-stat-row"><span>Workouts Logged</span><span>${playerData.workoutLog.length}</span></div>
    </div>
    <div class="profile-actions">
      <button class="btn-danger" id="btn-reset-character">Reset Character</button>
    </div>
  `;

  document.getElementById('btn-reset-character').addEventListener('click', () => {
    console.log('[UI] Reset character button tapped');
    if (confirm('Are you sure you want to reset your character? All progress will be lost!')) {
      console.log('[UI] User confirmed character reset');
      resetCharacter();
    } else {
      console.log('[UI] User cancelled character reset');
    }
  });
}
