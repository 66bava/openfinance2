-- ================================================================
-- Migration: Otimização de índices e políticas RLS
-- Execute no Supabase → SQL Editor
-- ================================================================


-- ── 1. ÍNDICES ────────────────────────────────────────────────
-- Remove índice duplicado: já coberto pela UNIQUE constraint
DROP INDEX IF EXISTS idx_beta_users_email;

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_criado_em
  ON audit_logs(criado_em DESC);

-- cartoes
CREATE INDEX IF NOT EXISTS idx_cartoes_user_id
  ON cartoes(user_id);

-- compromissos
CREATE INDEX IF NOT EXISTS idx_compromissos_user_id
  ON compromissos(user_id);
CREATE INDEX IF NOT EXISTS idx_compromissos_categoria
  ON compromissos(categoria_id);

-- faturas
CREATE INDEX IF NOT EXISTS idx_faturas_user_id
  ON faturas(user_id);

-- gastos_futuros
CREATE INDEX IF NOT EXISTS idx_gastos_futuros_user_id
  ON gastos_futuros(user_id);
CREATE INDEX IF NOT EXISTS idx_gastos_futuros_categoria
  ON gastos_futuros(categoria_id);
CREATE INDEX IF NOT EXISTS idx_gastos_futuros_cartao
  ON gastos_futuros(cartao_id);

-- investimentos
CREATE INDEX IF NOT EXISTS idx_investimentos_user_id
  ON investimentos(user_id);

-- parcelas
CREATE INDEX IF NOT EXISTS idx_parcelas_user_id
  ON parcelas(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_gasto_futuro
  ON parcelas(gasto_futuro_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_transacao
  ON parcelas(transacao_id);
-- composto: busca parcelas pendentes de um usuário por vencimento
CREATE INDEX IF NOT EXISTS idx_parcelas_user_venc_status
  ON parcelas(user_id, data_vencimento, status);

-- relatorios
CREATE INDEX IF NOT EXISTS idx_relatorios_user_id
  ON relatorios(user_id);

-- transacoes: cobertura dos FKs restantes
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria
  ON transacoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_cartao
  ON transacoes(cartao_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_fatura
  ON transacoes(fatura_id);
-- composto: filtra receitas/despesas por período em uma única varredura
CREATE INDEX IF NOT EXISTS idx_transacoes_user_tipo_data
  ON transacoes(user_id, tipo, data DESC);


-- ── 2. RLS POLICIES OTIMIZADAS ────────────────────────────────
-- auth.uid() era reavaliado uma vez por linha.
-- (select auth.uid()) é avaliado uma única vez por query → muito mais rápido.

-- profiles
DROP POLICY IF EXISTS "Usuários veem apenas seus dados" ON profiles;
CREATE POLICY "Usuários veem apenas seus dados" ON profiles
  FOR ALL
  USING     ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- categorias
DROP POLICY IF EXISTS "Categorias próprias ou padrão" ON categorias;
CREATE POLICY "Categorias próprias ou padrão" ON categorias
  FOR ALL
  USING     ((select auth.uid()) = user_id OR is_padrao = true)
  WITH CHECK ((select auth.uid()) = user_id);

-- transacoes
DROP POLICY IF EXISTS "Transações próprias" ON transacoes;
CREATE POLICY "Transações próprias" ON transacoes
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- metas
DROP POLICY IF EXISTS "Metas próprias" ON metas;
CREATE POLICY "Metas próprias" ON metas
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- investimentos
DROP POLICY IF EXISTS "Investimentos próprios" ON investimentos;
CREATE POLICY "Investimentos próprias" ON investimentos
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- relatorios
DROP POLICY IF EXISTS "Relatórios próprios" ON relatorios;
CREATE POLICY "Relatórios próprios" ON relatorios
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- cartoes
DROP POLICY IF EXISTS "own" ON cartoes;
CREATE POLICY "own" ON cartoes
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- faturas
DROP POLICY IF EXISTS "own" ON faturas;
CREATE POLICY "own" ON faturas
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- gastos_futuros
DROP POLICY IF EXISTS "own" ON gastos_futuros;
CREATE POLICY "own" ON gastos_futuros
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- parcelas
DROP POLICY IF EXISTS "own" ON parcelas;
CREATE POLICY "own" ON parcelas
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- relatorios_ia
DROP POLICY IF EXISTS "own" ON relatorios_ia;
CREATE POLICY "own" ON relatorios_ia
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- compromissos
DROP POLICY IF EXISTS "Users can manage own compromissos" ON compromissos;
CREATE POLICY "Users can manage own compromissos" ON compromissos
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- audit_logs
DROP POLICY IF EXISTS "Audit logs próprios" ON audit_logs;
CREATE POLICY "Audit logs próprios" ON audit_logs
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- beta_users
DROP POLICY IF EXISTS "Beta service role only" ON beta_users;
CREATE POLICY "Beta service role only" ON beta_users
  FOR ALL
  USING ((select auth.role()) = 'service_role');

-- waitlist
DROP POLICY IF EXISTS "Waitlist select autenticado" ON waitlist;
CREATE POLICY "Waitlist select autenticado" ON waitlist
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');
