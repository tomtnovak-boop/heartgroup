

## Server-Side Auto-Stop Timer for Sessions

### Problem
The session timer is purely client-side. If the coach refreshes or switches devices, the countdown is lost and auto-stop never fires.

### Solution
Store `auto_end_at` in the database so any device can read it and enforce the auto-stop.

### Changes

**1. Database Migration**
Add `auto_end_at` column to `active_sessions`:
```sql
ALTER TABLE active_sessions ADD COLUMN IF NOT EXISTS auto_end_at TIMESTAMPTZ;
```

**2. `src/hooks/useWorkoutSession.ts`**

- Update `startSession` signature to accept optional `durMin`:
  ```typescript
  const startSession = useCallback(async (participants: LiveHRData[], durMin?: number) => {
  ```
- After the existing `active_sessions` update (line 233-238), add `auto_end_at` write when `durMin > 0`.
- Add new state: `const [autoEndAt, setAutoEndAt] = useState<Date | null>(null);`
- Add new `useEffect` that watches `session.isActive` + `sessionCode`: fetches `auto_end_at` from the DB, and if the time has passed calls `stopSession()`, otherwise sets a `setTimeout` for the exact delay.
- In the existing realtime subscription (`session-code-sync` channel), also fetch and set `autoEndAt` from the payload.
- Export `autoEndAt` in the return object.

**3. `src/pages/CoachDashboard.tsx`**

- In `startSession()` (line 198-206): after the existing update, if `durMin > 0`, write `auto_end_at` to the DB.
- In the realtime subscription (line 89-107): when receiving an update with `auto_end_at`, calculate remaining time and set `remainSec` accordingly so the timer survives a refresh.
- On mount restore (line 70-82): also fetch `auto_end_at` and if present, calculate and set `remainSec`.

**4. Callers of `startSession` from `useWorkoutSession`**

These pages call `startSession(participants)` without `durMin` — no changes needed since `durMin` is optional and defaults to undefined (no auto-stop). They don't have timer UI. Only `CoachDashboard.tsx` (which has its own `startSession`) and `CoachWorkspace.tsx` need attention.

- `src/pages/CoachWorkspace.tsx`: Update `handleStartSession` to pass `durMin` if a timer field exists (currently it doesn't have one, so no change needed — it passes `undefined`).
- `src/pages/CoachFancy.tsx`, `CoachAlert.tsx`, `CoachNeutral.tsx`, `CoachZoneFocus.tsx`: No changes — they pass no timer duration.

### Files Modified
1. **Database migration** — add `auto_end_at` column
2. **`src/hooks/useWorkoutSession.ts`** — accept `durMin`, write `auto_end_at`, add auto-stop watcher, export `autoEndAt`
3. **`src/pages/CoachDashboard.tsx`** — write `auto_end_at` on start, restore timer from DB on mount/realtime

### What stays unchanged
- `stopSession()` logic
- HR recording logic
- All other files

