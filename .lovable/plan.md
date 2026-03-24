

## Plan: Pulsieren entfernen + progressive Farbintensität

### Änderungen in `HexTile.tsx`

**1. Pulsieren entfernen**
- BPM `motion.span` (Zeile 105–120): `animate={{ scale: [1, 1.03, 1] }}` entfernen → normales `<span>`
- Äusserer Hex-Rand (Zeile 57–65): Pulsierendes `animate` bei `isNearZoneEdge` entfernen → statische Opacity

**2. Progressive Farbintensität im Fill**
- Statt fester Opacity (`${color}40`) wird die Opacity dynamisch berechnet basierend auf der Position innerhalb der aktuellen Zone
- Formel: `zoneProgress = (hr_percentage - zoneMinPercent) / (zoneMaxPercent - zoneMinPercent)` → 0.0 bis 1.0
- Opacity-Mapping: `zoneProgress` von 0→1 wird auf 10%→100% Opacity gemappt
- Hex-Opacity-Wert: `Math.round(0.10 + zoneProgress * 0.90) * 255` → als Hex-String für den Gradient
- Ergebnis: Am unteren Rand der Zone ist die Farbe kaum sichtbar, kurz vor dem Zonenwechsel ist sie voll gesättigt

**3. Äusserer Rand**
- Statische Opacity, die ebenfalls mit `zoneProgress` skaliert: `0.15 + zoneProgress * 0.45` (also 15%–60%)
- Hero-Tile: leicht höher (`0.3 + zoneProgress * 0.4`)

### Dateien
- **Ändern:** `HexTile.tsx`

