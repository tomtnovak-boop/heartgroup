

## Plan: Liquid-Fill + Zonen-Schwelle + Puls-Warnung in HexTile

### Übersicht
Jede Hex-Kachel bekommt einen visuellen Füllstand basierend auf der HR-Percentage, eine dünne Zonen-Grenzlinie und einen Puls-Effekt bei drohendem Zonenwechsel.

### Änderung: `HexTile.tsx`

**1. Liquid-Fill-Effekt**
- Inner-Hex bekommt zwei überlagerte Divs statt einem Gradient:
  - **Unterer Fill-Layer**: Zonen-Farbe mit ~30% Opacity, Höhe = `hr_percentage`% von unten nach oben
  - **Oberer Empty-Layer**: Dunkles Charcoal (`rgba(15,15,15,0.95)`) für den leeren Teil
- Umgesetzt mit einem `linear-gradient` auf dem Inner-Hex:
  - `linear-gradient(to top, ${color}40 ${fillPercent}%, rgba(15,15,15,0.95) ${fillPercent}%)`
- `fillPercent` = `data.hr_percentage` (geclampt auf 0–100)

**2. Zonen-Schwelle (Threshold Marker)**
- Dünne horizontale Linie innerhalb des Inner-Hex
- Position: Berechnet aus der oberen Grenze der aktuellen Zone (z.B. Zone 3 = 80%)
- Umgesetzt als ein zusätzliches `div` mit `position: absolute`, `height: 1px`, `background: ${color}44`
- Vertikale Position: `bottom: ${zoneMaxPercent}%` des Hex-Innenraums
- Nur sichtbar wenn der Teilnehmer nicht bereits in Zone 5 (dort gibt es kein "nächste Zone")

**3. Puls-Warnung bei drohendem Zonenwechsel**
- Wenn `hr_percentage` innerhalb der oberen 3% der aktuellen Zone liegt (z.B. 77–80% in Zone 3):
  - Äusserer Hex-Rand: Framer Motion `animate` auf `opacity` (0.3→0.7→0.3, 0.6s Loop)
  - Erzeugt ein subtiles Flackern des Randes
- Berechnung: `isNearZoneEdge = hr_percentage >= (zoneMaxPercent - 3) && zone < 5`

**4. Text-Lesbarkeit**
- `text-shadow: 0 1px 3px rgba(0,0,0,0.8)` auf Name, BPM und %-Anzeige
- Stellt sicher, dass Text über dem farbigen Fill gut lesbar bleibt

### Hilfsdaten
- Zone-Grenzen aus `HEART_RATE_ZONES` importieren, um `zoneMaxPercent` zu ermitteln
- Kein neuer Hook nötig — alles aus `data.zone` und `data.hr_percentage` ableitbar

### Dateien
- **Ändern:** `HexTile.tsx` (Fill-Gradient, Threshold-Linie, Puls-Warnung, Text-Shadow)

