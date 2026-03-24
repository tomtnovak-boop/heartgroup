
## Plan: Count-Leiste wirklich am unteren sichtbaren Bildschirmrand

### Ursache
Aktuell ist die Seite mit `min-h-screen` aufgebaut. Dadurch kann der Dashboard-Bereich effektiv höher als der sichtbare Bereich werden (Header + Inhalt), und die schwarze Fläche wirkt wie 100% Viewport-Höhe statt „Resthöhe“. Die Count-Leiste sitzt dann nicht stabil am sichtbaren Bottom.

### Umsetzung

1. **Viewport-Höhe hart fixieren (`Dashboard.tsx`)**
   - Wrapper von `min-h-screen` auf `h-screen` (oder `h-dvh`) umstellen.
   - `overflow-hidden` setzen, damit keine zusätzliche Seitenhöhe entsteht.
   - Ergebnis: App passt exakt in den sichtbaren Bildschirm.

2. **Dashboard auf Resthöhe begrenzen (`CoachDashboard.tsx`)**
   - Root-Container auf `h-full min-h-0 flex flex-col` setzen (statt nur `flex-1`-Verhalten).
   - Oberes Zonen-Grid bleibt `flex-1 min-h-0`.
   - Untere Count-Leiste bleibt `flex-shrink-0` und sitzt damit immer am unteren Rand des sichtbaren Bereichs.

3. **Scroll nur dort erlauben, wo nötig**
   - Für den `customers`-Tab gezielt `overflow-y-auto` auf dem Content-Container aktivieren, damit nur die Liste scrollt (nicht die gesamte Seite).

4. **Abstand/Polsterung feinjustieren**
   - `pb/pt` der Count-Leiste minimal halten, damit sie wirklich „ganz unten“ sitzt (ohne optische Lücke).

### Betroffene Dateien
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/CoachDashboard.tsx`

### Erwartetes Ergebnis
- Keine überhohe schwarze Fläche mehr.
- Die Zonen-Anzahl bleibt stabil am unteren sichtbaren Bildschirmrand.
- Kein globales Vertikal-Scrollen der Dashboard-Seite.
