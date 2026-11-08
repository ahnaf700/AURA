-- Jalankan di Supabase > SQL Editor.
-- Bila sebelumnya sudah ada tabel "users" versi lama, hapus dulu (data uji coba):
-- drop table if exists public.users cascade;

create extension if not exists pgcrypto;

create table public.users (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid not null unique references auth.users(id) on delete cascade,
  email             text not null,
  no_whatsapp       text unique check (no_whatsapp ~ '^[0-9]{8,15}$'),
  spreadsheet_id    text unique check (spreadsheet_id ~ '^[A-Za-z0-9_-]{20,100}$'),
  link_code         text unique,
  link_code_expires timestamptz,
  created_at        timestamptz not null default now()
);

-- Dedup webhook + rate limit per nomor
create table public.processed_messages (
  id         text primary key,
  wa_number  text not null,
  created_at timestamptz not null default now()
);
create index processed_messages_wa_idx on public.processed_messages (wa_number, created_at);

-- RLS aktif TANPA policy = anon/authenticated ditolak total.
-- Semua akses lewat server (service key) setelah sesi login diverifikasi.
alter table public.users enable row level security;
alter table public.processed_messages enable row level security;
revoke all on public.users, public.processed_messages from anon, authenticated;

-- Rate limit endpoint dashboard per pengguna
create table if not exists public.api_hits (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  route      text not null,
  created_at timestamptz not null default now()
);
create index if not exists api_hits_idx on public.api_hits (user_id, route, created_at);
alter table public.api_hits enable row level security;
revoke all on public.api_hits from anon, authenticated;
