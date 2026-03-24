

## Plan: Kompakter Single-Bar Header (≤10% Bildschirmhöhe)

### Übersicht
AppHeader + Tabs + TeamStats werden zu einer einzigen schmalen Leiste zusammengeführt. Die grosse TeamStats-Card wird entfernt.

### Änderungen

**1. `AppHeader.tsx` — Alles in eine Zeile**
- Padding reduzieren: `p-4` → `px-4 py-1.5`
- Logo-Circle verkleinern: `w-10 h-10` → `w-7 h-7`
- Titel: nur "HR Training" als `text-sm font-bold`, Untertitel entfernen
- Neue Props: `stats` (participantCount, averageBPM, averageZone), `activeTab`, `onTabChange`, `onRefresh`
- Mitte: Pill-Toggle für "Live Training" / "Kunden verwalten" (zwei Buttons mit `rounded-full`, aktiver = `bg-white/10`)
- Stats als Inline-Badges rechts neben dem Toggle:
  - `[Users icon] 20` · `[Heart icon] 124 BPM` · `[Activity icon] Z3`
  - Zahlen: `text-sm font-bold text-white`, Labels: `text-[10px] text-white/50`
- Coach-Dropdown + Logout bleiben ganz rechts

**2. `CoachDashboard.tsx` — TeamStats + Tabs entfernen**
- `TeamStats`-Komponente nicht mehr rendern
- `Tabs`/`TabsList`/`TabsTrigger` aus CoachDashboard entfernen
- Tab-State und Stats-Daten nach oben an AppHeader übergeben
- Padding reduzieren: `px-6 pt-4 pb-2` → `px-4 pt-1 pb-1`
- Grid startet direkt nach dem Header

**3. `Dashboard.tsx` — Stats + Tab-State hochziehen**
- Tab-State (`activeTab`) und `useLiveHR`-Daten hier verwalten
- An AppHeader die Stats + Tab-Controls übergeben
- An CoachDashboard die Live-Daten + activeTab durchreichen

**4. `ZoneColumn.tsx` — Spacing reduzieren**
- Header `mb-1` → `mb-0.5`
- Count-Badge `mt-1` → `mt-0.5`

### Layout-Ergebnis
```text
[♥ HR Training] [Live Training | Kunden] [👥20 · ♥124 BPM · ⚡Z3] [Coach ▾ | ⏏]
─────────────────────────────────────────────────────────────────────────────────
 REGENERATION    FAT BURN      AEROBIC       CARDIO       MAX EFFORT
     Z1             Z2           Z3            Z4             Z5
 ⬡⬡  ⬡⬡  ...
```

Header-Höhe: ~40–44px statt aktuell ~160px+ (Header + Tabs-Bar + TeamStats-Card)

### Dateien
- **Ändern:** `AppHeader.tsx`, `CoachDashboard.tsx`, `Dashboard.tsx`, `ZoneColumn.tsx`
- **Entfernen:** `TeamStats.tsx` wird nicht mehr importiert (Datei bleibt, falls für andere Views gebraucht)

