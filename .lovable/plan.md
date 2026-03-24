

## Plan: Hero-Tile farblich ausfüllen statt vergrössern

### Idee
Der Teilnehmer mit dem höchsten BPM in Zone 5 wird nicht mehr grösser dargestellt (1.8x), sondern behält die **gleiche Grösse** wie alle anderen — aber sein Hex-Hintergrund wird mit der **Zonen-Farbe gefüllt** statt dunkel. So sticht er sofort ins Auge, ohne das Layout zu stören.

### Änderung: `HexTile.tsx`

**Aktuell (Hero):**
- `baseSize = tileSize * 1.8` → grösser
- Dunkler Hintergrund wie alle anderen

**Neu (Hero):**
- `baseSize = tileSize` → gleiche Grösse wie alle
- Inner-Hex Hintergrund: `linear-gradient` mit Zonen-Farbe (z.B. `rgba(255,0,68,0.35)` für Zone 5) statt dunklem Grau
- Äusserer Hex-Ring: Opacity von 0.3 → 0.6 (kräftiger)
- Text-Farbe bleibt weiss (guter Kontrast auf farbigem Hintergrund)
- Drop-Shadow etwas stärker (8px statt 5px)

### Visueller Unterschied

```text
Normal-Tile:          Hero-Tile:
 ╱‾‾‾‾╲               ╱‾‾‾‾╲
│ dunkel │            │▓farbig▓│
│  140   │            │  178   │
 ╲____╱               ╲____╱
```

### Dateien
- **Ändern:** `HexTile.tsx` — Hero-Logik: gleiche Grösse, farbiger Hintergrund

