-- ================================================================
-- Migration: Notificações + melhorias em import_batches + prefs básicas
-- Execute no Supabase → SQL Editor
-- ================================================================

-- ── 1) import_batches: campos para debug/histórico mais completo ────────────
ALTER TABLE import_batches
  ADD COLUMN IF NOT EXISTS bank_detected text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS valid_transactions_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_transactions_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS import_batches_user_imported_idx
  ON import_batches(user_id, imported_at DESC);

-- ── 2) notifications: persistência por usuário ─────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own"
  ON notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications(user_id)
  WHERE read_at IS NULL;

-- ── 3) profiles: preferências básicas (tema/moeda/data) ────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_preference text,
  ADD COLUMN IF NOT EXISTS currency_preference text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS date_format_preference text NOT NULL DEFAULT 'pt-BR';

