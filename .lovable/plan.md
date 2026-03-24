

## Plan: Frische Live-HR-Daten für Testprofile einfügen

### Problem
Die simulierten Herzschlag-Daten sind älter als 30 Sekunden. Die App filtert inaktive Teilnehmer automatisch aus.

### Lösung
Ein SQL-Script via `psql` ausführen, das für alle 10 Testprofile (user_id IS NULL) neue `live_hr`-Einträge mit **aktuellem Timestamp** und zufälligen BPM-Werten (90–180) einfügt.

### Umsetzung
- Ein einzelnes `INSERT INTO live_hr` mit Subquery auf die 10 Testprofile
- Zufällige BPM pro Profil, Zone und HR-Prozentsatz berechnet
- Timestamp = `now()` damit die 30-Sekunden-Logik sie als aktiv erkennt
- Dashboard aktualisiert sich automatisch via Realtime

### Hinweis
Da die Daten nach 30 Sekunden wieder ausgeblendet werden, könnte man optional ein wiederkehrendes Script bauen. Für den Moment reicht ein einmaliger Insert + manuelles Refresh im Dashboard.

