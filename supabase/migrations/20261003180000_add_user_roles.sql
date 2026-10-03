alter table public.users
  add column if not exists role text not null default 'user' check (role in ('admin', 'user'));

update public.users
set role = 'admin', updated_at = now()
where email = 'demo@elcaleno.com';