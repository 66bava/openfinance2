-- ================================================================
-- Migration: Admin panel + Pro upgrade + Avatar + Preferences
-- Execute no Supabase → SQL Editor
-- ================================================================

-- ── profiles: novas colunas ───────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notificacoes   BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS moeda          TEXT    DEFAULT 'BRL';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS idioma         TEXT    DEFAULT 'Português';


-- ── Storage: bucket de avatares ───────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "avatars_public_select"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_insert"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_update"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_delete"    ON storage.objects;

-- Qualquer pessoa pode ver avatares (URLs públicas)
CREATE POLICY "avatars_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Usuário só faz upload na própria pasta (userId/...)
CREATE POLICY "avatars_user_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );


-- ── RLS: admin pode ler/editar todos os profiles ──────────────
DROP POLICY IF EXISTS "Usuários veem apenas seus dados" ON profiles;
CREATE POLICY "Usuários veem apenas seus dados" ON profiles
  FOR ALL
  USING (
    (select auth.uid()) = id
    OR (select auth.jwt() ->> 'email') = 'pedrinhotwich@gmail.com'
  )
  WITH CHECK (
    (select auth.uid()) = id
    OR (select auth.jwt() ->> 'email') = 'pedrinhotwich@gmail.com'
  );

-- Admin pode ler todos os audit_logs
DROP POLICY IF EXISTS "Audit logs próprios" ON audit_logs;
CREATE POLICY "Audit logs próprios" ON audit_logs
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (select auth.jwt() ->> 'email') = 'pedrinhotwich@gmail.com'
  );


-- ── app_config: configurações do admin ───────────────────────
-- Adiciona número do WhatsApp (atualize com seu número real)
INSERT INTO app_config (chave, valor)
VALUES ('whatsapp_numero', '5511999999999')
ON CONFLICT (chave) DO NOTHING;


-- ── Constraint: termos de aceite ────────────────────────────
-- Garante que data_consentimento seja preenchida quando consentimento_politica = true
-- (soft constraint via check — não bloqueia dados existentes)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS chk_consentimento_data,
  ADD CONSTRAINT chk_consentimento_data
    CHECK (
      consentimento_politica IS NULL
      OR consentimento_politica = false
      OR data_consentimento IS NOT NULL
    );
