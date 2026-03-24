

## Plan: Gewicht & Körpergrösse bei Registrierung und Kundenverwaltung

### Problem
- **Gewicht** existiert in der DB (`profiles.weight`), wird aber bei der Registrierung nicht abgefragt
- **Körpergrösse** existiert gar nicht in der Datenbank
- Beide Werte werden für eine genaue Kalorienberechnung benötigt

### Änderungen

**1. Datenbank-Migration**
- Neue Spalte `height` (integer, nullable) zur `profiles`-Tabelle hinzufügen (Körpergrösse in cm)

**2. `RegisterForm.tsx` — Gewicht + Grösse abfragen**
- Zwei neue Felder nach Geschlecht hinzufügen:
  - Gewicht (kg): `type="number"`, Placeholder "z.B. 75"
  - Körpergrösse (cm): `type="number"`, Placeholder "z.B. 175"
- Beide optional, werden beim Profil-Erstellen mitgespeichert

**3. `CustomerList.tsx` — Spalten ergänzen**
- Neue Spalten "Gewicht" und "Grösse" in der Tabelle anzeigen

**4. `CustomerEditDialog.tsx` — Felder hinzufügen**
- Gewicht- und Grösse-Eingabefelder im Bearbeitungs-Dialog
- Nickname-Feld ebenfalls hinzufügen (aus dem zuvor genehmigten Plan)

**5. `ProfileEditDialog.tsx` — Grösse-Feld ergänzen**
- Neues Feld "Körpergrösse (cm)" neben dem bestehenden Gewicht-Feld

### Dateien
- **Migration:** `profiles` → neue Spalte `height`
- **Ändern:** `RegisterForm.tsx`, `CustomerList.tsx`, `CustomerEditDialog.tsx`, `ProfileEditDialog.tsx`

