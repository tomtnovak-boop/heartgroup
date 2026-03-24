

## Plan: Füllung basierend auf Zone-Position statt absoluter HR%

### Problem
Aktuell wird `fillPercent` = `data.hr_percentage` (absolut, 0–100%) verwendet. Das bedeutet: jemand in Zone 2 bei 65% HR hat die Hex-Kachel nur zu 65% gefüllt — obwohl er sich in der Mitte seiner Zone befindet.

### Lösung
Die Füllung soll die **relative Position innerhalb der aktuellen Zone** darstellen:
- Zone 3 (70–80%): Bei 70% HR → 0% gefüllt, bei 75% → 50% gefüllt, bei 80% → 100% gefüllt
- Formel: `fillPercent = zoneProgress * 100` (wobei `zoneProgress` bereits berechnet wird)

### Änderung: `HexTile.tsx`

Zeile mit `fillPercent`-Berechnung ändern:

```
// Alt:
const fillPercent = Math.max(0, Math.min(100, data.hr_percentage));

// Neu:
const fillPercent = Math.max(0, Math.min(100, zoneProgress * 100));
```

`zoneProgress` ist bereits vorhanden und berechnet genau diese relative Position (0.0 am unteren Rand der Zone, 1.0 am oberen).

### Dateien
- **Ändern:** `HexTile.tsx` — eine Zeile

