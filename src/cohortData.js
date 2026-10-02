/**
 * cohortData.js
 * Generates a SIMULATED cohort of athletes so the roster scales beyond the
 * three hand-authored test vectors (normal / unusual / invalid).
 * All values are synthetic and deterministic (seeded), clearly marked as mock.
 */

function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const FIRST = ['Maya', 'Ethan', 'Aisha', 'Diego', 'Nina', 'Kofi', 'Lena', 'Tariq', 'Sofia', 'Miles', 'Hana', 'Omar', 'Priya', 'Lucas', 'Zara', 'Noah']
const LAST = ['K.', 'R.', 'M.', 'T.', 'S.', 'B.', 'O.', 'V.', 'L.', 'A.', 'D.', 'N.']

const EVENTS = [
  { name: 'Triple Jump', disc: 'Jumps', high: true, base: 13.5, spread: 1.4 },
  { name: 'High Jump', disc: 'Jumps', high: true, base: 2.0, spread: 0.18 },
  { name: 'Long Jump', disc: 'Jumps', high: true, base: 6.4, spread: 0.9 },
  { name: 'Pole Vault', disc: 'Jumps', high: true, base: 4.4, spread: 0.6 },
  { name: '100m', disc: 'Sprints', high: false, base: 10.8, spread: 0.6 },
  { name: '200m', disc: 'Sprints', high: false, base: 21.7, spread: 1.0 },
  { name: '400m', disc: 'Sprints', high: false, base: 48.5, spread: 2.5 },
  { name: '110m Hurdles', disc: 'Sprints', high: false, base: 14.2, spread: 0.9 },
  { name: '800m', disc: 'Distance', high: false, base: 111.0, spread: 4.0 },
  { name: '1500m', disc: 'Distance', high: false, base: 230.0, spread: 6.0 },
  { name: 'Shot Put', disc: 'Throws', high: true, base: 15.0, spread: 2.5 },
  { name: 'Javelin', disc: 'Throws', high: true, base: 58.0, spread: 8.0 },
]
const YEARS = ['Senior', 'Junior', 'Sophomore', 'Freshman']
const COACHES = ['Coach Rivera', 'Coach Chen', 'Coach Adeyemi', 'Coach Novak']
const MONTHS = ["Oct '23", "Nov '23", "Dec '23", "Jan '24", "Feb '24", "Mar '24", "Apr '24", "May '24"]

export const COACH_LIST = COACHES

export function buildCohort(n = 12) {
  const out = []
  for (let i = 0; i < n; i++) {
    const r = makeRng(1000 + i * 37)
    const ev = EVENTS[Math.floor(r() * EVENTS.length)]
    const fn = FIRST[Math.floor(r() * FIRST.length)]
    const ln = LAST[Math.floor(r() * LAST.length)]
    const year = YEARS[Math.floor(r() * YEARS.length)]
    const gender = r() > 0.5 ? 'Female' : 'Male'

    const missing = r() < 0.12                 // ~12% incomplete data
    const readiness = missing ? null : Math.round(58 + r() * 39)   // 58–97
    const hrv = missing ? null : { value: Math.round(52 + r() * 32), trend: r() > 0.5 ? `+${Math.round(r() * 9)}%` : `-${Math.round(r() * 9)}%`, unit: 'ms' }
    const sleep = missing ? null : { value: Math.round((6.2 + r() * 2.4) * 10) / 10, trend: r() > 0.5 ? `+0.${Math.round(r() * 9)}` : `-0.${Math.round(r() * 9)}`, unit: 'h', efficiency: Math.round(72 + r() * 20) }
    const rpe = missing ? null : { value: Math.round((4 + r() * 4.5) * 10) / 10, trend: r() > 0.55 ? `+${Math.round(r() * 20)}%` : `-${Math.round(r() * 15)}%`, unit: '' }

    const status = missing ? 'Incomplete Data' : (readiness < 68 ? 'Monitoring' : r() < 0.12 ? 'Rehab' : 'Active')

    // Synthesize a season series around the event base mark
    const drift = (r() - 0.35) * ev.spread
    const peer = ev.high ? ev.base + ev.spread * 0.5 : ev.base - ev.spread * 0.5
    const timeSeries = missing ? [] : MONTHS.map((label, k) => {
      const prog = k / (MONTHS.length - 1)
      const noise = (makeRng(i * 100 + k)() - 0.5) * ev.spread * 0.35
      const actual = ev.high
        ? ev.base * 0.82 + (ev.base + drift) * prog * 0.35 + noise
        : ev.base * 1.08 - (ev.base - drift) * prog * 0.10 + noise
      const heartRate = Math.round(60 + makeRng(i * 300 + k)() * 26)
      return {
        date: `2023-${String(10 + k).padStart(2, '0')}`,
        label,
        actual: Math.round(actual * 100) / 100,
        peer: Math.round((peer + prog * (ev.high ? ev.spread * 0.3 : -ev.spread * 0.3)) * 100) / 100,
        sway: Math.round((3 + makeRng(i * 200 + k)() * 3.2) * 100) / 100,
        heartRate,
        hrv: Math.max(35, Math.round(142 - heartRate + (makeRng(i * 500 + k)() * 6 - 3))),
        stress: Math.round(2 + makeRng(i * 400 + k)() * 5),
      }
    })

    const interventions = missing ? [] : [
      { date: '2024-01', label: 'Training Block', sub: '(Jan 12)', color: '#4a6fa5' },
      ...(r() > 0.5 ? [{ date: '2024-03', label: 'Midterms', sub: '(Mar 08)', color: '#b0574f' }] : []),
    ].slice(0, r() > 0.6 ? 2 : 1)

    const readinessTxt = missing
      ? 'INCOMPLETE DATA — no wearable sync on file, so no readiness, HRV, or sleep could be computed.'
      : readiness < 68
        ? 'LOW READINESS flags elevated fatigue — recover load and sleep before the next quality session.'
        : 'Readiness within cohort band; markers stable. Maintain current plan and recheck weekly.'

    out.push({
      id: `gen-${i + 1}`,
      name: `${fn} ${ln}`,
      initials: `${fn[0]}${ln[0]}`,
      event: ev.name,
      eventCode: ev.name,
      discipline: ev.disc,
      gender,
      coach: COACHES[Math.floor(r() * COACHES.length)],
      category: r() > 0.45 ? 'International' : 'Domestic',
      year,
      status,
      readiness,
      hrv, sleep, rpe,
      workRestBalance: missing ? null : Math.round((0.55 + r() * 0.4) * 100) / 100,
      context: missing ? null : {
        yesterday: r() > 0.5 ? 'a heavy speed session' : 'a moderate volume session',
        todaySession: ev.disc === 'Jumps' ? 'Jump Session' : r() > 0.5 ? 'Strength Session' : 'Recovery Session',
        weeklyLoad: Math.round(60 + r() * 38),
        sleepPrev: Math.round((7 + r() * 1.2) * 10) / 10,
        sleepNow: missing ? null : Math.round((6.2 + r() * 2.2) * 10) / 10,
        stressToday: Math.round(1 + r() * 4),
      },
      isHighBetter: ev.high,
      peerBaseline: Math.round(peer * 100) / 100,
      timeSeries,
      interventions,
      aiAssessment: readinessTxt,
      simulated: true,
      econ: missing
        ? [{ bullet: '—', title: 'Insufficient n for inference', desc: 'no biometrics', r2: 'No confidence interval estimable', ci: 'Ask athlete to sync device', color: '#64748b', bg: '#f8fafc' }]
        : [
            { bullet: 'A', title: 'Load vs readiness', desc: readiness < 68 ? 'negative' : 'stable', r2: `R² = ${(0.55 + r() * 0.3).toFixed(2)}`, ci: '95% CI [auto]', color: readiness < 68 ? '#b0574f' : '#4f8a6b', bg: readiness < 68 ? '#fff1f2' : '#f0fdf4' },
          ],
    })
  }
  return out
}
