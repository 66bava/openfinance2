-- Migration: Preferências de categorias por usuário (ocultar categorias padrão)
-- Execute no Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS user_category_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  hidden boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, categoria_id)
);

ALTER TABLE user_category_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_category_prefs" ON user_category_preferences;
CREATE POLICY "user_own_category_prefs"
  ON user_category_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS user_category_preferences_user_id_idx
  ON user_category_preferences(user_id);

CREATE INDEX IF NOT EXISTS user_category_preferences_hidden_idx
  ON user_category_preferences(user_id, hidden);

CREATE OR REPLACE FUNCTION update_user_category_preferences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_category_preferences_updated_at ON user_category_preferences;
CREATE TRIGGER user_category_preferences_updated_at
  BEFORE UPDATE ON user_category_preferences
  FOR EACH ROW EXECUTE FUNCTION update_user_category_preferences_updated_at();

