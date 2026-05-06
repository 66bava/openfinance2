-- ============================================================
-- Plano Família: tabelas, RLS e constraint atualizada
-- Aplicar no Supabase SQL Editor
-- ============================================================

-- 1. Adiciona 'familia' aos planos permitidos
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plano_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plano_check
  CHECK (plano IN ('free', 'beta', 'pro', 'familia'));

-- 2. Grupos familiares (um por admin)
CREATE TABLE IF NOT EXISTS familia_grupos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome       TEXT NOT NULL DEFAULT 'Nossa Família',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- 3. Membros / convites (até 3 por grupo, excluindo admin)
CREATE TABLE IF NOT EXISTS familia_membros (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id   UUID REFERENCES familia_grupos(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status     TEXT CHECK (status IN ('pendente', 'aceito', 'rejeitado')) DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grupo_id, user_id)
);

-- Um usuário só pode ter 1 membership ativa (pendente ou aceita) por vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_familia_membros_active
  ON familia_membros(user_id)
  WHERE status IN ('pendente', 'aceito');

-- 4. Habilita RLS
ALTER TABLE familia_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE familia_membros ENABLE ROW LEVEL SECURITY;

-- 5. Políticas familia_grupos
CREATE POLICY "fg_admin_all" ON familia_grupos
  FOR ALL USING (auth.uid() = admin_id);

CREATE POLICY "fg_member_select" ON familia_grupos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM familia_membros
      WHERE grupo_id = familia_grupos.id
        AND user_id = auth.uid()
        AND status IN ('aceito', 'pendente')
    )
  );

-- 6. Políticas familia_membros
CREATE POLICY "fm_admin_all" ON familia_membros
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM familia_grupos
      WHERE id = familia_membros.grupo_id AND admin_id = auth.uid()
    )
  );

CREATE POLICY "fm_self_select" ON familia_membros
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "fm_self_update" ON familia_membros
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('aceito', 'rejeitado'));

CREATE POLICY "fm_group_select" ON familia_membros
  FOR SELECT USING (
    grupo_id IN (
      SELECT grupo_id FROM familia_membros
      WHERE user_id = auth.uid() AND status = 'aceito'
    )
  );

-- 7. Profiles: leitura por usuários autenticados (busca de email para convite)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_authenticated_read'
  ) THEN
    CREATE POLICY "profiles_authenticated_read" ON profiles
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
