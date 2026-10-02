/**
 * CompareAthletes.jsx
 * Side-by-side multi-athlete comparison. Marks are re-based to 100 at each
 * athlete's first data point so athletes in different events can be compared
 * on a like-for-like progression index. All data is mock.
 */
import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const COLORS = ['#4a6fa5', '#ba6b62', '#4f8a6b']
const MAX = 3

export default function CompareAthletes({ athletes }) {
  const withData = useMemo(() => athletes.filter(a => a.timeSeries && a.timeSeries.length > 0), [athletes])
  const [ids, setIds] = useState(() => withData.slice(0, 3).map(a => a.id))
  const selected = ids.map(id => withData.find(a => a.id === id)).filter(Boolean)

  function toggle(id) {
    setIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= MAX) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  // Build re-based progression series
  const series = useMemo(() => {
    const len = 8
    const rows = Array.from({ length: len }, (_, i) => ({ i }))
    selected.forEach(a => {
      const first = a.timeSeries[0].actual || 1
      a.timeSeries.forEach((d, i) => {
        if (!rows[i]) rows[i] = { i }
        rows[i].label = d.label
        rows[i][a.name] = Math.round((d.actual / first) * 1000) / 10
      })
    })
    return rows
  }, [selected])

  function metrics(a) {
    const ts = a.timeSeries || []
    const latest = ts.length ? ts[ts.length - 1].actual : null
    const best = ts.length ? (a.isHighBetter ? Math.max(...ts.map(d => d.actual)) : Math.min(...ts.map(d => d.actual))) : null
    const swayMax = ts.length ? Math.max(...ts.map(d => d.sway || 0)) : null
    return { latest, best, swayMax }
  }

  function exportCsv() {
    const header = ['Athlete', 'Event', 'Coach', 'Readiness (%)', 'HRV (ms)', 'Sleep (h)', 'RPE', 'Latest mark', 'Best mark', 'Sway max (mm)']
    const rows = selected.map(a => {
      const m = metrics(a)
      return [
        a.name, a.event, a.coach || '',
        a.readiness ?? '', a.hrv ? a.hrv.value : '', a.sleep ? a.sleep.value : '', a.rpe ? a.rpe.value : '',
        m.latest ?? '', m.best ?? '', m.swayMax ?? '',
      ]
    })
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'athlete_comparison.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="cmp">
      <div className="cmp-head">
        <div>
          <h2>Compare Athletes</h2>
          <p>Pick up to {MAX}. Marks are re-based to <b>100</b> at each athlete’s first data point, so different events can be compared on progression.</p>
        </div>
      </div>

      <div className="cmp-picker">
        {withData.map(a => (
          <button key={a.id} onClick={() => toggle(a.id)} className={`cmp-chip ${ids.includes(a.id) ? 'on' : ''}`}>
            <span className="cmp-chip-dot" style={{ background: COLORS[ids.indexOf(a.id)] || '#cbd5e1' }} />
            {a.name} <span className="cmp-chip-sub">{a.event}</span>
          </button>
        ))}
      </div>

      <div className="cmp-card">
        <h4 className="cmp-title">Overall Performance Score <span className="mf-info" data-tip="Tracks current performance relative to the athlete's baseline mark at the start of the season to measure overall progression.">i</span></h4>
        <p className="cmp-sub">Indexed to 100 at each athlete’s season-start mark. Higher = more progression.</p>
        {selected.length === 0 ? (
          <div className="mf-empty sm">Select at least one athlete above.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ top: 12, right: 18, left: 4, bottom: 4 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, color: '#475569', paddingTop: 8 }} />
              {selected.map((a, i) => (
                <Line key={a.id} type="monotone" dataKey={a.name} stroke={COLORS[i]} strokeWidth={2.6}
                  dot={{ r: 3.5, fill: COLORS[i], stroke: '#fff', strokeWidth: 1.4 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="cmp-card">
        <div className="cmp-card-head">
          <h4>Head-to-head metrics</h4>
          <button className="cmp-export" onClick={exportCsv} disabled={selected.length === 0}>⬇ Export to CSV</button>
        </div>
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Athlete</th><th>Event</th><th>Coach</th><th>Readiness</th><th>HRV</th>
                <th>Sleep</th><th>RPE</th><th>Latest</th><th>Best</th><th>Sway max</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((a, i) => {
                const m = metrics(a)
                const lowReady = a.readiness != null && a.readiness < 68
                return (
                  <tr key={a.id}>
                    <td><span className="cmp-dot" style={{ background: COLORS[i] }} />{a.name}</td>
                    <td>{a.event}</td>
                    <td>{a.coach || '—'}</td>
                    <td className={lowReady ? 'cmp-bad' : a.readiness == null ? 'cmp-muted' : 'cmp-good'}>{a.readiness != null ? `${a.readiness}%` : 'no data'}</td>
                    <td>{a.hrv ? `${a.hrv.value}ms` : '—'}</td>
                    <td>{a.sleep ? `${a.sleep.value}h` : '—'}</td>
                    <td>{a.rpe ? a.rpe.value : '—'}</td>
                    <td><b>{m.latest ?? '—'}</b></td>
                    <td>{m.best ?? '—'}</td>
                    <td className={m.swayMax > 5.2 ? 'cmp-bad' : ''}>{m.swayMax != null ? `${m.swayMax}mm` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="cmp-note">⚠ Different events use different units — compare <b>progression</b>, not raw marks. The index chart is the apples-to-apples view.</p>
      </div>
    </div>
  )
}
