# Athlete Diagnostics — D1 Track & Field Decision Platform

A 3-tab decision pipeline for D1 coaching staffs: **Diagnostics (Metrics) → Kinematic (Athlete Input) → Workout Generation (Coach Action)**. Turns invisible fatigue (HRV/sleep/sway + localized stress) into a specific, defensible daily training modification.

> Built for the AI Client Solutions Case Study. **Mock data throughout; the USF baseline session content is transcribed real plan data; integrations (wearables, CSV parsing) are simulated.**

---

## 🔗 Live Demo (permanent)

**Primary URL (GitHub Pages):** https://mimansadahiya.github.io/athlete-diagnostics/

- Repository: https://github.com/mimansadahiya/athlete-diagnostics
- Redeploy: `GITHUB_PAGES=1 npm run build` → push the `dist/` contents to the `gh-pages` branch.

**Alternative (Vercel):** https://temporary-speedy-chestnut-ndw2g91.vercel.app
> Temporary Vercel preview — expires unless claimed.

The GitHub Pages URL above is stable and permanent.

---

## 🧭 The 3-Tab Pipeline (the workflow under test)

| Tab | Role | What it shows |
|-----|------|----------------|
| **Diagnostics** | Metrics | Executive Briefing, Readiness %, **Peaking Trajectory**, Season Calendar, Deep Dive charts (performance vs peer, sway, HR/HRV, K-Means) |
| **Kinematic** | Athlete Input | Interactive SVG body map (log localized tightness 1–10, left/right independent) + 5-second daily check-in |
| **Workout Generation** | Coach Action | Import baseline plan → automated modification per athlete → **Accept** / **Accept All** → **Export Final Plan (CSV)** |

**Loop:** log a sore hamstring in Kinematic → a "Kinematic update" badge + updated recommendation appears on Workout Generation → Accept (baseline struck through, replaced) → Export.

---

## 🖥️ Run Locally

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5174 or http://localhost:5173). The app opens on **Diagnostics**.

> Supabase is optional. If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent (`.env`), the legacy Scouting Hub loads empty — the 3-tab pipeline runs entirely on local mock data and is unaffected.

Build a static bundle:

```bash
npm run build      # → dist/
npm run preview
```

---

## 🧪 Sample Test Inputs (the 3 required cases)

Use these on the **Diagnostics** tab (roster, left) — or compare them on the **Workout Generation** tab.

| # | Case | Athlete | What to do | Expected result |
|---|------|---------|-----------|-----------------|
| 1 | **Normal** | **Sarah J.** (Triple Jump) | Select Sarah → hover the **Peaking Trajectory** chip → (optionally) log a right hamstring = 8 in Kinematic | Briefing + plan show a hard hamstring/jump constraint: *"Cut full approaches. Short-approach / standing long (landing) only."* Peaking: *At Risk — Overreaching* |
| 2 | **Unusual** | **Jonah H.** (High Jump — field event, *higher is better*) | Select Jonah | Field-event logic flips correctly; strength/fatigue constraint: *"Fatigue detected. Cap gym load at <70% 1RM."* |
| 3 | **Invalid** | **Alex P.** (no wearable, no marks) | Select Alex | Graceful empty states — explains the data gap, no fabricated numbers (readiness "—") |

**Import test file (for the CSV button):** use any file, e.g. `Men_and_Women_2023-2024@USF_winter copy.pdf` from this repo, or a small CSV. The picker opens natively; on selection the button turns green with *"<file> • Successfully Imported."*

---

## 🛠️ Tech Stack
- **Frontend:** React 19 + Vite 8, Recharts, Tailwind v4 + custom CSS, lucide-react
- **Data:** local mock JSON (`src/mockAthleteData.json`, generated cohort) + transcribed USF plan (`src/usfTraining.js`)
- **Engines:** `src/engine.js` (constraints, adaptations, urgency, peaking trajectory), `src/stories.js` (narrative)
- **Backend (optional/unused in this view):** Supabase client (`src/supabaseClient.js`)
- **PDF ingestion:** `pypdf`

## 📁 Case Study Deliverables
All submission artifacts are in [`Miraflores/`](./Miraflores):
`Deliverable_A_Decision_Notes.md` · `Deliverable_B_Video_Script.md` · `Deliverable_C_Test_Results.md` · `Deliverable_D_Slide_Deck.md`

## ⚠️ Known Limitations
- Wearable/biometric data, check-ins, and the CSV **import parse** are **simulated**; importing a file updates the UI but does not parse contents.
- Causal claims (DiD, R², peaking trajectory) are illustrative, not statistically validated on longitudinal data.
- No auth / role-based access; the public link is a temporary deployment until claimed.
