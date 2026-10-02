/**
 * KinematicMap.jsx
 * Premium 2D SVG body map (Anterior + Posterior). Click a muscle group to log
 * localized tightness / stress / pain (1–10) via a sleek popover slider.
 * Feeds the constraint engine. All data is mock; no external 3D assets.
 */
import { useState } from 'react'
import { Activity, ShieldAlert, Check, X, Info } from 'lucide-react'
import { buildConstraints, systemicFatigue, todaySession } from './engine'
import DailyCheckIn from './DailyCheckIn'
import './KinematicMap.css'
import './DailyCheckIn.css'

/* ── Silhouette (shared) ── */
function Silhouette() {
  return (
    <g className="kine-body">
      <circle cx="110" cy="34" r="20" />
      <rect x="102" y="50" width="16" height="12" rx="6" />
      <path d="M80,66 Q110,58 140,66 L146,120 Q148,160 136,182 L84,182 Q72,160 74,120 Z" />
      <rect x="84" y="182" width="52" height="28" rx="12" />
      <rect x="58" y="70" width="18" height="66" rx="9" />
      <rect x="50" y="132" width="16" height="64" rx="8" />
      <rect x="144" y="70" width="18" height="66" rx="9" />
      <rect x="154" y="132" width="16" height="64" rx="8" />
      <rect x="88" y="206" width="22" height="100" rx="10" />
      <rect x="90" y="306" width="18" height="98" rx="9" />
      <ellipse cx="99" cy="410" rx="15" ry="8" />
      <rect x="110" y="206" width="22" height="100" rx="10" />
      <rect x="112" y="306" width="18" height="98" rx="9" />
      <ellipse cx="121" cy="410" rx="15" ry="8" />
    </g>
  )
}

/* ── Muscle group definitions ── */
const ANTERIOR = [
  { id: 'shoulders_l', label: 'Shoulder (L)', cx: 74, cy: 76, parts: [{ kind: 'ellipse', cx: 74, cy: 76, rx: 13, ry: 10 }] },
  { id: 'shoulders_r', label: 'Shoulder (R)', cx: 146, cy: 76, parts: [{ kind: 'ellipse', cx: 146, cy: 76, rx: 13, ry: 10 }] },
  { id: 'pecs_l', label: 'Chest (L)', cx: 98, cy: 94, parts: [{ kind: 'ellipse', cx: 98, cy: 94, rx: 15, ry: 11 }] },
  { id: 'pecs_r', label: 'Chest (R)', cx: 122, cy: 94, parts: [{ kind: 'ellipse', cx: 122, cy: 94, rx: 15, ry: 11 }] },
  { id: 'biceps_l', label: 'Biceps (L)', cx: 67, cy: 112, parts: [{ kind: 'rect', x: 60, y: 92, w: 14, h: 42, rx: 7 }] },
  { id: 'biceps_r', label: 'Biceps (R)', cx: 153, cy: 112, parts: [{ kind: 'rect', x: 146, y: 92, w: 14, h: 42, rx: 7 }] },
  { id: 'abs', label: 'Abdominals', cx: 110, cy: 146, parts: [{ kind: 'rect', x: 98, y: 120, w: 24, h: 54, rx: 8 }] },
  { id: 'adductors_l', label: 'Adductor (L)', cx: 104, cy: 232, parts: [{ kind: 'rect', x: 101, y: 208, w: 7, h: 50, rx: 3 }] },
  { id: 'adductors_r', label: 'Adductor (R)', cx: 116, cy: 232, parts: [{ kind: 'rect', x: 112, y: 208, w: 7, h: 50, rx: 3 }] },
  { id: 'quads_l', label: 'Quads (L)', cx: 98, cy: 254, parts: [{ kind: 'rect', x: 88, y: 212, w: 20, h: 84, rx: 9 }] },
  { id: 'quads_r', label: 'Quads (R)', cx: 122, cy: 254, parts: [{ kind: 'rect', x: 112, y: 212, w: 20, h: 84, rx: 9 }] },
  { id: 'shins_l', label: 'Shin (L)', cx: 98, cy: 345, parts: [{ kind: 'rect', x: 92, y: 312, w: 12, h: 66, rx: 6 }] },
  { id: 'shins_r', label: 'Shin (R)', cx: 122, cy: 345, parts: [{ kind: 'rect', x: 116, y: 312, w: 12, h: 66, rx: 6 }] },
]

const POSTERIOR = [
  { id: 'traps', label: 'Traps / Upper back', cx: 110, cy: 82, parts: [{ kind: 'ellipse', cx: 110, cy: 82, rx: 34, ry: 16 }] },
  { id: 'lats_l', label: 'Lat (L)', cx: 90, cy: 122, parts: [{ kind: 'ellipse', cx: 90, cy: 122, rx: 14, ry: 26 }] },
  { id: 'lats_r', label: 'Lat (R)', cx: 130, cy: 122, parts: [{ kind: 'ellipse', cx: 130, cy: 122, rx: 14, ry: 26 }] },
  { id: 'lowerback', label: 'Lower back', cx: 110, cy: 166, parts: [{ kind: 'rect', x: 101, y: 148, w: 18, h: 36, rx: 8 }] },
  { id: 'triceps_l', label: 'Triceps (L)', cx: 67, cy: 112, parts: [{ kind: 'rect', x: 60, y: 92, w: 14, h: 44, rx: 7 }] },
  { id: 'triceps_r', label: 'Triceps (R)', cx: 153, cy: 112, parts: [{ kind: 'rect', x: 146, y: 92, w: 14, h: 44, rx: 7 }] },
  { id: 'glutes_l', label: 'Glute (L)', cx: 100, cy: 194, parts: [{ kind: 'circle', cx: 100, cy: 194, r: 15 }] },
  { id: 'glutes_r', label: 'Glute (R)', cx: 120, cy: 194, parts: [{ kind: 'circle', cx: 120, cy: 194, r: 15 }] },
  { id: 'hamstrings_l', label: 'Hamstring (L)', cx: 98, cy: 254, parts: [{ kind: 'rect', x: 88, y: 212, w: 20, h: 84, rx: 9 }] },
  { id: 'hamstrings_r', label: 'Hamstring (R)', cx: 122, cy: 254, parts: [{ kind: 'rect', x: 112, y: 212, w: 20, h: 84, rx: 9 }] },
  { id: 'calves_l', label: 'Calf (L)', cx: 99, cy: 340, parts: [{ kind: 'rect', x: 92, y: 312, w: 14, h: 56, rx: 7 }] },
  { id: 'calves_r', label: 'Calf (R)', cx: 121, cy: 340, parts: [{ kind: 'rect', x: 114, y: 312, w: 14, h: 56, rx: 7 }] },
  { id: 'achilles_l', label: 'Achilles (L)', cx: 99, cy: 382, parts: [{ kind: 'rect', x: 95, y: 368, w: 8, h: 28, rx: 4 }] },
  { id: 'achilles_r', label: 'Achilles (R)', cx: 121, cy: 382, parts: [{ kind: 'rect', x: 117, y: 368, w: 8, h: 28, rx: 4 }] },
]

function fillFor(v) {
  if (!v) return 'rgba(37,99,235,0.10)'
  if (v >= 7) return 'rgba(225,29,72,0.55)'
  if (v >= 4) return 'rgba(217,119,6,0.50)'
  return 'rgba(22,163,74,0.45)'
}
function desc(v) {
  if (v == null) return 'Not logged'
  if (v >= 8) return 'Severe'
  if (v >= 6) return 'High'
  if (v >= 4) return 'Moderate'
  if (v >= 2) return 'Mild'
  return 'Minimal'
}

function Shape({ s, ...rest }) {
  const common = { className: 'kine-muscle', ...rest }
  if (s.kind === 'ellipse') return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />
  if (s.kind === 'rect') return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...common} />
  if (s.kind === 'circle') return <circle cx={s.cx} cy={s.cy} r={s.r} {...common} />
  return null
}

export default function KinematicMap({ athlete, log, setLog }) {
  const [view, setView] = useState('posterior')
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(5)

  const muscles = view === 'posterior' ? POSTERIOR : ANTERIOR
  const constraints = buildConstraints(athlete, log)
  const fatigue = systemicFatigue(athlete)

  function openMuscle(m) {
    setSelected(m)
    setDraft(log[m.id] || 5)
  }
  function save() {
    setLog(prev => ({ ...prev, [selected.id]: draft }))
    setSelected(null)
  }
  function clearMuscle() {
    setLog(prev => { const n = { ...prev }; delete n[selected.id]; return n })
    setSelected(null)
  }

  const logged = Object.entries(log).filter(([, v]) => v)

  return (
    <div className="kine">
      {/* Results-first: constraints */}
      {constraints.length > 0 ? (
        constraints.map(c => (
          <div key={c.id} className={`kine-constraint sev-${c.severity}`}>
            <span className="kine-constraint-ico"><ShieldAlert size={18} /></span>
            <div>
              <div className="kine-constraint-title">{c.title}</div>
              <p className="kine-constraint-msg">{c.message}</p>
              <div className="kine-constraint-reasons">
                <Activity size={12} /> {todaySession(athlete)} · {c.reasons.length ? c.reasons.join(' · ') : 'no flags'}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="kine-constraint sev-ok">
          <span className="kine-constraint-ico"><Check size={18} /></span>
          <div>
            <div className="kine-constraint-title">No training constraint today</div>
            <p className="kine-constraint-msg">Systemic load and localized stress are within range for a {todaySession(athlete).toLowerCase()}.</p>
          </div>
        </div>
      )}

      {/* Self-reported data — check-in + muscle log in one place */}
      <DailyCheckIn athleteName={athlete.name} />

      <div className="kine-head">
        <div>
          <h2>Kinematic Assessment — {athlete.name}</h2>
          <p>Tap a muscle group to log localized tightness / stress / pain. Feeds the briefing&nbsp;instantly.</p>
        </div>
        <div className="kine-toggle">
          <button className={view === 'anterior' ? 'on' : ''} onClick={() => { setView('anterior'); setSelected(null) }}>Anterior</button>
          <button className={view === 'posterior' ? 'on' : ''} onClick={() => { setView('posterior'); setSelected(null) }}>Posterior</button>
        </div>
      </div>

      <div className="kine-cols">
        <div className="kine-card">
          <div className="kine-body-wrap">
            <svg viewBox="0 0 220 520" className="kine-svg" role="img" aria-label={`${view} body map`}>
              <defs>
                <linearGradient id="kineBody" x1="0" y1="0" x2="0.4" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="42%" stopColor="#eef1f6" />
                  <stop offset="100%" stopColor="#d5dde8" />
                </linearGradient>
                <radialGradient id="kineHi" cx="0.4" cy="0.25" r="0.75">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <filter id="kineShadow" x="-25%" y="-12%" width="150%" height="130%">
                  <feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#1f2937" floodOpacity="0.16" />
                </filter>
                <filter id="kineRelief" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" floodColor="#1f2937" floodOpacity="0.28" />
                </filter>
              </defs>
              <Silhouette />
              <ellipse cx="96" cy="120" rx="42" ry="72" fill="url(#kineHi)" pointerEvents="none" />
              {muscles.map(m => (
                <g key={m.id} onClick={() => openMuscle(m)} className="kine-group">
                  {m.parts.map((s, i) => (
                    <Shape key={i} s={s}
                      style={{
                        fill: fillFor(log[m.id]),
                        stroke: selected && selected.id === m.id ? '#4a6fa5' : 'transparent',
                        strokeWidth: selected && selected.id === m.id ? 2.5 : 0,
                        filter: selected && selected.id === m.id ? 'drop-shadow(0 0 6px rgba(37,99,235,0.6))' : 'none',
                      }} />
                  ))}
                </g>
              ))}
            </svg>

            {selected && (
              <div className="kine-popover" style={{ left: `${(selected.cx / 220) * 100}%`, top: `${(selected.cy / 520) * 100}%` }}>
                <div className="kine-pop-head">
                  <span>{selected.label}</span>
                  <button className="kine-pop-x" onClick={() => setSelected(null)} aria-label="Close"><X size={14} /></button>
                </div>
                <div className="kine-pop-value">
                  <b style={{ color: draft >= 7 ? '#b0574f' : draft >= 4 ? '#a97c46' : '#4f8a6b' }}>{draft}</b>
                  <span>/10 · {desc(draft)}</span>
                </div>
                <input className="kine-range" type="range" min="1" max="10" step="1" value={draft}
                  onChange={e => setDraft(Number(e.target.value))} />
                <div className="kine-scale-labels"><span>1 minimal</span><span>10 severe</span></div>
                <div className="kine-pop-actions">
                  <button className="kine-btn-ghost" onClick={clearMuscle}>Clear</button>
                  <button className="kine-btn-primary" onClick={save}><Check size={14} /> Log</button>
                </div>
              </div>
            )}
          </div>

          <div className="kine-legend">
            <span><i style={{ background: 'rgba(22,163,74,0.5)' }} />Mild</span>
            <span><i style={{ background: 'rgba(217,119,6,0.5)' }} />Moderate</span>
            <span><i style={{ background: 'rgba(225,29,72,0.55)' }} />High</span>
            <span className="kine-legend-hint"><Info size={12} /> click a muscle</span>
          </div>
        </div>

        <div className="kine-side">
          <div className="kine-card kine-log">
            <h4>Localized Log</h4>
            {logged.length === 0 ? (
              <p className="kine-empty">No localized stress logged. Tap a muscle on the map.</p>
            ) : (
              <ul className="kine-log-list">
                {logged.map(([id, v]) => {
                  const m = [...ANTERIOR, ...POSTERIOR].find(x => x.id === id)
                  return (
                    <li key={id}>
                      <span className="kine-log-dot" style={{ background: fillFor(v) }} />
                      <span className="kine-log-name">{m ? m.label : id}</span>
                      <span className="kine-log-val" style={{ color: v >= 7 ? '#b0574f' : v >= 4 ? '#a97c46' : '#4f8a6b' }}>{v}/10</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="kine-card kine-sys">
            <h4>Systemic Load</h4>
            <p className="kine-empty">HRV, sleep, RPE and today's check-in fused.</p>
            <div className={`kine-sys-badge ${fatigue.high ? 'bad' : fatigue.present ? 'warn' : 'good'}`}>
              {fatigue.high ? 'HIGH' : fatigue.present ? 'ELEVATED' : 'NORMAL'} · score {fatigue.score}
            </div>
            {fatigue.reasons.length > 0 && <p className="kine-sys-reasons">{fatigue.reasons.join(' · ')}</p>}
            <p className="kine-sys-note">Engine combines this with the muscle log to decide today's constraint.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
