

## Plan: Hexagonal Zone-Column Dashboard Redesign

### Übersicht
Komplettes Redesign des Coach-Dashboards: Statt runder Bubbles werden hexagonale Kacheln in 5 Zonen-Spalten dargestellt. Die Anzeige ist optimiert für TV-Displays (16:9).

### Neue Komponenten

**1. `src/components/dashboard/HexTile.tsx` — Hexagonale Kachel**
- CSS `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)` für Hex-Form
- Glühender Rand via `box-shadow` + `drop-shadow` in Zonen-Farbe
- Framer Motion `animate`-Loop für pulsierenden Glow ("Breathing"-Effekt)
- Zeigt Name, BPM, HR-%, Zone-Label
- "Hero"-Variante: 2.5x größer, extra intensiver roter Puls-Glow (für höchsten BPM in Zone 5)
- Presentational/dumb component — nimmt `LiveHRData` als Prop

**2. `src/components/dashboard/ZoneColumn.tsx` — Spalte pro Zone**
- Header: "REGENERATION (Z1)" bis "MAX EFFORT (Z5)" in Bold Sans-Serif
- Vertikale Liste von `HexTile`s, sortiert nach BPM absteigend
- Zonen-Farben als Spalten-Akzent (Glow am Header)

**3. `src/components/dashboard/CoachDashboard.tsx` — Umbau**
- Live-Tab: 5 gleichbreite `ZoneColumn`s nebeneinander (`grid grid-cols-5`)
- Participants nach `zone` gruppieren und in die passende Spalte verteilen
- Höchster BPM in Zone 5 wird automatisch als "Hero"-Tile markiert
- TeamStats-Bar bleibt oben
- Hintergrund: `#0a0a0a` (deep charcoal)
- Fullscreen-optimiert, kein Scroll

### Zonen-Farbschema (neu)
| Zone | Farbe | Hex |
|------|-------|-----|
| 1 | Ice Blue | `#00d4ff` |
| 2 | Warm Amber | `#ffaa00` |
| 3 | Emerald Green | `#00ff88` |
| 4 | Electric Cyan | `#0088ff` |
| 5 | Neon Pulse Red | `#ff0044` |

### Animationen
- Framer Motion: Subtiler Puls auf allen Hex-Glows (opacity + shadow-size oscillation, 2s loop)
- Hero-Tile: Intensiverer Puls (größerer Shadow-Spread, schnellerer Loop)
- Heartbeat-Animation auf BPM-Zahl bleibt erhalten

### Technische Details
- `framer-motion` ist bereits im Projekt verfügbar (prüfen, sonst installieren)
- CSS-Variablen für Zone-Farben in `index.css` aktualisieren
- Bestehende `ParticipantBubble` und `ZoneArc` bleiben im Projekt, werden aber vom Dashboard nicht mehr genutzt
- `useLiveHR` Hook bleibt unverändert — Daten werden nur anders dargestellt
- Responsive: `min-h-screen` mit `grid` Layout, Hex-Größe skaliert via `clamp()` oder Container-Query

### Dateien
- **Neu:** `HexTile.tsx`, `ZoneColumn.tsx`
- **Ändern:** `CoachDashboard.tsx`, `index.css` (Zonen-Farben)
- **Unverändert:** `useLiveHR.ts`, `TeamStats.tsx`, `heartRateUtils.ts`

