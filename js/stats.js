// ============================================================
// stats.js - Stats Definitions, EXP Curves, Leveling System
// ============================================================

const STAT_DEFINITIONS = {
  benchPress: {
    name: 'Bench Press',
    icon: '🏋️',
    category: 'strength',
    xpType: 'reps',
    xpDescription: 'sets × reps = XP',
    color: '#e74c3c'
  },
  squat: {
    name: 'Squat',
    icon: '🦵',
    category: 'strength',
    xpType: 'reps',
    xpDescription: 'sets × reps = XP',
    color: '#e67e22'
  },
  deadlift: {
    name: 'Deadlift',
    icon: '💪',
    category: 'strength',
    xpType: 'reps',
    xpDescription: 'sets × reps = XP',
    color: '#c0392b'
  },
  overheadPress: {
    name: 'OHP',
    icon: '🙌',
    category: 'strength',
    xpType: 'reps',
    xpDescription: 'sets × reps = XP',
    color: '#d35400'
  },
  bicepCurl: {
    name: 'Bicep Curl',
    icon: '💪',
    category: 'strength',
    xpType: 'reps',
    xpDescription: 'sets × reps = XP',
    color: '#e74c3c'
  },
  pullUp: {
    name: 'Pull Up',
    icon: '🧗',
    category: 'strength',
    xpType: 'reps',
    xpDescription: 'sets × reps = XP',
    color: '#c0392b'
  },
  mileRun: {
    name: 'Mile Run',
    icon: '🏃',
    category: 'cardio',
    xpType: 'distance',
    xpDescription: '1 mile = 10 XP',
    color: '#3498db'
  },
  cycling: {
    name: 'Cycling',
    icon: '🚴',
    category: 'cardio',
    xpType: 'distance',
    xpDescription: '1 mile = 5 XP',
    color: '#2980b9'
  },
  swimming: {
    name: 'Swimming',
    icon: '🏊',
    category: 'cardio',
    xpType: 'laps',
    xpDescription: '1 lap = 5 XP',
    color: '#1abc9c'
  },
  yoga: {
    name: 'Yoga',
    icon: '🧘',
    category: 'flexibility',
    xpType: 'session',
    xpDescription: '1 session = 10 XP',
    color: '#9b59b6'
  },
  weight: {
    name: 'Weight',
    icon: '⚖️',
    category: 'body',
    xpType: 'weight',
    xpDescription: '0.5-1 lb toward goal = 10 XP',
    color: '#f39c12'
  },
  nutrition: {
    name: 'Nutrition',
    icon: '🥗',
    category: 'body',
    xpType: 'meal',
    xpDescription: '1 healthy meal = 5 XP',
    color: '#27ae60'
  }
};

const STAT_ORDER = [
  'benchPress', 'squat', 'deadlift',
  'overheadPress', 'bicepCurl', 'pullUp',
  'mileRun', 'cycling', 'swimming',
  'yoga', 'weight', 'nutrition'
];

const MAX_LEVEL = 99;

function getXpForLevel(level) {
  if (level <= 1) return 0;
  const xp = Math.floor(Math.pow(level, 2) * 1.1 + level * 8);
  console.log(`[Stats] XP required for level ${level}: ${xp}`);
  return xp;
}

function getXpBetweenLevels(level) {
  return getXpForLevel(level + 1) - getXpForLevel(level);
}

function getLevelFromXp(totalXp) {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= getXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

function getXpProgress(totalXp) {
  const currentLevel = getLevelFromXp(totalXp);
  console.log(`[Stats] XP progress check: ${totalXp} XP = Level ${currentLevel}`);
  if (currentLevel >= MAX_LEVEL) {
    console.log('[Stats] MAX LEVEL reached!');
    return { level: MAX_LEVEL, currentXp: totalXp, xpForNext: 0, xpIntoLevel: 0, progress: 1 };
  }

  const xpForCurrent = getXpForLevel(currentLevel);
  const xpForNext = getXpForLevel(currentLevel + 1);
  const xpIntoLevel = totalXp - xpForCurrent;
  const xpNeeded = xpForNext - xpForCurrent;

  return {
    level: currentLevel,
    currentXp: totalXp,
    xpForNext: xpNeeded,
    xpIntoLevel: xpIntoLevel,
    progress: xpIntoLevel / xpNeeded
  };
}

function calculateXpGain(statKey, data) {
  const def = STAT_DEFINITIONS[statKey];
  if (!def) {
    console.error('[Stats] calculateXpGain: unknown stat key:', statKey);
    return 0;
  }

  let xp = 0;

  switch (def.xpType) {
    case 'reps':
      xp = (data.sets || 0) * (data.reps || 0);
      console.log(`[Stats] XP calc (reps): ${data.sets}×${data.reps} = ${xp} XP`);
      return xp;
    case 'distance':
      if (statKey === 'mileRun') { xp = (data.distance || 0) * 10; }
      else if (statKey === 'cycling') { xp = (data.distance || 0) * 5; }
      else { xp = (data.distance || 0) * 5; }
      console.log(`[Stats] XP calc (distance): ${data.distance} miles = ${xp} XP`);
      return xp;
    case 'laps':
      xp = (data.laps || 0) * 5;
      console.log(`[Stats] XP calc (laps): ${data.laps} laps = ${xp} XP`);
      return xp;
    case 'session':
      xp = (data.sessions || 1) * 10;
      console.log(`[Stats] XP calc (session): ${data.sessions || 1} session(s) = ${xp} XP`);
      return xp;
    case 'weight':
      xp = (data.change || 0) >= 0.5 ? 10 : 0;
      console.log(`[Stats] XP calc (weight): change=${data.change}, XP=${xp}`);
      return xp;
    case 'meal':
      xp = (data.meals || 1) * 5;
      console.log(`[Stats] XP calc (meal): ${data.meals || 1} meal(s) = ${xp} XP`);
      return xp;
    default:
      console.warn('[Stats] Unknown xpType:', def.xpType);
      return 0;
  }
}

function getOverallLevel(stats) {
  let totalLevels = 0;
  let statCount = 0;
  for (const key of STAT_ORDER) {
    if (stats[key]) {
      totalLevels += getLevelFromXp(stats[key].xp);
      statCount++;
    }
  }
  const overall = statCount > 0 ? Math.floor(totalLevels / statCount) : 1;
  console.log(`[Stats] Overall level calculation: ${totalLevels} total / ${statCount} stats = ${overall}`);
  return overall;
}

function getTotalLevel(stats) {
  let total = 0;
  for (const key of STAT_ORDER) {
    if (stats[key]) {
      total += getLevelFromXp(stats[key].xp);
    }
  }
  console.log('[Stats] Total level (sum of all stat levels):', total);
  return total;
}

function getDefaultStats() {
  console.log('[Stats] Generating default stats for', STAT_ORDER.length, 'skills (all level 1)');
  const stats = {};
  for (const key of STAT_ORDER) {
    stats[key] = { level: 1, xp: 0 };
  }
  return stats;
}
