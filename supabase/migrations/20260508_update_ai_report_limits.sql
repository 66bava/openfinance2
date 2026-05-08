-- Atualiza limite semanal de relatórios IA: pro 7 → 10
-- free=3, pro=10, familia=ilimitado(-1)

CREATE OR REPLACE FUNCTION incrementar_relatorio_ia(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  perfil RECORD;
  semana_atual DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  limite INT;
  usado_atual INT;
BEGIN
  SELECT plano, relatorios_ia_semana, semana_ia_reset
  INTO perfil
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Perfil não encontrado');
  END IF;

  IF perfil.semana_ia_reset IS NULL OR perfil.semana_ia_reset < semana_atual THEN
    UPDATE profiles
      SET relatorios_ia_semana = 0, semana_ia_reset = semana_atual
      WHERE id = p_user_id;
    usado_atual := 0;
  ELSE
    usado_atual := perfil.relatorios_ia_semana;
  END IF;

  limite := CASE perfil.plano
    WHEN 'free'    THEN 3
    WHEN 'pro'     THEN 10
    WHEN 'familia' THEN -1
    ELSE 3
  END;

  IF limite >= 0 AND usado_atual >= limite THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Limite semanal de análises IA atingido',
      'usado', usado_atual,
      'limite', limite
    );
  END IF;

  UPDATE profiles
    SET relatorios_ia_semana = usado_atual + 1
    WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'usado', usado_atual + 1,
    'limite', limite
  );
END;
$$;
