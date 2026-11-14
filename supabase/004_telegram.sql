-- Saluran chat kedua: Telegram. Satu akun AURA bisa tertaut ke WhatsApp, Telegram, atau keduanya.
alter table public.users add column if not exists telegram_chat_id bigint unique;
