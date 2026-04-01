"use client";

import { useState, useTransition } from "react";
import { Competition } from "@/lib/types";
import {
  createCompetition,
  deleteCompetition,
} from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function CompetitionForm({
  competition,
  shotgunCount,
}: {
  competition: Competition | null;
  shotgunCount: number;
}) {
  const [name, setName] = useState("");
  const [numStages, setNumStages] = useState(5);
  const [shotsPerStage, setShotsPerStage] = useState(2);
  const [participantText, setParticipantText] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate() {
    const names = participantText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!name.trim() || names.length === 0 || numStages < 1) return;
    startTransition(async () => {
      await createCompetition(name.trim(), numStages, shotsPerStage, names);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteCompetition();
      router.refresh();
    });
  }

  if (competition) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Active Competition</h2>
        <div className="space-y-2 mb-4">
          <p>
            <span className="text-gray-400">Name:</span>{" "}
            <span className="font-bold">{competition.name}</span>
          </p>
          <p>
            <span className="text-gray-400">Status:</span>{" "}
            <span
              className={`font-bold ${
                competition.status === "active"
                  ? "text-green-400"
                  : "text-gray-400"
              }`}
            >
              {competition.status}
            </span>
          </p>
          <p>
            <span className="text-gray-400">Stages:</span> {competition.numStages}
          </p>
          <p>
            <span className="text-gray-400">Shots per stage:</span> {competition.shotsPerStage}
          </p>
          <p>
            <span className="text-gray-400">Participants:</span>{" "}
            {competition.participants.map((p) => p.name).join(", ")}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors"
        >
          Delete Competition
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Create Competition</h2>
      {shotgunCount === 0 && (
        <p className="text-amber-400 text-sm mb-4">
          Add at least one shotgun to the pool before creating a competition.
        </p>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Competition Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring Shootout 2026"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Number of Stages</label>
          <input
            type="number"
            value={numStages}
            onChange={(e) => setNumStages(parseInt(e.target.value) || 1)}
            min={1}
            max={50}
            className="w-32 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Shots per Stage</label>
          <input
            type="number"
            value={shotsPerStage}
            onChange={(e) => setShotsPerStage(parseInt(e.target.value) || 1)}
            min={1}
            max={10}
            className="w-32 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Participants (one per line)
          </label>
          <textarea
            value={participantText}
            onChange={(e) => setParticipantText(e.target.value)}
            placeholder={"John Smith\nJane Doe\nBob Johnson"}
            rows={6}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={isPending || shotgunCount === 0 || !name.trim() || !participantText.trim()}
          className="px-6 py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          Start Competition
        </button>
      </div>
    </div>
  );
}
