-- ================================================================
-- Migration: Constraints de segurança server-side
-- Execute no Supabase → SQL Editor
-- ================================================================

-- Limita parcelamento a no máximo 48x (4 anos)
-- Impede que dados malformados entrem via API mesmo se o frontend falhar
ALTER TABLE transacoes
  DROP CONSTRAINT IF EXISTS chk_total_parcelas_max,
  ADD CONSTRAINT chk_total_parcelas_max
    CHECK (total_parcelas IS NULL OR (total_parcelas >= 1 AND total_parcelas <= 48));

ALTER TABLE transacoes
  DROP CONSTRAINT IF EXISTS chk_parcela_atual_range,
  ADD CONSTRAINT chk_parcela_atual_range
    CHECK (parcela_atual IS NULL OR (parcela_atual >= 1 AND parcela_atual <= total_parcelas));

-- Valor de transação deve ser positivo
ALTER TABLE transacoes
  DROP CONSTRAINT IF EXISTS chk_valor_positivo,
  ADD CONSTRAINT chk_valor_positivo
    CHECK (valor > 0);

-- Valor de compromisso deve ser positivo
ALTER TABLE compromissos
  DROP CONSTRAINT IF EXISTS chk_compromisso_valor_positivo,
  ADD CONSTRAINT chk_compromisso_valor_positivo
    CHECK (valor > 0);

-- Dia de vencimento entre 1 e 31
ALTER TABLE compromissos
  DROP CONSTRAINT IF EXISTS chk_dia_vencimento,
  ADD CONSTRAINT chk_dia_vencimento
    CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31);

-- Valor pago não pode exceder valor total da fatura
ALTER TABLE faturas
  DROP CONSTRAINT IF EXISTS chk_valor_pago_max,
  ADD CONSTRAINT chk_valor_pago_max
    CHECK (valor_pago >= 0 AND valor_pago <= valor_total);
