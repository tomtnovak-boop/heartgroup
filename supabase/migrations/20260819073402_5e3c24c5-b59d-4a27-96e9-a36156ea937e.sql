-- 1) Fehlende Profile für vorhandene Auth-User anlegen (id = user_id = Auth-UID,
--    Name provisorisch aus dem E-Mail-Präfix)
insert into public.profiles (id, user_id, name)
select au.id, au.id, split_part(au.email, '@', 1)
from auth.users au
where not exists (
  select 1 from public.profiles p where p.id = au.id or p.user_id = au.id
);

-- 2) Vorhandene Profile ohne user_id nachträglich verknüpfen
update public.profiles p
set user_id = p.id
where p.user_id is null
  and exists (select 1 from auth.users au where au.id = p.id);