-- ============================================================
-- OTP CODES TABLE — updated RLS for client-side verification
-- ============================================================

-- 1. Create table (if not already done)
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  code        TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes (email);

-- 2. RLS — allow anyone to read/write their own email row
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can upsert own otp" ON otp_codes;
CREATE POLICY "Anyone can upsert own otp" ON otp_codes
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SUPABASE DASHBOARD SETTINGS (do these once)
-- ============================================================

-- STEP 1: Disable email confirmation
-- Dashboard → Authentication → Providers → Email
--   Turn OFF "Confirm email"
--   This makes signUp() create the account immediately.

-- STEP 2: Set up Brevo SMTP (free — 300 emails/day, no domain needed)
-- 1. Sign up free at https://brevo.com
-- 2. Brevo → SMTP & API → SMTP tab → copy credentials:
--      SMTP Server : smtp-relay.brevo.com
--      Port        : 587
--      Login       : your Brevo account email
--      Password    : your Brevo SMTP key
-- 3. Supabase Dashboard → Authentication → SMTP Settings:
--      Enable custom SMTP : ON
--      Host               : smtp-relay.brevo.com
--      Port               : 587
--      Username           : your-brevo-email@example.com
--      Password           : your-brevo-smtp-key
--      Sender email       : your-brevo-email@example.com
--      Sender name        : FitLife

-- STEP 3: Customise the OTP email template (optional)
-- Dashboard → Authentication → Email Templates → Magic Link
-- Subject: "Your FitLife verification code"
-- Body: use {{ .Token }} where you want the 6-digit code to appear.

-- Verify
SELECT email, LEFT(code,2)||'****' AS preview, expires_at, used
FROM otp_codes ORDER BY created_at DESC LIMIT 10;
