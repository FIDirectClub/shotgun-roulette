"use client";

import { useState, useTransition } from "react";
import { recordScore } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function ScoreEntry({
  participantName,
  shotgunName,
}: {
  participantName: string;
  shotgunName: string;
}) {
  const [shot1, setShot1] = useState<boolean | null>(null);
  const [shot2, setShot2] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  function handleSubmit() {
    if (shot1 === null || shot2 === null) return;
    startTransition(async () => {
      await recordScore(shot1, shot2);
      setSubmitted(true);
      setTimeout(() => {
        setShot1(null);
        setShot2(null);
        setSubmitted(false);
        router.refresh();
      }, 1500);
    });
  }

  if (submitted) {
    const total = (shot1 ? 1 : 0) + (shot2 ? 1 : 0);
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-2xl font-bold text-green-400">
          Score recorded: {total}/2
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
        <div>
          <p className="text-sm text-gray-400 mb-2">Shot 1</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShot1(true)}
              className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
                shot1 === true
                  ? "bg-green-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              HIT
            </button>
            <button
              onClick={() => setShot1(false)}
              className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
                shot1 === false
                  ? "bg-red-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              MISS
            </button>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-2">Shot 2</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShot2(true)}
              className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
                shot2 === true
                  ? "bg-green-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              HIT
            </button>
            <button
              onClick={() => setShot2(false)}
              className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
                shot2 === false
                  ? "bg-red-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              MISS
            </button>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={shot1 === null || shot2 === null || isPending}
          className="w-full py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          Submit Score
        </button>
      </div>
    </div>
  );
}
