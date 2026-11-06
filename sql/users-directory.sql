-- Run in the existing Neon database (Vercel Storage / Neon SQL Editor).
-- Accounts for this version are in users, NOT in Supabase auth.users.
-- Schema additions are applied automatically by lib/db.js after deployment.
-- Run this SELECT for inspection; export its result to CSV in the SQL Editor.
-- No password hashes, salts, session tokens, OTPs, or reset tickets are included.
select
  id,
  name,
  email,
  role as stored_role,
  email_verified_at is not null as email_verified,
  to_timestamp(email_verified_at / 1000.0) as email_verified_at,
  to_timestamp(last_login_at / 1000.0) as last_login_at,
  to_timestamp(created_at / 1000.0) as created_at,
  case when paid_until > 0 then to_timestamp(paid_until / 1000.0) end as paid_until,
  blocked
from users
order by created_at desc,id;

-- Administrator access is computed on the server from ADMIN_EMAILS.
-- stored_role is informational, not the authorization source.
-- Older accounts retain access but email_verified remains false until email proof.
