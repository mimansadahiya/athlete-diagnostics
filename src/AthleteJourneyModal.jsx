/**
 * AthleteJourneyModal.jsx
 * 
 * Full athlete journey view — shows the Pre-college vs D1 era split,
 * career bests with improvement indicators, event progression bars,
 * a season line chart, and notable meets.
 * 
 * Data is sourced live from Supabase athlete_performances table.
 */

import { useEffect, useRef, useMemo } from 'react';
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from 'chart.js';

Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, Tooltip, Filler);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a mark string to seconds (or meters for field events) as a number */
function markToNumber(mark) {
  if (!mark) return null;
  const clean = mark.replace(/[^0-9:.]/g, '');
  if (clean.includes(':')) {
    const [min, sec] = clean.split(':');
    return parseFloat(min) * 60 + parseFloat(sec);
  }
  return parseFloat(clean) || null;
}

/** Field events where higher = better */
const FIELD_HIGH_BETTER = ['LJ','TJ','HJ','PV','SP','DT','HT','JT','HH','Pentathlon','Heptathlon','Decathlon'];
function isHighBetter(event) {
  return FIELD_HIGH_BETTER.some(f => event?.toUpperCase().includes(f.toUpperCase()));
}

/** Get enrollment year estimate from academic year string */
function getEnrollmentYear(yearStr) {
  const currentYear = new Date().getFullYear();
  const map = { 'Senior': currentYear - 3, 'Junior': currentYear - 2, 'Sophomore': currentYear - 1, 'Freshman': currentYear };
  return map[yearStr] || currentYear - 1;
}

/** Get initials from name */
function initials(name) {
  return (name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Format seconds back to human-readable */
function formatMark(num, event) {
  if (!num) return '—';
  if (isHighBetter(event)) return num.toFixed(2) + 'm';
  if (num >= 60) {
    const min = Math.floor(num / 60);
    const sec = (num % 60).toFixed(2).padStart(5, '0');
    return `${min}:${sec}`;
  }
  return num.toFixed(2) + 's';
}

/** Get improvement label */
function improvement(hsMark, d1Mark, event) {
  if (!hsMark || !d1Mark) return null;
  const diff = hsMark - d1Mark;
  if (isHighBetter(event)) {
    const d = d1Mark - hsMark;
    return d > 0 ? `+${d.toFixed(2)}m` : null;
  }
  return diff > 0 ? `↓${diff.toFixed(2)}s` : null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, subColor }) {
  return (
    <div className="journey-metric">
      <p className="journey-metric-label">{label}</p>
      <p className="journey-metric-value">{value}</p>
      {sub && <p className="journey-metric-sub" style={{ color: subColor || '#1D9E75' }}>{sub}</p>}
    </div>
  );
}

function EventProgressionBar({ event, hsBest, d1Best }) {
  const hsNum = markToNumber(hsBest);
  const d1Num = markToNumber(d1Best);
  const high = isHighBetter(event);

  // Normalize bars to 40–95% width range
  const normalize = (val, ref) => {
    if (!val || !ref) return 50;
    const ratio = high ? val / (ref * 1.1) : ref / (val * 1.05);
    return Math.min(95, Math.max(30, ratio * 85));
  };

  const hsWidth = normalize(hsNum, d1Num || hsNum);
  const d1Width = normalize(d1Num, d1Num || hsNum);
  const imp = improvement(hsNum, d1Num, event);

  return (
    <div className="journey-event-row">
      <div className="journey-event-name">{event}</div>
      <div className="journey-bar-wrap">
        {hsBest && (
          <div className="journey-bar-row">
            <span className="journey-bar-label">HS</span>
            <div className="journey-bar-outer">
              <div className="journey-bar-inner journey-bar-pre" style={{ width: `${hsWidth}%` }} />
            </div>
            <span className="journey-bar-val">{hsBest}</span>
          </div>
        )}
        {d1Best && (
          <div className="journey-bar-row">
            <span className="journey-bar-label">D1</span>
            <div className="journey-bar-outer">
              <div className="journey-bar-inner journey-bar-d1" style={{ width: `${d1Width}%` }} />
            </div>
            <span className="journey-bar-val">{d1Best}</span>
          </div>
        )}
      </div>
      {imp && <div className="journey-improve-pill">{imp}</div>}
    </div>
  );
}

function ProgressionChart({ primaryEvent, prePerfs, d1Perfs }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const { labels, preData, d1Data } = useMemo(() => {
    // Group by year, take best per year
    const group = (perfs) => {
      const byYear = {};
      perfs.forEach(p => {
        const yr = p.date?.slice(0, 4);
        if (!yr) return;
        const num = markToNumber(p.mark);
        if (!num) return;
        const high = isHighBetter(p.event);
        if (!byYear[yr] || (high ? num > byYear[yr] : num < byYear[yr])) {
          byYear[yr] = num;
        }
      });
      return byYear;
    };

    const preByYear = group(prePerfs);
    const d1ByYear = group(d1Perfs);
    const allYears = [...new Set([...Object.keys(preByYear), ...Object.keys(d1ByYear)])].sort();

    return {
      labels: allYears,
      preData: allYears.map(y => preByYear[y] ?? null),
      d1Data: allYears.map(y => d1ByYear[y] ?? null),
    };
  }, [prePerfs, d1Perfs]);

  useEffect(() => {
    if (!canvasRef.current || labels.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const high = isHighBetter(primaryEvent);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Pre-college',
            data: preData,
            borderColor: '#7F77DD',
            backgroundColor: 'rgba(127,119,221,0.15)',
            pointBackgroundColor: '#7F77DD',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
            spanGaps: false,
            fill: false,
          },
          {
            label: 'D1',
            data: d1Data,
            borderColor: '#1D9E75',
            backgroundColor: 'rgba(29,158,117,0.15)',
            pointBackgroundColor: '#1D9E75',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
            spanGaps: false,
            borderDash: [5, 3],
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return ctx.dataset.label + ': ' + formatMark(v, primaryEvent);
            }
          }
        }},
        scales: {
          y: {
            reverse: !high,
            ticks: {
              callback: v => formatMark(v, primaryEvent),
              font: { size: 10 },
              color: 'rgba(255,255,255,0.4)',
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          x: {
            ticks: { font: { size: 10 }, color: 'rgba(255,255,255,0.4)', autoSkip: false },
            grid: { display: false },
          },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, preData, d1Data, primaryEvent]);

  if (labels.length === 0) return <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Not enough data for chart.</p>;

  return <canvas ref={canvasRef} style={{ width: '100%', height: '200px' }} />;
}

function MeetRow({ meet, era }) {
  return (
    <div className="journey-meet-row">
      <div className={`journey-meet-icon journey-meet-icon--${era}`}>
        {era === 'pre' ? '🏫' : '🏆'}
      </div>
      <div style={{ flex: 1 }}>
        <p className="journey-meet-name">{meet.meet_name || 'Meet'}</p>
        <p className="journey-meet-detail">{meet.event} · {meet.date}</p>
      </div>
      <div className="journey-meet-result">
        <p className="journey-meet-time">{meet.mark}</p>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function AthleteJourneyModal({ athlete, performances, onClose }) {
  const enrollYear = getEnrollmentYear(athlete.year);

  // Split performances into pre-college and D1 eras
  const { prePerfs, d1Perfs } = useMemo(() => {
    const pre = [], d1 = [];
    performances.forEach(p => {
      const yr = parseInt(p.date?.slice(0, 4));
      if (!yr) return;
      if (yr < enrollYear) pre.push(p);
      else d1.push(p);
    });
    return { prePerfs: pre, d1Perfs: d1 };
  }, [performances, enrollYear]);

  // Compute career bests per event, per era
  const { eventBests, allEvents } = useMemo(() => {
    const bests = {}; // { event: { pre: bestMark, d1: bestMark } }
    const addBest = (perf, era) => {
      const e = perf.event;
      if (!bests[e]) bests[e] = {};
      const num = markToNumber(perf.mark);
      if (!num) return;
      const existing = markToNumber(bests[e][era]);
      const high = isHighBetter(e);
      if (!existing || (high ? num > existing : num < existing)) {
        bests[e][era] = perf.mark;
      }
    };
    prePerfs.forEach(p => addBest(p, 'pre'));
    d1Perfs.forEach(p => addBest(p, 'd1'));

    // Sort events: primary event first
    const primary = athlete.primary_event;
    const events = Object.keys(bests).sort((a, b) => {
      if (a === primary) return -1;
      if (b === primary) return 1;
      return a.localeCompare(b);
    });

    return { eventBests: bests, allEvents: events };
  }, [prePerfs, d1Perfs, athlete.primary_event]);

  // Primary event performances for chart
  const primaryEvent = athlete.primary_event || allEvents[0] || '';
  const primaryPre = prePerfs.filter(p => p.event === primaryEvent);
  const primaryD1  = d1Perfs.filter(p => p.event === primaryEvent);

  // Summary stats
  const totalMeets = new Set(performances.map(p => p.meet_name)).size;
  const d1PR = eventBests[primaryEvent]?.d1;
  const hsOR = eventBests[primaryEvent]?.pre;
  const imp  = improvement(markToNumber(hsOR), markToNumber(d1PR), primaryEvent);

  // Notable meets: top 3 from each era by mark
  const topMeets = (perfs, era) => {
    return [...perfs]
      .filter(p => p.meet_name && p.mark)
      .sort((a, b) => {
        const high = isHighBetter(a.event);
        const diff = markToNumber(a.mark) - markToNumber(b.mark);
        return high ? -diff : diff;
      })
      .slice(0, 3)
      .map(p => ({ ...p, era }));
  };

  const notablePre = topMeets(prePerfs, 'pre');
  const notableD1  = topMeets(d1Perfs, 'd1');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="journey-modal glass-panel fade-in" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>

        {/* ── Header ── */}
        <div className="journey-athlete-header">
          <div className="journey-avatar">{initials(athlete.name)}</div>
          <div>
            <h2 className="journey-athlete-name">{athlete.name}</h2>
            <p className="journey-athlete-sub">
              {primaryEvent || 'Track & Field'} · Example University · {athlete.year !== 'N/A' ? athlete.year : 'Student-Athlete'}
            </p>
          </div>
          {athlete.tfrrs_url && (
            <a href={athlete.tfrrs_url} target="_blank" rel="noreferrer" className="journey-ext-link">
              TFRRS ↗
            </a>
          )}
        </div>

        {/* ── Era Timeline ── */}
        <div className="journey-timeline">
          <div className="journey-era-block journey-era-block--pre">
            <p className="journey-era-title">🏫 Pre-college</p>
            <p className="journey-era-sub">High school · before {enrollYear}</p>
          </div>
          <div className="journey-era-block journey-era-block--d1">
            <p className="journey-era-title">🏆 D1 Collegiate</p>
            <p className="journey-era-sub">Example University · {enrollYear}–present</p>
          </div>
        </div>

        {/* ── Career Bests Grid ── */}
        <p className="journey-section-label">Career Bests</p>
        <div className="journey-metric-grid">
          {d1PR && <MetricCard label={`${primaryEvent} D1 PR`} value={d1PR} sub={imp ? imp + ' vs HS' : 'College best'} />}
          {hsOR && <MetricCard label={`${primaryEvent} HS Best`} value={hsOR} subColor="#7F77DD" sub="Pre-college" />}
          <MetricCard label="Total Meets" value={totalMeets} sub={`${prePerfs.length > 0 ? '⬛ HS + ' : ''}🟩 D1`} subColor="rgba(255,255,255,0.4)" />
          <MetricCard label="Events Competed" value={allEvents.length} sub="Across career" subColor="rgba(255,255,255,0.4)" />
        </div>

        <div className="journey-two-col">
          <div>
            {/* ── Event Progression Bars ── */}
            {allEvents.length > 0 && (
              <>
                <p className="journey-section-label">Event Progression</p>
                <div className="journey-card">
                  <div className="journey-legend">
                    <div className="journey-leg-item"><div className="journey-leg-dot" style={{ background: '#7F77DD' }} />Pre-college best</div>
                    <div className="journey-leg-item"><div className="journey-leg-dot" style={{ background: '#1D9E75' }} />D1 best</div>
                  </div>
                  {allEvents.slice(0, 5).map(ev => (
                    <EventProgressionBar
                      key={ev}
                      event={ev}
                      hsBest={eventBests[ev]?.pre}
                      d1Best={eventBests[ev]?.d1}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── Season Progression Chart ── */}
            {primaryEvent && (
              <>
                <p className="journey-section-label" style={{ marginTop: '20px' }}>{primaryEvent} Season Progression</p>
                <div className="journey-card">
                  <div className="journey-legend">
                    <div className="journey-leg-item"><div className="journey-leg-dot" style={{ background: '#7F77DD' }} />Pre-college</div>
                    <div className="journey-leg-item"><div className="journey-leg-dot" style={{ background: '#1D9E75' }} />D1</div>
                  </div>
                  <div style={{ height: '200px', position: 'relative' }}>
                    <ProgressionChart
                      primaryEvent={primaryEvent}
                      prePerfs={primaryPre}
                      d1Perfs={primaryD1}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            {/* ── Notable Meets ── */}
            {notablePre.length > 0 && (
              <>
                <p className="journey-section-label">Notable Meets — Pre-college</p>
                <div className="journey-card">
                  {notablePre.map((m, i) => <MeetRow key={i} meet={m} era="pre" />)}
                </div>
              </>
            )}
            {notableD1.length > 0 && (
              <>
                <p className="journey-section-label" style={{ marginTop: '16px' }}>Notable Meets — D1</p>
                <div className="journey-card">
                  {notableD1.map((m, i) => <MeetRow key={i} meet={m} era="d1" />)}
                </div>
              </>
            )}
            {performances.length === 0 && (
              <div className="journey-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>No performance history available for this athlete.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
