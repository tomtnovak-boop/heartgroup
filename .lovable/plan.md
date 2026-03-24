

## Plan: Dynamische Bubble-Größe + Sortierung nach BPM

### Übersicht
Die Teilnehmer-Bubbles sollen immer in den sichtbaren Bereich passen (keine Scrollbar) und nach BPM absteigend sortiert sein (höchster Puls zuerst).

### Änderungen

**1. `CoachDashboard.tsx` — Sortierung + dynamische Größe**
- Teilnehmer vor dem Rendern nach BPM absteigend sortieren: `participants.sort((a, b) => b.bpm - a.bpm)`
- Anzahl der Teilnehmer und verfügbare Fläche an `ParticipantBubble` weitergeben (als `totalCount` Prop)

**2. `ParticipantBubble.tsx` — Dynamische Größe berechnen**
- Neuer Prop `totalCount` für die Gesamtzahl der Teilnehmer
- Bubble-Größe dynamisch berechnen basierend auf Teilnehmerzahl:
  - ≤4 Teilnehmer: 140px Basis
  - 5–10: ~110px
  - 11–15: ~90px  
  - 16–20: ~75px
  - >20: ~65px
- Zone-4/5-Skalierung beibehalten (1.15x statt 1.2x bei vielen Teilnehmern)
- Schriftgrößen proportional anpassen (BPM, Name, Prozent)

**3. Layout-Anpassung im Grid**
- `flex-wrap` Grid mit `gap` proportional zur Bubble-Größe
- Container füllt verfügbaren Platz ohne Overflow

### Ergebnis
- Höchster BPM immer oben links, niedrigster unten rechts
- Alle Bubbles passen immer auf den Bildschirm, egal ob 5 oder 20 Teilnehmer

