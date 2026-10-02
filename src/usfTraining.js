/**
 * usfTraining.js
 * REAL training blocks parsed from "Men_and_Women_2023-2024@USF_winter copy.pdf"
 * — Group G2 (Triple Jump), Period 3 "Specific Prep", Phase "Winter",
 * Meso Weeks 14–17 (Dec 11 – Jan 4).
 *
 * NOTE: athlete names from the source PDF are intentionally NOT included.
 * Only the workout content is mapped. This is transcribed plan data (mock-fed).
 */

export const USF_G2_SPECIFIC_PREP = [
  {
    id: 'dec11', day: 'Mon', date: 'Dec 11', phase: 'Specific Prep · Winter', title: 'Full Approach + Plyo',
    blocks: [
      { ex: 'Hurdle Mobility (series A)', set: '2 x' },
      { ex: '50-40-30-20m @ GGBB', set: '2 x · 5-4-3-2 min RI' },
      { ex: 'Standing long (landing)', set: '2 x 4' },
      { ex: 'Continuous take-off @20m (4-step run-up)', set: '2 x 6 · weighted vest' },
      { ex: 'Full approaches (Push 6)', set: '2 x 3' },
      { ex: 'Multi Jump Plyos (series B)', set: '1 series' },
    ],
  },
  {
    id: 'dec12', day: 'Tue', date: 'Dec 12', phase: 'Specific Prep · Winter', title: 'Wickets + Intensive Tempo',
    blocks: [
      { ex: '4 x (wickets) GGBB', set: '4 reps' },
      { ex: '300m @75% effort', set: '3 x · 5 min int' },
      { ex: '150m @60% (mechanics)', set: '3 x' },
    ],
  },
  {
    id: 'dec14', day: 'Thu', date: 'Dec 14', phase: 'Specific Prep · Winter', title: 'Triple Jump — Runway + Bounds',
    blocks: [
      { ex: 'Alt bounds (grass 30m)', set: '6 x' },
      { ex: 'SL bounds Right / Left', set: '2 x each' },
      { ex: 'RRL / LLR bounds', set: '2 x each' },
      { ex: 'Hop-step–Jump (8-10 step, runway)', set: '4 x' },
      { ex: '120m tech runs', set: '3 x · 2-4 min RI' },
    ],
  },
  {
    id: 'dec15', day: 'Fri', date: 'Dec 15', phase: 'Specific Prep · Winter', title: 'Intensive Tempo',
    blocks: [
      { ex: '4 x (wickets) GGBB', set: '4 reps' },
      { ex: '250m @ (28-32) + 200m tempo', set: '3 x · 5 min int' },
    ],
  },
  {
    id: 'dec18', day: 'Mon', date: 'Dec 18', phase: 'Specific Prep · Winter', title: 'Full Approach + Box',
    blocks: [
      { ex: 'Full approaches (Push 6)', set: '2 x 3' },
      { ex: '10-step approach w/ 2" box', set: '4 x' },
      { ex: 'Multi Jump Plyos (series B)', set: '1 series' },
    ],
  },
  {
    id: 'dec19', day: 'Tue', date: 'Dec 19', phase: 'Specific Prep · Winter', title: 'Special Endurance',
    blocks: [
      { ex: '4 x (wickets) GGBB', set: '4 reps' },
      { ex: '250m @ (26-32) + 200m tempo', set: '3 x' },
      { ex: '150m @ tech', set: '1 x' },
      { ex: 'Matt drills', set: '—' },
    ],
  },
  {
    id: 'dec28', day: 'Thu', date: 'Dec 28', phase: 'Specific Prep · Winter', title: 'Triple Jump — Short Board',
    blocks: [
      { ex: 'Approaches run', set: '2 x 4' },
      { ex: '20m alternating steps (bounds — for height)', set: '2 x' },
      { ex: '20m RRL / LLR', set: '4 x' },
      { ex: '8-step app — hop-step-jump (short board)', set: '3 x' },
      { ex: '300m–150m @ 42/38-19/18', set: '1 x · 5 min rest' },
    ],
  },
  {
    id: 'jan01', day: 'Mon', date: 'Jan 1', phase: 'Specific Prep · Winter', title: 'Triple Jump — Grass @40m',
    blocks: [
      { ex: 'Extensive Bounding', set: '—' },
      { ex: 'SL bounds Right / Left', set: '4 x each' },
      { ex: 'RRL / LLR', set: '2 x each' },
    ],
  },
  {
    id: 'jan02', day: 'Wed', date: 'Jan 2', phase: 'Specific Prep · Winter', title: 'Acceleration + Penultimate',
    blocks: [
      { ex: '20m high knees (quick)', set: '4 x' },
      { ex: '30m @90%', set: '3 x · 3 min RI' },
      { ex: '40m @90%', set: '2 x · 4 min RI' },
      { ex: '50m @90%', set: '1 x · 5 min RI' },
      { ex: 'Standing long', set: '4 x' },
      { ex: '1-stride penultimate (both sides)', set: '3 x' },
    ],
  },
  {
    id: 'jan03', day: 'Thu', date: 'Jan 3', phase: 'Specific Prep · Winter', title: 'Intensive Tempo + Plyos',
    blocks: [
      { ex: '15s run @80% / 25s run @80% (grass)', set: '4 x each' },
      { ex: 'Multi Jump/Plyos (series B)', set: '4 x 12 each' },
    ],
  },
]

/**
 * Single "Today" session — the whole board represents one day in the
 * Specific Prep (Winter) phase, so every athlete is measured against the same
 * baseline. (Dated sessions above are kept as the source/audit trail.)
 */
export const TODAY_SESSION = {
  id: 'today', day: 'Today', date: 'Today', phase: 'Specific Prep · Winter',
  kind: 'Jump Session',
  title: 'Specific Prep — Winter',
  blocks: [
    { ex: '4 x (wickets) GGBB', set: '4 reps' },
    { ex: 'Full approaches (Push 6)', set: '2 x 3' },
    { ex: 'Multi Jump Plyos (series B)', set: '1 series' },
  ],
}

export function pickSession() {
  return TODAY_SESSION
}

/** Classify a session for the constraint engine */
export function sessionKind(session) {
  if (session?.kind) return session.kind
  const t = (session?.title || '').toLowerCase()
  if (t.includes('triple jump') || t.includes('approach') || t.includes('board')) return 'Jump Session'
  if (t.includes('acceleration') || t.includes('speed')) return 'Speed Session'
  if (t.includes('tempo') || t.includes('endurance')) return 'Tempo Session'
  if (t.includes('plyo') || t.includes('plyos')) return 'Plyo Session'
  return 'Training Session'
}
