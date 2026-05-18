-- ================================================================
-- Migration: Base Open Finance + LGPD (conexões, consentimentos, importações)
-- Execute no Supabase -> SQL Editor
-- ================================================================

-- Helper genérico: updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ================================================================
-- 1) Conexões bancárias (Open Finance-ready)
-- ================================================================

CREATE TABLE IF NOT EXISTS bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- pluggy | belvo | quanto | celcoin | mock | etc
  institution_id text NOT NULL,
  institution_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- connected | disconnected | pending | error
  external_connection_id text NULL,
  last_sync_at timestamptz NULL,
  disconnected_at timestamptz NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, institution_id)
);

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_connections_own" ON bank_connections;
CREATE POLICY "bank_connections_own"
  ON bank_connections FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS bank_connections_updated_at ON bank_connections;
CREATE TRIGGER bank_connections_updated_at
  BEFORE UPDATE ON bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS bank_connections_user_id_idx ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS bank_connections_status_idx ON bank_connections(user_id, status);

-- ================================================================
-- 2) Consentimento explícito de compartilhamento financeiro
-- ================================================================

CREATE TABLE IF NOT EXISTS financial_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb, -- ex.: { accounts: true, transactions: true, balances: true }
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  privacy_version text NULL,
  terms_version text NULL,
  user_agent text NULL,
  ip_address inet NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE financial_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_consents_own" ON financial_consents;
CREATE POLICY "financial_consents_own"
  ON financial_consents FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS financial_consents_updated_at ON financial_consents;
CREATE TRIGGER financial_consents_updated_at
  BEFORE UPDATE ON financial_consents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apenas 1 consentimento ativo por provider (revoked_at IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS financial_consents_one_active_per_provider
  ON financial_consents(user_id, provider)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS financial_consents_user_id_idx ON financial_consents(user_id);

-- ================================================================
-- 3) Transações importadas (normalizadas, prontas para conciliação futura)
-- ================================================================

CREATE TABLE IF NOT EXISTS imported_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  external_id text NULL,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('receita','despesa')),
  date date NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  raw jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connection_id, external_id)
);

ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imported_transactions_own" ON imported_transactions;
CREATE POLICY "imported_transactions_own"
  ON imported_transactions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS imported_transactions_updated_at ON imported_transactions;
CREATE TRIGGER imported_transactions_updated_at
  BEFORE UPDATE ON imported_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS imported_transactions_user_date_idx
  ON imported_transactions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS imported_transactions_conn_date_idx
  ON imported_transactions(connection_id, date DESC);

-- ================================================================
-- 4) Solicitações LGPD (exportação / exclusão definitiva)
-- ================================================================

CREATE TABLE IF NOT EXISTS user_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('export','delete')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','completed','failed','canceled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  details jsonb NULL,
  error_message text NULL
);

ALTER TABLE user_data_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_data_requests_own" ON user_data_requests;
CREATE POLICY "user_data_requests_own"
  ON user_data_requests FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS user_data_requests_user_kind_idx
  ON user_data_requests(user_id, kind, requested_at DESC);

