-- ============================================================
-- MERIDIAN — Settings Tables SQL Patch
-- 01/03/2026
-- Fixes: 400 errors on upsert (missing unique constraints)
-- Run ONCE in Supabase SQL Editor
-- ============================================================

-- ── clinic_settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_settings (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       text NOT NULL,
  clinic_name   text,
  phone         text,
  address       text,
  city          text,
  website       text,
  opening_hours jsonb,   -- weekly diary JSON
  updated_at    timestamptz DEFAULT now()
);
-- Add unique constraint if missing (safe to run even if exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clinic_settings_user_id_key'
  ) THEN
    ALTER TABLE clinic_settings ADD CONSTRAINT clinic_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_settings_all" ON clinic_settings;
CREATE POLICY "clinic_settings_all" ON clinic_settings FOR ALL USING (true);

-- ── therapist_profile ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS therapist_profile (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        text NOT NULL,
  full_name      text,
  email          text,
  license_number text,
  years_exp      int,
  specialty      text,
  bio_he         text,
  updated_at     timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'therapist_profile_user_id_key'
  ) THEN
    ALTER TABLE therapist_profile ADD CONSTRAINT therapist_profile_user_id_key UNIQUE (user_id);
  END IF;
END $$;
ALTER TABLE therapist_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "therapist_profile_all" ON therapist_profile;
CREATE POLICY "therapist_profile_all" ON therapist_profile FOR ALL USING (true);

-- ── subscription_status ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_status (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         text NOT NULL,
  plan_key        text DEFAULT 'starter',
  plan_he         text DEFAULT 'מתחיל — Starter',
  price_usd       numeric DEFAULT 8,
  sessions_used   int DEFAULT 0,
  sessions_limit  int DEFAULT 100,
  renewal_date    date DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  tier_tok        text DEFAULT 's',
  has_audio       boolean DEFAULT false,
  has_trans       boolean DEFAULT false,
  registered_at   timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_status_user_id_key'
  ) THEN
    ALTER TABLE subscription_status ADD CONSTRAINT subscription_status_user_id_key UNIQUE (user_id);
  END IF;
END $$;
ALTER TABLE subscription_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_status_all" ON subscription_status;
CREATE POLICY "subscription_status_all" ON subscription_status FOR ALL USING (true);

-- ── claude_settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claude_settings (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       text NOT NULL,
  api_key       text,
  model         text DEFAULT 'claude-sonnet-4-20250514',
  response_lang text DEFAULT 'he',
  max_tokens    int  DEFAULT 1500,
  safety_level  text DEFAULT 'standard',
  updated_at    timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claude_settings_user_id_key'
  ) THEN
    ALTER TABLE claude_settings ADD CONSTRAINT claude_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;
ALTER TABLE claude_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "claude_settings_all" ON claude_settings;
CREATE POLICY "claude_settings_all" ON claude_settings FOR ALL USING (true);

-- ── VERIFY ───────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('clinic_settings','therapist_profile','subscription_status','claude_settings');
