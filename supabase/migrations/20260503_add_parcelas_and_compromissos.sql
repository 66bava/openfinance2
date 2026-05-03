-- Migration: Parcelas (installments) + Compromissos (fixed expenses)
-- Run this in your Supabase project → SQL Editor

-- 1. Add installment fields to transacoes
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS grupo_parcela uuid,
  ADD COLUMN IF NOT EXISTS parcela_atual integer,
  ADD COLUMN IF NOT EXISTS total_parcelas integer;

-- 2. Create compromissos table
CREATE TABLE IF NOT EXISTS compromissos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL,
  categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('financiamento', 'despesa_fixa', 'assinatura')),
  dia_vencimento integer NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  data_inicio date NOT NULL,
  data_fim date,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS on compromissos
ALTER TABLE compromissos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own compromissos"
  ON compromissos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
