-- Migration: campos adicionais do onboarding v2
-- Objetivo: armazenar objetivo/perfil financeiro no profiles sem quebrar RLS.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS objetivo_financeiro TEXT,
  ADD COLUMN IF NOT EXISTS perfil_financeiro TEXT;

