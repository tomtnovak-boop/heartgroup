

## Fix Three Session State Bugs in Participant Page

### Overview
Three bugs cause stale state, delayed session-end detection, and stuck lobby joins. All fixes are in `src/pages/Participant.tsx` plus one migration for Realtime.

### Changes

**1. Database Migration — Enable Realtime on `active_sessions`**
New migration file with:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
```

**2. `src/pages/Participant.tsx` — Bug 1: Stale state on mount (lines 311-326)**
In the `checkOwnWorkout` useEffect:
- After finding an open workout (`ended_at = null`), verify an active coach session exists in `active_sessions` (where `ended_at IS NULL` and `started_at` within last 4 hours).
- If no active coach session: auto-close the stale workout (update `ended_at`, `duration_seconds: 0`) and do NOT set `currentWorkoutId`/`activeSession`.
- Add `cleanupStaleLobby()` call that removes `session_lobby` entries for this profile where the session code no longer has an active session.

**3. `src/pages/Participant.tsx` — Bug 2: Delayed session-end detection (lines 290-308)**
In the `checkCoachSession` useEffect, add a Realtime subscription on `active_sessions`:
- On `UPDATE` where `ended_at` is set: immediately `setCoachSessionActive(false)`.
- On `INSERT`: trigger `checkCoachSession()` to pick up new sessions.
- Clean up subscription in the useEffect return alongside the interval.

**4. `src/pages/Participant.tsx` — Bug 3: Stuck in lobby (lines 354-377)**
In `handleEnterLobby`, after the `session_lobby` upsert:
- Check if the session is already running (open workouts exist within last 3 hours).
- If yes: set `coachSessionActive(true)`, mark `joinDialogShownRef`, and call `handleJoinSession()` directly.
- If no: set `lobbyJoined(true)` as before.

### Files modified
- `src/pages/Participant.tsx` — three targeted changes as described
- New migration file for Realtime enablement

### What stays unchanged
- All UI layout, branding, styles
- Coach-side code, routing, auth
- `stopSession()`, HR recording, workout finalization logic

