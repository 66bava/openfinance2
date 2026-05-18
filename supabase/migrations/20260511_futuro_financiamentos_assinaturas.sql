-- Migration: Futuro (financiamentos) + Assinaturas (campos financeiros)
-- Execute no Supabase → SQL Editor

-- ================================================================
-- 1) ASSINATURAS: campos para virar despesa recorrente real
-- ================================================================

ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS categoria_financeira_id uuid REFERENCES categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metodo_pagamento text,
  ADD COLUMN IF NOT EXISTS dia_cobranca integer;

ALTER TABLE assinaturas
  DROP CONSTRAINT IF EXISTS chk_assinaturas_dia_cobranca,
  ADD CONSTRAINT chk_assinaturas_dia_cobranca
    CHECK (dia_cobranca IS NULL OR (dia_cobranca BETWEEN 1 AND 31));

CREATE INDEX IF NOT EXISTS assinaturas_categoria_financeira_id_idx
  ON assinaturas(categoria_financeira_id);

-- ================================================================
-- 2) COMPROMISSOS: focar em FINANCIAMENTOS (mais completo)
-- ================================================================

ALTER TABLE compromissos
  ADD COLUMN IF NOT EXISTS financiamento_tipo text,
  ADD COLUMN IF NOT EXISTS valor_total_financiado numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_entrada numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_parcela numeric(14,2),
  ADD COLUMN IF NOT EXISTS parcelas_total integer,
  ADD COLUMN IF NOT EXISTS parcelas_pagas integer,
  ADD COLUMN IF NOT EXISTS metodo_pagamento text,
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE compromissos
  DROP CONSTRAINT IF EXISTS chk_financiamento_tipo,
  ADD CONSTRAINT chk_financiamento_tipo
    CHECK (
      financiamento_tipo IS NULL OR financiamento_tipo IN ('carro','casa','apartamento','moto','outro')
    );

ALTER TABLE compromissos
  DROP CONSTRAINT IF EXISTS chk_financiamento_parcelas_total,
  ADD CONSTRAINT chk_financiamento_parcelas_total
    CHECK (parcelas_total IS NULL OR parcelas_total >= 1);

ALTER TABLE compromissos
  DROP CONSTRAINT IF EXISTS chk_financiamento_parcelas_pagas,
  ADD CONSTRAINT chk_financiamento_parcelas_pagas
    CHECK (
      parcelas_pagas IS NULL
      OR (parcelas_total IS NULL AND parcelas_pagas >= 0)
      OR (parcelas_total IS NOT NULL AND parcelas_pagas BETWEEN 0 AND parcelas_total)
    );

-- ================================================================
-- 3) MIGRAÇÃO: "assinatura" do compromissos → assinaturas
--    (mantém dados do usuário e evita duplicação; contas fixas continuam em `compromissos`)
-- ================================================================

INSERT INTO assinaturas (
  user_id,
  nome,
  valor,
  recorrencia,
  categoria_financeira_id,
  metodo_pagamento,
  dia_cobranca,
  proximo_pagamento,
  renovacao_automatica,
  ativo,
  observacoes
)
SELECT
  c.user_id,
  c.descricao,
  c.valor,
  'mensal',
  c.categoria_id,
  c.metodo_pagamento,
  c.dia_vencimento,
  c.data_inicio,
  true,
  true,
  COALESCE(NULLIF(c.observacoes, ''), '') ||
  CASE
    WHEN COALESCE(NULLIF(c.observacoes, ''), '') <> '' THEN E'\n\n'
    ELSE ''
  END ||
  'Migrado do planejamento futuro (' || c.tipo || ').'
FROM compromissos c
WHERE c.ativo = true
  AND c.tipo IN ('assinatura')
  AND NOT EXISTS (
    SELECT 1
    FROM assinaturas a
    WHERE a.user_id = c.user_id
      AND a.ativo = true
      AND a.nome = c.descricao
      AND a.valor = c.valor
  );

UPDATE compromissos
  SET ativo = false
WHERE ativo = true
  AND tipo IN ('assinatura');

-- Opcional (não destrutivo): normaliza valor_parcela para financiamentos legados
UPDATE compromissos
  SET valor_parcela = COALESCE(valor_parcela, valor)
WHERE tipo = 'financiamento'
  AND ativo = true;

-- ================================================================
-- 4) NOTA DE COMPATIBILIDADE
-- ------------------------------------------------
-- Não apertamos o CHECK de `compromissos.tipo` aqui, pois pode existir
-- histórico legado (ex.: tipos antigos) e um CHECK mais restritivo falharia
-- mesmo com `ativo=false`. A remoção do tipo "despesa_fixa" é feita no app
-- (UI/validação) + migração acima.
-- ================================================================
