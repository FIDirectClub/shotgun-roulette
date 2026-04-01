import {
  getCompetition,
  getCompetitionState,
  getShotguns,
} from "@/lib/actions";
import StationClient from "./client";

export const dynamic = "force-dynamic";

export default async function StationPage() {
  const [competition, state, shotguns] = await Promise.all([
    getCompetition(),
    getCompetitionState(),
    getShotguns(),
  ]);

  if (!competition || competition.status !== "active" || !state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-3xl font-extrabold mb-4">Station</h1>
        <p className="text-gray-400 text-lg">
          No active competition. Head to Admin to set one up.
        </p>
      </div>
    );
  }

  const currentParticipant = competition.participants[state.participantIndex];

  return (
    <StationClient
      competition={competition}
      state={state}
      shotguns={shotguns}
      currentParticipant={currentParticipant}
    />
  );
}
