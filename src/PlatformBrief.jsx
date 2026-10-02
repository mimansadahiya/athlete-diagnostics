/**
 * PlatformBrief.jsx
 * The "why this matters" tab — progressive disclosure. Section headings are
 * clickable rows; detail expands on demand. No boxes around static text.
 */
import { useState } from 'react'

const SECTIONS = [
  {
    id: 'problem', title: 'The Problem',
    lead: 'D1 coaches are asked to find needles in a haystack, with no shared tool.',
    points: [
      'Thousands of international & domestic athletes, but no single verified profile — coaches jump between TFRRS, World Athletics, YouTube and spreadsheets.',
      'A coach watching 40+ athletes cannot manually catch who is fatigued or about to break down this week.',
      'Talented athletes from small programmes are invisible because no one has time to look.',
      'Decisions get made on a single personal best, not on trajectory, load or risk.',
    ],
    outcome: 'Better outcome: one screen that ingests the data, flags who needs attention, and lets a coach act before a dip becomes an injury or a missed recruit.',
  },
  {
    id: 'data', title: 'What Data the Platform Needs',
    lead: 'Three layers — performance, biometrics, and academic.',
    points: [
      'Performance: meet results, marks, wind, PB/season-best, event — from TFRRS / World Athletics / meet timing APIs.',
      'Biometrics: HRV, resting heart rate, sleep hours & efficiency, RPE, and balance/sway — from wearables (Whoop, Garmin, Apple Watch) or manual entry.',
      'Academic: GPA, test scores, major, eligibility — entered by the athlete or pulled from admissions.',
      'Context: event, class/year, coach assignment, nationality, graduation year.',
    ],
    outcome: 'All of it lands in one database (Supabase) so every view reads the same source of truth.',
  },
  {
    id: 'tools', title: 'Tools Required to Scale',
    lead: 'The current prototype is the smallest slice of this stack.',
    points: [
      'Frontend: React + Vite (built). Charts with Recharts — multi-axis, scatter, causal markers (built).',
      'Backend / DB: Supabase (Postgres + Auth + Storage) — schema and anon client are already wired.',
      'Ingestion: Node scrapers (TFRRS, World Athletics, YouTube) + wearable APIs/webhooks, run on a schedule.',
      'Analytics: nightly jobs compute readiness, sway, peer baselines, DiD and K-Means clusters.',
      'Alerts: email / push when a threshold trips; role-based access so each coach sees only their squad.',
    ],
    outcome: 'Scale plan: move ingestion to serverless cron, put analytics behind a queue, and cache per-event results.',
  },
  {
    id: 'benefit', title: 'Why It’s Beneficial (D1 Schools & Athletes)',
    lead: 'A two-sided win — recruiting efficiency for schools, visibility for athletes.',
    points: [
      'Coaches: triage an entire squad in minutes; spot injury risk early; compare athletes objectively with one index.',
      'Programmes: fewer wasted recruiting trips and lower injury cost — one prevented stress fracture can pay for the tool.',
      'Athletes: a verified, shareable profile that reaches coaches who would never see them otherwise.',
      'Fairness: small-programme and international talent gets surfaced on merit, not on who a coach happened to see.',
    ],
    outcome: 'Net effect: better roster decisions at lower cost, and more athletes discovered.',
  },
  {
    id: 'investment', title: 'How It’s a Good Investment',
    lead: 'Modest cost, recurring value, and a clear payback.',
    points: [
      'Build cost is low: open-source stack (React, Supabase, Recharts) — no licence fees for the core.',
      'Run cost scales gently: one database + scheduled jobs, hundreds — not thousands — of dollars a month for a whole department.',
      'Direct ROI: replace manual scouting hours; a single avoided injury or one extra scholarship hit outweighs annual cost.',
      'Strategic value: proprietary historical data on athlete development compounds — the longer it runs, the smarter the benchmarks get.',
      'Revenue paths: institutional licences per programme, premium athlete profiles, and anonymous benchmarking data.',
    ],
    outcome: 'The prototype de-risks the idea for a few hundred dollars before any real spend.',
  },
  {
    id: 'blockers', title: 'Blockers & Risks (Honest List)',
    lead: 'What still stands between the prototype and a real product.',
    points: [
      'Data access & scraping: TFRRS / World Athletics have terms and rate limits; scraping can break — official APIs or licences are safer.',
      'Wearable integration: requires athlete consent and OAuth per platform; not all athletes own a device.',
      'Data privacy & compliance: health data is sensitive (GDPR/FERPA); auth, consent and encryption are not optional.',
      'Data quality: AI-extracted majors/marks can be confidently wrong — needs verification against a source of record.',
      'Adoption: coaches must trust it; change management is as hard as the tech.',
      'Analytics validity: correlation ≠ causation — the causal claims must be validated before decisions rely on them.',
    ],
    outcome: 'Unresolved today: real ingestion, auth, and privacy. Everything shown is mock / simulated.',
  },
]

export default function PlatformBrief() {
  const [open, setOpen] = useState('problem')

  return (
    <div className="brief">
      <div className="brief-head">
        <h2>Platform Brief — the problem, the plan, the payoff</h2>
        <p>Why an athlete-diagnostics &amp; recruiting platform matters, what it takes to scale, and what’s still blocking it.</p>
        <div className="brief-tags">
          <span className="brief-tag">For coaches &amp; D1 programmes</span>
          <span className="brief-tag">Non-technical summary</span>
          <span className="brief-tag warn">Prototype = mock data</span>
        </div>
      </div>

      <div className="brief-acc">
        {SECTIONS.map(s => {
          const isOpen = open === s.id
          return (
            <div key={s.id} className={`brief-row ${isOpen ? 'open' : ''}`}>
              <button className="brief-row-head" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                <span className="brief-row-title">{s.title}</span>
                <span className="brief-row-lead">{s.lead}</span>
                <span className={`mf-chevron ${isOpen ? 'open' : ''}`}>▾</span>
              </button>
              {isOpen && (
                <div className="brief-row-body">
                  <ul className="brief-points">
                    {s.points.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                  <div className="brief-outcome">{s.outcome}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="brief-flow">
        <h3>The automation loop that makes it scale</h3>
        <div className="brief-flow-track">
          {['Wearable / results sync', 'Auto-ingest to DB', 'Nightly analytics', 'Detect anomalies', 'Coach alert', 'Adjust plan'].map((step, i, arr) => (
            <div key={step} className="brief-flow-step">
              <span className="brief-flow-num">{i + 1}</span>
              <span>{step}</span>
              {i < arr.length - 1 && <span className="brief-flow-arrow">→</span>}
            </div>
          ))}
        </div>
        <p className="brief-flow-note">The product is the loop: data in → automatic detection → prioritised human action → re-measure. A coach only needs to look when the system says so.</p>
      </div>
    </div>
  )
}
