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
  shotsPerStage: number;
  participants: Participant[];
  createdAt: string;
}

export interface ScoreEntry {
  participantId: string;
  stage: number;
  shotgunId: string;
  shots: boolean[];
}

export interface CompetitionState {
  stage: number;
  participantIndex: number;
  shotgunId: string | null;
  wheelSpun: boolean;
}
