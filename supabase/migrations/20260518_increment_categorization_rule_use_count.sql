-- ================================================================
-- Migration: Incremento atômico de uso de regras de categorização
-- Função: public.increment_categorization_rule_use_count
-- Execute no Supabase -> SQL Editor
-- ================================================================

CREATE OR REPLACE FUNCTION public.increment_categorization_rule_use_count(
  p_user_id uuid,
  p_key text,
  p_tipo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Segurança: só permite incrementar a própria regra
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  UPDATE public.user_categorization_rules
     SET use_count = COALESCE(use_count, 0) + 1,
         last_used_at = now()
   WHERE user_id = p_user_id
     AND key = p_key
     AND (tipo IS NOT DISTINCT FROM p_tipo);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_categorization_rule_use_count(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_categorization_rule_use_count(uuid, text, text) TO authenticated;

