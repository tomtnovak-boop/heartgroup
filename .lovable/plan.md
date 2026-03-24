

## Plan: Teilnehmer-Anzahl am unteren Bildschirmrand fixieren

### Problem
Die Count-Badges sind aktuell mit `mt-auto` am Ende der Spalte, aber bei wenig Inhalt nicht ganz unten am sichtbaren Bildschirm.

### Lösung
Die Count-Badges aus den ZoneColumns herausnehmen und in eine eigene, fixierte Zeile am unteren Rand des Dashboards setzen.

### Änderungen

**`CoachDashboard.tsx`:**
- Unter dem 5-Spalten-Grid eine neue fixierte Zeile hinzufügen: `grid grid-cols-5` mit den Count-Badges pro Zone
- Diese Zeile bekommt `flex-shrink-0` und sitzt am Ende des `flex-col`-Containers, also immer am unteren Bildschirmrand

**`ZoneColumn.tsx`:**
- Den Count-Badge (Zeilen 84–94) komplett entfernen
- Die Anzahl wird stattdessen von `CoachDashboard` direkt aus `zoneGroups[zone].length` gerendert

### Dateien
- **Ändern:** `CoachDashboard.tsx`, `ZoneColumn.tsx`

