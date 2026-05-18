-- WhatsApp Integration: phone number mapping + pending confirmations

CREATE TABLE IF NOT EXISTS whatsapp_users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number  TEXT NOT NULL,
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id),
  UNIQUE (phone_number)
);

ALTER TABLE whatsapp_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own WhatsApp link"
  ON whatsapp_users FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pending confirmations (auto-expire after 10 minutes)
CREATE TABLE IF NOT EXISTS whatsapp_pending (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number  TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

ALTER TABLE whatsapp_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pending"
  ON whatsapp_pending FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_whatsapp_pending_user_status
  ON whatsapp_pending (user_id, status, created_at DESC);
