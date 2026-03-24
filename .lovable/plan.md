

## Plan: 10 Testprofile mit Live-Herzschlägen simulieren

### Übersicht
Ein kombiniertes SQL-Script, das in einem Schritt 10 realistische Kundenprofile erstellt und sofort Live-HR-Daten für alle einfügt, sodass das Coach-Dashboard direkt aktive Teilnehmer mit Pulsdaten anzeigt.

### Testprofile

| Name | Alter | Geschlecht | Gewicht | max_hr |
|------|-------|------------|---------|--------|
| Anna Müller | 28 | female | 62 | 188 |
| Ben Keller | 35 | male | 78 | 184 |
| Clara Fischer | 42 | female | 65 | 179 |
| David Brunner | 25 | male | 82 | 191 |
| Eva Schneider | 31 | female | 58 | 186 |
| Felix Wagner | 48 | male | 90 | 174 |
| Gina Huber | 22 | female | 55 | 193 |
| Hans Meier | 39 | male | 85 | 181 |
| Irene Baumann | 33 | female | 68 | 185 |
| Jan Steiner | 45 | male | 75 | 177 |

### Umsetzung

1. **INSERT profiles** — 10 Zeilen mit Name, Alter, Geschlecht, Gewicht, birth_date, max_hr (Tanaka). `user_id` = NULL.
2. **INSERT live_hr** — Pro Profil ein Eintrag mit zufälligem BPM (90–180), berechnetem HR-Prozentsatz und Zone, aktuellem Timestamp.
3. Reines SQL via `psql` — keine Code-Änderungen nötig.
4. Dashboard zeigt die Daten automatisch via Realtime an.
5. Daten werden nach 1 Stunde vom `cleanup_old_live_hr`-Job gelöscht.

