

## Plan: Sanftere Herzfrequenz-Simulation (±10% Abweichung)

### Problem
Aktuell wird jedes Mal ein komplett zufälliger BPM-Wert (90–180) generiert. Das ergibt wilde Sprünge — z.B. von 95 auf 170 auf 102 — was unnatürlich und unruhig aussieht.

### Lösung
Beim Start einen zufälligen Basis-BPM pro Profil setzen. Danach bei jeder Iteration den Wert nur um ±10% variieren, sodass die Herzfrequenz sanft schwankt.

### Änderung: `supabase/functions/simulate-hr/index.ts`

- Vor der Loop: Für jedes Profil einen zufälligen Start-BPM (90–180) in einer Map speichern
- In jeder Iteration: Den aktuellen BPM um einen Zufallswert im Bereich ±10% ändern (z.B. bei BPM 140 → Schwankung zwischen 126–154)
- BPM auf den Bereich 60–200 begrenzen (Clamp), damit keine unrealistischen Werte entstehen
- Den neuen BPM-Wert als Basis für die nächste Iteration speichern

### Ergebnis
Statt wilder Sprünge sieht man sanfte, realistische Herzfrequenz-Verläufe auf dem Dashboard.

