create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null check (password_hash ~ '^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_normalized check (email = lower(btrim(email)))
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists user_sessions_user_id_idx on public.user_sessions (user_id);
create index if not exists user_sessions_expires_at_idx on public.user_sessions (expires_at);

alter table public.users enable row level security;
alter table public.user_sessions enable row level security;
revoke all on table public.users from anon, authenticated;
revoke all on table public.user_sessions from anon, authenticated;
grant all on table public.users to service_role;
grant all on table public.user_sessions to service_role;

insert into public.users (id, email, name, password_hash)
values (
  '00000000-0000-4000-8000-000000000001',
  'demo@elcaleno.com',
  'Usuario demo',
  'scrypt$237160f955972fd60a682fb85a49a839$13ec0a27e6ac64904e6f27d2d3aa86e34feba6f623a0a35c3ecd5a8b9f1d23df9d0d06c363b9f78c8aff22368159535e6b5eb2f7a9cc5d3b246abbcf503de051'
)
on conflict (email) do nothing;