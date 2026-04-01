"use client";

import { useState } from "react";
import { Competition, CompetitionState, Shotgun, Participant } from "@/lib/types";
import { setWheelResult } from "@/lib/actions";
import Wheel from "@/components/wheel";
import ScoreEntry from "@/components/score-entry";
import { useRouter } from "next/navigation";

export default function StationClient({
  competition,
  state,
  shotguns,
  currentParticipant,
}: {
  competition: Competition;
  state: CompetitionState;
  shotguns: Shotgun[];
  currentParticipant: Participant;
}) {
  const [selectedShotgun, setSelectedShotgun] = useState<Shotgun | null>(
    state.wheelSpun && state.shotgunId
      ? shotguns.find((s) => s.id === state.shotgunId) ?? null
      : null
  );
  const router = useRouter();

  async function handleWheelResult(shotgun: Shotgun) {
    await setWheelResult(shotgun.id);
    setSelectedShotgun(shotgun);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status bar */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="bg-gray-800 px-6 py-3 rounded-xl text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Shooter</p>
          <p className="text-xl font-bold">{currentParticipant.name}</p>
        </div>
        <div className="bg-gray-800 px-6 py-3 rounded-xl text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Stage</p>
          <p className="text-xl font-bold">
            {state.stage} of {competition.numStages}
          </p>
        </div>
        {selectedShotgun && (
          <div className="bg-gray-800 px-6 py-3 rounded-xl text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Shotgun</p>
            <p className="text-xl font-bold text-amber-400">{selectedShotgun.name}</p>
          </div>
        )}
      </div>

      {/* Wheel or Score Entry */}
      {!selectedShotgun ? (
        <Wheel shotguns={shotguns} onResult={handleWheelResult} />
      ) : (
        <ScoreEntry
          participantName={currentParticipant.name}
          shotgunName={selectedShotgun.name}
        />
      )}
    </div>
  );
}
