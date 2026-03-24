

## Plan: Feste 2-Spalten-Anordnung pro Zone

### Problem
Die Spaltenanzahl wechselt dynamisch (1→2→3) wenn Teilnehmer die Zone wechseln, was ein unruhiges "Springen" verursacht.

### Lösung
In `ZoneColumn.tsx` die `getGridCols()`-Logik entfernen und stattdessen immer `gridTemplateColumns: repeat(2, 1fr)` setzen — unabhängig von der Teilnehmerzahl.

### Änderung: `ZoneColumn.tsx`
- `getGridCols()` Funktion entfernen
- Grid-Spalten fest auf `2` setzen
- Bei nur 1 Teilnehmer: wird einfach links platziert, rechts bleibt leer — kein Layout-Sprung

