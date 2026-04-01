import { getCompetition, getScores, getShotguns } from "@/lib/actions";
import { calculateStats } from "@/lib/stats";
import LeaderboardTable from "@/components/leaderboard-table";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [competition, scores, shotguns] = await Promise.all([
    getCompetition(),
    getScores(),
    getShotguns(),
  ]);

  if (!competition) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-3xl font-extrabold mb-4">Leaderboard</h1>
        <p className="text-gray-400 text-lg">No competition yet.</p>
      </div>
    );
  }

  const stats = calculateStats(scores, shotguns, competition.participants);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">{competition.name}</h1>
        <p className="text-gray-400">
          {competition.participants.length} shooters &middot;{" "}
          {competition.numStages} stages &middot; {competition.shotsPerStage} shots/stage &middot;{" "}
          <span
            className={
              competition.status === "completed"
                ? "text-amber-400"
                : "text-green-400"
            }
          >
            {competition.status}
          </span>
        </p>
      </div>
      <LeaderboardTable
        scores={scores}
        participants={competition.participants}
        shotguns={shotguns}
        numStages={competition.numStages}
        shotsPerStage={competition.shotsPerStage}
        stats={stats}
      />
    </div>
  );
}
