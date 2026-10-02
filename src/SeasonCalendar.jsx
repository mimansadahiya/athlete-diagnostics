/**
 * SeasonCalendar.jsx
 * Visual season map: phases, weekly training load, planned vs achieved
 * milestones, and upcoming meets. Phases and week bars are interactive.
 * Mock data, generated per athlete.
 */
import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from 'recharts'

function seed(id) { let s = 0; for (let i = 0; i < id.length; i++) s += id.charCodeAt(i) * (i + 3); return s }
function rand(s, i) { const x = Math.sin(s * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x) }

const PHASE_FOCUS = {
  'Off-season': 'General prep · hypertrophy · base',
  'Indoor': 'Speed & power · short approach',
  'Outdoor': 'Competition block · full approach',
  'Championships': 'Peak / taper · championship loading',
}

export function buildSeason(a) {
  const s = seed(a.id)
  const weeks = Array.from({ length: 16 }, (_, i) => {
    const base = 55 + Math.sin(i / 2.4) * 22
    const dip = i === 10 ? 8 : 0
    const load = Math.round(Math.max(38, Math.min(100, base + rand(s, i) * 14 + dip)))
    return {
      week: `W${i + 1}`,
      load,
      planned: i === 10 ? 55 : 70,
      phase: i < 4 ? 'Off-season' : i < 8 ? 'Indoor' : i < 14 ? 'Outdoor' : 'Championships',
      session: i === 10 ? 'Deload + midterms' : load > 85 ? 'High CNS load' : 'Standard block',
      milestone: i === 4 ? 'Indoor opener' : i === 10 ? 'Midterms' : i === 14 ? 'Peak' : null,
    }
  })
  const unit = a.isHighBetter ? 'm' : 's'
  const baseMark = a.peerBaseline || 6
  return {
    currentWeek: 11,
    phases: [
      { name: 'Off-season', range: 'Sep–Nov', state: 'done' },
      { name: 'Indoor', range: 'Dec–Feb', state: 'done' },
      { name: 'Outdoor', range: 'Mar–May', state: 'current' },
      { name: 'Championships', range: 'Jun', state: 'upcoming' },
    ],
    weeks,
    milestones: [
      { date: 'Jan 12', title: 'Indoor opener', target: a.isHighBetter ? `${(baseMark * 0.9).toFixed(2)}${unit}` : `${(baseMark * 1.02).toFixed(2)}${unit}`, actual: a.isHighBetter ? `${(baseMark * 0.86).toFixed(2)}${unit}` : `${(baseMark * 1.05).toFixed(2)}${unit}`, status: 'off' },
      { date: 'Mar 10', title: 'Midterm block', target: 'Hold load', actual: 'Load dipped', status: 'watch' },
      { date: 'Apr 20', title: 'Recovery reset', target: 'Return to plan', actual: 'On track', status: 'on' },
    ],
    meets: [
      { date: 'May 10', name: 'Conference Championships', location: 'San Luis Obispo, CA', target: a.isHighBetter ? `${(baseMark * 1.15).toFixed(2)}${unit}` : `${(baseMark * 0.97).toFixed(2)}${unit}`, status: 'upcoming' },
      { date: 'May 24', name: 'NCAA West Regionals', location: 'Sacramento, CA', target: 'Qualify', status: 'upcoming' },
      { date: 'Jun 07', name: 'NCAA Championships', location: 'Eugene, OR', target: 'Final', status: 'planned' },
    ],
  }
}

const TONE = { off: 'slate', watch: 'warn', on: 'good', upcoming: 'blue', planned: 'muted' }
const LABEL = { off: 'Off Pace', watch: 'Watch', on: 'On Track', upcoming: 'Upcoming', planned: 'Planned' }

function Info({ text }) { return <span className="mf-info" data-tip={text} aria-label={text}>i</span> }

function ChampLabel({ viewBox }) {
  if (!viewBox) return null
  return (
    <g>
      <title>Conference Championships</title>
      <text x={viewBox.x} y={13} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight={700}>Conf. Champs</text>
    </g>
  )
}

export default function SeasonCalendar({ athletes, compact = false }) {
  const athlete = athletes.find(a => a.timeSeries && a.timeSeries.length > 0) || athletes[0]
  const season = useMemo(() => buildSeason(athlete), [athlete])
  const [phase, setPhase] = useState('Outdoor')
  const [week, setWeek] = useState(null)

  const phaseWeeks = season.weeks.filter(w => w.phase === phase)
  const avgLoad = phaseWeeks.length ? Math.round(phaseWeeks.reduce((s, w) => s + w.load, 0) / phaseWeeks.length) : 0
  const nextMeet = season.meets[0]

  if (compact) {
    return (
      <div className="sc sc-compact">
        <div className="sc-compact-head">
          <span className="sc-compact-title">Season Timeline</span>
          <span className="sc-compact-next">Next: <b>{nextMeet.name}</b> · {nextMeet.date}</span>
        </div>
        <div className="sc-phases sc-phases-compact">
          {season.phases.map(p => (
            <button key={p.name} onClick={() => setPhase(p.name)} className={`sc-phase ${p.state} ${phase === p.name ? 'selected' : ''}`}>
              <span className="sc-phase-name">{p.name}</span>
              <span className="sc-phase-range">{p.range}</span>
            </button>
          ))}
        </div>
        <div className="sc-phase-detail">
          <b>{phase}</b> · {PHASE_FOCUS[phase]} · <span className="sc-phase-stat">avg load {avgLoad}%</span>
        </div>
      </div>
    )
  }

  return (
    <div className="sc">
      <div className="sc-head">
        <h2>Season Calendar — {athlete.name} <span className="sc-event">{athlete.event}</span></h2>
        <p>Competition season mapped against planned milestones and weekly training load. Click a phase or a week bar. Mock data.</p>
      </div>

      {/* Clickable phase timeline */}
      <div className="sc-phases">
        {season.phases.map(p => (
          <button key={p.name} onClick={() => { setPhase(p.name); setWeek(null) }} className={`sc-phase ${p.state} ${phase === p.name ? 'selected' : ''}`}>
            <span className="sc-phase-name">{p.name}</span>
            <span className="sc-phase-range">{p.range}</span>
            {p.state === 'current' && <span className="sc-phase-now">● current</span>}
          </button>
        ))}
      </div>

      <div className="sc-phase-detail">
        <b>{phase}</b> · {PHASE_FOCUS[phase]} · <span className="sc-phase-stat">avg load {avgLoad}%</span>
      </div>

      {/* Weekly load — clickable bars */}
      <div className="sc-card">
        <h4>Weekly Training Load <Info text="Weekly prescribed load as a % of the athlete's capacity. Bars above 85% are high CNS load; below 55% is deload." /> <span className="sc-hint">click a bar for that week’s detail</span></h4>
        <p className="sc-sub">The midterm dip (W11) lines up with the fatigue flagged on the Diagnostics tab.</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={season.weeks} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={30} unit="%" />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} cursor={{ fill: 'rgba(74,111,165,0.06)' }} />
            <ReferenceLine y={70} stroke="#cbd5e1" strokeDasharray="4 4" />
            <ReferenceLine x="W15" stroke="#94a3b8" strokeWidth={2} strokeDasharray="2 4" label={<ChampLabel />} />
            <Bar dataKey="load" radius={[5, 5, 0, 0]} name="Load %" onClick={d => setWeek(d)} cursor="pointer">
              {season.weeks.map((w, i) => (
                <Cell key={i} fill={week && week.week === w.week ? '#4a6fa5' : w.load > 85 ? '#ba6b62' : w.load < 55 ? '#cbd5e1' : '#7d97b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {week && (
          <div className="sc-week-detail">
            <b>{week.week}</b>
            <span className="sc-week-stat">Load {week.load}% · planned {week.planned}% · {week.session}</span>
            <span className="sc-week-phase">{week.phase}{week.milestone ? ` · ${week.milestone}` : ''}</span>
            <button className="sc-week-x" onClick={() => setWeek(null)}>×</button>
          </div>
        )}
      </div>

      <div className="sc-cols">
        <div className="sc-card">
          <h4>Planned vs. Achieved <Info text="Compares the coach's prescribed weekly training load against the athlete's actual executed volume." /></h4>
          <div className="sc-milestones">
            {season.milestones.map(m => (
              <div key={m.title} className="sc-milestone">
                <span className={`sc-dot tone-${TONE[m.status]}`} />
                <div className="sc-ms-text">
                  <b>{m.title}</b><span>{m.date} · target {m.target} · actual {m.actual}</span>
                </div>
                <span className={`sc-ms-tag tone-${TONE[m.status]}`}>{LABEL[m.status]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sc-card">
          <h4>Upcoming Meets <Info text="Scheduled competitions with the target mark the coach is peaking toward." /></h4>
          <div className="sc-meets">
            {season.meets.map(m => (
              <div key={m.name} className="sc-meet">
                <div className="sc-meet-date">{m.date}</div>
                <div className="sc-meet-body">
                  <b>{m.name}</b><span>{m.location} · target {m.target}</span>
                </div>
                <span className={`sc-ms-tag tone-${TONE[m.status]}`}>{LABEL[m.status]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
