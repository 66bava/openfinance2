-- ================================================================
-- Migration: Ciclos Financeiros completos
-- Tabelas: financial_cycles, cycle_resets
-- Alterações: import_batches, transacoes, user_categorization_rules
-- Execute no Supabase -> SQL Editor
-- ================================================================

-- ── Tabela principal de ciclos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_cycles (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date           date        NOT NULL,
  end_date             date        NOT NULL,
  status               text        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active', 'closed', 'reset')),
  -- Saldo herdado do ciclo anterior (carried_balance do fechamento anterior)
  opening_balance      numeric(12,2) NOT NULL DEFAULT 0,
  -- Saldo calculado no fechamento (NULL enquanto ativo)
  closing_balance      numeric(12,2) NULL,
  -- Saldo carregado: abertura + receitas - despesas (alias semântico para reports)
  carried_balance      numeric(12,2) NOT NULL DEFAULT 0,
  income_total         numeric(12,2) NULL,
  expense_total        numeric(12,2) NULL,
  investment_total     numeric(12,2) NULL,
  score_snapshot       int          NULL,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  closed_at            timestamptz  NULL,
  reset_at             timestamptz  NULL,
  metadata             jsonb        NULL
);

ALTER TABLE financial_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_cycles_own" ON financial_cycles;
CREATE POLICY "financial_cycles_own"
  ON financial_cycles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS financial_cycles_user_status_idx
  ON financial_cycles(user_id, status);

CREATE INDEX IF NOT EXISTS financial_cycles_user_start_idx
  ON financial_cycles(user_id, start_date DESC);

-- Garante no máximo 1 ciclo 'active' por usuário
CREATE UNIQUE INDEX IF NOT EXISTS financial_cycles_user_active_unique
  ON financial_cycles(user_id)
  WHERE status = 'active';

-- ── Registro de resets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cycle_resets (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id                   uuid        NOT NULL REFERENCES financial_cycles(id) ON DELETE CASCADE,
  reset_type                 text        NOT NULL
                                         CHECK (reset_type IN (
                                           'imports_only',
                                           'all_transactions',
                                           'imports_keep_manual'
                                         )),
  affected_transactions_count int        NOT NULL DEFAULT 0,
  affected_imports_count      int        NOT NULL DEFAULT 0,
  previous_snapshot          jsonb       NULL,
  new_snapshot               jsonb       NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  metadata                   jsonb       NULL
);

ALTER TABLE cycle_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cycle_resets_own" ON cycle_resets;
CREATE POLICY "cycle_resets_own"
  ON cycle_resets FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS cycle_resets_cycle_idx
  ON cycle_resets(cycle_id);

CREATE INDEX IF NOT EXISTS cycle_resets_user_idx
  ON cycle_resets(user_id, created_at DESC);

-- ── Estender import_batches com cycle_id ──────────────────────────────────────
ALTER TABLE import_batches
  ADD COLUMN IF NOT EXISTS cycle_id uuid
    REFERENCES financial_cycles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS import_batches_cycle_idx
  ON import_batches(cycle_id);

-- ── Estender transacoes com cycle_id e fingerprint de dedup ──────────────────
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS cycle_id      uuid REFERENCES financial_cycles(id) ON DELETE SET NULL;

ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS tx_fingerprint text NULL;

CREATE INDEX IF NOT EXISTS transacoes_cycle_idx
  ON transacoes(cycle_id);

-- Índice para dedup rápido por fingerprint (parcial: só linhas com fingerprint)
CREATE INDEX IF NOT EXISTS transacoes_user_fingerprint_idx
  ON transacoes(user_id, tx_fingerprint)
  WHERE tx_fingerprint IS NOT NULL;

-- ── Estender user_categorization_rules com campos de treinamento ──────────────
ALTER TABLE user_categorization_rules
  ADD COLUMN IF NOT EXISTS category_id uuid
    REFERENCES categorias(id) ON DELETE SET NULL;

ALTER TABLE user_categorization_rules
  ADD COLUMN IF NOT EXISTS source text
    DEFAULT 'user_correction'
    CHECK (source IN ('user_correction', 'import_confirmation', 'manual_rule'));
