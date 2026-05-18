-- Migration: Limite semanal do Conselheiro IA (reset todo domingo às 13h)
-- Execute no Supabase → SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS conselheiro_ia_usos_semana INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conselheiro_ia_reset_at TIMESTAMPTZ;

-- RPC: verifica, reseta (se necessário) e incrementa o uso do Conselheiro IA.
-- Retorna: { success: bool, usado: int, limite: int, reset_at: timestamptz, message?: text }
CREATE OR REPLACE FUNCTION incrementar_conselheiro_ia(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  perfil RECORD;
  limite INT;
  usado_atual INT;
  now_local TIMESTAMP;
  reset_local TIMESTAMP;
  reset_at_utc TIMESTAMPTZ;
  dow INT;
BEGIN
  SELECT plano, conselheiro_ia_usos_semana, conselheiro_ia_reset_at
  INTO perfil
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Perfil não encontrado');
  END IF;

  -- Limite por plano (pode ajustar depois): free=5, pro=30, familia=-1 (ilimitado)
  limite := CASE perfil.plano
    WHEN 'free'    THEN 5
    WHEN 'pro'     THEN 30
    WHEN 'beta'    THEN 30
    WHEN 'familia' THEN -1
    ELSE 5
  END;

  -- "Agora" em horário de São Paulo (timestamp sem tz)
  now_local := timezone('America/Sao_Paulo', now());

  -- Calcula o próximo domingo 13:00 (local)
  dow := EXTRACT(DOW FROM now_local)::INT; -- domingo=0
  reset_local := date_trunc('day', now_local) + make_interval(hours => 13);
  IF dow = 0 THEN
    IF now_local >= reset_local THEN
      reset_local := reset_local + make_interval(days => 7);
    END IF;
  ELSE
    reset_local := reset_local + make_interval(days => (7 - dow));
  END IF;

  -- Converte para UTC (timestamptz)
  reset_at_utc := reset_local AT TIME ZONE 'America/Sao_Paulo';

  -- Reset se ainda não existe reset_at ou já passou do reset_at salvo
  IF perfil.conselheiro_ia_reset_at IS NULL OR now() >= perfil.conselheiro_ia_reset_at THEN
    UPDATE profiles
      SET conselheiro_ia_usos_semana = 0,
          conselheiro_ia_reset_at = reset_at_utc
      WHERE id = p_user_id;
    usado_atual := 0;
  ELSE
    usado_atual := perfil.conselheiro_ia_usos_semana;
    -- Mantém o reset_at existente (não recalcula) para consistência
    reset_at_utc := perfil.conselheiro_ia_reset_at;
  END IF;

  IF limite >= 0 AND usado_atual >= limite THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Limite semanal de usos do Conselheiro IA atingido',
      'usado', usado_atual,
      'limite', limite,
      'reset_at', reset_at_utc
    );
  END IF;

  UPDATE profiles
    SET conselheiro_ia_usos_semana = usado_atual + 1
    WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'usado', usado_atual + 1,
    'limite', limite,
    'reset_at', reset_at_utc
  );
END;
$$;

-- RPC: consulta status sem incrementar
CREATE OR REPLACE FUNCTION consultar_conselheiro_ia(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  perfil RECORD;
  limite INT;
  now_local TIMESTAMP;
  reset_local TIMESTAMP;
  reset_at_utc TIMESTAMPTZ;
  dow INT;
  usado_atual INT;
BEGIN
  SELECT plano, conselheiro_ia_usos_semana, conselheiro_ia_reset_at
  INTO perfil
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Perfil não encontrado');
  END IF;

  limite := CASE perfil.plano
    WHEN 'free'    THEN 5
    WHEN 'pro'     THEN 30
    WHEN 'beta'    THEN 30
    WHEN 'familia' THEN -1
    ELSE 5
  END;

  now_local := timezone('America/Sao_Paulo', now());
  dow := EXTRACT(DOW FROM now_local)::INT;
  reset_local := date_trunc('day', now_local) + make_interval(hours => 13);
  IF dow = 0 THEN
    IF now_local >= reset_local THEN
      reset_local := reset_local + make_interval(days => 7);
    END IF;
  ELSE
    reset_local := reset_local + make_interval(days => (7 - dow));
  END IF;
  reset_at_utc := reset_local AT TIME ZONE 'America/Sao_Paulo';

  usado_atual := perfil.conselheiro_ia_usos_semana;

  -- Se já passou do reset_at, o usuário "tem" usado=0 (sem forçar update)
  IF perfil.conselheiro_ia_reset_at IS NULL OR now() >= perfil.conselheiro_ia_reset_at THEN
    usado_atual := 0;
  ELSE
    reset_at_utc := perfil.conselheiro_ia_reset_at;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'usado', usado_atual,
    'limite', limite,
    'reset_at', reset_at_utc
  );
END;
$$;

