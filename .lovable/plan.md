

## Fix: Detect External Session Starts via Realtime

### Problem
`useWorkoutSession` only sets `isActive = true` when the local coach clicks Start or on mount restore. If the companion app starts a session, the web app doesn't react.

### Change
**File:** `src/hooks/useWorkoutSession.ts` only

Add one new `useEffect` (after the lobby subscription at line 240) with a Realtime subscription on two tables:

1. **`active_sessions` UPDATE** — When `started_at` is set and `!isActiveRef.current`, fetch open workouts from DB, build the workout map, set `sessionCode`, and set `session.isActive = true`. When `ended_at` is set and session is active, reset session state.

2. **`workouts` INSERT** — When a new workout row appears while session is active, add it to the `activeWorkouts` map via `setSession`.

The subscription uses refs (`isActiveRef`) to avoid stale closures and runs once on mount (empty dependency array). Cleanup removes the channel.

### What stays unchanged
- `startSession()`, `stopSession()`, `restoreSession()`, `recordHRData`, lobby logic
- All UI components, styling, routing
- The existing `session-code-sync` channel (handles `sessionCode` state — the new subscription handles `session` state)

