

## Fix: Timo Admin-Rolle zuweisen

### Problem
Timo (`f2a7c490-8ee1-4f0e-95e0-ed3e22648e27`) hat keinen Eintrag in der `user_roles`-Tabelle. Ohne Rolle wird er vom Routing als Teilnehmer behandelt und direkt zu `/participant` geleitet.

Tom (`f70a8be1-5421-4940-b285-493a970cf88a`) hat ebenfalls keinen Eintrag — vermutlich wird seine Rolle anderweitig gesetzt. Beide sollten `admin` und `coach` Rollen erhalten.

### Fix
Eine Migration die für beide Accounts die Rollen `admin` und `coach` einfügt:

```sql
INSERT INTO public.user_roles (user_id, role) VALUES
  ('f2a7c490-8ee1-4f0e-95e0-ed3e22648e27', 'admin'),
  ('f2a7c490-8ee1-4f0e-95e0-ed3e22648e27', 'coach'),
  ('f70a8be1-5421-4940-b285-493a970cf88a', 'admin'),
  ('f70a8be1-5421-4940-b285-493a970cf88a', 'coach')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Dateien
Keine Code-Änderungen nötig — nur eine Datenbank-Migration.

