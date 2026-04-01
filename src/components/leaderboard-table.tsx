"use client";

import { Fragment, useState } from "react";
import { ScoreEntry, Shotgun, Participant } from "@/lib/types";
import { FunStats } from "@/lib/stats";

const MEDALS = ["text-yellow-400", "text-gray-300", "text-amber-600"];

export default function LeaderboardTable({
  scores,
  participants,
  shotguns,
  numStages,
  stats,
}: {
  scores: ScoreEntry[];
  participants: Participant[];
  shotguns: Shotgun[];
  numStages: number;
  stats: FunStats;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calculate totals
  const rankings = participants
    .map((p) => {
      const pScores = scores.filter((s) => s.participantId === p.id);
      const totalHits = pScores.reduce(
        (sum, s) => sum + (s.shot1 ? 1 : 0) + (s.shot2 ? 1 : 0),
        0
      );
      const totalShots = pScores.length * 2;
      return { ...p, totalHits, totalShots, pScores };
    })
    .sort((a, b) => b.totalHits - a.totalHits);

  function getShotgunName(id: string) {
    return shotguns.find((s) => s.id === id)?.name ?? id;
  }

  return (
    <div className="space-y-8">
      {/* Rankings table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-sm text-gray-400">#</th>
              <th className="text-left px-4 py-3 text-sm text-gray-400">Shooter</th>
              <th className="text-right px-4 py-3 text-sm text-gray-400">Hits</th>
              <th className="text-right px-4 py-3 text-sm text-gray-400">Possible</th>
              <th className="text-right px-4 py-3 text-sm text-gray-400">%</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => (
              <Fragment key={r.id}>
                <tr
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <td className={`px-4 py-3 font-bold ${MEDALS[i] ?? "text-gray-400"}`}>
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right font-bold">{r.totalHits}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{r.totalShots}</td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {r.totalShots > 0
                      ? Math.round((r.totalHits / r.totalShots) * 100)
                      : 0}
                    %
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr key={`${r.id}-detail`}>
                    <td colSpan={5} className="px-4 py-3 bg-gray-900">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Array.from({ length: numStages }, (_, stageIdx) => {
                          const stageScore = r.pScores.find(
                            (s) => s.stage === stageIdx + 1
                          );
                          if (!stageScore) {
                            return (
                              <div
                                key={stageIdx}
                                className="bg-gray-800 rounded-lg p-2 text-center text-sm"
                              >
                                <p className="text-gray-500">Stage {stageIdx + 1}</p>
                                <p className="text-gray-600">--</p>
                              </div>
                            );
                          }
                          const total =
                            (stageScore.shot1 ? 1 : 0) + (stageScore.shot2 ? 1 : 0);
                          return (
                            <div
                              key={stageIdx}
                              className="bg-gray-800 rounded-lg p-2 text-center text-sm"
                            >
                              <p className="text-gray-400">Stage {stageIdx + 1}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {getShotgunName(stageScore.shotgunId)}
                              </p>
                              <p className="font-bold mt-1">
                                <span className={stageScore.shot1 ? "text-green-400" : "text-red-400"}>
                                  {stageScore.shot1 ? "H" : "M"}
                                </span>
                                {" "}
                                <span className={stageScore.shot2 ? "text-green-400" : "text-red-400"}>
                                  {stageScore.shot2 ? "H" : "M"}
                                </span>
                                <span className="text-gray-400 ml-2">({total}/2)</span>
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fun Stats */}
      <div>
        <h2 className="text-2xl font-extrabold mb-4">Fun Stats</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.bestShotgun && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Best Shotgun</p>
              <p className="text-xl font-bold text-green-400">{stats.bestShotgun.name}</p>
              <p className="text-sm text-gray-400">
                Avg: {stats.bestShotgun.avg.toFixed(1)}/2
              </p>
            </div>
          )}
          {stats.worstShotgun && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Worst Shotgun</p>
              <p className="text-xl font-bold text-red-400">{stats.worstShotgun.name}</p>
              <p className="text-sm text-gray-400">
                Avg: {stats.worstShotgun.avg.toFixed(1)}/2
              </p>
            </div>
          )}
          {stats.longestHitStreak && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Longest Hit Streak</p>
              <p className="text-xl font-bold">{stats.longestHitStreak.participantName}</p>
              <p className="text-sm text-gray-400">
                {stats.longestHitStreak.streak} hits in a row
              </p>
            </div>
          )}
          {stats.longestMissStreak && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Longest Miss Streak</p>
              <p className="text-xl font-bold">{stats.longestMissStreak.participantName}</p>
              <p className="text-sm text-gray-400">
                {stats.longestMissStreak.streak} misses in a row
              </p>
            </div>
          )}
          {stats.luckiestSpinner && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Luckiest Spinner</p>
              <p className="text-xl font-bold">{stats.luckiestSpinner.participantName}</p>
              <p className="text-sm text-gray-400">
                Got the best shotgun {stats.luckiestSpinner.count}x
              </p>
            </div>
          )}
          {stats.perfectStages.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Perfect Stages (2/2)</p>
              {stats.perfectStages.map((ps) => (
                <p key={ps.participantName} className="font-medium">
                  {ps.participantName}: <span className="text-green-400">{ps.count}</span>
                </p>
              ))}
            </div>
          )}
          {stats.shutoutStages.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Shutout Stages (0/2)</p>
              {stats.shutoutStages.map((ss) => (
                <p key={ss.participantName} className="font-medium">
                  {ss.participantName}: <span className="text-red-400">{ss.count}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
