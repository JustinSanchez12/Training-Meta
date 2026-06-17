// ============================================================
// workout.js - Workout Logging & Session Management
// ============================================================

let currentSession = [];

function startWorkoutSession() {
  console.log('[Workout] Starting new workout session');
  currentSession = [];
  return currentSession;
}

function getExerciseFormFields(statKey) {
  const def = STAT_DEFINITIONS[statKey];
  if (!def) return [];

  switch (def.xpType) {
    case 'reps':
      return [
        { id: 'sets', label: 'Sets', type: 'number', placeholder: '4', min: 1 },
        { id: 'reps', label: 'Reps', type: 'number', placeholder: '8', min: 1 },
        { id: 'weight', label: 'Weight (lbs)', type: 'number', placeholder: '135', min: 0 }
      ];
    case 'distance':
      return [
        { id: 'distance', label: 'Distance (miles)', type: 'number', placeholder: '1', min: 0.1, step: 0.1 }
      ];
    case 'laps':
      return [
        { id: 'laps', label: 'Laps', type: 'number', placeholder: '10', min: 1 }
      ];
    case 'session':
      return [
        { id: 'sessions', label: 'Sessions', type: 'number', placeholder: '1', min: 1 },
        { id: 'duration', label: 'Duration (min)', type: 'number', placeholder: '30', min: 1 }
      ];
    case 'weight':
      return [
        { id: 'currentWeight', label: 'Current Weight (lbs)', type: 'number', placeholder: '175', min: 50, step: 0.1 }
      ];
    case 'meal':
      return [
        { id: 'meals', label: 'Healthy Meals', type: 'number', placeholder: '3', min: 1 },
        { id: 'description', label: 'Description', type: 'text', placeholder: 'Grilled chicken, rice, vegetables' }
      ];
    default:
      return [];
  }
}

function addExerciseToSession(statKey, formData) {
  console.log('[Workout] ---- ADD EXERCISE TO SESSION ----');
  console.log('[Workout] Stat:', statKey);
  console.log('[Workout] Form data:', JSON.stringify(formData));

  const xpGained = calculateXpGain(statKey, formData);
  const def = STAT_DEFINITIONS[statKey];

  const exercise = {
    stat: statKey,
    name: def.name,
    icon: def.icon,
    data: formData,
    xpGained: xpGained,
    timestamp: new Date().toISOString()
  };

  currentSession.push(exercise);
  console.log(`[Workout] Exercise added: ${def.name}`);
  console.log(`[Workout]   XP gained: ${xpGained}`);
  console.log(`[Workout]   Session count: ${currentSession.length}`);
  console.log(`[Workout]   Session total XP: ${currentSession.reduce((s, e) => s + e.xpGained, 0)}`);

  return exercise;
}

function removeExerciseFromSession(index) {
  console.log('[Workout] Removing exercise at index:', index);
  if (index >= 0 && index < currentSession.length) {
    const removed = currentSession[index];
    console.log('[Workout] Removing:', removed.name, '(-' + removed.xpGained + ' XP)');
    currentSession.splice(index, 1);
    console.log('[Workout] Remaining exercises:', currentSession.length);
  } else {
    console.warn('[Workout] Invalid removal index:', index, '(session length:', currentSession.length, ')');
  }
}

function getSessionSummary() {
  const summary = {
    exerciseCount: currentSession.length,
    totalXp: currentSession.reduce((sum, ex) => sum + ex.xpGained, 0),
    exercises: currentSession,
    statBreakdown: currentSession.reduce((acc, ex) => {
      if (!acc[ex.stat]) acc[ex.stat] = { name: ex.name, totalXp: 0, count: 0 };
      acc[ex.stat].totalXp += ex.xpGained;
      acc[ex.stat].count++;
      return acc;
    }, {})
  };
  console.log('[Workout] Session summary:', summary.exerciseCount, 'exercises,', summary.totalXp, 'total XP');
  return summary;
}

function finishWorkoutSession(playerData) {
  console.log('[Workout] ---- FINISHING SESSION ----');
  console.log('[Workout] Exercises in session:', currentSession.length);

  if (currentSession.length === 0) {
    console.log('[Workout] Session is empty, nothing to finish');
    return null;
  }

  const levelUps = [];

  currentSession.forEach((exercise, idx) => {
    console.log(`[Workout] Processing exercise ${idx + 1}/${currentSession.length}: ${exercise.name}`);
    const result = updatePlayerStat(playerData, exercise.stat, exercise.xpGained);
    if (result.leveledUp) {
      console.log(`[Workout] 🎉 LEVEL UP detected: ${exercise.name}`);
      levelUps.push({
        stat: exercise.stat,
        name: exercise.name,
        icon: exercise.icon,
        previousLevel: result.previousLevel,
        newLevel: result.newLevel
      });
    }
  });

  const workoutEntry = logWorkout(playerData, [...currentSession]);
  const summary = getSessionSummary();

  currentSession = [];

  console.log('[Workout] Session complete.');
  console.log(`[Workout] Total XP: ${summary.totalXp}`);
  console.log(`[Workout] Level ups: ${levelUps.length}`);
  console.log('[Workout] ---- SESSION FINISHED ----');

  return {
    workout: workoutEntry,
    summary: summary,
    levelUps: levelUps
  };
}

function getCurrentSession() {
  return currentSession;
}

function formatExerciseData(statKey, data) {
  const def = STAT_DEFINITIONS[statKey];
  if (!def) {
    console.warn('[Workout] formatExerciseData: unknown stat key:', statKey);
    return '';
  }

  switch (def.xpType) {
    case 'reps':
      return `${data.sets}×${data.reps} @ ${data.weight || '—'} lbs`;
    case 'distance':
      return `${data.distance} miles`;
    case 'laps':
      return `${data.laps} laps`;
    case 'session':
      return `${data.sessions || 1} session(s), ${data.duration || '—'} min`;
    case 'weight':
      return `${data.currentWeight} lbs`;
    case 'meal':
      return `${data.meals || 1} meal(s)`;
    default:
      return '';
  }
}
