

## Plan: Fix CoachDashboard background rendering

### Problem
In `Dashboard.tsx`, the `CoachDashboard` component is rendered as a direct child of the `flex flex-col` container **without** the `flex-1 min-h-0 overflow-hidden` wrapper that exists in `Index.tsx`. This means the component's `h-full` has no constrained parent height, so the background and layout may collapse or not fill the viewport correctly.

Additionally, when the coach dashboard renders via `Index.tsx`, the wrapper div is correct — so the issue likely only manifests on the `/dashboard` route.

### Changes

**`src/pages/Dashboard.tsx`** (1 line change):
- Wrap `<CoachDashboard>` in a `<div className="flex-1 min-h-0 overflow-hidden">` — matching exactly how `Index.tsx` renders it (line 64-65).

```tsx
// Before (line 58):
<CoachDashboard participants={...} ... />

// After:
<div className="flex-1 min-h-0 overflow-hidden">
  <CoachDashboard participants={...} ... />
</div>
```

### Files
- **Change:** `src/pages/Dashboard.tsx` (wrap CoachDashboard in flex-1 div)

