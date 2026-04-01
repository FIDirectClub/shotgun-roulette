# Shotgun Roulette — Design Spec

## Overview

A lightweight Next.js web app for running a "Shotgun Roulette" competition — a skeet shooting event where participants spin a Wheel of Fortune-style wheel before each stage to randomly determine which shotgun they must shoot with. The app manages scorecards, the spinning wheel, and a leaderboard with fun stats.

Deployed on Vercel with Vercel KV for persistence.

## Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Styling:** Tailwind CSS + custom CSS for wheel animation
- **Storage:** Vercel KV (Redis-based key-value store)
- **Deployment:** Vercel
- **Auth:** None (open access for now; may be hardened later)

## Pages & Navigation

A persistent navigation bar appears on every page with clearly labeled links: Home, Admin, Station, Leaderboard. The nav highlights the active page. On mobile, it collapses to a hamburger menu or bottom tab bar. Users can jump between any page at any time.

### `/` — Home/Dashboard

- Create a new competition or resume an existing one
- Simple landing page with clear call-to-action buttons

### `/admin` — Admin Panel

- **Manage Shotguns:** Add and remove shotgun models from the global pool (persists across competitions)
- **Set Up Competition:** Enter participant names, set number of stages, confirm shotgun pool
- **Enter Scores:** After a shooter completes their stage, enter hit/miss for each of the 2 shots

### `/station` — Station (Shared Device)

- Displays current shooter's name and stage number
- The spinning wheel is the centerpiece
- Big SPIN button to trigger the wheel
- After the wheel lands, it fades/shrinks away and is replaced by a full-screen reveal of the selected shotgun name
- After scores are entered, advances to the next shooter

### `/leaderboard` — Leaderboard & Stats

- Ranked table of participants by total score (gold/silver/bronze for top 3)
- Expandable detailed scorecards per participant showing each stage: assigned shotgun, shot 1, shot 2, stage total
- Fun stats section (see below)
- Viewable at any time, updates live

## Scoring

- Each stage: 2 shots per participant
- Each shot: hit (1) or miss (0)
- Max score per stage: 2
- Total score: sum across all stages
- Each participant spins the wheel before shooting their stage

## Spinning Wheel

### Visual Design

- Colored segments, one per shotgun in the pool
- No pegs or dots on the rim — clean design
- Text style: black fill (#111) with white stroke outline, extra-bold weight (900)
- Text extends from center hub to near the outer edge for maximum readability
- **6 or fewer shotguns:** text follows the arc (curved)
- **7+ shotguns:** text reads radially outward from center (horizontal)
- Colors cycle through a vibrant palette; for 7+ shotguns, the palette repeats with a slight variation to stay distinct

### Animation Sequence

1. Shooter taps big SPIN button
2. Wheel accelerates with whoosh sound
3. Tick-tick-tick sounds triggered by segment boundary crossings during rotation (no physical pegs)
4. Dramatic deceleration over 4-6 seconds
5. If landing near a segment border, snaps to whichever segment the pointer is closest to
6. Wheel fades/shrinks away
7. Full-screen reveal: large bold text showing the selected shotgun name (e.g., "BERETTA A400")
8. Confetti burst + pulsing glow on reveal

### Randomness

- Purely random with no memory
- A shooter can get the same shotgun on consecutive stages
- The wheel determines result client-side via random spin duration/velocity

## Data Model (Vercel KV)

### `shotguns`

Global shotgun pool, persists across competitions.

```json
[
  { "id": "sg_1", "name": "Beretta A400" },
  { "id": "sg_2", "name": "Mossberg 930" }
]
```

### `competition`

One active competition at a time.

```json
{
  "id": "comp_1",
  "name": "Spring Shootout 2026",
  "status": "setup | active | completed",
  "numStages": 8,
  "participants": [
    { "id": "p_1", "name": "John Smith" },
    { "id": "p_2", "name": "Jane Doe" }
  ],
  "createdAt": "2026-04-01T12:00:00Z"
}
```

### `scores:{competitionId}`

Array of score entries.

```json
[
  {
    "participantId": "p_1",
    "stage": 1,
    "shotgunId": "sg_2",
    "shot1": true,
    "shot2": false
  }
]
```

### `current:{competitionId}`

Tracks competition progress.

```json
{
  "stage": 3,
  "participantIndex": 1,
  "shotgunId": "sg_2",
  "wheelSpun": true
}
```

## Fun Stats (Leaderboard)

All derived from score data at render time — no extra storage.

- **Best Shotgun:** Highest average score across all shooters
- **Worst Shotgun:** Lowest average score across all shooters
- **Longest Hit Streak:** Most consecutive hits by any shooter
- **Longest Miss Streak:** Most consecutive misses (for the laughs)
- **Luckiest Spinner:** Who got the "best" shotgun most often
- **Perfect Stages:** Count of 2/2 stages per shooter
- **Shutout Stages:** Count of 0/2 stages per shooter

## Event Flow

1. Admin opens `/admin`, adds shotgun models to the pool
2. Admin creates a competition: enters participant names, sets number of stages
3. Competition status moves to `active`
4. Shared device at the station loads `/station`
5. First shooter's name appears, they tap SPIN
6. Wheel spins, lands on a shotgun, big reveal
7. Shooter shoots their 2 targets
8. Scorekeeper enters hits (0, 1, or 2) — can be done on `/admin` or `/station`
9. App advances to next shooter; repeat for all participants in the stage
10. After all participants complete a stage, advance to next stage
11. After all stages complete, competition status moves to `completed`
12. `/leaderboard` is viewable at any time with live updates

## Architecture

- **Server Actions** for all data mutations (add/remove shotgun, create competition, record score, advance state)
- **Client components** for the spinning wheel (needs browser APIs for animation, sound, canvas/SVG)
- **Server components** for leaderboard, admin panel, dashboard (data fetching)
- **Vercel KV** accessed via `@vercel/kv` package in server actions

## Future Considerations (Not In Scope)

- Authentication / admin PIN
- Multiple simultaneous competitions
- Custom scoring rules
- Image uploads for shotgun models
- Tournament brackets
