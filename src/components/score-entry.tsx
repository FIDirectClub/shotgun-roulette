"use client";

import { useState, useTransition } from "react";
import { recordScore } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function ScoreEntry({
  participantName,
  shotgunName,
  shotsPerStage,
}: {
  participantName: string;
  shotgunName: string;
  shotsPerStage: number;
}) {
  const [shots, setShots] = useState<(boolean | null)[]>(
    Array(shotsPerStage).fill(null)
  );
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  function setShot(index: number, value: boolean) {
    setShots((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const allAnswered = shots.every((s) => s !== null);

  function handleSubmit() {
    if (!allAnswered) return;
    startTransition(async () => {
      await recordScore(shots as boolean[]);
      setSubmitted(true);
      setTimeout(() => {
        setShots(Array(shotsPerStage).fill(null));
        setSubmitted(false);
        router.refresh();
      }, 1500);
    });
  }

  if (submitted) {
    const total = shots.filter(Boolean).length;
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-2xl font-bold text-green-400">
          Score recorded: {total}/{shotsPerStage}
        </p>
        <p className="text-gray-400 mt-2">Advancing to next shooter...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-1">{participantName}</h3>
      <p className="text-gray-400 text-sm mb-4">Shooting: {shotgunName}</p>
      <div className="space-y-4">
        {shots.map((shot, i) => (
          <div key={i}>
            <p className="text-sm text-gray-400 mb-2">Shot {i + 1}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShot(i, true)}
                className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
                  shot === true
                    ? "bg-green-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                HIT
              </button>
              <button
                onClick={() => setShot(i, false)}
                className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
                  shot === false
                    ? "bg-red-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                MISS
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || isPending}
          className="w-full py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          Submit Score
        </button>
      </div>
    </div>
  );
}
