

## Plan: Körpergrösse für alle 20 Testprofile einfügen

### Vorgehen
Per INSERT-Tool (UPDATE) realistische Körpergrössen für alle 20 Testprofile setzen, basierend auf Geschlecht und proportional zum Gewicht.

### Daten

| Name | Geschlecht | Gewicht | Grösse (cm) |
|------|-----------|---------|-------------|
| Anna Müller | F | 62 | 168 |
| Ben Keller | M | 78 | 180 |
| Clara Fischer | F | 65 | 170 |
| David Brunner | M | 82 | 183 |
| Eva Schneider | F | 58 | 164 |
| Felix Wagner | M | 90 | 188 |
| Gina Huber | F | 55 | 162 |
| Hans Meier | M | 85 | 185 |
| Irene Baumann | F | 68 | 172 |
| Jan Steiner | M | 75 | 178 |
| Lisa Braun | F | 60 | 166 |
| Marco Roth | M | 76 | 179 |
| Nina Schwarz | F | 63 | 169 |
| Oliver Fuchs | M | 80 | 182 |
| Paula Lang | F | 57 | 163 |
| Ralf Zimmer | M | 88 | 186 |
| Sara Klein | F | 54 | 160 |
| Thomas Wolf | M | 83 | 184 |
| Ulla Peters | F | 66 | 171 |
| Viktor Hahn | M | 79 | 181 |

### Umsetzung
- Ein einzelnes UPDATE-Statement pro Profil via INSERT-Tool
- Keine Code-Änderungen nötig — die Kalorienberechnung nutzt bereits `weight` aus dem Profil

### Hinweis zur Kalorienformel
Die **Keytel-Formel** verwendet Herzfrequenz, Gewicht, Alter und Geschlecht. `height` wird aktuell nicht für die Berechnung verwendet, ist aber als Profildaten sinnvoll (z.B. für BMI oder zukünftige Erweiterungen).

### Dateien
- **Keine Code-Änderungen** — nur Datenbank-Update

