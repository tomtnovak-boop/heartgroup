# Bheart: Sicherheits- und Stabilitäts-Fixes (8 Punkte)

Reihenfolge wie angefragt, Sicherheit zuerst. Nach jedem Block wird der Build geprüft und Beitritt/HR-Streaming/Auswertung gegengelesen.

## 1. Admin bleibt eingeloggt beim Anlegen eines Teilnehmers (kritisch)

- `supabase/functions/manage-coach/index.ts` um die Action `create-participant` erweitern (gleicher Admin-Check wie bisher: `getUser()` + `user_roles`-Prüfung über Service-Role-Client).
- Ablauf in der Function: `auth.admin.createUser({ email, password, email_confirm: true })`, danach `upsert` in `profiles` mit `user_id = neue UserId`, Feldern `name, nickname, birth_date, age, max_hr, custom_max_hr, weight, gender`. Rolle bleibt `participant` (wird bereits vom Trigger `handle_new_user` gesetzt).
- In `src/components/admin/AdminParticipantsTab.tsx` (`handleCreate` im Create-Modal) den `supabase.auth.signUp(...)`-Block **und** den nachfolgenden `profiles.upsert` durch einen einzigen `supabase.functions.invoke('manage-coach', { body: { action: 'create-participant', ... } })`-Aufruf ersetzen. Fehler wie bisher als Toast.
- Damit wird im Browser keine neue Session mehr erzeugt; die Admin-Session bleibt bestehen.

## 2. Edge Functions absichern (kritisch)

Status heute: `cleanup-stale-participants` besitzt bereits Bearer-Token-Prüfung + Coach/Admin-Rollencheck; `simulate-hr` existiert nicht mehr im Projekt.
Ergänzend:
- `supabase/config.toml`: für `cleanup-stale-participants` `verify_jwt = true` setzen, damit anonyme Aufrufe schon am Gateway abprallen.
- Kurzcheck, dass keine weitere Function ohne Auth-Check existiert (`cleanup-live-hr`, `manage-coach` prüfen).

## 3. RLS: INSERT auf `workout_hr_data` verschärfen (hoch)

Migration:
- Alte Policy `Authenticated users can insert workout_hr_data` (`WITH CHECK (auth.uid() IS NOT NULL)`) droppen.
- Neue INSERT-Policy analog zur SELECT-Policy: erlaubt, wenn `workout_id` zu einem Workout gehört, dessen `profiles.user_id = auth.uid()` ist, ODER `has_role(auth.uid(),'coach')` / `has_role(auth.uid(),'admin')`.

## 4. `active_sessions` SELECT leicht einschränken (mittel)

Migration: Policy `Authenticated can read active_sessions` ersetzen durch `USING (ended_at IS NULL)` für `authenticated`. Kein `created_by`/Lobby-Filter, damit der Beitritt per Code funktioniert.
Hinweis: Code-Stellen, die beendete Sessions lesen (z. B. Leaderboard-Nachlauf), werden vorher geprüft; falls eine solche Abfrage existiert, wird sie über die Workout-Daten statt über `active_sessions` bedient oder der Punkt vorher gemeldet.

## 5. Kalorien mit Geschlecht berechnen (mittel)

In `src/hooks/useWorkoutSession.ts` (Finalisierung, ca. Zeile 596) die fest verdrahtete Männer-Formel ersetzen durch
`Math.round((durationSeconds / 60) * calculateCaloriesPerMinute(avgBpm, weight, age, profile?.gender === 'female' ? 'female' : 'male'))`,
Fallbacks `weight = 75`, `age = 30`, Ergebnis weiterhin `Math.max(0, ...)`. Import aus `src/lib/heartRateUtils.ts`.

## 6. Doppelte HR-Speicherung entfernen (mittel)

Befund: `src/pages/Participant.tsx` schreibt pro Tick in `workout_hr_data` (an die Coach-Session gekoppelt). `HeartRateDisplay` wird von genau dieser Seite gerendert, deren Effects weiterlaufen — dort wird zusätzlich ein eigener Workout angelegt und pro Tick erneut inserted.
Fix: Der Insert in `src/components/participant/HeartRateDisplay.tsx` entfällt; die Session-gekoppelte Schreibstelle in `Participant.tsx` bleibt die einzige Quelle. `live_hr`-Upserts bleiben unverändert (die Komponente behält ihre lokale Historie für die Workout-Zusammenfassung).

## 7. Session-Wiederverwendung auf den Coach beschränken (mittel)

In `ensureSessionCode` (`src/hooks/useWorkoutSession.ts`) die Abfrage um `.eq('created_by', userData.user.id)` ergänzen (zusätzlich zu `ended_at IS NULL`). Analog in `restoreSession`, damit ein Coach nicht die Session eines anderen Coaches übernimmt. Ohne Treffer wird wie bisher ein neuer Code mit eigener `created_by` erzeugt.

## 8. Selbstheilung nach Realtime-Abbruch (mittel)

- `useWorkoutSession.ts`: in den `.subscribe((status) => ...)`-Callbacks der Kanäle `active-sessions-sync`, `session-code-sync` und `external-session-changes` bei `status === 'SUBSCRIBED'` denselben Init-Load (`restoreSession` / Session-Refetch) ausführen.
- `useLiveHR.ts`: bei `SUBSCRIBED` zusätzlich `fetchLatestData()` aufrufen (bisher nur bei CLOSED/CHANNEL_ERROR).
- In beiden Hooks sowie auf `src/pages/Participant.tsx` und `src/pages/Display.tsx` Listener auf `visibilitychange` (sichtbar) und `focus` registrieren, die denselben Refetch anstoßen; Cleanup beim Unmount.

## Technische Notizen

- Migrationen: zwei separate, additive Policy-Migrationen (Punkt 3 und 4), jeweils Drop + Create nur der betroffenen Policy.
- Keine Schemaänderungen an Tabellen/Spalten.
- Prüfung nach Umsetzung: Build-Log, Policy-Liste per Read-Query, sowie Sichtprüfung der betroffenen UI-Pfade.
