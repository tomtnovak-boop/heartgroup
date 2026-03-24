

## Plan: Mehrspaltige Kacheln pro Zone (2–3 Spalten)

### Idee
Statt einer einzelnen vertikalen Reihe pro Zone werden die Hex-Kacheln in einem **Wrap-Grid** (2–3 nebeneinander) angeordnet. Dadurch:
- Feste Kachelgröße (z.B. 64px) — kein dynamisches Schrumpfen mehr
- Mehr Teilnehmer passen in den sichtbaren Bereich
- Sortierung bleibt: höchster BPM oben-links → niedrigster unten-rechts

### Logik für Spaltenanzahl
- Automatisch basierend auf Teilnehmeranzahl pro Zone:
  - 1–4 Teilnehmer → 1 Spalte (wie bisher)
  - 5–8 Teilnehmer → 2 Spalten
  - 9+ Teilnehmer → 3 Spalten

### Änderungen

**1. `ZoneColumn.tsx`**
- Tiles-Container: `flex flex-col` → `flex flex-wrap` mit dynamischer Breite
- CSS Grid alternativ: `grid grid-cols-2` / `grid-cols-3` je nach Teilnehmerzahl
- Hex-Versatz für ungerade Reihen beibehalten (Honigwaben-Effekt optional)

**2. `CoachDashboard.tsx`**
- Dynamische `tileSize`-Berechnung entfernen
- Feste Kachelgröße setzen (z.B. 64px)
- `maxPerZone`-Logik wird nicht mehr benötigt

**3. `HexTile.tsx`**
- Keine Änderungen nötig — nimmt weiterhin `tileSize` als Prop

### Ergebnis
- Kacheln bleiben immer gleich groß und gut lesbar
- Bei 9 Teilnehmern in Zone 1: 3×3 Grid statt einer langen Spalte
- Alle Teilnehmer sichtbar ohne Scrolling

