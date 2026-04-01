import { getShotguns, getCompetition } from "@/lib/actions";
import ShotgunForm from "@/components/shotgun-form";
import CompetitionForm from "@/components/competition-form";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [shotguns, competition] = await Promise.all([
    getShotguns(),
    getCompetition(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Admin Panel</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <ShotgunForm initialShotguns={shotguns} />
        <CompetitionForm
          competition={competition}
          shotgunCount={shotguns.length}
        />
      </div>
    </div>
  );
}
