-- ================================================================
-- Migration: Engine de categorização por usuário (aprendizado local)
-- Execute no Supabase -> SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS user_categorization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL, -- texto normalizado (ex.: "ifood", "uber", "netflix")
  tipo text NULL CHECK (tipo IN ('receita','despesa')),
  categoria_nome text NOT NULL, -- mantém independente do id da categoria
  confidence numeric NOT NULL DEFAULT 0.92 CHECK (confidence > 0 AND confidence <= 0.99),
  use_count int NOT NULL DEFAULT 1 CHECK (use_count >= 1),
  last_used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key, tipo)
);

ALTER TABLE user_categorization_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_categorization_rules_own" ON user_categorization_rules;
CREATE POLICY "user_categorization_rules_own"
  ON user_categorization_rules FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger (reaproveita public.set_updated_at se existir; senão, cria)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pg_function_is_visible(oid)
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $f$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $f$;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS user_categorization_rules_updated_at ON user_categorization_rules;
CREATE TRIGGER user_categorization_rules_updated_at
  BEFORE UPDATE ON user_categorization_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS user_categorization_rules_user_idx
  ON user_categorization_rules(user_id);

CREATE INDEX IF NOT EXISTS user_categorization_rules_user_key_idx
  ON user_categorization_rules(user_id, key);

