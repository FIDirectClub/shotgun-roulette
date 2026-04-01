"use client";

import { useState, useTransition } from "react";
import { Shotgun } from "@/lib/types";
import { addShotgun, removeShotgun } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function ShotgunForm({
  initialShotguns,
}: {
  initialShotguns: Shotgun[];
}) {
  const [shotguns, setShotguns] = useState(initialShotguns);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      const updated = await addShotgun(name.trim());
      setShotguns(updated);
      setName("");
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const updated = await removeShotgun(id);
      setShotguns(updated);
      router.refresh();
    });
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Shotgun Pool</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="e.g. Beretta A400"
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          disabled={isPending}
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !name.trim()}
          className="px-4 py-2 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>
      {shotguns.length === 0 ? (
        <p className="text-gray-500 text-sm">No shotguns added yet.</p>
      ) : (
        <ul className="space-y-2">
          {shotguns.map((sg) => (
            <li
              key={sg.id}
              className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-2"
            >
              <span className="font-medium">{sg.name}</span>
              <button
                onClick={() => handleRemove(sg.id)}
                disabled={isPending}
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
