/**
 * stories.js
 * Context engine + executive narrative for coaches.
 * Fuses biometrics with *today's context* (yesterday's session, weekly load,
 * daily mental-fatigue check-in) into a plain-English briefing.
 * Authored for the three test vectors; generated for the simulated cohort.
 * All content is mock.
 */

/** Today's context layer — feeds the "why now" sentence */
const CONTEXT = {
  'sarah-j': {
    yesterday: 'a heavy plyometric session',
    weeklyLoad: 92,
    sleepPrev: 7.2,
    sleepNow: 6.4,
    stressToday: 4,
  },
  'jonah-h': {
    yesterday: 'a controlled rehab session with light jumps',
    weeklyLoad: 61,
    sleepPrev: 7.5,
    sleepNow: 7.3,
    stressToday: 3,
  },
  'case-invalid': null,
}

const STORIES = {
  'sarah-j': {
    headline: 'Fatigue is showing up in motor control before it shows up on the scoreboard',
    narrative:
      'Sarah’s neuromuscular sway climbed through the winter and peaked in the same window as her academic midterms, while HRV stalled and sleep efficiency dipped. Marks softened in March, then rebounded in May once recovery and nutrition were tightened. The signal to act on is the sway — it moved first.',
    action:
      'Cut plyometric load by ~20% for the next 48 hours to protect motor control, and keep the nutritionist check-in on the calendar. Re-test balance before the next quality session.',
  },
  'jonah-h': {
    headline: 'Injury plateau — recovery is tracking HRV, not the calendar',
    narrative:
      'Jonah’s early-season injury held marks flat from November to January while sway sat above the 5.2mm risk line. HRV fell to its lowest point in that stretch, then recovered alongside the physio block — and marks followed to a season-best 2.12m.',
    action:
      'Hold the current rehab progression and keep RPE below 7.0 until HRV returns to baseline. Do not add load on a good week alone.',
  },
  'case-invalid': {
    headline: 'No data on file — this is a gap, not a judgement',
    narrative:
      'Alex has no wearable sync and no recorded marks, so readiness, sleep and any causal analysis cannot be produced. Nothing on this screen is a performance verdict — there is simply nothing to read yet.',
    action:
      'Ask the athlete to sync a device or enter metrics manually, then collect at least three weeks of baseline before the next review.',
  },
}

/** Build the "why now" context sentence from today's context */
export function contextSentence(a) {
  const c = a.context || CONTEXT[a.id]
  if (!c) return 'No recent training context on file.'
  const stress = c.stressToday != null ? ` and today’s stress check-in reads ${c.stressToday}/5` : ''
  const sleep = c.sleepPrev && c.sleepNow
    ? `, sleep moved from ${c.sleepPrev}h to ${c.sleepNow}h`
    : ''
  return `Following yesterday’s ${c.yesterday} (weekly load ${c.weeklyLoad}%)${sleep}${stress}.`
}

/** Simple, universally understood metrics for the results-first hero */
export function simpleMetrics(a) {
  const ready = a.readiness
  const readyTone = ready == null ? 'muted' : ready >= 80 ? 'good' : ready >= 68 ? 'warn' : 'bad'
  const sleep = a.sleep ? a.sleep.value : null
  const sleepTone = sleep == null ? 'muted' : sleep >= 7.5 ? 'good' : sleep >= 6.5 ? 'warn' : 'bad'
  return [
    {
      label: 'Readiness', value: ready != null ? `${ready}%` : '—', tone: readyTone,
      note: ready == null ? 'no data' : ready >= 80 ? 'ready' : ready >= 68 ? 'moderate' : 'recover',
      tip: 'Calculated nightly by fusing 3 metrics: Sleep Efficiency (%), HRV baseline deviation (ms), and morning Neuromuscular Sway (mm). Below 70% triggers a warning.',
      clickable: true,
    },
    {
      label: 'Sleep last night', value: sleep != null ? `${sleep}h` : '—', tone: sleepTone,
      note: sleep == null ? 'no data' : sleep >= 7.5 ? 'good' : sleep >= 6.5 ? 'watch' : 'low',
      tip: 'Hours slept before the session, from the athlete’s wearable. Rising = good recovery; falling = watch for fatigue.',
    },
  ]
}

/** Rich detail chips — hidden until Deep Dive */
export function storyStats(a) {
  const ts = a.timeSeries || []
  if (ts.length === 0) return []
  const swayBase = ts[0].sway || 1
  const stressBase = ts[0].stress || 1
  const swayPeak = Math.max(...ts.map(d => d.sway || 0))
  const stressPeak = Math.max(...ts.map(d => d.stress || 0))
  const first = ts[0].actual || 1
  const last = ts[ts.length - 1].actual || first
  const progress = Math.round((last / first - 1) * 100)
  return [
    { label: 'Sway peak', value: `${swayPeak}mm`, delta: `+${Math.round((swayPeak / swayBase - 1) * 100)}%`, tone: swayPeak > 5.2 ? 'bad' : 'warn' },
    { label: 'Stress peak', value: `${stressPeak}/10`, delta: `+${Math.round((stressPeak / stressBase - 1) * 100)}%`, tone: 'bad' },
    { label: 'Season progression', value: `${progress >= 0 ? '+' : ''}${progress}%`, delta: a.isHighBetter ? 'higher better' : 'lower better', tone: progress >= 0 ? 'good' : 'bad' },
    { label: 'Readiness', value: a.readiness != null ? `${a.readiness}%` : '—', delta: a.readiness != null && a.readiness < 68 ? 'below line' : 'in band', tone: a.readiness != null && a.readiness < 68 ? 'bad' : 'good' },
  ]
}

export function buildStory(a) {
  const base = STORIES[a.id] || (!a.timeSeries || a.timeSeries.length === 0
    ? STORIES['case-invalid']
    : a.readiness != null && a.readiness < 68
      ? {
          headline: `${a.name} is carrying load — readiness is below the training line`,
          narrative: `${a.name}'s readiness sits at ${a.readiness}%, under the 70% threshold, with load markers trending the wrong way this cycle. This is the profile that precedes a drop in output or a soft-tissue issue if load is not adjusted.`,
          action: 'Reduce high-intensity volume for ~48 hours and recheck readiness before the next quality session.',
        }
      : {
          headline: `${a.name} is tracking inside cohort bands`,
          narrative: `${a.name}'s readiness, recovery and load sit within the peer range this cycle, and marks are progressing in line with the cohort baseline. No corrective action is indicated right now.`,
          action: 'Maintain the current plan and re-run the review weekly. Escalate only if readiness drops below 70% or balance quality worsens.',
        })
  return { ...base, context: contextSentence(a) }
}
