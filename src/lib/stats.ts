import { ScoreEntry, Shotgun, Participant } from "./types";

export interface FunStats {
  bestShotgun: { name: string; avg: number } | null;
  worstShotgun: { name: string; avg: number } | null;
  longestHitStreak: { participantName: string; streak: number } | null;
  longestMissStreak: { participantName: string; streak: number } | null;
  luckiestSpinner: { participantName: string; count: number } | null;
  perfectStages: { participantName: string; count: number }[];
  shutoutStages: { participantName: string; count: number }[];
}

export function calculateStats(
  scores: ScoreEntry[],
  shotguns: Shotgun[],
  participants: Participant[]
): FunStats {
  if (scores.length === 0) {
    return {
      bestShotgun: null,
      worstShotgun: null,
      longestHitStreak: null,
      longestMissStreak: null,
      luckiestSpinner: null,
      perfectStages: [],
      shutoutStages: [],
    };
  }

  // Best/Worst Shotgun by average score
  const shotgunScores: Record<string, number[]> = {};
  for (const s of scores) {
    if (!shotgunScores[s.shotgunId]) shotgunScores[s.shotgunId] = [];
    shotgunScores[s.shotgunId].push(s.shots.filter(Boolean).length);
  }

  let bestShotgun: FunStats["bestShotgun"] = null;
  let worstShotgun: FunStats["worstShotgun"] = null;

  for (const [sgId, vals] of Object.entries(shotgunScores)) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const name = shotguns.find((sg) => sg.id === sgId)?.name ?? sgId;
    if (!bestShotgun || avg > bestShotgun.avg) bestShotgun = { name, avg };
    if (!worstShotgun || avg < worstShotgun.avg) worstShotgun = { name, avg };
  }

  // Longest hit/miss streaks per participant
  let longestHitStreak: FunStats["longestHitStreak"] = null;
  let longestMissStreak: FunStats["longestMissStreak"] = null;

  for (const p of participants) {
    const pScores = scores
      .filter((s) => s.participantId === p.id)
      .sort((a, b) => a.stage - b.stage);
    const shots: boolean[] = [];
    for (const s of pScores) {
      shots.push(...s.shots);
    }

    let hitStreak = 0;
    let maxHit = 0;
    let missStreak = 0;
    let maxMiss = 0;
    for (const hit of shots) {
      if (hit) {
        hitStreak++;
        missStreak = 0;
        maxHit = Math.max(maxHit, hitStreak);
      } else {
        missStreak++;
        hitStreak = 0;
        maxMiss = Math.max(maxMiss, missStreak);
      }
    }
    if (!longestHitStreak || maxHit > longestHitStreak.streak) {
      longestHitStreak = { participantName: p.name, streak: maxHit };
    }
    if (!longestMissStreak || maxMiss > longestMissStreak.streak) {
      longestMissStreak = { participantName: p.name, streak: maxMiss };
    }
  }

  // Luckiest Spinner: who got the best shotgun most
  const luckiestSpinner: FunStats["luckiestSpinner"] = (() => {
    if (!bestShotgun) return null;
    const bestSgId = shotguns.find((sg) => sg.name === bestShotgun!.name)?.id;
    if (!bestSgId) return null;
    const counts: Record<string, number> = {};
    for (const s of scores) {
      if (s.shotgunId === bestSgId) {
        counts[s.participantId] = (counts[s.participantId] || 0) + 1;
      }
    }
    let maxId = "";
    let maxCount = 0;
    for (const [pid, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxId = pid;
        maxCount = count;
      }
    }
    const name = participants.find((p) => p.id === maxId)?.name ?? maxId;
    return maxCount > 0 ? { participantName: name, count: maxCount } : null;
  })();

  // Perfect (2/2) and Shutout (0/2) stages per participant
  const perfectStages: FunStats["perfectStages"] = [];
  const shutoutStages: FunStats["shutoutStages"] = [];
  for (const p of participants) {
    const pScores = scores.filter((s) => s.participantId === p.id);
    const perfect = pScores.filter((s) => s.shots.every(Boolean)).length;
    const shutout = pScores.filter((s) => s.shots.every((sh) => !sh)).length;
    if (perfect > 0) perfectStages.push({ participantName: p.name, count: perfect });
    if (shutout > 0) shutoutStages.push({ participantName: p.name, count: shutout });
  }
  perfectStages.sort((a, b) => b.count - a.count);
  shutoutStages.sort((a, b) => b.count - a.count);

  return {
    bestShotgun,
    worstShotgun,
    longestHitStreak,
    longestMissStreak,
    luckiestSpinner,
    perfectStages,
    shutoutStages,
  };
}
