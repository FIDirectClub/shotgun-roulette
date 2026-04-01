# Shotgun Roulette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web app for running shotgun roulette competitions with a spinning wheel, scorecards, and leaderboard.

**Architecture:** Next.js 14+ App Router with Server Actions for data mutations. Upstash Redis (via Vercel Marketplace) for persistence. Client components for the spinning wheel animation; server components for data-fetching pages. Tailwind CSS for styling.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, @upstash/redis, Vercel

---

## File Structure

```
shotgun-roulette/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.local                    # UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
├── .gitignore
├── public/
│   └── sounds/
│       ├── tick.mp3              # Wheel tick sound
│       ├── whoosh.mp3            # Spin start sound
│       └── reveal.mp3            # Result reveal sound
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with nav bar
│   │   ├── globals.css           # Tailwind imports + wheel animation CSS
│   │   ├── page.tsx              # Home/dashboard
│   │   ├── admin/
│   │   │   └── page.tsx          # Admin panel (shotguns + competition setup + score entry)
│   │   ├── station/
│   │   │   └── page.tsx          # Station page (wheel + score entry)
│   │   └── leaderboard/
│   │       └── page.tsx          # Leaderboard + fun stats
│   ├── lib/
│   │   ├── redis.ts              # Redis client singleton
│   │   ├── types.ts              # Shared TypeScript types
│   │   ├── actions.ts            # All Server Actions (shotguns, competition, scores)
│   │   └── stats.ts              # Fun stats calculation functions
│   └── components/
│       ├── nav.tsx               # Persistent navigation bar
│       ├── wheel.tsx             # Spinning wheel (client component)
│       ├── score-entry.tsx       # Hit/miss entry UI (client component)
│       ├── shotgun-form.tsx      # Add/remove shotgun form (client component)
│       ├── competition-form.tsx  # Create competition form (client component)
│       └── leaderboard-table.tsx # Leaderboard + scorecards + stats (client component)
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.env.local`, `.gitignore`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: Project scaffolded with `src/app` directory, `tailwind.config.ts`, `next.config.ts`, `package.json`.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install @upstash/redis canvas-confetti
npm install --save-dev @types/canvas-confetti
```

- [ ] **Step 3: Create `.env.local`**

Create `/.env.local`:
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

These will be populated after creating the Upstash Redis store in the Vercel dashboard.

- [ ] **Step 4: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: Server starts on `http://localhost:3000` with default Next.js page.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind and dependencies"
```

---

### Task 2: Shared Types and Redis Client

**Files:**
- Create: `src/lib/types.ts`, `src/lib/redis.ts`

- [ ] **Step 1: Create shared types**

Create `src/lib/types.ts`:
```typescript
export interface Shotgun {
  id: string;
  name: string;
}

export interface Participant {
  id: string;
  name: string;
}

export interface Competition {
  id: string;
  name: string;
  status: "setup" | "active" | "completed";
  numStages: number;
  participants: Participant[];
  createdAt: string;
}

export interface ScoreEntry {
  participantId: string;
  stage: number;
  shotgunId: string;
  shot1: boolean;
  shot2: boolean;
}

export interface CompetitionState {
  stage: number;
  participantIndex: number;
  shotgunId: string | null;
  wheelSpun: boolean;
}
```

- [ ] **Step 2: Create Redis client singleton**

Create `src/lib/redis.ts`:
```typescript
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/redis.ts
git commit -m "feat: add shared types and Redis client"
```

---

### Task 3: Server Actions

**Files:**
- Create: `src/lib/actions.ts`

- [ ] **Step 1: Create all server actions**

Create `src/lib/actions.ts`:
```typescript
"use server";

import { redis } from "./redis";
import { Shotgun, Competition, ScoreEntry, CompetitionState } from "./types";

// ============ SHOTGUNS ============

export async function getShotguns(): Promise<Shotgun[]> {
  const shotguns = await redis.get<Shotgun[]>("shotguns");
  return shotguns ?? [];
}

export async function addShotgun(name: string): Promise<Shotgun[]> {
  const shotguns = await getShotguns();
  const id = `sg_${Date.now()}`;
  const updated = [...shotguns, { id, name }];
  await redis.set("shotguns", updated);
  return updated;
}

export async function removeShotgun(id: string): Promise<Shotgun[]> {
  const shotguns = await getShotguns();
  const updated = shotguns.filter((s) => s.id !== id);
  await redis.set("shotguns", updated);
  return updated;
}

// ============ COMPETITION ============

export async function getCompetition(): Promise<Competition | null> {
  return await redis.get<Competition>("competition");
}

export async function createCompetition(
  name: string,
  numStages: number,
  participantNames: string[]
): Promise<Competition> {
  const id = `comp_${Date.now()}`;
  const competition: Competition = {
    id,
    name,
    status: "active",
    numStages,
    participants: participantNames.map((pName, i) => ({
      id: `p_${i}_${Date.now()}`,
      name: pName,
    })),
    createdAt: new Date().toISOString(),
  };
  await redis.set("competition", competition);
  await redis.set(`scores:${id}`, []);
  await redis.set(`current:${id}`, {
    stage: 1,
    participantIndex: 0,
    shotgunId: null,
    wheelSpun: false,
  } satisfies CompetitionState);
  return competition;
}

export async function deleteCompetition(): Promise<void> {
  const comp = await getCompetition();
  if (comp) {
    await redis.del(`scores:${comp.id}`);
    await redis.del(`current:${comp.id}`);
    await redis.del("competition");
  }
}

// ============ COMPETITION STATE ============

export async function getCompetitionState(): Promise<CompetitionState | null> {
  const comp = await getCompetition();
  if (!comp) return null;
  return await redis.get<CompetitionState>(`current:${comp.id}`);
}

export async function setWheelResult(shotgunId: string): Promise<void> {
  const comp = await getCompetition();
  if (!comp) return;
  const state = await redis.get<CompetitionState>(`current:${comp.id}`);
  if (!state) return;
  await redis.set(`current:${comp.id}`, {
    ...state,
    shotgunId,
    wheelSpun: true,
  });
}

export async function recordScore(
  shot1: boolean,
  shot2: boolean
): Promise<void> {
  const comp = await getCompetition();
  if (!comp) return;
  const state = await redis.get<CompetitionState>(`current:${comp.id}`);
  if (!state || !state.shotgunId) return;

  const scores = (await redis.get<ScoreEntry[]>(`scores:${comp.id}`)) ?? [];
  const participant = comp.participants[state.participantIndex];

  scores.push({
    participantId: participant.id,
    stage: state.stage,
    shotgunId: state.shotgunId,
    shot1,
    shot2,
  });

  await redis.set(`scores:${comp.id}`, scores);

  // Advance to next participant or next stage
  const nextParticipantIndex = state.participantIndex + 1;
  if (nextParticipantIndex < comp.participants.length) {
    await redis.set(`current:${comp.id}`, {
      stage: state.stage,
      participantIndex: nextParticipantIndex,
      shotgunId: null,
      wheelSpun: false,
    } satisfies CompetitionState);
  } else if (state.stage < comp.numStages) {
    await redis.set(`current:${comp.id}`, {
      stage: state.stage + 1,
      participantIndex: 0,
      shotgunId: null,
      wheelSpun: false,
    } satisfies CompetitionState);
  } else {
    // Competition complete
    const updatedComp: Competition = { ...comp, status: "completed" };
    await redis.set("competition", updatedComp);
    await redis.set(`current:${comp.id}`, {
      ...state,
      shotgunId: null,
      wheelSpun: false,
    });
  }
}

// ============ SCORES ============

export async function getScores(): Promise<ScoreEntry[]> {
  const comp = await getCompetition();
  if (!comp) return [];
  return (await redis.get<ScoreEntry[]>(`scores:${comp.id}`)) ?? [];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions.ts
git commit -m "feat: add all server actions for shotguns, competition, and scores"
```

---

### Task 4: Fun Stats Calculator

**Files:**
- Create: `src/lib/stats.ts`

- [ ] **Step 1: Create stats calculation functions**

Create `src/lib/stats.ts`:
```typescript
import { ScoreEntry, Shotgun, Participant } from "./types";

export interface FunStats {
  bestShotgun: { name: string; avg: number } | null;
  worstShotgun: { name: string; avg: number } | null;
  longestHitStreak: { participantName: string; streak: number } | null;
  longestMissStreak: { participantName: string; streak: number } | null;
  luckiestSpinner: { participantName: string; count: number } | null;
  perfectStages: { participantName: string; count: number }[];
  shutoutStages: { participantName: string; count: number }[];
}

export function calculateStats(
  scores: ScoreEntry[],
  shotguns: Shotgun[],
  participants: Participant[]
): FunStats {
  if (scores.length === 0) {
    return {
      bestShotgun: null,
      worstShotgun: null,
      longestHitStreak: null,
      longestMissStreak: null,
      luckiestSpinner: null,
      perfectStages: [],
      shutoutStages: [],
    };
  }

  // Best/Worst Shotgun by average score
  const shotgunScores: Record<string, number[]> = {};
  for (const s of scores) {
    if (!shotgunScores[s.shotgunId]) shotgunScores[s.shotgunId] = [];
    shotgunScores[s.shotgunId].push((s.shot1 ? 1 : 0) + (s.shot2 ? 1 : 0));
  }

  let bestShotgun: FunStats["bestShotgun"] = null;
  let worstShotgun: FunStats["worstShotgun"] = null;

  for (const [sgId, vals] of Object.entries(shotgunScores)) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const name = shotguns.find((sg) => sg.id === sgId)?.name ?? sgId;
    if (!bestShotgun || avg > bestShotgun.avg) bestShotgun = { name, avg };
    if (!worstShotgun || avg < worstShotgun.avg) worstShotgun = { name, avg };
  }

  // Longest hit/miss streaks per participant
  let longestHitStreak: FunStats["longestHitStreak"] = null;
  let longestMissStreak: FunStats["longestMissStreak"] = null;

  for (const p of participants) {
    const pScores = scores
      .filter((s) => s.participantId === p.id)
      .sort((a, b) => a.stage - b.stage);
    const shots: boolean[] = [];
    for (const s of pScores) {
      shots.push(s.shot1, s.shot2);
    }

    let hitStreak = 0;
    let maxHit = 0;
    let missStreak = 0;
    let maxMiss = 0;
    for (const hit of shots) {
      if (hit) {
        hitStreak++;
        missStreak = 0;
        maxHit = Math.max(maxHit, hitStreak);
      } else {
        missStreak++;
        hitStreak = 0;
        maxMiss = Math.max(maxMiss, missStreak);
      }
    }
    if (!longestHitStreak || maxHit > longestHitStreak.streak) {
      longestHitStreak = { participantName: p.name, streak: maxHit };
    }
    if (!longestMissStreak || maxMiss > longestMissStreak.streak) {
      longestMissStreak = { participantName: p.name, streak: maxMiss };
    }
  }

  // Luckiest Spinner: who got the best shotgun most
  const luckiestSpinner: FunStats["luckiestSpinner"] = (() => {
    if (!bestShotgun) return null;
    const bestSgId = shotguns.find((sg) => sg.name === bestShotgun!.name)?.id;
    if (!bestSgId) return null;
    const counts: Record<string, number> = {};
    for (const s of scores) {
      if (s.shotgunId === bestSgId) {
        counts[s.participantId] = (counts[s.participantId] || 0) + 1;
      }
    }
    let maxId = "";
    let maxCount = 0;
    for (const [pid, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxId = pid;
        maxCount = count;
      }
    }
    const name = participants.find((p) => p.id === maxId)?.name ?? maxId;
    return maxCount > 0 ? { participantName: name, count: maxCount } : null;
  })();

  // Perfect (2/2) and Shutout (0/2) stages per participant
  const perfectStages: FunStats["perfectStages"] = [];
  const shutoutStages: FunStats["shutoutStages"] = [];
  for (const p of participants) {
    const pScores = scores.filter((s) => s.participantId === p.id);
    const perfect = pScores.filter((s) => s.shot1 && s.shot2).length;
    const shutout = pScores.filter((s) => !s.shot1 && !s.shot2).length;
    if (perfect > 0) perfectStages.push({ participantName: p.name, count: perfect });
    if (shutout > 0) shutoutStages.push({ participantName: p.name, count: shutout });
  }
  perfectStages.sort((a, b) => b.count - a.count);
  shutoutStages.sort((a, b) => b.count - a.count);

  return {
    bestShotgun,
    worstShotgun,
    longestHitStreak,
    longestMissStreak,
    luckiestSpinner,
    perfectStages,
    shutoutStages,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stats.ts
git commit -m "feat: add fun stats calculator"
```

---

### Task 5: Navigation Bar Component

**Files:**
- Create: `src/components/nav.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create nav component**

Create `src/components/nav.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "/station", label: "Station" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="text-xl font-bold text-amber-400 tracking-tight">
          Shotgun Roulette
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-amber-500 text-gray-900"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-300 hover:text-white"
          onClick={() => setOpen(!open)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-700 px-4 pb-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium mt-1 ${
                pathname === link.href
                  ? "bg-amber-500 text-gray-900"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Update root layout**

Replace the contents of `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shotgun Roulette",
  description: "Spin the wheel. Grab a shotgun. Shoot some clays.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify nav renders**

Run `npm run dev`, open `http://localhost:3000`. Confirm nav bar shows with 4 links, amber highlight on active page, hamburger on mobile viewport.

- [ ] **Step 4: Commit**

```bash
git add src/components/nav.tsx src/app/layout.tsx
git commit -m "feat: add persistent navigation bar with mobile hamburger"
```

---

### Task 6: Home/Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the home page**

Replace `src/app/page.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add home/dashboard page"
```

---

### Task 7: Admin Page — Shotgun Management + Competition Setup

**Files:**
- Create: `src/components/shotgun-form.tsx`, `src/components/competition-form.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: Create shotgun form component**

Create `src/components/shotgun-form.tsx`:
```tsx
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
```

- [ ] **Step 2: Create competition form component**

Create `src/components/competition-form.tsx`:
```tsx
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
      await createCompetition(name.trim(), numStages, names);
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
```

- [ ] **Step 3: Create admin page**

Create `src/app/admin/page.tsx`:
```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shotgun-form.tsx src/components/competition-form.tsx src/app/admin/page.tsx
git commit -m "feat: add admin page with shotgun management and competition setup"
```

---

### Task 8: Spinning Wheel Component

**Files:**
- Create: `src/components/wheel.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add wheel animation CSS**

Append to `src/app/globals.css` (after the existing Tailwind directives):
```css
@keyframes wheel-glow {
  0%, 100% { filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.4)); }
  50% { filter: drop-shadow(0 0 40px rgba(245, 158, 11, 0.8)); }
}

.wheel-glow {
  animation: wheel-glow 1.5s ease-in-out infinite;
}

@keyframes reveal-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.reveal-pulse {
  animation: reveal-pulse 0.8s ease-in-out infinite;
}
```

- [ ] **Step 2: Create the spinning wheel component**

Create `src/components/wheel.tsx`:
```tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Shotgun } from "@/lib/types";

const COLORS = [
  "#E74C3C", "#3498DB", "#2ECC71", "#E67E22", "#9B59B6", "#1ABC9C",
  "#C0392B", "#2980B9", "#27AE60", "#D35400", "#8E44AD", "#16A085",
];

interface WheelProps {
  shotguns: Shotgun[];
  onResult: (shotgun: Shotgun) => void;
  disabled?: boolean;
}

export default function Wheel({ shotguns, onResult, disabled }: WheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Shotgun | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const whooshAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSegmentRef = useRef<number>(-1);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    tickAudioRef.current = new Audio("/sounds/tick.mp3");
    whooshAudioRef.current = new Audio("/sounds/whoosh.mp3");
    revealAudioRef.current = new Audio("/sounds/reveal.mp3");
    tickAudioRef.current.volume = 0.3;
  }, []);

  const n = shotguns.length;
  const segAngle = 360 / n;

  const playTick = useCallback(() => {
    if (tickAudioRef.current) {
      tickAudioRef.current.currentTime = 0;
      tickAudioRef.current.play().catch(() => {});
    }
  }, []);

  function spin() {
    if (spinning || disabled || n === 0) return;
    setResult(null);
    setShowReveal(false);
    setSpinning(true);
    lastSegmentRef.current = -1;

    if (whooshAudioRef.current) {
      whooshAudioRef.current.currentTime = 0;
      whooshAudioRef.current.play().catch(() => {});
    }

    // Random result: 5-8 full rotations + random offset
    const fullRotations = (5 + Math.random() * 3) * 360;
    const randomOffset = Math.random() * 360;
    // Snap to segment center if near a border (within 10% of segment)
    const segIndex = Math.floor(randomOffset / segAngle);
    const segCenter = segIndex * segAngle + segAngle / 2;
    const distFromCenter = Math.abs(randomOffset - segCenter);
    const threshold = segAngle * 0.1;
    const finalOffset =
      distFromCenter < threshold || distFromCenter > segAngle - threshold
        ? segCenter
        : randomOffset;

    const targetRotation = rotation + fullRotations + finalOffset;
    const duration = 4000 + Math.random() * 2000;
    const startRotation = rotation;
    const startTime = performance.now();

    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const currentRotation = startRotation + (targetRotation - startRotation) * eased;
      setRotation(currentRotation);

      // Tick on segment boundary crossings
      const normalizedAngle = ((currentRotation % 360) + 360) % 360;
      const currentSegment = Math.floor(normalizedAngle / segAngle) % n;
      if (currentSegment !== lastSegmentRef.current && lastSegmentRef.current !== -1) {
        playTick();
      }
      lastSegmentRef.current = currentSegment;

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Determine winner: the segment at the top (0 degrees / pointer position)
        const finalNorm = ((targetRotation % 360) + 360) % 360;
        // The pointer is at the top (0 deg). The wheel rotates clockwise.
        // Segment under pointer = opposite of rotation direction
        const pointerAngle = (360 - finalNorm) % 360;
        const winnerIndex = Math.floor(pointerAngle / segAngle) % n;
        const winner = shotguns[winnerIndex];

        setTimeout(() => {
          setResult(winner);
          setSpinning(false);
          if (revealAudioRef.current) {
            revealAudioRef.current.currentTime = 0;
            revealAudioRef.current.play().catch(() => {});
          }
          // Trigger confetti
          import("canvas-confetti").then((mod) => {
            const confetti = mod.default;
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ["#F59E0B", "#EF4444", "#3B82F6", "#10B981"],
            });
          });
          setTimeout(() => {
            setShowReveal(true);
            onResult(winner);
          }, 800);
        }, 300);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  if (showReveal && result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] reveal-pulse">
        <p className="text-gray-400 text-lg uppercase tracking-widest mb-2">You got</p>
        <p className="text-5xl md:text-7xl font-black text-amber-400 text-center">
          {result.name}
        </p>
      </div>
    );
  }

  const useRadialText = n > 6;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pointer */}
      <div className="text-4xl text-amber-400" style={{ marginBottom: "-20px", zIndex: 10 }}>
        &#9660;
      </div>

      {/* Wheel SVG */}
      <svg
        viewBox="0 0 300 300"
        className={`w-72 h-72 md:w-96 md:h-96 ${result ? "wheel-glow" : ""}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "none" : undefined,
        }}
      >
        <circle cx="150" cy="150" r="148" fill="none" stroke="#374151" strokeWidth="3" />
        {shotguns.map((sg, i) => {
          const startAngle = (i * segAngle * Math.PI) / 180;
          const endAngle = ((i + 1) * segAngle * Math.PI) / 180;
          const x1 = 150 + 145 * Math.sin(startAngle);
          const y1 = 150 - 145 * Math.cos(startAngle);
          const x2 = 150 + 145 * Math.sin(endAngle);
          const y2 = 150 - 145 * Math.cos(endAngle);
          const largeArc = segAngle > 180 ? 1 : 0;
          const midAngle = ((i + 0.5) * segAngle * Math.PI) / 180;

          const color = COLORS[i % COLORS.length];

          // Text positioning
          const textRotation = i * segAngle + segAngle / 2;

          return (
            <g key={sg.id}>
              <path
                d={`M150,150 L${x1},${y1} A145,145 0 ${largeArc},1 ${x2},${y2} Z`}
                fill={color}
                stroke="#1f2937"
                strokeWidth="1"
              />
              {useRadialText ? (
                <text
                  fill="#111"
                  fontSize={n > 10 ? "8" : "9.5"}
                  fontWeight="900"
                  textAnchor="start"
                  stroke="white"
                  strokeWidth="2.5"
                  paintOrder="stroke"
                  transform={`translate(150,150) rotate(${textRotation - 90}) translate(32,4)`}
                >
                  {sg.name}
                </text>
              ) : (
                <text
                  fill="#111"
                  fontSize="14"
                  fontWeight="900"
                  textAnchor="middle"
                  stroke="white"
                  strokeWidth="3"
                  paintOrder="stroke"
                  transform={`translate(150,150) rotate(${textRotation - 90}) translate(80,5)`}
                >
                  {sg.name}
                </text>
              )}
            </g>
          );
        })}
        <circle cx="150" cy="150" r="28" fill="#1f2937" stroke="#F59E0B" strokeWidth="3" />
      </svg>

      {/* Spin button */}
      <button
        onClick={spin}
        disabled={spinning || disabled || n === 0}
        className="px-10 py-4 bg-amber-500 text-gray-900 font-black text-2xl rounded-full hover:bg-amber-400 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/25"
      >
        {spinning ? "SPINNING..." : "SPIN!"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/wheel.tsx src/app/globals.css
git commit -m "feat: add spinning wheel component with animation, sounds, and confetti"
```

---

### Task 9: Score Entry Component

**Files:**
- Create: `src/components/score-entry.tsx`

- [ ] **Step 1: Create score entry component**

Create `src/components/score-entry.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/score-entry.tsx
git commit -m "feat: add hit/miss score entry component"
```

---

### Task 10: Station Page

**Files:**
- Create: `src/app/station/page.tsx`

- [ ] **Step 1: Create station page**

Create `src/app/station/page.tsx`:
```tsx
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
```

- [ ] **Step 2: Create station client component**

Create `src/app/station/client.tsx`:
```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/station/page.tsx src/app/station/client.tsx
git commit -m "feat: add station page with wheel spin and score entry flow"
```

---

### Task 11: Leaderboard Page

**Files:**
- Create: `src/components/leaderboard-table.tsx`, `src/app/leaderboard/page.tsx`

- [ ] **Step 1: Create leaderboard table component**

Create `src/components/leaderboard-table.tsx`:
```tsx
"use client";

import { useState } from "react";
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
              <>
                <tr
                  key={r.id}
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
              </>
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
```

- [ ] **Step 2: Create leaderboard page**

Create `src/app/leaderboard/page.tsx`:
```tsx
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
          {competition.numStages} stages &middot;{" "}
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
        stats={stats}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/leaderboard-table.tsx src/app/leaderboard/page.tsx
git commit -m "feat: add leaderboard with detailed scorecards and fun stats"
```

---

### Task 12: Sound Files and Polish

**Files:**
- Create: `public/sounds/tick.mp3`, `public/sounds/whoosh.mp3`, `public/sounds/reveal.mp3`

- [ ] **Step 1: Create placeholder sound files**

We need three short sound effect files. For now, create silent placeholder MP3 files. These can be replaced with real sound effects before the event.

Run:
```bash
mkdir -p public/sounds
# Create minimal valid MP3 files (silence) as placeholders
# These should be replaced with real sound effects before the event
node -e "
const fs = require('fs');
// Minimal valid MP3 frame (silent)
const silence = Buffer.from('//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 'base64');
fs.writeFileSync('public/sounds/tick.mp3', silence);
fs.writeFileSync('public/sounds/whoosh.mp3', silence);
fs.writeFileSync('public/sounds/reveal.mp3', silence);
"
```

- [ ] **Step 2: Commit**

```bash
git add public/sounds/
git commit -m "feat: add placeholder sound files for wheel animation"
```

---

### Task 13: Build Verification and GitHub Setup

- [ ] **Step 1: Verify build passes**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors. Fix any TypeScript or build errors before proceeding.

- [ ] **Step 2: Create GitHub repository and push**

Run:
```bash
gh repo create shotgun-roulette --public --source=. --remote=origin --push
```

Expected: Repository created on GitHub, all commits pushed.

- [ ] **Step 3: Set up Upstash Redis on Vercel**

Manual steps (in browser):
1. Go to Vercel dashboard, import the `shotgun-roulette` repo
2. Go to the Vercel Marketplace, add Upstash Redis integration
3. Connect the Redis store to the project — this auto-populates `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars
4. Redeploy

- [ ] **Step 4: Verify deployment**

Open the Vercel deployment URL. Confirm:
- Home page loads with "Set Up a Competition" button
- Admin page allows adding shotguns and creating a competition
- Station page shows the spinning wheel
- Leaderboard page shows rankings

- [ ] **Step 5: Copy Upstash env vars to local `.env.local`**

From the Vercel project settings, copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into your local `.env.local` for local development.
