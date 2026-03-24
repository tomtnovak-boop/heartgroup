

## Plan: Hex-Kachel Lesbarkeit verbessern

### Problem
Der Name ist auf den Hex-Kacheln schlecht lesbar, besonders aus Distanz (TV-Display). Die HR%-Anzeige nimmt Platz weg, der besser für den Namen genutzt werden kann.

### Änderungen in `HexTile.tsx`

1. **HR-Prozent entfernen** — den `{Math.round(data.hr_percentage)}%` Span komplett entfernen
2. **Name grösser machen** — `nameFontSize` von `baseSize * 0.11` auf `baseSize * 0.18` erhöhen, dickere Schrift (`font-black` statt `font-bold`)
3. **BPM etwas kleiner** — `bpmFontSize` von `baseSize * 0.28` auf `baseSize * 0.22` reduzieren
4. **Layout-Reihenfolge anpassen** — Name oben (prominent), BPM darunter (kompakt)

### Ergebnis
- Name: gut lesbar auch aus 3-4m Entfernung
- BPM: weiterhin sichtbar, aber kompakter
- Mehr vertikaler Platz durch Wegfall der %-Zeile

### Dateien
- **Ändern:** `src/components/dashboard/HexTile.tsx`

