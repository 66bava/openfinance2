-- Add cargo column to profiles (null = regular, 'ceo' = founder, 'beta_tester' = beta user)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cargo TEXT DEFAULT NULL;

-- Update plano check constraint to include 'beta'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plano_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plano_check
  CHECK (plano IN ('free', 'beta', 'pro'));

-- Index for cargo-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_cargo ON profiles (cargo) WHERE cargo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_plano ON profiles (plano);
