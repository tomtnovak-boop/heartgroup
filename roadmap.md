# Roadmap

- [ ] 1. Teilnehmer-Anlage serverseitig (manage-coach action create-participant) — Admin bleibt eingeloggt
- [ ] 2. Edge Functions absichern (verify_jwt für cleanup-stale-participants; simulate-hr bereits entfernt)
- [ ] 3. RLS INSERT workout_hr_data verschärfen
- [ ] 4. active_sessions SELECT: nur nicht beendete Sessions
- [ ] 5. Kalorien geschlechtsabhängig in useWorkoutSession
- [ ] 6. Doppelte HR-Speicherung: toten Solo-Trainings-Code (HeartRateDisplay) entfernen, Participant.tsx unverändert
- [ ] 7. ensureSessionCode nur eigene Sessions wiederverwenden
- [ ] 8. Realtime-Reconnect/Foreground Resync
