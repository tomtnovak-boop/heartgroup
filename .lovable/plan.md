

## Two Fixes

### Fix 1 — Leaderboard: Remove opacity gradient from text

The `RankingColumn` component applies `style={{ opacity }}` to rank numbers, names, and BPM values for rows below rank 3 (line 129: `Math.max(0.4, 1 - (rank - 3) * 0.08)`). This creates a fade effect on all text.

**Change in `SessionLeaderboard.tsx`:**
- Remove the `opacity` style from rank number (`<span>` line 134), name (`<span>` line 135), and BPM value (`<span>` line 140)
- Keep the opacity ONLY on the bar itself (line 138) — bars can still fade, as the user confirmed those are fine
- Also fix the auto-close countdown text: line 108 and 238 use `text-white/60` — change to `text-white`

### Fix 2 — Stop button not responding immediately

The `stopSession` function in `useWorkoutSession.ts` (line 117-207) is **sequential and blocking**: it loops through every participant one by one, making 3 database calls per participant (fetch HR data, fetch profile, update workout). With 21 participants, that's ~63 sequential DB calls before `setSession({ isActive: false })` fires on line 198.

**Change in `useWorkoutSession.ts`:**
- Immediately set `isActive: false` at the START of `stopSession` (before any DB calls), so the UI responds instantly
- Then process all the workout finalization in the background
- Use `Promise.all` to parallelize the per-participant DB work instead of sequential `for...of` loop

This means the stop button will toggle the UI state immediately, and the heavy DB work happens asynchronously after.

### Files to modify
1. `src/components/dashboard/SessionLeaderboard.tsx` — remove opacity from text, keep on bars only
2. `src/hooks/useWorkoutSession.ts` — set isActive=false immediately, parallelize DB calls

