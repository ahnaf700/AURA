-- Migrasi untuk project yang masih memakai tabel "users" versi lama (id bigint, tanpa auth_user_id).
-- Tabel lama TIDAK dihapus: diganti nama menjadi users_legacy (hapus manual bila sudah tidak perlu).
-- Aman dijalankan ulang.

create extension if not exists pgcrypto;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='users' and column_name='id' and data_type='bigint') then
    alter table public.users rename to users_legacy;
    alter table public.users_legacy enable row level security;
    revoke all on public.users_legacy from anon, authenticated;
  end if;
end $$;

create table if not exists public.users (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid not null unique references auth.users(id) on delete cascade,
  email             text not null,
  no_whatsapp       text unique check (no_whatsapp ~ '^[0-9]{8,15}$'),
  spreadsheet_id    text unique check (spreadsheet_id ~ '^[A-Za-z0-9_-]{20,100}$'),
  link_code         text unique,
  link_code_expires timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists public.processed_messages (
  id         text primary key,
  wa_number  text not null,
  created_at timestamptz not null default now()
);
create index if not exists processed_messages_wa_idx on public.processed_messages (wa_number, created_at);

create table if not exists public.api_hits (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  route      text not null,
  created_at timestamptz not null default now()
);
create index if not exists api_hits_idx on public.api_hits (user_id, route, created_at);

-- Catatan aksi admin (siapa melakukan apa pada siapa).
create table if not exists public.admin_log (
  id           bigint generated always as identity primary key,
  admin_email  text not null,
  action       text not null,
  target_email text,
  created_at   timestamptz not null default now()
);
create index if not exists admin_log_created_idx on public.admin_log (created_at desc);

-- RLS aktif TANPA policy: anon/authenticated ditolak total. Semua akses lewat server (service key).
alter table public.users enable row level security;
alter table public.processed_messages enable row level security;
alter table public.api_hits enable row level security;
alter table public.admin_log enable row level security;
revoke all on public.users, public.processed_messages, public.api_hits, public.admin_log from anon, authenticated;
