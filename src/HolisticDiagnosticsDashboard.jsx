import { useState, useMemo } from 'react'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, ScatterChart, Scatter, ZAxis
} from 'recharts'
import mockData from './mockAthleteData.json'
import { buildCohort } from './cohortData'
import { buildStory, storyStats, simpleMetrics } from './stories'
import CompareAthletes from './CompareAthletes'
import PlatformBrief from './PlatformBrief'
import SeasonCalendar from './SeasonCalendar'
import KinematicMap from './KinematicMap'
import TrainingReport from './TrainingReport'
import SquadPlanBoard from './SquadPlanBoard'
import { buildConstraints, urgencyScore, urgencyBand, todaySession, peakingTrajectory } from './engine'
import { ShieldAlert, GraduationCap } from 'lucide-react'
import './HolisticDiagnosticsDashboard.css'
import './KinematicMap.css'
import './PlatformBrief.css'
import './CompareAthletes.css'
import './SeasonCalendar.css'
import './DailyCheckIn.css'
import './polish.css'
import './SquadPlanBoard.css'

const GLOSSARY = [
  { term: 'Readiness Score', def: 'A 0–100 composite of recovery signals. 80+ = ready for hard training · below 60 = prioritise recovery.' },
  { term: 'HRV (Heart Rate Variability)', def: 'Beat-to-beat variation. Higher usually means better recovered; a drop vs the athlete’s baseline signals stress.' },
  { term: 'Sleep', def: 'Hours slept. Rising = good recovery; falling = watch for fatigue.' },
  { term: 'RPE (Rating of Perceived Exertion)', def: 'How hard the session felt, 1–10. Sustained 7+ means overload risk.' },
  { term: 'Arrows ↑ / ↓', def: 'Direction of change vs the athlete’s own baseline.' },
  { term: 'Neuromuscular Sway', def: 'Balance-test wobble in mm. Rising = fatigue showing up in movement before marks drop.' },
  { term: 'Peer Group Baseline', def: 'Average mark of athletes in the same event and cohort.' },
  { term: 'Progression Index', def: 'Each athlete re-based to 100 at their first mark so different events can be compared fairly.' },
]

const EVENT_OPTIONS = ['All', 'Jumps', 'Sprints', 'Distance', 'Throws']
const CLASS_OPTIONS = ['All', 'Senior', 'Junior', 'Sophomore', 'Freshman']
const GENDER_OPTIONS = ['All', 'Female', 'Male']

const RAIL = [
  { icon: '▦', label: 'Dashboard', short: 'Home', action: 'dashboard', active: true },
  { icon: '▤', label: 'Reports', short: 'Reports', action: 'reports' },
  { icon: '▣', label: 'Video & media', short: 'Media', action: 'media' },
  { icon: '⚙', label: 'Settings', short: 'Settings', action: 'settings' },
  { icon: '⎋', label: 'Sign out', short: 'Exit', action: 'signout', bottom: true },
]

function seededRng(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) }
function buildClusters() {
  const elite = Array.from({ length: 14 }, (_, i) => ({ x: 72 + seededRng(i) * 12, y: 6.1 + seededRng(i + 50) * 0.5, cluster: 'Elite', r: 46 }))
  const mid = Array.from({ length: 12 }, (_, i) => ({ x: 56 + seededRng(i + 100) * 12, y: 5.3 + seededRng(i + 150) * 0.6, cluster: 'Mid', r: 42 }))
  const dev = Array.from({ length: 10 }, (_, i) => ({ x: 38 + seededRng(i + 200) * 14, y: 4.4 + seededRng(i + 250) * 0.7, cluster: 'Developing', r: 38 }))
  return [...elite, ...mid, ...dev]
}
function initialsOf(name, initials) { return initials || (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }
function readyTone(r) { return r == null ? 'muted' : r >= 80 ? 'good' : r >= 68 ? 'warn' : 'bad' }

function buildFocus(a) {
  if (!a.timeSeries || a.timeSeries.length === 0) {
    return [{ level: 'Action', color: 'slate', text: 'No data yet — ask the athlete to sync a wearable or enter metrics manually. Nothing can be assessed until then.' }]
  }
  const items = []
  if (a.readiness != null && a.readiness < 68) items.push({ level: 'High', color: 'red', text: `Readiness is ${a.readiness}% — below the 70% line. Cut high-intensity volume for ~48 hours.` })
  if (a.hrv && a.hrv.trend.startsWith('-')) items.push({ level: 'Medium', color: 'amber', text: `HRV is down ${a.hrv.trend} vs baseline — protect sleep this week.` })
  if (a.rpe && a.rpe.value >= 7) items.push({ level: 'Medium', color: 'amber', text: `RPE is ${a.rpe.value}/10 — insert a recovery day before the next quality session.` })
  const maxSway = Math.max(...a.timeSeries.map(d => d.sway || 0))
  if (maxSway > 5.2) items.push({ level: 'Medium', color: 'violet', text: `Balance quality dipped past the risk line — add a neuromuscular screen.` })
  if (items.length === 0) items.push({ level: 'Low', color: 'green', text: 'All markers are inside cohort bands. Keep the current plan and re-check weekly.' })
  return items.slice(0, 3)
}

function InfoTip({ text }) { return <span className="mf-info" data-tip={text} aria-label={text}>i</span> }

function RosterAvatar({ gender }) {
  const female = gender === 'Female'
  return (
    <span className={`mf-avatar-face ${female ? 'female' : 'male'}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
        <circle cx="12" cy="7" r="3.4" />
        {female
          ? <path d="M6 21c0-2.4 1.4-4.3 3.4-5.2L12 16.6l2.6-.8C16.6 16.7 18 18.6 18 21z" />
          : <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7z" />}
      </svg>
    </span>
  )
}

function ReadinessGauge({ value }) {
  if (value == null) return <div className="mf-gauge-empty">—</div>
  const pct = Math.max(0, Math.min(100, value)); const r = 26
  const c = 2 * Math.PI * r; const off = c * (1 - pct / 100)
  return (
    <div className="mf-gauge">
      <svg width="62" height="62" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r={r} stroke="rgba(0,0,0,0.08)" strokeWidth="6" fill="none" />
        <circle cx="31" cy="31" r={r} stroke="#4f8a6b" strokeWidth="6" fill="none" strokeDasharray={c}
          strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 31 31)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
    </div>
  )
}

function MarkerLabel({ viewBox, value, sub, color }) {
  if (!viewBox) return null
  return (<g>
    <text x={viewBox.x} y={12} textAnchor="middle" fill={color} fontSize={10.5} fontWeight={800}>{value}</text>
    {sub && <text x={viewBox.x} y={24} textAnchor="middle" fill="#94a3b8" fontSize={9.5} fontWeight={600}>{sub}</text>}
  </g>)
}

export default function HolisticDiagnosticsDashboard({ onBack }) {
  const [tab, setTab] = useState('diagnostics')
  const [activeId, setActiveId] = useState('sarah-j')
  const [fEvent, setFEvent] = useState('All')
  const [fClass, setFClass] = useState('All')
  const [fGender, setFGender] = useState('All')
  const [fCoach, setFCoach] = useState('All')
  const [showGuide, setShowGuide] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [prefs, setPrefs] = useState({ metric: true, alerts: true })
  const [muscleLogs, setMuscleLogs] = useState({ 'sarah-j': { hamstrings_r: 8 }, 'jonah-h': { quads_r: 5 } })
  const [showCompare, setShowCompare] = useState(false)
  const [sortMode, setSortMode] = useState('urgency')
  const [toast, setToast] = useState('')

  function flash(msg) {
    setToast(msg)
    window.clearTimeout(flash._t)
    flash._t = window.setTimeout(() => setToast(''), 2600)
  }
  function handleRail(action) {
    if (action === 'dashboard') setTab('diagnostics')
    else if (action === 'settings') setShowPrefs(true)
    else if (action === 'reports') flash('Reports export — coming soon (mock)')
    else if (action === 'media') flash('Video & media library — coming soon (mock)')
    else if (action === 'signout') flash('Signed out — demo mode (mock)')
  }

  const cohort = useMemo(() => buildCohort(12), [])
  const clusters = useMemo(() => buildClusters(), [])
  const all = useMemo(() => [...mockData, ...cohort], [cohort])

  const coachPool = useMemo(() => ['All', ...new Set(all.map(a => a.coach).filter(Boolean))], [all])
  const coachFiltered = useMemo(() => all.filter(a => fCoach === 'All' || a.coach === fCoach), [all, fCoach])

  const roster = useMemo(() => all.filter(a => {
    const ev = fEvent === 'All' || a.discipline === fEvent
    const cl = fClass === 'All' || a.year === fClass
    const ge = fGender === 'All' || a.gender === fGender
    const co = fCoach === 'All' || a.coach === fCoach
    return ev && cl && ge && co
  }), [all, fEvent, fClass, fGender, fCoach])

  const athlete = roster.find(a => a.id === activeId) || roster[0] || all[0]
  const hasData = athlete.timeSeries && athlete.timeSeries.length > 0
  const muscleLog = muscleLogs[athlete.id] || {}
  const constraints = buildConstraints(athlete, muscleLog)
  const rosterView = useMemo(() => {
    const r = [...roster]
    if (sortMode === 'urgency') r.sort((a, b) => urgencyScore(b) - urgencyScore(a))
    else if (sortMode === 'az') r.sort((a, b) => a.name.localeCompare(b.name))
    else r.sort((a, b) => (a.readiness ?? 999) - (b.readiness ?? 999))
    return r
  }, [roster, sortMode])
  function setAthleteLog(updater) {
    setMuscleLogs(prev => {
      const current = prev[athlete.id] || {}
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [athlete.id]: next }
    })
  }
  const focus = buildFocus(athlete)
  const story = buildStory(athlete)
  const stats = storyStats(athlete)
  const simple = simpleMetrics(athlete)
  const peak = peakingTrajectory(athlete)
  const lastMark = hasData ? athlete.timeSeries[athlete.timeSeries.length - 1].actual : null
  const athletePoint = hasData ? [{ x: Math.min(90, Math.max(32, athlete.readiness ?? 60)), y: lastMark, cluster: 'Athlete', r: 130 }] : []
  const TABS = [['diagnostics', 'Diagnostics'], ['kinematic', 'Kinematic'], ['board', 'Workout Generation']]

  return (
    <div className="mf-app">
      <header className="mf-topbar">
        <div className="mf-brand">
          <span className="mf-brand-mark" aria-hidden="true"><GraduationCap size={18} /></span>
          <span className="mf-brand-text">
            <span className="mf-brand-name">Athlete Diagnostics</span>
            <span className="mf-brand-sub">Example University · Division I Athletics</span>
          </span>
        </div>
        <nav className="mf-tabs" aria-label="Views">
          {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        <div className="mf-topbar-actions">
          <div className="mf-avatar-lg">MM</div>
        </div>
      </header>

      <div className="mf-sheet">
        {tab === 'board' ? <SquadPlanBoard athletes={coachFiltered} muscleLogs={muscleLogs} /> : tab === 'platform' ? <PlatformBrief /> : tab === 'kinematic' ? <KinematicMap athlete={athlete} log={muscleLog} setLog={setAthleteLog} /> : (
        <>
        <div className="mf-onboard">
          <div>
            <b>Results first.</b> The briefing tells you what to do; the numbers are hidden until you ask. Open <b>Deep Dive</b> for the math, or the <button className="mf-link" onClick={() => setShowGuide(true)}>Guide</button> for definitions. All data is <b>mock</b>.
          </div>
        </div>

        <div className="mf-filterbar">
          <label className="mf-select"><span>Event:</span>
            <select value={fEvent} onChange={e => setFEvent(e.target.value)}>{EVENT_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
          </label>
          <label className="mf-select"><span>Class:</span>
            <select value={fClass} onChange={e => setFClass(e.target.value)}>{CLASS_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
          </label>
          <label className="mf-select"><span>Coach:</span>
            <select value={fCoach} onChange={e => setFCoach(e.target.value)}>
              {coachPool.map(o => <option key={o}>{o === 'All' ? 'All coaches' : o}</option>)}
            </select>
          </label>
          <span className="mf-filter-note">Showing {roster.length} of {all.length}</span>
        </div>

        <div className="mf-body">
          <nav className="mf-rail" aria-label="Sections">
            {RAIL.map(r => (
              <button key={r.label} title={r.label} aria-label={r.label} onClick={() => handleRail(r.action)}
                className={`mf-rail-btn ${r.active ? 'active' : ''} ${r.bottom ? 'mf-rail-bottom' : ''}`} data-tip={r.label}>
                <span className="mf-rail-ico">{r.icon}</span>
                <span className="mf-rail-label">{r.short || r.label}</span>
              </button>
            ))}
          </nav>

          {/* Compact roster */}
          <section className="mf-roster">
            <div className="mf-roster-head"><span>Roster</span><span className="mf-count">{roster.length}</span></div>
            <div className="mf-roster-sort">
              <span>Sort</span>
              <select value={sortMode} onChange={e => setSortMode(e.target.value)}>
                <option value="urgency">Urgency (triage)</option>
                <option value="readiness">Lowest readiness</option>
                <option value="az">A–Z</option>
              </select>
            </div>
            <p className="mf-roster-hint">Tap an athlete. Colour = readiness.</p>
            <div className="mf-roster-list">
              {rosterView.length === 0 && <p className="mf-roster-empty">No athletes match these filters.</p>}
              {rosterView.map(a => {
                const band = urgencyBand(a)
                return (
                  <button key={a.id} onClick={() => setActiveId(a.id)} className={`mf-roster-card compact urg-${band} ${a.id === athlete.id ? 'active' : ''}`}>
                    <RosterAvatar gender={a.gender} />
                    <div className="mf-roster-id">
                      <span className="mf-roster-name">{a.name}</span>
                      <span className="mf-roster-sub">{a.event} | {a.year}</span>
                    </div>
                    {band === 'critical' && <span className="mf-urg-flag">!</span>}
                    <span className={`mf-roster-ready tone-${readyTone(a.readiness)}`}>{a.readiness != null ? `${a.readiness}%` : '—'}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Center — results first */}
          <section className="mf-diag">
            <div className="mf-diag-head">
              <h2>{athlete.name} - {athlete.event} ({athlete.year})</h2>
              <div className="mf-head-right">
                <span className={`mf-status ${readyTone(athlete.readiness) === 'good' ? 'ok' : readyTone(athlete.readiness) === 'bad' || athlete.status === 'Rehab' ? 'warn' : 'muted'}`}>{athlete.status}</span>
              </div>
            </div>

            {/* HERO: Executive Briefing */}
            <div className="mf-briefing">
              <div className="mf-briefing-top">
                <span className="mf-briefing-badge">Coach’s Executive Briefing</span>
                <span className={`mf-peak-chip tone-${peak.tone}`} data-tip={peak.note}>{peak.status}</span>
                <span className="mf-session-chip">Today · {todaySession(athlete)}</span>
              </div>
              {constraints.map(c => (
                <div key={c.id} className={`mf-hero-constraint sev-${c.severity}`}>
                  <ShieldAlert size={16} />
                  <span>{c.message}</span>
                </div>
              ))}
              <h3 className="mf-briefing-headline">{story.headline}</h3>
              <p className="mf-briefing-context">🕒 {story.context}</p>
              <p className="mf-briefing-narrative">{story.narrative}</p>

              <div className="mf-simple">
                {simple.map(m => (
                  <div key={m.label} className={`mf-simple-card tone-${m.tone}`}>
                    <span className="mf-simple-label">{m.label}{m.tip && <InfoTip text={m.tip} />}</span>
                    {m.clickable
                      ? <button className="mf-simple-value mf-simple-btn" onClick={() => setShowGuide(true)} title="Open the Guide">{m.value}</button>
                      : <span className="mf-simple-value">{m.value}</span>}
                    <span className="mf-simple-note">{m.note}</span>
                  </div>
                ))}
              </div>

              <div className="mf-briefing-action">
                <span className="mf-briefing-action-label">Action Recommendation</span>
                <span>{story.action}</span>
              </div>
            </div>

            {/* Season Calendar — prominent, no clicks required */}
            <SeasonCalendar athletes={coachFiltered} />

            {/* Today's Training Plan */}
            <TrainingReport athlete={athlete} constraints={constraints} />

            {/* Plain-English focus */}
            <div className="mf-card mf-focus">
              <h4>Coach’s Focus — what to act on</h4>
              <div className="mf-focus-list">
                {focus.map((f, i) => (
                  <div key={i} className={`mf-focus-item lvl-${f.color}`}>
                    <span className="mf-focus-level">{f.level}</span><span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>


            {/* Deep Dive */}
            <div className="mf-detail">
              <button className="mf-detail-toggle" onClick={() => setShowDetail(v => !v)} aria-expanded={showDetail}>
                <span className="mf-detail-title">Deep Dive / Analyst View</span>
                <span className="mf-detail-hint">{showDetail ? 'Hide raw charts & numbers' : 'Show readiness detail, charts, clustering & the math'}</span>
                <span className={`mf-chevron ${showDetail ? 'open' : ''}`}>▾</span>
              </button>

              {showDetail && (
              <div className="mf-detail-body">
                {/* Detail stat chips */}
                {stats.length > 0 && (
                  <div className="mf-briefing-stats">
                    {stats.map(s => (
                      <div key={s.label} className={`mf-bstat tone-${s.tone}`}>
                        <span className="mf-bstat-label">{s.label}</span>
                        <span className="mf-bstat-value">{s.value}</span>
                        <span className="mf-bstat-delta">{s.delta}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Full readiness detail */}
                <div className={`mf-readiness ${!hasData ? 'is-empty' : ''}`}>
                  <div className="mf-readiness-left">
                    <ReadinessGauge value={athlete.readiness} />
                    <span className="mf-readiness-label">Readiness Score: <b>{athlete.readiness != null ? `${athlete.readiness}%` : '—'}</b><InfoTip text="Calculated nightly by fusing 3 metrics: Sleep Efficiency (%), HRV baseline deviation (ms), and morning Neuromuscular Sway (mm). Below 70% triggers a warning." /></span>
                  </div>
                  <div className="mf-readiness-metrics">
                    <span className="mf-metric">🫀 HRV: <b>{athlete.hrv ? `${athlete.hrv.value}ms` : '—'}</b>
                      {athlete.hrv && <em className={athlete.hrv.trend.startsWith('+') ? 'up' : 'down'}>{athlete.hrv.trend.startsWith('+') ? '↑' : '↓'}</em>}
                    </span>
                    <span className="mf-metric">🛏 Sleep: <b>{athlete.sleep ? `${athlete.sleep.value}h` : '—'}</b></span>
                    <span className="mf-metric">🔥 RPE: <b>{athlete.rpe ? athlete.rpe.value : '—'}</b></span>
                  </div>
                  {!hasData && <div className="mf-readiness-empty-note">⚠ No biometrics on file — the invalid test case. Ask the athlete to sync a device or enter values manually (simulated).</div>}
                </div>

                {/* Main chart */}
                <div className="mf-card">
                  <div className="mf-legend">
                    <span className="mf-leg"><i className="dot blue" />{athlete.name} actual</span>
                    <span className="mf-leg"><i className="dash gray" />Peer Group Baseline <InfoTip text="Average mark of athletes in the same event & cohort." /></span>
                    <span className="mf-unit">Marks (m) • {athlete.isHighBetter ? 'higher better ↑' : 'lower better ↓'}</span>
                  </div>
                  {!hasData ? <div className="mf-empty">No time series — nothing to plot.</div> : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={athlete.timeSeries} margin={{ top: 28, right: 18, left: 6, bottom: 4 }}>
                        <defs><linearGradient id="mfFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a6fa5" stopOpacity={0.16} /><stop offset="100%" stopColor="#4a6fa5" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid stroke="#eef2f7" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} label={{ value: 'Months', position: 'insideBottom', offset: -2, style: { fontSize: 10, fill: '#94a3b8', fontWeight: 600 } }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={54} domain={['auto', 'auto']} label={{ value: 'Marks (m)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8', fontWeight: 600, textAnchor: 'middle' } }} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
                        <Line type="monotone" dataKey="actual" stroke="#4a6fa5" strokeWidth={2.6} fill="url(#mfFill)" dot={{ r: 4, fill: '#4a6fa5', stroke: '#fff', strokeWidth: 1.5 }} />
                        <Line type="monotone" dataKey="peer" stroke="#cbd5e1" strokeWidth={1.8} strokeDasharray="5 4" dot={false} />
                        {athlete.interventions.map(m => (
                          <ReferenceLine key={m.label} x={athlete.timeSeries.find(d => d.date === m.date)?.label} stroke={m.color} strokeWidth={1.2} strokeDasharray="4 4" label={<MarkerLabel value={m.label} sub={m.sub} color={m.color} />} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <p className="mf-read">The <b>gap</b> between blue and grey is the athlete’s edge over peers. Where it widens after a vertical line, that event likely caused it.</p>
                </div>

                {/* Sub charts */}
                <div className="mf-subgrid">
                  <div className="mf-card">
                    <h4>Neuromuscular Sway <InfoTip text="Balance-test wobble in mm. Rising = fatigue showing up in movement before marks drop." /></h4>
                    <p className="mf-card-sub">Tracking fatigue via sway millimetres</p>
                    {!hasData ? <div className="mf-empty sm">No sway data</div> : (
                      <ResponsiveContainer width="100%" height={170}>
                        <AreaChart data={athlete.timeSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                          <defs><linearGradient id="mfSway" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a6fa5" stopOpacity={0.3} /><stop offset="100%" stopColor="#4a6fa5" stopOpacity={0.02} /></linearGradient></defs>
                          <CartesianGrid stroke="#eef2f7" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} label={{ value: 'Months', position: 'insideBottom', offset: -2, style: { fontSize: 10, fill: '#94a3b8', fontWeight: 600 } }} />
                          <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={44} domain={['dataMin - 1', 'dataMax + 1']} label={{ value: 'Sway (mm)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8', fontWeight: 600, textAnchor: 'middle' } }} />
                          <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
                          <ReferenceLine y={5.2} stroke="#ba6b62" strokeDasharray="4 4" label={{ value: 'risk 5.2mm', fill: '#ba6b62', fontSize: 9, fontWeight: 800, position: 'insideTopRight' }} />
                          <Area type="monotone" dataKey="sway" stroke="#4a6fa5" strokeWidth={2.2} fill="url(#mfSway)" dot={false} activeDot={{ r: 4 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="mf-card">
                    <h4>Resting Heart Rate &amp; HRV <InfoTip text="Tracks cardiovascular recovery. A rising resting heart rate combined with dropping HRV indicates severe CNS fatigue." /></h4>
                    <p className="mf-card-sub"><span style={{ color: '#4a6fa5' }}>— Heart Rate (BPM)</span> · <span style={{ color: '#ba6b62' }}>— HRV (ms)</span></p>
                    {!hasData ? <div className="mf-empty sm">No heart-rate data</div> : (
                      <ResponsiveContainer width="100%" height={170}>
                        <AreaChart data={athlete.timeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="mfHr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a6fa5" stopOpacity={0.28} /><stop offset="100%" stopColor="#4a6fa5" stopOpacity={0.02} /></linearGradient>
                            <linearGradient id="mfHrv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ba6b62" stopOpacity={0.26} /><stop offset="100%" stopColor="#ba6b62" stopOpacity={0.02} /></linearGradient>
                          </defs>
                          <CartesianGrid stroke="#eef2f7" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} label={{ value: 'Months', position: 'insideBottom', offset: -2, style: { fontSize: 10, fill: '#94a3b8', fontWeight: 600 } }} />
                          <YAxis yAxisId="l" tick={{ fill: '#4a6fa5', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={48} label={{ value: 'Heart Rate (BPM)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#4a6fa5', fontWeight: 600, textAnchor: 'middle' } }} />
                          <YAxis yAxisId="r" orientation="right" tick={{ fill: '#ba6b62', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={48} label={{ value: 'HRV (ms)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#ba6b62', fontWeight: 600, textAnchor: 'middle' } }} />
                          <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
                          <Area yAxisId="l" type="monotone" dataKey="heartRate" stroke="#4a6fa5" strokeWidth={2.2} fill="url(#mfHr)" dot={false} activeDot={{ r: 4 }} name="Heart Rate (BPM)" />
                          <Area yAxisId="r" type="monotone" dataKey="hrv" stroke="#ba6b62" strokeWidth={2.2} fill="url(#mfHrv)" dot={false} activeDot={{ r: 4 }} name="HRV (ms)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Clustering + econometrics */}
                <div className="mf-subgrid">
                  <div className="mf-card">
                    <h4>K-Means Peer Clustering <span className="mf-tag coral">k = 3</span> <InfoTip text="Groups athletes by training load and mark into tiers. The star is this athlete; proximity to a centroid indicates the tier." /></h4>
                    <p className="mf-card-sub">Training load vs mark — the star is {athlete.name}</p>
                    {!hasData ? <div className="mf-empty sm">No embedding available</div> : (
                      <ResponsiveContainer width="100%" height={190}>
                        <ScatterChart margin={{ top: 8, right: 10, left: 0, bottom: 18 }}>
                          <CartesianGrid stroke="#eef2f7" />
                          <XAxis type="number" dataKey="x" name="Load" unit="%" domain={[30, 90]} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} label={{ value: 'Training Load (%)', position: 'insideBottom', offset: -8, style: { fontSize: 10, fill: '#94a3b8', fontWeight: 600 } }} />
                          <YAxis type="number" dataKey="y" name="Mark" domain={[3.5, 7]} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={48} label={{ value: 'Mark (m)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8', fontWeight: 600, textAnchor: 'middle' } }} />
                          <ZAxis dataKey="r" range={[40, 90]} />
                          <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
                          <Scatter data={clusters.filter(d => d.cluster === 'Elite')} fill="#4a6fa5" fillOpacity={0.8} />
                          <Scatter data={clusters.filter(d => d.cluster === 'Mid')} fill="#ba6b62" fillOpacity={0.8} />
                          <Scatter data={clusters.filter(d => d.cluster === 'Developing')} fill="#cbd5e1" fillOpacity={0.9} />
                          <Scatter data={athletePoint} fill="#1f2937" shape="star" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    )}
                    <div className="mf-cluster-legend">
                      <span><i style={{ background: '#4a6fa5' }} />Elite</span>
                      <span><i style={{ background: '#ba6b62' }} />Mid</span>
                      <span><i style={{ background: '#cbd5e1' }} />Developing</span>
                      <span><i className="star" />This athlete</span>
                    </div>
                  </div>

                  <div className="mf-card mf-ai">
                    <h4>Causal Impact Report</h4>
                    <div className="mf-ai-econ">
                      {athlete.econ.map(e => (
                        <div key={e.title} className="mf-econ-row" style={{ background: e.bg, borderColor: `${e.color}22` }}>
                          <span className="mf-econ-badge" style={{ color: e.color }}>{e.bullet}</span>
                          <div>
                            <div className="mf-econ-title">{e.title}</div>
                            <div className="mf-econ-meta">
                              <span className="mf-econ-ci">{e.ci}</span>
                              <span style={{ color: e.color, fontWeight: 800 }}>{e.r2}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Automation */}
                <div className="mf-card mf-auto">
                  <h4>How this runs automatically</h4>
                  <ol className="mf-auto-steps">
                    <li><b>Ingest</b><InfoTip text="Pulls daily CSVs from the weight room velocity trackers and field GPS units." /> — wearable / GPS / meet results sync in daily <span className="mf-sim-inline">(simulated)</span></li>
                    <li><b>Compute</b><InfoTip text="Runs a Python script at 2:00 AM to update the Readiness Score before morning practice." /> — readiness, balance & peer baseline recalculated nightly</li>
                    <li><b>Detect</b> — engine flags anomalies (readiness &lt; 70, balance past risk line)</li>
                    <li><b>Alert</b> — the coach gets a prioritised “Focus” list like the one above</li>
                    <li><b>Act</b> — adjust training load; the next cycle re-checks</li>
                  </ol>
                </div>

                {/* Inline comparison (consolidated from the old Compare tab) */}
                <div className="mf-card">
                  <div className="mf-compare-head">
                    <h4>⇄ Compare athletes</h4>
                    <button className="mf-btn-ghost" onClick={() => setShowCompare(v => !v)}>{showCompare ? 'Hide' : 'Show comparison'}</button>
                  </div>
                  {showCompare
                    ? <div className="mf-compare-embed"><CompareAthletes athletes={coachFiltered} /></div>
                    : <p className="mf-read">Head-to-head progression and a CSV export, inline — no separate tab.</p>}
                </div>
              </div>
              )}
            </div>
          </section>
        </div>
        </>
        )}
      </div>

      {/* System Preferences modal */}
      {showPrefs && (
        <div className="mf-guide-overlay" onClick={() => setShowPrefs(false)}>
          <div className="mf-prefs" onClick={e => e.stopPropagation()}>
            <div className="mf-guide-head">
              <h3>System Preferences</h3>
              <button className="mf-guide-close" onClick={() => setShowPrefs(false)}>×</button>
            </div>
            <p className="mf-guide-sub">Demo controls — mock settings for the prototype.</p>
            <div className="mf-pref-list">
              {[
                { key: 'metric', title: 'Metric units', desc: 'Show marks in metres / seconds (SI)' },
                { key: 'alerts', title: 'Threshold alerts', desc: 'Notify coach when readiness < 70% or balance passes the risk line' },
              ].map(row => (
                <div key={row.key} className="mf-pref-row">
                  <div className="mf-pref-text"><b>{row.title}</b><span>{row.desc}</span></div>
                  <button className={`mf-toggle ${prefs[row.key] ? 'on' : ''}`} aria-pressed={prefs[row.key]}
                    onClick={() => setPrefs(p => ({ ...p, [row.key]: !p[row.key] }))}><span /></button>
                </div>
              ))}
            </div>
            <div className="mf-pref-nav">
              <button onClick={() => { setShowPrefs(false); setTab('platform') }}>Platform Brief</button>
              <button onClick={() => { setShowPrefs(false); setShowGuide(true) }}>Guide</button>
              <button onClick={() => { setShowPrefs(false); if (onBack) onBack() }}>Back to Coach Hub</button>
            </div>
            <div className="mf-prefs-foot"><span>Changes are cosmetic in this demo.</span><button className="mf-btn-ghost" onClick={() => setShowPrefs(false)}>Done</button></div>
          </div>
        </div>
      )}

      {toast && <div className="mf-toast">{toast}</div>}

      {/* Guide modal */}
      {showGuide && (
        <div className="mf-guide-overlay" onClick={() => setShowGuide(false)}>
          <div className="mf-guide" onClick={e => e.stopPropagation()}>
            <div className="mf-guide-head">
              <h3>Guide — reading this dashboard</h3>
              <button className="mf-guide-close" onClick={() => setShowGuide(false)}>×</button>
            </div>
            <p className="mf-guide-sub">Plain-English definitions for a coach (no sports-science background needed).</p>
            <dl className="mf-guide-list">
              {GLOSSARY.map(g => (
                <div key={g.term} className="mf-guide-item"><dt>{g.term}</dt><dd>{g.def}</dd></div>
              ))}
            </dl>
            <div className="mf-guide-rail">
              <h4>Left icon rail</h4>
              {RAIL.map(r => <span key={r.label} className="mf-guide-rail-item">{r.icon} {r.label}</span>)}
            </div>
            <div className="mf-guide-foot">
              <b>3 test cases:</b> Sarah J. (normal) · Jonah H. (unusual — field event + injury) · Alex P. (invalid — no data). Mock data; integrations simulated.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
