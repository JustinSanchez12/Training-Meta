// ============================================================
// player.js - Player Data Model & Character Creation
// ============================================================

function getDefaultPlayerData() {
  console.log('[Player] Creating default player data template');
  return {
    player: {
      name: '',
      gender: '',
      age: 0,
      startWeight: 0,
      currentWeight: 0,
      weightUnit: 'lbs',
      createdAt: '',
      isNewPlayer: true
    },
    stats: getDefaultStats(),
    workoutLog: [],
    dailyStreak: 0,
    lastWorkoutDate: ''
  };
}

function createPlayer(name, gender, age, weight, weightUnit) {
  console.log('[Player] Creating new character:', { name, gender, age, weight, weightUnit });

  return {
    player: {
      name: name,
      gender: gender,
      age: parseInt(age),
      startWeight: parseFloat(weight),
      currentWeight: parseFloat(weight),
      weightUnit: weightUnit || 'lbs',
      createdAt: new Date().toISOString(),
      isNewPlayer: false
    },
    stats: getDefaultStats(),
    workoutLog: [],
    dailyStreak: 0,
    lastWorkoutDate: ''
  };
}

function updatePlayerStat(playerData, statKey, xpGained) {
  console.log(`[Player] ---- UPDATE STAT: ${statKey} ----`);
  console.log(`[Player] Adding ${xpGained} XP to ${statKey}`);

  if (!playerData.stats[statKey]) {
    console.error(`[Player] Unknown stat: ${statKey}`);
    return { leveledUp: false, previousLevel: 1, newLevel: 1, xpGained: 0 };
  }

  const previousXp = playerData.stats[statKey].xp;
  const previousLevel = getLevelFromXp(previousXp);
  console.log(`[Player] Before: ${previousXp} XP (Level ${previousLevel})`);

  playerData.stats[statKey].xp += xpGained;
  const newLevel = getLevelFromXp(playerData.stats[statKey].xp);
  playerData.stats[statKey].level = newLevel;
  console.log(`[Player] After: ${playerData.stats[statKey].xp} XP (Level ${newLevel})`);

  const leveledUp = newLevel > previousLevel;

  if (leveledUp) {
    console.log(`[Player] 🎉 LEVEL UP! ${STAT_DEFINITIONS[statKey].name}: ${previousLevel} → ${newLevel}`);
  }

  return { leveledUp, previousLevel, newLevel, xpGained };
}

function logWorkout(playerData, exercises) {
  console.log('[Player] ---- LOGGING WORKOUT ----');
  console.log('[Player] Exercise count:', exercises.length);
  exercises.forEach((ex, i) => {
    console.log(`[Player]   Exercise ${i + 1}: ${ex.name} (+${ex.xpGained} XP)`);
  });

  const workoutEntry = {
    id: Date.now().toString(),
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    exercises: exercises,
    totalXp: exercises.reduce((sum, ex) => sum + ex.xpGained, 0)
  };

  playerData.workoutLog.unshift(workoutEntry);

  const today = new Date().toISOString().split('T')[0];
  console.log('[Player] Today:', today, '| Last workout date:', playerData.lastWorkoutDate);
  if (playerData.lastWorkoutDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (playerData.lastWorkoutDate === yesterday) {
      playerData.dailyStreak++;
      console.log('[Player] Streak continued! New streak:', playerData.dailyStreak);
    } else {
      playerData.dailyStreak = 1;
      console.log('[Player] Streak reset to 1 (missed a day)');
    }
    playerData.lastWorkoutDate = today;
  } else {
    console.log('[Player] Already worked out today, streak unchanged');
  }

  console.log('[Player] Workout logged. Total XP gained:', workoutEntry.totalXp);
  console.log('[Player] Daily streak:', playerData.dailyStreak);

  return workoutEntry;
}
