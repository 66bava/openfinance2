-- Migration: Aceite de termos (1x) + versionamento
-- Execute no Supabase -> SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS versao_politica text,
  ADD COLUMN IF NOT EXISTS versao_termos_aceita text,
  ADD COLUMN IF NOT EXISTS data_aceite_termos timestamptz;

-- Helper: tenta converter texto em timestamptz sem quebrar a migration
CREATE OR REPLACE FUNCTION public.try_timestamptz(p_text text)
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  v timestamptz;
  t text;
BEGIN
  IF p_text IS NULL THEN
    RETURN NULL;
  END IF;

  t := btrim(p_text);
  IF t = '' OR t = '""' THEN
    RETURN NULL;
  END IF;

  BEGIN
    v := t::timestamptz;
    RETURN v;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

-- Backfill: se ja aceitou a politica, considera que aceitou os termos da versao atual (default 1.0)
UPDATE profiles
  SET
    versao_termos_aceita = COALESCE(versao_termos_aceita, versao_politica, '1.0'),
    data_aceite_termos = COALESCE(data_aceite_termos, public.try_timestamptz(data_consentimento::text), now())
WHERE consentimento_politica = true
  AND versao_termos_aceita IS NULL;

