

## Plan: Global Start/Stop Session Button im Coach Dashboard

### Übersicht
Ein Session-Management-System, das es dem Coach ermöglicht, eine Trainingseinheit für alle aktiven Teilnehmer gleichzeitig zu starten und zu stoppen. Während der Session werden HR-Daten in `workout_hr_data` geschrieben, beim Stopp werden Zusammenfassungsstatistiken berechnet.

### Neuer Hook: `src/hooks/useWorkoutSession.ts`

Zentrale Session-Logik:

**State:**
- `isActive: boolean`, `startedAt: Date | null`, `elapsedSeconds: number`
- `activeWorkouts: Map<string, string>` (profile_id → workout_id)

**`startSession(participants: LiveHRData[])`:**
1. Für jeden sichtbaren Teilnehmer: INSERT in `workouts` (profile_id, started_at=now, ended_at=null)
2. Speichere workout_ids im State
3. Starte einen 1s-Interval-Timer für die Elapsed-Time-Anzeige

**`stopSession()`:**
1. Für jeden aktiven Workout:
   - Query `workout_hr_data` für diesen workout_id → berechne avg_bpm, max_bpm, avg_zone
   - Berechne zone_X_seconds (Anzahl Einträge pro Zone × Polling-Intervall, ca. 2s)
   - Berechne total_calories mit Keytel-Formel (Profil-Weight/Age oder Fallback 75kg/30J)
   - UPDATE `workouts` SET ended_at=now(), alle berechneten Felder
2. Reset State

**`onLiveHRData(data)`:** Callback, der bei jedem neuen live_hr-Insert aufgerufen wird:
- Wenn Session aktiv und profile_id in activeWorkouts → INSERT in `workout_hr_data`

**`restoreSession()`:** Beim Mount: Query `workouts WHERE ended_at IS NULL` → wenn vorhanden, Session-State wiederherstellen

### Änderung: `src/hooks/useLiveHR.ts`

- Neuen optionalen Callback `onNewData?: (data) => void` als Parameter oder via Ref
- Im Realtime-Handler: Wenn Callback gesetzt, aufrufen mit den neuen HR-Daten
- Alternativ: Der Session-Hook subscribed selbst auf den gleichen Realtime-Channel

### Änderung: `src/components/layout/AppHeader.tsx`

Neue Props: `sessionActive`, `sessionElapsed`, `onStartSession`, `onStopSession`

**UI im Header (rechte Seite, vor Refresh-Button):**
- **Idle:** Grüner Button "Session starten" mit Play-Icon (`Play` von lucide)
- **Aktiv:** Roter Button "Session stoppen" mit Square-Icon + Timer-Anzeige (MM:SS oder HH:MM:SS)
- **Aktiv-Indikator:** Kleiner pulsierender roter Punkt (CSS animation) links neben dem Timer

### Änderung: `src/pages/Dashboard.tsx`

- `useWorkoutSession()` Hook einbinden
- Session-Start: `startSession(participants)` aufrufen mit aktuellen Teilnehmern
- Session-Stop: `stopSession()` aufrufen
- Live-HR-Daten an den Session-Hook weiterleiten (für workout_hr_data-Schreibung)
- Session-Props an AppHeader durchreichen

### Dateien
- **Neu:** `src/hooks/useWorkoutSession.ts`
- **Ändern:** `src/components/layout/AppHeader.tsx`, `src/pages/Dashboard.tsx`, `src/hooks/useLiveHR.ts`
- **Keine DB-Migration nötig** — `workouts` und `workout_hr_data` Tabellen existieren bereits

