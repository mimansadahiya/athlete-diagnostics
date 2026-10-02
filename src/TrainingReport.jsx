/**
 * TrainingReport.jsx
 * Compact "Today's Training Plan". Baseline = REAL USF G2-Triple session
 * (Specific Prep · Winter). Adaptation = block-level modification derived from
 * readiness / fatigue / localized stress. One-line summary; rep/set detail on hover.
 */
import { buildAdaptation } from './engine'
import { pickSession, sessionKind } from './usfTraining'
import './TrainingReport.css'

export default function TrainingReport({ athlete, constraints = [] }) {
  const baseline = pickSession(athlete)
  const adapt = buildAdaptation(athlete, constraints, baseline)

  return (
    <div className="tr">
      <div className="tr-head">
        <span className="tr-title">Today’s Training Plan</span>
        <span className="tr-session">{sessionKind(baseline)}</span>
      </div>

      <div className="tr-row">
        <span className="tr-label">USF baseline</span>
        <span className="tr-base">
          <b>{baseline.title}</b>
          <em>{baseline.day} {baseline.date} · {baseline.phase}</em>
        </span>
        <span className="tr-hover" aria-hidden="true">
          <span className="tr-detail-title">Baseline blocks (USF G2 · Triple)</span>
          <ul>{baseline.blocks.map(b => <li key={b.ex}><span>{b.ex}</span><b>{b.set}</b></li>)}</ul>
        </span>
      </div>

      <div className={`tr-row tr-adapt lvl-${adapt.level}`}>
        <span className="tr-label">Adaptation</span>
        <span className="tr-adapt-summary">{adapt.summary}</span>
        <span className="tr-hover tr-adapt-hover" aria-hidden="true">
          <span className="tr-detail-title">Applied modifications</span>
          {adapt.modifications && adapt.modifications.length > 0 ? (
            <ul>{adapt.modifications.map((m, i) => (
              <li key={i} className="tr-mod"><span>{m.ex}</span><span className="tr-mod-change">{m.from} → <b>{m.to}</b></span></li>
            ))}</ul>
          ) : <ul><li>No modification required today</li></ul>}
        </span>
      </div>

      <p className="tr-note">Hover a row for detail. Baseline is transcribed USF plan data; adaptation is generated from readiness, sleep, check-in and the muscle log.</p>
    </div>
  )
}
