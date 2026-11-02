create table if not exists public.email_otp_verifications (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists email_otp_verifications_expires_at_idx
  on public.email_otp_verifications (expires_at);
