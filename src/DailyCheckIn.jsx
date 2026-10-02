/**
 * DailyCheckIn.jsx
 * A frictionless 2-tap athlete self-report (<5 seconds): mental stress and
 * physical freshness on a 1–5 scale. Feeds the context engine.
 */
import { useState } from 'react'

const SCALE = [1, 2, 3, 4, 5]

export default function DailyCheckIn({ athleteName, onLog }) {
  const [stress, setStress] = useState(null)
  const [fresh, setFresh] = useState(null)
  const [done, setDone] = useState(false)

  const complete = stress != null && fresh != null

  function submit() {
    if (!complete) return
    setDone(true)
    onLog?.({ stress, fresh })
  }

  if (done) {
    return (
      <div className="ci ci-done">
        <span className="ci-check">✓</span>
        <div>
          <b>Check-in logged.</b>
          <span>Stress {stress}/5 · Freshness {fresh}/5 — thanks, this now feeds today’s briefing.</span>
        </div>
        <button className="ci-redo" onClick={() => { setDone(false); setStress(null); setFresh(null) }}>Edit</button>
      </div>
    )
  }

  return (
    <div className="ci">
      <div className="ci-head">
        <h4>Athlete Daily Check-In</h4>
        <span className="ci-time">under 5 seconds</span>
      </div>
      <div className="ci-q">
        <label>How stressed do you feel today?</label>
        <div className="ci-scale">
          {SCALE.map(n => (
            <button key={n} className={`ci-tap ${stress === n ? 'on stress' : ''}`} onClick={() => setStress(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="ci-q">
        <label>How fresh do you feel physically?</label>
        <div className="ci-scale">
          {SCALE.map(n => (
            <button key={n} className={`ci-tap ${fresh === n ? 'on fresh' : ''}`} onClick={() => setFresh(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="ci-foot">
        <span className="ci-hint">1 = low · 5 = high</span>
        <button className="ci-submit" disabled={!complete} onClick={submit}>
          {complete ? 'Log check-in' : 'Tap 1–5 on both'}
        </button>
      </div>
      {athleteName && <p className="ci-note">Simulated athlete self-report for {athleteName}.</p>}
    </div>
  )
}
