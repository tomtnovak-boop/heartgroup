

## Plan: Test-Login für Anna Müller erstellen

### Vorgehen

Da Anna Müller nur als Testprofil ohne Auth-Account existiert, muss ein Login-Account erstellt und mit ihrem bestehenden Profil verknüpft werden.

**Schritt 1: E-Mail Auto-Confirm aktivieren**
- Damit du dich ohne E-Mail-Bestätigung direkt anmelden kannst, wird Auto-Confirm temporär aktiviert

**Schritt 2: Du registrierst dich auf /auth mit diesen Daten:**
- **E-Mail:** `anna@test.de`
- **Passwort:** `Test1234!`
- **Name:** Anna Müller
- **Geburtsdatum:** 15.03.1998
- **Gewicht:** 62 kg
- **Grösse:** 168 cm

**Schritt 3: Profil-Verknüpfung (Datenbank)**
- Nach der Registrierung wird ein zweites Anna-Profil erstellt — das alte Test-Profil (ohne `user_id`) wird gelöscht und die `user_id` des neuen Auth-Accounts auf das neue Profil gesetzt
- Die Simulationsdaten (live_hr) werden auf das neue Profil umgemappt

### Alternative (schneller)
Stattdessen kann ich auch eine Backend-Funktion erstellen, die den Auth-User automatisch anlegt und direkt mit dem bestehenden Anna-Profil verknüpft — dann musst du dich nur einloggen.

### Empfehlung
Die manuelle Registrierung ist der einfachste Weg und testet gleichzeitig den Registrierungs-Flow.

### Technische Schritte
1. Auto-Confirm via `configure_auth` aktivieren
2. Du registrierst dich manuell
3. Ich verknüpfe die Daten per DB-Update

