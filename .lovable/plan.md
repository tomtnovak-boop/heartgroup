

## Fix Session Code Logic in CoachDashboard.tsx

### Problem
`src/pages/CoachDashboard.tsx` has its own session code logic (separate from `useWorkoutSession.ts`) with three bugs:
1. `genCode()` generates letter-based codes (e.g. "NEYK") instead of 4-digit numeric codes
2. Session restore query filters by `created_by === user.id`, missing sessions from the native app
3. Realtime subscription also filters by `created_by`, missing cross-device updates

### Changes (single file: `src/pages/CoachDashboard.tsx`)

**1. Replace `genCode()` with numeric code generation**
- Remove the `AMBIG_FREE` constant (line 15)
- Replace the `genCode()` function (lines 17-21) with:
  ```typescript
  function genCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }
  ```

**2. Remove `created_by` filter from session restore (lines 73-74)**
- Change the initial session lookup from:
  ```typescript
  .eq('created_by', user.id).is('ended_at', null)
  ```
  to:
  ```typescript
  .is('ended_at', null)
  ```
- Add numeric code validation before using the restored session (same pattern as `useWorkoutSession.ts`)

**3. Remove `created_by` filter from realtime subscription (line 95)**
- Change the realtime filter from:
  ```typescript
  filter: `created_by=eq.${user.id}`,
  ```
  to no filter (listen to all `active_sessions` changes)

**4. Add numeric code validation in `createNewSession` (line 223)**
- Before creating a new session, check for any existing active session globally and reuse it if it has a valid numeric code

No other files are modified. No database changes needed.

