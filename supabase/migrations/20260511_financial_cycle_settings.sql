-- Migration: Configurações do ciclo financeiro do usuário
-- Execute no Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS user_financial_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payday_day smallint NOT NULL DEFAULT 5 CHECK (payday_day BETWEEN 1 AND 31),
  reset_day smallint NOT NULL DEFAULT 1 CHECK (reset_day BETWEEN 1 AND 31),
  recurring_post_day smallint NOT NULL DEFAULT 1 CHECK (recurring_post_day BETWEEN 1 AND 31),
  cycle_start_day smallint NOT NULL DEFAULT 1 CHECK (cycle_start_day BETWEEN 1 AND 31),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_financial_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_financial_settings" ON user_financial_settings;
CREATE POLICY "user_own_financial_settings"
  ON user_financial_settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS user_financial_settings_timezone_idx
  ON user_financial_settings(timezone);

CREATE OR REPLACE FUNCTION update_user_financial_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_financial_settings_updated_at ON user_financial_settings;
CREATE TRIGGER user_financial_settings_updated_at
  BEFORE UPDATE ON user_financial_settings
  FOR EACH ROW EXECUTE FUNCTION update_user_financial_settings_updated_at();

