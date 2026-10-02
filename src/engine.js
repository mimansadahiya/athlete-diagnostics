import { pickSession } from './usfTraining'

/**
 * engine.js
 * Deterministic decision engine:
 *  - urgencyScore: roster triage ranking
 *  - systemicFatigue: fuses biometrics + today's context
 *  - buildConstraints: localized muscle data × session type → hard training constraints
 * All rule-based and traceable (no free-form generation). Data is mock.
 */

const TODAY_SESSION = {
  'sarah-j': 'Jump Session',
  'jonah-h': 'Strength Session',
  'case-invalid': 'Recovery Session',
}

export function todaySession(a) {
  return (a.context && a.context.todaySession) || TODAY_SESSION[a.id] || 'Training Session'
}

/** Roster triage ranking — higher = more urgent */
export function urgencyScore(a) {
  let s = 0
  if (!a.timeSeries || a.timeSeries.length === 0) s += 25
  if (a.readiness != null) {
    if (a.readiness < 68) s += 45 + (68 - a.readiness)
    else if (a.readiness < 80) s += 10
  }
  if (a.hrv && a.hrv.trend && a.hrv.trend.startsWith('-')) s += 15
  if (a.rpe && a.rpe.value >= 7) s += 15
  if (a.timeSeries && a.timeSeries.length) {
    const maxSway = Math.max(...a.timeSeries.map(d => d.sway || 0))
    if (maxSway > 5.2) s += 12
  }
  return s
}

export function urgencyBand(a) {
  const s = urgencyScore(a)
  if (s >= 45) return 'critical'
  if (s >= 25) return 'high'
  if (s >= 10) return 'watch'
  return 'ok'
}

/** Systemic (whole-body) fatigue, fused with today's context */
export function systemicFatigue(a) {
  const c = a.context || {}
  const reasons = []
  let score = 0
  if (a.readiness != null && a.readiness < 70) { score += (70 - a.readiness); reasons.push(`readiness ${a.readiness}%`) }
  if (a.hrv && a.hrv.trend && a.hrv.trend.startsWith('-')) { score += 10; reasons.push(`HRV ${a.hrv.trend}`) }
  if (a.rpe && a.rpe.value >= 7) { score += 10; reasons.push(`RPE ${a.rpe.value}/10`) }
  if (c.sleepNow != null && c.sleepNow < 6.8) { score += 8; reasons.push(`sleep ${c.sleepNow}h`) }
  if (c.stressToday != null && c.stressToday >= 4) { score += 8; reasons.push(`stress ${c.stressToday}/5`) }
  return { score, high: score >= 15, present: score >= 8, reasons }
}

/**
 * Constraint engine — the "triple jump logic".
 * @param athlete  athlete object
 * @param log      { [muscleId]: number } localized 1–10 report for this athlete
 */
export function buildConstraints(athlete, log = {}) {
  const session = todaySession(athlete)
  const fatigue = systemicFatigue(athlete)
  const out = []

  const side = (base) => Math.max(log[`${base}_l`] || 0, log[`${base}_r`] || 0, log[base] || 0)
  const hamTight = side('hamstrings')
  const quadTight = side('quads')
  const calfTight = Math.max(side('calves'), side('achilles'))
  const anyLocal = Object.values(log).some(v => v >= 6)

  // Condition A — jump session + systemic fatigue + hamstring stress
  if (session === 'Jump Session' && fatigue.high && hamTight >= 6) {
    out.push({
      id: 'cond-a',
      severity: 'critical',
      session,
      title: 'CRITICAL — jump load blocked',
      message:
        'CRITICAL: Do not execute full-approach jumps today. Muscle fatigue combined with localized hamstring stress creates a high risk for acute tears. Pivot to short-approach technique or pool recovery.',
      reasons: [...fatigue.reasons, `hamstring ${hamTight}/10`],
    })
  }

  // Condition B — strength session + systemic fatigue present
  if (session === 'Strength Session' && (fatigue.high || fatigue.present)) {
    out.push({
      id: 'cond-b',
      severity: 'warning',
      session,
      title: 'Load cap — strength session',
      message:
        'Systemic fatigue detected. Limit weight room load to <70% 1RM. Do not overstress the central nervous system today.',
      reasons: fatigue.reasons,
    })
  }

  // Secondary safeguard — localized stress on a non-jump day
  if (out.length === 0 && anyLocal && (hamTight >= 6 || quadTight >= 6 || calfTight >= 6)) {
    out.push({
      id: 'cond-local',
      severity: 'warning',
      session,
      title: 'Localized stress flagged',
      message: `Localized stress logged${hamTight ? ' (hamstrings)' : ''}${quadTight ? ' (quads)' : ''}${calfTight ? ' (calf/achilles)' : ''}. Reduce high-velocity work for this area and re-check tomorrow.`,
      reasons: fatigue.reasons,
    })
  }

  return out
}

/**
 * Recommended adaptation for the athlete's real USF baseline session.
 * Produces block-level modifications (from → to) driven by the constraint
 * engine + systemic fatigue.
 * @param baseline optional session object (defaults to pickSession(athlete))
 */
export function buildAdaptation(athlete, constraints = [], baseline = null) {
  const session = baseline || pickSession(athlete)
  const blocks = session.blocks || []
  const f = systemicFatigue(athlete)
  const hasCritical = constraints.some(c => c.severity === 'critical')
  const hasWarning = constraints.some(c => c.severity === 'warning')

  const plyoBlocks = blocks.filter(b => /plyo|multi jump/i.test(b.ex))
  const approachBlocks = blocks.filter(b => /full approach|approach run|approaches run/i.test(b.ex))
  const mods = []
  const fmt = () => mods.map(m => `${m.ex}: ${m.from} → ${m.to}`)

  const hasWickets = blocks.some(b => /wicket/i.test(b.ex))

  if (hasCritical) {
    approachBlocks.forEach(b => mods.push({ ex: b.ex, from: b.set, to: 'Short-approach / standing long (landing) only' }))
    plyoBlocks.forEach(b => mods.push({ ex: b.ex, from: b.set, to: 'Cut' }))
    if (mods.length === 0) mods.push({ ex: 'High-velocity jump work', from: 'planned', to: 'Short-approach only' })
    return {
      level: 'critical',
      summary: 'High hamstring stress. Cut full approaches. Short-approach / standing long (landing) only.',
      modifications: mods,
      details: fmt(),
    }
  }
  if (hasWarning) {
    mods.push({ ex: 'Weight-room load', from: 'planned', to: 'Cap at <70% 1RM' })
    mods.push({ ex: 'Max-effort CNS work', from: 'planned', to: 'Skip' })
    return { level: 'warning', summary: 'Fatigue detected. Cap gym load at <70% 1RM.', modifications: mods, details: fmt() }
  }
  if (f.high) {
    plyoBlocks.forEach(b => mods.push({ ex: b.ex, from: b.set, to: 'Cut' }))
    if (mods.length === 0) mods.push({ ex: 'Plyometric accessory', from: 'planned', to: 'Cut ~50%' })
    return {
      level: 'warning',
      summary: hasWickets ? 'Fatigue detected. Cut Plyos. Proceed with Wickets only.' : 'Fatigue detected. Cut plyometric volume ~50%.',
      modifications: mods,
      details: fmt(),
    }
  }
  if (f.present) {
    mods.push({ ex: 'All blocks', from: 'planned', to: '−1 set / −10% volume' })
    return { level: 'info', summary: 'Elevated load. Trim total volume ~10%.', modifications: mods, details: fmt() }
  }
  return { level: 'ok', summary: 'Cleared to train as scheduled.', modifications: [], details: [] }
}

/** Apply a recommended adaptation to a baseline session → final blocks */
export function applyAdaptation(baseline, adapt) {
  const mods = adapt.modifications || []
  return (baseline.blocks || []).map(b => {
    const m = mods.find(x => x.ex === b.ex)
    return { ex: b.ex, set: m ? m.to : b.set, changed: !!m }
  })
}

/** Plain-language systemic label (no arbitrary numbers) */
export function fatigueLabel(a) {
  const f = systemicFatigue(a)
  if (f.high) return { label: 'Highly Fatigued', tone: 'bad' }
  if (f.present) return { label: 'Fatigued', tone: 'warn' }
  return { label: 'Recovered', tone: 'good' }
}

/**
 * Peaking Trajectory — synthesizes current fatigue against the proximity of
 * the next major championship. Mock weeks-out derived from athlete id.
 */
export function peakingTrajectory(athlete) {
  const f = systemicFatigue(athlete)
  const weeklyLoad = (athlete.context && athlete.context.weeklyLoad) ?? 70
  const key = athlete.id || 'x'
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const weeksAway = 3 + (h % 8) // 3–10 weeks

  if (f.high) {
    return { status: 'At Risk — Overreaching', tone: 'bad', weeksAway, note: `High fatigue with championships ${weeksAway} wks out. Reduce volume now to protect peak.` }
  }
  if (f.score <= 4 && weeklyLoad < 62 && weeksAway <= 6) {
    return { status: 'At Risk — Detraining', tone: 'warn', weeksAway, note: `Very low load ${weeksAway} wks from championships. Add a quality stimulus.` }
  }
  return { status: 'On Track', tone: 'good', weeksAway, note: `Load and recovery match a ${weeksAway}-week runway to championships.` }
}
