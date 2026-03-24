

## Plan: Passwort-vergessen Funktion

### Übersicht
"Passwort vergessen"-Link auf der Login-Seite + eine neue `/reset-password`-Seite zum Setzen des neuen Passworts.

### Änderungen

**1. Neue Komponente: `src/components/auth/ForgotPasswordForm.tsx`**
- E-Mail-Eingabe + Button "Passwort zurücksetzen"
- Ruft `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })` auf
- Erfolgs-/Fehlermeldung via Toast
- Link zurück zum Login

**2. Neue Seite: `src/pages/ResetPassword.tsx`**
- Prüft URL-Hash auf `type=recovery`
- Formular für neues Passwort (mit Bestätigung)
- Ruft `supabase.auth.updateUser({ password })` auf
- Leitet nach Erfolg zum Login weiter

**3. `src/components/auth/LoginForm.tsx` erweitern**
- Neuer Prop `onSwitchToForgotPassword`
- "Passwort vergessen?"-Link unter dem Passwort-Feld

**4. `src/pages/Auth.tsx` erweitern**
- Dritter State `'forgot'` neben `login`/`register`
- Rendert `ForgotPasswordForm` wenn aktiv

**5. `src/App.tsx` — Neue Route**
- `/reset-password` → `ResetPassword` (öffentlich, nicht geschützt)

### Ergebnis
Login → "Passwort vergessen?" → E-Mail eingeben → Link erhalten → neues Passwort setzen → zurück zum Login.

