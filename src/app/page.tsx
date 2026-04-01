import Link from "next/link";
import { getCompetition } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const competition = await getCompetition();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-extrabold tracking-tight mb-4">
        Shotgun <span className="text-amber-400">Roulette</span>
      </h1>
      <p className="text-gray-400 text-lg mb-10 max-w-md">
        Spin the wheel. Grab a shotgun. Shoot some clays.
      </p>

      {competition && competition.status === "active" ? (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm">
            <p className="text-sm text-gray-400 uppercase tracking-wide">Active Competition</p>
            <p className="text-2xl font-bold mt-1">{competition.name}</p>
            <p className="text-gray-400 mt-1">
              {competition.participants.length} shooters &middot; {competition.numStages} stages
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/station"
              className="px-6 py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Go to Station
            </Link>
            <Link
              href="/leaderboard"
              className="px-6 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      ) : (
        <Link
          href="/admin"
          className="px-8 py-4 bg-amber-500 text-gray-900 font-bold text-lg rounded-lg hover:bg-amber-400 transition-colors"
        >
          Set Up a Competition
        </Link>
      )}
    </div>
  );
}
