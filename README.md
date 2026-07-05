# EASA Pilot Essentials

PPL/SPL aviation theory exam prep — 1,009 questions across 9 subjects with 4 study modes and an AI tutor.

## Study Modes

| Mode | Description |
|------|-------------|
| **Flash Cards** | 3D flip-card swiping with Knew It / Missed It |
| **Study** | Per-question instant feedback |
| **Practice** | Free answering, results at the end |
| **Mock Exam** | Timed 20-question exam per subject |

## Subjects

| Subject | Questions | Time |
|---------|-----------|------|
| Air Law | 77 | 25min |
| Human Performance | 100 | 25min |
| Meteorology | 190 | 30min |
| Communications | 53 | 20min |
| Principles of Flight | 100 | 30min |
| Operational Procedures | 69 | 25min |
| Flight Performance & Planning | 74 | 25min |
| Aircraft General Knowledge | 178 | 30min |
| Navigation | 168 | 35min |

## Features

- **Daily Q** — randomized 7-question mixed practice session
- **Progress tracking** persisted to localStorage (accuracy, time, sessions)
- **Bookmarks & flagging**
- **Explanations** for every question
- **aiR AI tutor** — Beta (server-side proxy via OpenRouter), Own Key, or WebLLM (local, in-browser)
- **Dark/light/system theme**
- **Keyboard shortcuts** (1-4 / A-D, arrows, F / B)
- **Responsive** desktop and mobile
- **Capacitor** iOS/Android builds

## Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS + shadcn/ui · react-router · web-llm · OpenRouter · lucide-react

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

For the Beta AI provider, copy `.env.example` to `.env` and add your `OPENROUTER_KEY`. Alternatively, use Own Key (enter in UI) or WebLLM (download once, requires WebGPU).
