export interface Shotgun {
  id: string;
  name: string;
}

export interface Participant {
  id: string;
  name: string;
}

export interface Competition {
  id: string;
  name: string;
  status: "setup" | "active" | "completed";
  numStages: number;
  participants: Participant[];
  createdAt: string;
}

export interface ScoreEntry {
  participantId: string;
  stage: number;
  shotgunId: string;
  shot1: boolean;
  shot2: boolean;
}

export interface CompetitionState {
  stage: number;
  participantIndex: number;
  shotgunId: string | null;
  wheelSpun: boolean;
}
