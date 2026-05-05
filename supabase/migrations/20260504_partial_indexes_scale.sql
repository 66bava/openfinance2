-- ================================================================
-- Migration: Partial indexes para escala multi-usuário
-- Execute no Supabase → SQL Editor
-- ================================================================
-- Por que partial indexes?
-- Um índice normal em cartoes(user_id) indexa TODOS os cartões,
-- incluindo os inativos. Com muitos usuários isso cresce sem parar.
-- Um partial index "WHERE ativo = true" é menor, mais rápido e
-- cobre 100% das queries reais (ninguém consulta cartão inativo).
-- ================================================================


-- ── cartoes: só ativos ─────────────────────────────────────────
-- Substitui o idx_cartoes_user_id para queries do dashboard
CREATE INDEX IF NOT EXISTS idx_cartoes_user_ativo
  ON cartoes(user_id)
  WHERE ativo = true;


-- ── compromissos: só ativos ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_compromissos_user_ativo
  ON compromissos(user_id, dia_vencimento)
  WHERE ativo = true;


-- ── gastos_futuros: só ativos ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gastos_futuros_user_ativo
  ON gastos_futuros(user_id)
  WHERE ativo = true;


-- ── investimentos: só ativos ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_investimentos_user_ativo
  ON investimentos(user_id)
  WHERE ativo = true;


-- ── categorias: padrão separado ────────────────────────────────
-- As categorias padrão são compartilhadas entre TODOS os usuários.
-- Um partial index minúsculo (15 linhas, sempre) serve a query
-- "OR is_padrao = true" sem varredura completa da tabela.
CREATE INDEX IF NOT EXISTS idx_categorias_padrao
  ON categorias(tipo)
  WHERE is_padrao = true;


-- ── faturas: abertas por usuário ───────────────────────────────
-- Query mais frequente do dashboard: faturas abertas do usuário.
-- Partial index cobre só o status mais consultado.
CREATE INDEX IF NOT EXISTS idx_faturas_user_abertas
  ON faturas(user_id, ano, mes DESC)
  WHERE status = 'aberta';


-- ── parcelas: pendentes por vencimento ─────────────────────────
-- Tela /futuro: "quais parcelas vencem nos próximos X dias?"
-- Partial index elimina as pagas/atrasadas da varredura.
CREATE INDEX IF NOT EXISTS idx_parcelas_pendentes
  ON parcelas(user_id, data_vencimento)
  WHERE status = 'pendente';


-- ── transacoes: grupo de parcelas ──────────────────────────────
-- Query "buscar todas as parcelas do mesmo grupo" (campo novo).
-- Partial index só existe para transações que são parceladas.
CREATE INDEX IF NOT EXISTS idx_transacoes_grupo_parcela
  ON transacoes(grupo_parcela)
  WHERE grupo_parcela IS NOT NULL;


-- ── transacoes: não confirmadas ────────────────────────────────
-- Query do dashboard: "transações pendentes de confirmação".
CREATE INDEX IF NOT EXISTS idx_transacoes_nao_confirmadas
  ON transacoes(user_id, data DESC)
  WHERE confirmado = false;
