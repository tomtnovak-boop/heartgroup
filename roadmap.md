# Roadmap

- [x] 1. Teilnehmer-Anlage serverseitig (manage-coach action create-participant) — Admin bleibt eingeloggt
- [x] 2. Edge Functions absichern (verify_jwt für cleanup-stale-participants; simulate-hr bereits entfernt)
- [x] 3. RLS INSERT workout_hr_data verschärfen
- [x] 4. active_sessions SELECT: nur nicht beendete Sessions
- [x] 5. Kalorien geschlechtsabhängig in useWorkoutSession
- [x] 6. Doppelte HR-Speicherung: toten Solo-Trainings-Code (HeartRateDisplay) entfernen, Participant.tsx unverändert
- [x] 7. ensureSessionCode nur eigene Sessions wiederverwenden
- [x] 8. Realtime-Reconnect/Foreground Resync
