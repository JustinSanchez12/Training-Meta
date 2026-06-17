// ============================================================
// app.js - Main App Controller & Screen Navigation
// ============================================================

const APP_SLUG = 'the-training-meta';
let storage;
let playerData;

async function initApp() {
  console.log('[App] ============================================');
  console.log('[App] Initializing The Training Meta...');
  console.log('[App] Timestamp:', new Date().toISOString());
  console.log('[App] User Agent:', navigator.userAgent);
  console.log('[App] Screen:', window.innerWidth, 'x', window.innerHeight);

  const isValid = await validateApiKey();
  if (!isValid) {
    showApiKeySetupPopup();
    return;
  }

  console.log('[App] API key valid, loading player data...');

  try {
    storage = new ApeStorage(APP_SLUG);
    const defaults = getDefaultPlayerData();
    playerData = await storage.init(defaults);

    console.log('[App] Player data loaded. New player:', playerData.player.isNewPlayer);
    console.log('[App] Player stats keys:', Object.keys(playerData.stats));
    console.log('[App] Workout log entries:', playerData.workoutLog.length);
    console.log('[App] Daily streak:', playerData.dailyStreak);

    if (playerData.player.isNewPlayer) {
      console.log('[App] → Routing to START screen (new player)');
      showScreen('screen-start');
    } else {
      console.log('[App] → Routing to HUB screen (returning player:', playerData.player.name, ')');
      navigateToHub();
    }
  } catch (error) {
    console.error('[App] Failed to initialize:', error);
    console.error('[App] Error stack:', error.stack);
    console.log('[App] → Falling back to START screen with default data');
    showScreen('screen-start');
    playerData = getDefaultPlayerData();
  }
}

function navigateToStart() {
  console.log('[App] navigateToStart() called');
  showScreen('screen-start');
}

function navigateToCharacterCreation() {
  console.log('[App] Starting character creation');
  showScreen('screen-character-creation');
  initCharacterCreation();
}

function initCharacterCreation() {
  console.log('[CharCreate] Initializing character creation wizard');
  const steps = document.querySelectorAll('.creation-step');
  console.log('[CharCreate] Total steps:', steps.length);

  function showStep(idx) {
    console.log('[CharCreate] Showing step', idx + 1, 'of', steps.length);
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    document.getElementById('creation-progress').textContent = `Step ${idx + 1} of ${steps.length}`;
  }

  showStep(0);

  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('[CharCreate] Gender selected:', btn.dataset.gender);
      document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('selected-gender').value = btn.dataset.gender;
    });
  });

  document.getElementById('btn-next-step-1').addEventListener('click', () => {
    const name = document.getElementById('input-name').value.trim();
    console.log('[CharCreate] Step 1 - Name entered:', name || '(empty)');
    if (!name) { console.log('[CharCreate] Validation failed: name is empty'); alert('Please enter your name.'); return; }
    console.log('[CharCreate] Step 1 complete → advancing to Step 2');
    showStep(1);
  });

  document.getElementById('btn-next-step-2').addEventListener('click', () => {
    const gender = document.getElementById('selected-gender').value;
    console.log('[CharCreate] Step 2 - Gender value:', gender || '(none selected)');
    if (!gender) { console.log('[CharCreate] Validation failed: no gender selected'); alert('Please select a gender.'); return; }
    console.log('[CharCreate] Step 2 complete → advancing to Step 3');
    showStep(2);
  });

  document.getElementById('btn-next-step-3').addEventListener('click', () => {
    const age = document.getElementById('input-age').value;
    console.log('[CharCreate] Step 3 - Age entered:', age || '(empty)');
    if (!age || parseInt(age) < 1) { console.log('[CharCreate] Validation failed: invalid age'); alert('Please enter a valid age.'); return; }
    console.log('[CharCreate] Step 3 complete → advancing to Step 4');
    showStep(3);
  });

  document.getElementById('btn-create-character').addEventListener('click', async () => {
    const weight = document.getElementById('input-weight').value;
    console.log('[CharCreate] Step 4 - Weight entered:', weight || '(empty)');
    if (!weight || parseFloat(weight) < 1) { console.log('[CharCreate] Validation failed: invalid weight'); alert('Please enter a valid weight.'); return; }

    const name = document.getElementById('input-name').value.trim();
    const gender = document.getElementById('selected-gender').value;
    const age = document.getElementById('input-age').value;
    const weightUnit = document.getElementById('input-weight-unit').value;

    console.log('[CharCreate] Creating character with:', { name, gender, age, weight, weightUnit });
    playerData = createPlayer(name, gender, age, weight, weightUnit);
    storage.setData(playerData);
    console.log('[CharCreate] Player data set in storage, attempting save...');

    try {
      await storage.save();
      console.log('[App] Character saved successfully');
    } catch (error) {
      console.error('[App] Failed to save character:', error);
    }

    showCharacterCreatedAnimation(name);
  });
}

function showCharacterCreatedAnimation(name) {
  const overlay = document.createElement('div');
  overlay.className = 'levelup-overlay';
  overlay.innerHTML = `
    <div class="levelup-modal">
      <div class="levelup-title">⚔️ CHARACTER CREATED ⚔️</div>
      <div class="levelup-item">
        <span class="levelup-icon">🎉</span>
        <span class="levelup-name">Welcome, ${name}!</span>
        <span class="levelup-levels">All stats: Level 1</span>
      </div>
      <p style="color: #aaa; margin: 12px 0;">Your adventure begins now.</p>
      <button class="btn-primary levelup-dismiss" id="btn-enter-hub">Enter the Hub</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  document.getElementById('btn-enter-hub').addEventListener('click', () => {
    overlay.remove();
    navigateToHub();
  });
}

function navigateToHub() {
  console.log('[Hub] Navigating to hub');
  showScreen('screen-hub');

  const overallLvl = getOverallLevel(playerData.stats);
  const totalLvl = getTotalLevel(playerData.stats);
  const p = playerData.player;

  console.log('[Hub] Player:', p.name, '| Overall Level:', overallLvl, '| Total Level:', totalLvl);
  console.log('[Hub] Streak:', playerData.dailyStreak, '| Workouts logged:', playerData.workoutLog.length);

  document.getElementById('hub-player-name').textContent = p.name;
  document.getElementById('hub-player-level').textContent = `Level ${overallLvl}`;
  document.getElementById('hub-total-level').textContent = `Total Level: ${totalLvl}`;
  document.getElementById('hub-streak').textContent = `🔥 ${playerData.dailyStreak} day streak`;
}

function navigateToStats() {
  console.log('[Stats] Navigating to stats screen');
  showScreen('screen-stats');

  const grid = document.getElementById('stats-grid');
  renderStatsGrid(playerData.stats, grid);

  const totalLvl = getTotalLevel(playerData.stats);
  console.log('[Stats] Total level:', totalLvl);
  STAT_ORDER.forEach(key => {
    const s = playerData.stats[key];
    console.log(`[Stats]   ${STAT_DEFINITIONS[key].name}: Level ${getLevelFromXp(s.xp)} (${s.xp} XP)`);
  });
  document.getElementById('stats-total-level').textContent = `Total Level: ${totalLvl}`;
}

function navigateToWorkout() {
  console.log('[Workout] User tapped Log Workout panel');
  showWorkoutScreen();
}

function showWorkoutScreen() {
  showScreen('screen-workout');
  startWorkoutSession();

  const selectorContainer = document.getElementById('exercise-selector');
  renderExerciseSelector(selectorContainer, (statKey) => {
    showExerciseForm(statKey);
  });

  renderSessionExercises(document.getElementById('session-exercises'));
  updateSessionTotal();
}

function showExerciseForm(statKey) {
  console.log('[Workout] User selected exercise:', statKey, '-', STAT_DEFINITIONS[statKey]?.name);
  showScreen('screen-exercise-form');
  const formContainer = document.getElementById('exercise-form-container');
  renderExerciseForm(statKey, formContainer, (key, data) => {
    console.log('[Workout] Exercise form submitted:', key, JSON.stringify(data));
    const exercise = addExerciseToSession(key, data);
    console.log('[Workout] XP gained from exercise:', exercise.xpGained);
    showXpGainAnimation(exercise.xpGained, exercise.name);

    console.log('[Workout] Returning to workout session screen');
    showScreen('screen-workout');
    renderSessionExercises(document.getElementById('session-exercises'));
    updateSessionTotal();
  });
}

async function finishWorkout() {
  console.log('[Workout] ---- FINISH WORKOUT ----');
  console.log('[Workout] Session exercises count:', getCurrentSession().length);

  const result = finishWorkoutSession(playerData);
  if (!result) {
    console.log('[Workout] Cannot finish: no exercises in session');
    alert('Add at least one exercise before finishing!');
    return;
  }

  console.log('[Workout] Workout result:', {
    totalXp: result.summary.totalXp,
    exerciseCount: result.summary.exerciseCount,
    levelUps: result.levelUps.length
  });

  result.levelUps.forEach(lu => {
    console.log(`[Workout] 🎉 LEVEL UP: ${lu.name} ${lu.previousLevel} → ${lu.newLevel}`);
  });

  try {
    await storage.save();
    console.log('[Workout] Workout saved to cloud successfully');
  } catch (error) {
    console.error('[Workout] Failed to save workout:', error);
    console.error('[Workout] Error stack:', error.stack);
  }

  if (result.levelUps.length > 0) {
    console.log('[Workout] Showing level up animation for', result.levelUps.length, 'stat(s)');
    showLevelUpAnimation(result.levelUps);
  }

  console.log('[Workout] ---- WORKOUT COMPLETE ----');
  navigateToHub();
}

function navigateToProgress() {
  console.log('[Progress] Navigating to quest log');
  console.log('[Progress] Total workout entries:', playerData.workoutLog.length);
  if (playerData.workoutLog.length > 0) {
    console.log('[Progress] Most recent workout:', playerData.workoutLog[0].date, '- XP:', playerData.workoutLog[0].totalXp);
  }
  showScreen('screen-progress');

  const container = document.getElementById('progress-log');
  renderWorkoutLog(playerData.workoutLog, container);
}

function navigateToProfile() {
  console.log('[Profile] Navigating to profile screen');
  console.log('[Profile] Player data:', JSON.stringify(playerData.player));
  showScreen('screen-profile');

  const container = document.getElementById('profile-content');
  renderProfileScreen(playerData, container);
}

async function resetCharacter() {
  console.log('[Profile] ⚠️ RESETTING CHARACTER - all progress will be lost');
  console.log('[Profile] Current player:', playerData.player.name);
  console.log('[Profile] Current total level:', getTotalLevel(playerData.stats));
  try {
    await storage.reset();
    console.log('[Profile] Character reset successfully, reloading page...');
    location.reload();
  } catch (error) {
    console.error('[Profile] Failed to reset via storage:', error);
    console.log('[Profile] Clearing localStorage as fallback');
    localStorage.clear();
    location.reload();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] ============================================');
  console.log('[App] DOM loaded at', new Date().toISOString());
  console.log('[App] Starting initialization...');
  initApp();
});

window.addEventListener('error', (e) => {
  console.error('[App] Uncaught error:', e.message, 'at', e.filename, ':', e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[App] Unhandled promise rejection:', e.reason);
});
