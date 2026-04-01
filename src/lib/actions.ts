"use server";

import { redis } from "./redis";
import { Shotgun, Competition, ScoreEntry, CompetitionState } from "./types";

// ============ SHOTGUNS ============

export async function getShotguns(): Promise<Shotgun[]> {
  const shotguns = await redis.get<Shotgun[]>("shotguns");
  return shotguns ?? [];
}

export async function addShotgun(name: string): Promise<Shotgun[]> {
  const shotguns = await getShotguns();
  const id = `sg_${Date.now()}`;
  const updated = [...shotguns, { id, name }];
  await redis.set("shotguns", updated);
  return updated;
}

export async function removeShotgun(id: string): Promise<Shotgun[]> {
  const shotguns = await getShotguns();
  const updated = shotguns.filter((s) => s.id !== id);
  await redis.set("shotguns", updated);
  return updated;
}

// ============ COMPETITION ============

export async function getCompetition(): Promise<Competition | null> {
  return await redis.get<Competition>("competition");
}

export async function createCompetition(
  name: string,
  numStages: number,
  participantNames: string[]
): Promise<Competition> {
  const id = `comp_${Date.now()}`;
  const competition: Competition = {
    id,
    name,
    status: "active",
    numStages,
    participants: participantNames.map((pName, i) => ({
      id: `p_${i}_${Date.now()}`,
      name: pName,
    })),
    createdAt: new Date().toISOString(),
  };
  await redis.set("competition", competition);
  await redis.set(`scores:${id}`, []);
  await redis.set(`current:${id}`, {
    stage: 1,
    participantIndex: 0,
    shotgunId: null,
    wheelSpun: false,
  } satisfies CompetitionState);
  return competition;
}

export async function deleteCompetition(): Promise<void> {
  const comp = await getCompetition();
  if (comp) {
    await redis.del(`scores:${comp.id}`);
    await redis.del(`current:${comp.id}`);
    await redis.del("competition");
  }
}

// ============ COMPETITION STATE ============

export async function getCompetitionState(): Promise<CompetitionState | null> {
  const comp = await getCompetition();
  if (!comp) return null;
  return await redis.get<CompetitionState>(`current:${comp.id}`);
}

export async function setWheelResult(shotgunId: string): Promise<void> {
  const comp = await getCompetition();
  if (!comp) return;
  const state = await redis.get<CompetitionState>(`current:${comp.id}`);
  if (!state) return;
  await redis.set(`current:${comp.id}`, {
    ...state,
    shotgunId,
    wheelSpun: true,
  });
}

export async function recordScore(
  shot1: boolean,
  shot2: boolean
): Promise<void> {
  const comp = await getCompetition();
  if (!comp) return;
  const state = await redis.get<CompetitionState>(`current:${comp.id}`);
  if (!state || !state.shotgunId) return;

  const scores = (await redis.get<ScoreEntry[]>(`scores:${comp.id}`)) ?? [];
  const participant = comp.participants[state.participantIndex];

  scores.push({
    participantId: participant.id,
    stage: state.stage,
    shotgunId: state.shotgunId,
    shot1,
    shot2,
  });

  await redis.set(`scores:${comp.id}`, scores);

  // Advance to next participant or next stage
  const nextParticipantIndex = state.participantIndex + 1;
  if (nextParticipantIndex < comp.participants.length) {
    await redis.set(`current:${comp.id}`, {
      stage: state.stage,
      participantIndex: nextParticipantIndex,
      shotgunId: null,
      wheelSpun: false,
    } satisfies CompetitionState);
  } else if (state.stage < comp.numStages) {
    await redis.set(`current:${comp.id}`, {
      stage: state.stage + 1,
      participantIndex: 0,
      shotgunId: null,
      wheelSpun: false,
    } satisfies CompetitionState);
  } else {
    // Competition complete
    const updatedComp: Competition = { ...comp, status: "completed" };
    await redis.set("competition", updatedComp);
    await redis.set(`current:${comp.id}`, {
      ...state,
      shotgunId: null,
      wheelSpun: false,
    });
  }
}

// ============ SCORES ============

export async function getScores(): Promise<ScoreEntry[]> {
  const comp = await getCompetition();
  if (!comp) return [];
  return (await redis.get<ScoreEntry[]>(`scores:${comp.id}`)) ?? [];
}
