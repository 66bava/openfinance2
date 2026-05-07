-- ─── Receitas Recorrentes ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receitas_recorrentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL CHECK (valor > 0),
  dia_do_mes SMALLINT NOT NULL CHECK (dia_do_mes BETWEEN 1 AND 28),
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receitas_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_receitas_recorrentes"
  ON receitas_recorrentes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_receitas_recorrentes_user_id ON receitas_recorrentes(user_id);

-- Função que processa receitas recorrentes do dia atual
-- Chamar via pg_cron diariamente ou via Edge Function
CREATE OR REPLACE FUNCTION processar_receitas_recorrentes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  today DATE := CURRENT_DATE;
  inserted INT := 0;
BEGIN
  FOR rec IN
    SELECT rr.*
    FROM receitas_recorrentes rr
    WHERE rr.ativo = TRUE
      AND EXTRACT(DAY FROM today) = rr.dia_do_mes
      AND NOT EXISTS (
        SELECT 1 FROM transacoes t
        WHERE t.user_id = rr.user_id
          AND t.data = today
          AND t.valor = rr.valor
          AND t.tipo = 'receita'
          AND t.descricao = rr.descricao
          AND (t.categoria_id = rr.categoria_id OR (t.categoria_id IS NULL AND rr.categoria_id IS NULL))
      )
  LOOP
    INSERT INTO transacoes (user_id, categoria_id, descricao, valor, tipo, data)
    VALUES (rec.user_id, rec.categoria_id, rec.descricao, rec.valor, 'receita', today);
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- ─── AI Reports Weekly Limit ──────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS relatorios_ia_semana INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS semana_ia_reset DATE;

-- RPC: verificar e incrementar contador de relatórios IA
-- Retorna: { success: bool, usado: int, limite: int, message?: text }
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

  -- Reset semanal se semana mudou
  IF perfil.semana_ia_reset IS NULL OR perfil.semana_ia_reset < semana_atual THEN
    UPDATE profiles
      SET relatorios_ia_semana = 0, semana_ia_reset = semana_atual
      WHERE id = p_user_id;
    usado_atual := 0;
  ELSE
    usado_atual := perfil.relatorios_ia_semana;
  END IF;

  -- Limite por plano: free=3, pro=7, familia=-1 (ilimitado)
  limite := CASE perfil.plano
    WHEN 'free'    THEN 3
    WHEN 'pro'     THEN 7
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

-- ─── Monthly Reset (Quinto dia útil) ─────────────────────────────────────────
-- Função auxiliar: retorna o quinto dia útil do mês atual
CREATE OR REPLACE FUNCTION quinto_dia_util_mes(p_ano INT, p_mes INT)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  d DATE;
  count_util INT := 0;
BEGIN
  d := make_date(p_ano, p_mes, 1);
  WHILE count_util < 5 LOOP
    IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
      count_util := count_util + 1;
    END IF;
    IF count_util < 5 THEN
      d := d + 1;
    END IF;
  END LOOP;
  RETURN d;
END;
$$;

-- Função: resetar contadores mensais (chamada via pg_cron no 5o dia útil)
CREATE OR REPLACE FUNCTION resetar_mes_automatico()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE profiles
    SET
      total_transacoes_mes = 0,
      total_gastos_mes = 0,
      total_receitas_mes = 0,
      saldo_mes = 0
    WHERE TRUE;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
