-- Migrasi untuk yang SUDAH menjalankan schema.sql versi sebelumnya. Jalankan di Supabase > SQL Editor.
create table if not exists public.api_hits (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  route      text not null,
  created_at timestamptz not null default now()
);
create index if not exists api_hits_idx on public.api_hits (user_id, route, created_at);
alter table public.api_hits enable row level security;
revoke all on public.api_hits from anon, authenticated;
