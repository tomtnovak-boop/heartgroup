

# Coach Dashboard — New Page `/coach-dashboard`

## Overview
Create a self-contained coach control panel page at `/coach-dashboard` with session management, live stats, participant list, timer, and display mode toggle. This is a **new standalone page** — it does NOT replace the existing Fancy/Neutral views.

## Important Schema Notes (from DB inspection)
- `active_sessions` has NO `status` column — active = `ended_at IS NULL`
- `created_by` stores the **auth user ID** (not profile ID)
- `live_hr` has no `session_id` column — all live HR data is global; filter by matching profile_ids from `session_lobby`

---

## Technical Plan

### Step 1 — Create the page component
**File:** `src/pages/CoachDashboard.tsx`

Single-file page component containing all 7 sections from the spec. Key implementation details:

**Header:** Bheart logo, session code pill (fetched from `active_sessions` where `ended_at IS NULL` and `created_by = auth.uid()`), coach name pill (from `profiles`), exit button (signOut + navigate `/`).

**Display Mode Toggle:** Local `useState<'fancy' | 'neutral'>('fancy')` — purely frontend, two styled buttons.

**Stat Cards:** 2-column grid.
- "Logged In" — count from `session_lobby` for current session code, updated via Realtime subscription on `session_lobby` table (event `*`).
- "Avg. BPM" — calculated from `live_hr` rows whose `profile_id` is in current session's lobby. Subscribe to `live_hr` Realtime (event `*`). Shows "—" when no active session.

**Session Timer:** Optional countdown timer with minute input + range slider (0–60). Synced bidirectionally. When session starts with `durMin > 0`, runs a `setInterval` countdown. Auto-stops session at 0. Disabled during active session.

**Live Participant List:** Visible only when session active. Join `live_hr` with `profiles` (via profile_id). 
- Fancy mode: name + 5-segment zone bar + BPM in zone color + zone badge.
- Neutral mode: name + white BPM + zone badge.
- Zone calculation uses Tanaka formula from `@/lib/heartRateUtils`.

**Start/Stop Button:** 
- Start: find active session (`ended_at IS NULL`, `created_by = auth.uid()`), update `started_at = now()`, show participant list, start timer.
- Stop: update `ended_at = now()`, clear timer, hide participants, reset avg BPM.
- Styled with gradient glow border (start) vs outlined (stop).

**New Session Button:** Generates 4-char alphanumeric code (excluding ambiguous chars 0OI1L), inserts into `active_sessions`, updates header badge. Disabled during active session.

### Step 2 — Add route
**File:** `src/App.tsx`

Add protected route:
```tsx
<Route path="/coach-dashboard" element={<ProtectedRoute requireCoach><CoachDashboard /></ProtectedRoute>} />
```

### Step 3 — Add hub navigation card
**File:** `src/pages/CoachHub.tsx`

Add a new card to the hub grid pointing to `/coach-dashboard` with a suitable icon and label (e.g. "Coach Dashboard" / "Session Control").

### Step 4 — No database changes needed
The existing schema supports all required functionality. No migrations required.

---

## Design Tokens (applied throughout)
- Background: `#0a0a0a`, Cards: `#111` with `1px solid #1f1f1f`, radius `12px`
- Primary: `#ff4425`, Text: `#fff`, Muted: `#666`
- Zone colors: Z1 `#9CA3AF`, Z2 `#00BFFF`, Z3 `#22C55E`, Z4 `#F59E0B`, Z5 `#EF4444`
- Labels: 11px uppercase, `letter-spacing: 0.1em`, color `#666`
- Values: `font-weight: 900`

## Files Changed
| File | Action |
|------|--------|
| `src/pages/CoachDashboard.tsx` | Create |
| `src/App.tsx` | Edit — add route |
| `src/pages/CoachHub.tsx` | Edit — add hub card |

