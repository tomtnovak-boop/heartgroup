

## Plan: Reduzierter Glow + Alle Kacheln immer sichtbar

### Probleme (Screenshot-Analyse)
1. **Zone 1 hat 9 Teilnehmer** — die untersten Kacheln (Ulla Pet., 60 BPM) werden abgeschnitten
2. **Glow-Effekt ist intensiv** — die pulsierenden `drop-shadow`-Animationen lenken ab, besonders bei häufigem Draufschauen
3. **Hero-Tile in Zone 5 ist sehr dominant** (2.5x) — nimmt viel Platz weg

### Vorschlag

**1. Glow reduzieren — subtiler, ruhiger**
- `HexTile.tsx`: Pulsierender Glow-Effekt entfernen (keine Framer Motion `filter`-Animation mehr)
- Stattdessen: Statischer, dezenter `drop-shadow` (z.B. `0 0 6px color` statt `0 0 20px`)
- BPM-Zahl behält einen leichten `text-shadow` für Lesbarkeit
- Hero-Tile: Nur ein etwas stärkerer statischer Glow, kein Pulsieren

**2. Dynamische Kachelgröße — alle passen rein**
- `HexTile.tsx` + `ZoneColumn.tsx`: Kachelgröße dynamisch berechnen basierend auf der **maximalen Anzahl** Teilnehmer in einer Spalte
- Formel: Verfügbare Höhe (Viewport minus Header/Stats/Footer) geteilt durch die max. Anzahl pro Spalte
- Basis-Hex-Größe: `min(72px, verfügbareHöhe / maxProSpalte - gap)`
- Hero-Tile: Nur 1.8x statt 2.5x (passt besser rein)

**3. Layout-Anpassung**
- `ZoneColumn.tsx`: `overflow-hidden` entfernen, stattdessen `flex-shrink` auf Kacheln
- Container bekommt eine feste Höhe (`calc(100vh - headerHöhe)`) und die Kacheln passen sich an
- `gap` zwischen Kacheln wird proportional kleiner bei mehr Teilnehmern

### Dateien
- **Ändern:** `HexTile.tsx` (Glow reduzieren, dynamische Größe), `ZoneColumn.tsx` (max-count Prop durchreichen), `CoachDashboard.tsx` (max-count berechnen und übergeben)

### Ergebnis
- Ruhigeres, augenfreundliches Design — kein Pulsieren, nur dezente Farbakzente
- Alle 20 Teilnehmer sind immer sichtbar, egal wie sie verteilt sind

