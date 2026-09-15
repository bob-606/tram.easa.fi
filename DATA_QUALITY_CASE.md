# Data Quality Case — Leaked Answers in Question Stems

Date: 2026-09-15
Scope: `src/data.ts` (1009 questions, 9 subjects), `src/explanations.json`
Status: Fixed + validated (`npm run build`, `npm run lint` pass).

## Symptom

Question texts sometimes contained answers, e.g.:

- `airlaw_15`: `...required flight time? A proficiency check with an examiner`
- `airlaw_25`: `...two aeroplane? When "crossing", the angle ... is more than 70°...`
- `met_68`: stem contained two full option sentences + left fragment `interaction with...` as option 0.

## Root cause

Question bank was parsed on newlines/periods instead of structured fields:

1. Option merged into `question` (leak).
2. One option split mid-sentence into two (`airlaw_13: ...at least 1 hour` + `cross-country flight plus...`; `airlaw_31: ...below 20000` + `ft.height of...`).
3. Two options concatenated without delimiter (`airlaw_26: ...600 m... 500 ft AGL` in one string).
4. No validation — `QuizView.tsx` renders whatever `options` contains.

## Audit result (pre-fix)

- `options.length != 4`: **64/1009** — 27×2 options, 36×3, 1×5 (`perf_31`).
  - airlaw (8): 7, 15, 22, 25, 26, 50, 72, 73
  - humanperf (3): 24, 51, 61
  - met (10): 27, 68, 110, 132, 139, 151, 174, 179, 182, 184
  - comm (6): 2, 15, 35, 46, 47, 50
  - pof (1): 44
  - ops (9): 1, 3, 20, 26, 41, 46, 51, 55, 68
  - perf (14): 8, 16, 17, 21, 25, 29, 31, 33, 36, 50, 51, 56, 63, 64
  - agk (8): 1, 2, 31, 43, 60, 81, 144, 169
  - nav (5): 6, 24, 42, 43, 90
- `?` mid-stem leaks (18): airlaw_13/15/25/72/73, humanperf_24/98, met_1/68/132/139, comm_35, pof_28, agk_43/81/126, nav_109/121.
- `...` mergers (9): met_27/179/184, comm_15/50, pof_44, perf_21, agk_60 (+ airlaw_52 NOTAM, legitimate).
- Hidden splits with n=4: airlaw_13, airlaw_31, met_1, ops_5, agk_70, humanperf_66, perf_31.
- Formatting: `altitude.Which` (airlaw_28), `altitude.In` + `..."` (perf_21), `ft.height` (airlaw_31), `""crossing""` (airlaw_25), `correctSwitching` (ops_5), trailing `"` (airlaw_24, humanperf_98, perf_22/23/67, nav_59/133).
- Grading impact: `answer` pointed at fragments (e.g. airlaw_13 ans=1 → `cross-country flight plus...`); airlaw_25 ans pointed at opposite of correct; airlaw_50/agk_81 pointed at wrong option.

## Fix applied

`src/data.ts`: 81 questions touched (64 count fixes + 17 stem/format fixes). Every question now has exactly 4 options and a valid `answer` index.

- Stems trimmed (leaked option moved back to options).
- Splits rejoined (`airlaw_13 0+1/2+3`, `airlaw_31 0+ft.`, `met_68 Q+opt0`, `ops_5 0+1`, `agk_70 1+2`, `met_1` fully rebuilt).
- Merges split (`airlaw_26 1→2+1`, `ops_51`, `met_151`).
- `perf_31`: removed duplicated 5th option (`The take-off distance will decrease`).
- Missing distractors reconstructed as clearly-wrong EASA-plausible options; correct answer preserved per Part-FCL/SERA/CS-23.
- Answer-index changes (only 4): `airlaw_15 1→0` (proficiency check), `ops_5 1→0` (reorder), `ops_46 0→1` (same text, reorder), `perf_31 4→0` (dedup). Several others kept index but swapped content to correct text (airlaw_25, airlaw_50, met_27/132, comm_15, agk_81).
- Formatting: spaces restored, stray quotes removed, `""` → `"`, `clocking` → `clogging` (agk_81), `indicaton` kept as `indication` (nav_109).
- File normalized to UTF-8 JSON (`\u00b0` → `°` etc.); functionally identical, hence larger diff.

`src/explanations.json`: 9 briefs fixed where they contradicted the corrected answer: airlaw_7/15/50, met_182 (24 °C → 15 °C), nav_6 (magnetic → geographic), nav_42 (great circles → rhumb lines), ops_20 (normal → high approach), perf_25 (5000 kg → 5700 kg), met_132 (Foehn).

## Validation

- Post-fix: `total=1009, bad=0, out-of-range answers=0`.
- `npm run build` ✓, `npm run lint` ✓.
- Remaining `?`-in-stem flags are intentional stem-completion lists (`humanperf_98` item list, `pof_28` `generates...`), not leaks.

## Known follow-ups (not changed)

- Numbering gaps (content missing upstream, left as-is): ops lacks 8; perf lacks 70–71; nav lacks 157–159, 167.
- Duplicate stems (possible intentional variants, left as-is): humanperf_9/12, pof_40/71, perf_44/55.
- Answer distribution still skewed (airlaw 0-heavy) — reflects bank, not parser; needs EASA cross-check if rebalancing.
- Recommendation: add build-time validator (`options.length===4`, no `?` mid-stem, no dangling `the/a/of` option endings, no `ft.height`-style joins).
