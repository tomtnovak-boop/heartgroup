

## Plan: 10 zusätzliche Testprofile + automatische Herzschlag-Simulation alle 2 Sekunden

### Übersicht
10 neue Testprofile erstellen und eine Edge Function einrichten, die alle 2 Sekunden frische Herzschlag-Daten für alle Testprofile in die `live_hr`-Tabelle schreibt. Ein pg_cron Job ruft die Funktion jede Minute auf.

### Neue Testprofile

| Name | Alter | Geschlecht | Gewicht | max_hr |
|------|-------|------------|---------|--------|
| Lisa Braun | 27 | female | 60 | 189 |
| Marco Roth | 32 | male | 76 | 186 |
| Nina Schwarz | 38 | female | 63 | 181 |
| Oliver Fuchs | 24 | male | 80 | 191 |
| Paula Lang | 29 | female | 57 | 188 |
| Ralf Zimmer | 44 | male | 88 | 177 |
| Sara Klein | 21 | female | 54 | 193 |
| Thomas Wolf | 36 | male | 83 | 183 |
| Ulla Peters | 34 | female | 66 | 184 |
| Viktor Hahn | 41 | male | 79 | 179 |

### Umsetzung

**1. Datenbank: 10 Profile einfügen**
- `INSERT INTO profiles` mit 10 neuen Zeilen, `user_id = NULL`

**2. Edge Function: `simulate-hr`**
- Läuft bei Aufruf ca. 55 Sekunden lang
- Alle 2 Sekunden: Für jedes Testprofil (`user_id IS NULL`) einen neuen `live_hr`-Eintrag mit zufälligem BPM (90–180), berechneter Zone und HR-Prozentsatz
- Nutzt die Supabase Service Role zum Einfügen

**3. pg_cron Job: Jede Minute aufrufen**
- Aktiviert `pg_cron` und `pg_net` Extensions
- Cron Job ruft `simulate-hr` Edge Function jede Minute auf
- So entsteht ein lückenloser Stream von Herzschlag-Daten alle ~2 Sekunden

### Ergebnis
Das Coach-Dashboard zeigt dauerhaft 20 aktive Teilnehmer mit sich ständig aktualisierenden Pulswerten an.

