/**
 * SquadPlanBoard.jsx  →  "Workout Generation" tab
 * Step 3 of the pipeline: ingest a baseline plan, see each athlete's kinematic-
 * synced modification, Accept (or Accept All), and export the finalized plan.
 * Read-only data logic. Mock-fed.
 */
import { useState, useRef } from 'react'
import { Upload, Check, Download, AlertTriangle } from 'lucide-react'
import { buildConstraints, buildAdaptation, fatigueLabel, applyAdaptation } from './engine'
import { pickSession, sessionKind } from './usfTraining'
import './SquadPlanBoard.css'

export default function SquadPlanBoard({ athletes, muscleLogs = {} }) {
  const baseline = pickSession()
  const kind = sessionKind(baseline)
  const [imported, setImported] = useState(false)
  const [fileName, setFileName] = useState('')
  const [accepted, setAccepted] = useState({})
  const fileRef = useRef(null)

  function handleFile(e) {
    const f = e.target.files && e.target.files[0]
    setFileName(f ? f.name : 'Men_and_Women_2023-2024@USF_winter.pdf')
    setImported(true)
  }

  const rows = athletes.map(a => {
    const log = muscleLogs[a.id] || {}
    const constraints = buildConstraints(a, log)
    const adapt = buildAdaptation(a, constraints, baseline)
    const hasUpdate = Object.keys(log).length > 0
    const finalBlocks = applyAdaptation(baseline, adapt)
    return { a, adapt, readiness: fatigueLabel(a), hasUpdate, finalBlocks, accepted: !!accepted[a.id] }
  })

  const pending = rows.filter(r => !r.accepted && r.adapt.modifications.length > 0)
  const flagged = rows.filter(r => r.adapt.level === 'critical' || r.adapt.level === 'warning').length

  function acceptOne(id) { setAccepted(s => ({ ...s, [id]: true })) }
  function acceptAll() { setAccepted(s => { const n = { ...s }; pending.forEach(r => { n[r.a.id] = true }); return n }) }

  function exportCsv() {
    const header = ['Athlete', 'Coach', 'Baseline session', 'Overall readiness', 'Status', 'Final plan (accepted)']
    const lines = rows.map(r => {
      const finalPlan = r.accepted && r.adapt.modifications.length > 0
        ? r.finalBlocks.map(b => `${b.ex} ${b.set}${b.changed ? ' (modified)' : ''}`).join('; ')
        : ''
      return [r.a.name, r.a.coach || '', baseline.title, r.readiness.label, r.accepted ? 'Accepted' : 'Baseline', finalPlan]
    })
    const csv = [header, ...lines].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'final_training_plan.csv'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="spb">
      <div className="spb-head">
        <div>
          <h2>Workout Generation</h2>
          <p><b>Today · Specific Prep Phase (Winter)</b> — {baseline.title} ({kind}). Import a baseline, sync kinematic updates, accept modifications, export.</p>
        </div>
        <div className="spb-stats">
          <span>{rows.length} athletes</span>
          <span className="spb-flag">{flagged} flagged</span>
        </div>
      </div>

      {/* 1 — Import baseline (native file picker) */}
      <div className={`spb-import ${imported ? 'done' : ''}`}>
        <button className={`spb-import-btn ${imported ? 'done' : ''}`} onClick={() => fileRef.current && fileRef.current.click()}>
          <Upload size={15} /> {imported ? 'Re-import Baseline Plan' : 'Import Baseline Plan (CSV)'}
        </button>
        <input ref={fileRef} type="file" accept=".csv,.pdf,.xlsx,.xls,text/csv" className="spb-file-input" onChange={handleFile} />
        {imported ? (
          <span className="spb-import-file"><Check size={13} /> {fileName || 'Men_and_Women_2023-2024@USF_winter.pdf'} • Successfully Imported</span>
        ) : (
          <span className="spb-import-hint">Drop a CSV or click to load the USF G2 · Triple · Specific Prep baseline.</span>
        )}
      </div>

      {/* 2 — Actions */}
      <div className="spb-actions">
        <button className="spb-accept-all" onClick={acceptAll} disabled={pending.length === 0 || !imported}>
          <Check size={15} /> Accept All Updates {pending.length > 0 ? `(${pending.length})` : ''}
        </button>
        <button className="spb-export" onClick={exportCsv} disabled={!imported}>
          <Download size={15} /> Export Final Plan (CSV)
        </button>
      </div>

      {/* 3 — Board */}
      <div className="spb-table-wrap">
        <table className="spb-table">
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Coach</th>
              <th>Baseline session</th>
              <th>Overall readiness</th>
              <th>Recommended modification</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.a.id} className={`spb-row lvl-${r.adapt.level}`}>
                <td className="spb-name">
                  {r.a.name}
                  {r.hasUpdate && <span className="spb-sync"><AlertTriangle size={11} /> Kinematic update</span>}
                </td>
                <td>{r.a.coach || '—'}</td>
                <td>
                  <span className={`spb-title ${r.accepted ? 'spb-strike' : ''}`}>{baseline.title}</span>
                  <span className="spb-sub">{baseline.phase} · Today</span>
                </td>
                <td><span className={`spb-ready ${r.readiness.tone}`}>{r.readiness.label}</span></td>
                <td className="spb-mod">
                  {r.accepted ? (
                    <>
                      <span className="spb-final">Final plan {r.adapt.modifications.length > 0 ? '(modified)' : ''}</span>
                      <span className="spb-mod-detail">
                        {r.finalBlocks.map((b, i) => (
                          <span key={i} className={`spb-mod-line ${b.changed ? 'changed' : ''}`}>{b.ex} — {b.set}</span>
                        ))}
                      </span>
                    </>
                  ) : (
                    <>
                      {r.adapt.summary}
                      {r.adapt.details && r.adapt.details.length > 0 && (
                        <span className="spb-mod-detail">
                          {r.adapt.details.map((d, i) => <span key={i} className="spb-mod-line">{d}</span>)}
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td>
                  {r.adapt.modifications.length === 0 ? (
                    <span className="spb-flagpill lvl-ok">No change</span>
                  ) : r.accepted ? (
                    <span className="spb-flagpill lvl-ok"><Check size={11} /> Accepted</span>
                  ) : (
                    <button className="spb-accept-btn" onClick={() => acceptOne(r.a.id)} disabled={!imported}>Accept</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="spb-note">Baseline transcribed from Men_and_Women_2023-2024@USF_winter.pdf (G2 · Triple · Specific Prep). Modifications are rule-based and sync live from the Kinematic tab. Mock data throughout.</p>
    </div>
  )
}
