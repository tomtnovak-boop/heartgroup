

## Plan: Teilnehmer-Anzahl immer am unteren Bildschirmrand fixieren

### Änderung in `ZoneColumn.tsx`

Die Spalte nutzt bereits `flex flex-col h-full`. Der Count-Badge sitzt aktuell direkt unter den Tiles mit `mt-1`. Um ihn ganz unten zu fixieren, muss er mit `mt-auto` nach unten gedrückt werden — so bleibt er immer am Ende der Spalte, unabhängig davon wie viele Tiles vorhanden sind.

**Einzige Änderung:** Zeile 86 — `mt-1` durch `mt-auto` ersetzen.

### Datei
- **Ändern:** `src/components/dashboard/ZoneColumn.tsx` (1 Zeile)

