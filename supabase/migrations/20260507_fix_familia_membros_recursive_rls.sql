-- Fix: política fm_group_select causava recursão infinita (HTTP 500)
-- O problema: a policy consultava familia_membros dentro de uma policy de familia_membros
-- A solução: função SECURITY DEFINER que burla o RLS internamente, sem recursão

-- 1. Remove a policy recursiva
DROP POLICY IF EXISTS "fm_group_select" ON familia_membros;

-- 2. Cria função helper que roda sem RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION auth_user_familia_grupo_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT grupo_id
  FROM familia_membros
  WHERE user_id = auth.uid()
    AND status = 'aceito'
  LIMIT 1
$$;

-- 3. Recria a policy usando a função — sem recursão
CREATE POLICY "fm_group_select" ON familia_membros
  FOR SELECT USING (
    grupo_id = auth_user_familia_grupo_id()
  );
