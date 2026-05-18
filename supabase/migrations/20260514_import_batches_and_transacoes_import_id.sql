-- ================================================================
-- Migration: Importação por arquivo (CSV/OFX/XLSX) + histórico
-- Execute no Supabase -> SQL Editor
-- ================================================================

-- Histórico de imports (1 linha por arquivo confirmado)
CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('csv','ofx','xlsx')),
  filename text NOT NULL,
  filesize_bytes bigint NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
  transactions_count int NOT NULL DEFAULT 0,
  total_income numeric(12,2) NULL,
  total_expenses numeric(12,2) NULL,
  statement_balance numeric(12,2) NULL,
  score_before int NULL,
  score_after int NULL,
  recurring_count int NULL,
  subscriptions_count int NULL,
  payment_methods jsonb NULL,
  categories_top jsonb NULL,
  error_message text NULL,
  error_details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_batches_own" ON import_batches;
CREATE POLICY "import_batches_own"
  ON import_batches FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger (reusa public.set_updated_at se existir)
DROP TRIGGER IF EXISTS import_batches_updated_at ON import_batches;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at' AND pg_function_is_visible(oid)) THEN
    CREATE TRIGGER import_batches_updated_at
      BEFORE UPDATE ON import_batches
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS import_batches_user_created_idx
  ON import_batches(user_id, created_at DESC);

-- Link de conciliação: transações criadas via import (para apagar por batch)
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES import_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transacoes_user_import
  ON transacoes(user_id, import_id);
