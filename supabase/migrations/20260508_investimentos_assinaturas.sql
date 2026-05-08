-- Migration: Investimentos + Assinaturas
-- Run this in your Supabase project → SQL Editor

-- ─── INVESTIMENTOS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS investimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL,
  categoria_investimento text NOT NULL DEFAULT 'renda_fixa',
  corretora text,
  corretora_personalizada text,
  valor_aporte numeric(14,2) NOT NULL DEFAULT 0,
  aporte_recorrente boolean NOT NULL DEFAULT false,
  recorrencia text CHECK (recorrencia IN ('semanal','quinzenal','mensal','anual')),
  rentabilidade numeric(10,4),
  rentabilidade_tipo text NOT NULL DEFAULT 'percent' CHECK (rentabilidade_tipo IN ('percent','reais')),
  data_investimento date NOT NULL DEFAULT CURRENT_DATE,
  vencimento date,
  observacoes text,
  risco text NOT NULL DEFAULT 'moderado' CHECK (risco IN ('baixo','moderado','alto')),
  liquidez text NOT NULL DEFAULT 'media' CHECK (liquidez IN ('diaria','curto','media','longo')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investimentos"
  ON investimentos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS investimentos_user_id_idx ON investimentos(user_id);
CREATE INDEX IF NOT EXISTS investimentos_ativo_idx ON investimentos(user_id, ativo);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_investimentos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER investimentos_updated_at
  BEFORE UPDATE ON investimentos
  FOR EACH ROW EXECUTE FUNCTION update_investimentos_updated_at();

-- ─── ASSINATURAS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  recorrencia text NOT NULL DEFAULT 'mensal' CHECK (recorrencia IN ('semanal','quinzenal','mensal','bimestral','trimestral','semestral','anual')),
  categoria text,
  proximo_pagamento date,
  renovacao_automatica boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  icone text,
  cor text DEFAULT '#16A34A',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own assinaturas"
  ON assinaturas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS assinaturas_user_id_idx ON assinaturas(user_id);
CREATE INDEX IF NOT EXISTS assinaturas_ativo_idx ON assinaturas(user_id, ativo);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_assinaturas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER assinaturas_updated_at
  BEFORE UPDATE ON assinaturas
  FOR EACH ROW EXECUTE FUNCTION update_assinaturas_updated_at();
