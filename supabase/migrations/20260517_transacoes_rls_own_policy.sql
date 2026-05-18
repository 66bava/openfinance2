-- ================================================================
-- Migration: Garantir RLS + policy correta em transacoes
-- Execute no Supabase → SQL Editor
-- (Não desabilita RLS; reforça isolamento por user_id)
-- ================================================================

-- 1) Ativa RLS caso ainda não esteja habilitado
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

-- 2) Policy padrão: usuário só enxerga/insere/edita/deleta suas transações
DROP POLICY IF EXISTS "Transações próprias" ON transacoes;
CREATE POLICY "Transações próprias" ON transacoes
  FOR ALL
  USING     ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

