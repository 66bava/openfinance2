export const CURRENT_TERMS_VERSION = "1.0"

export function needsTermsAcceptance(profile: { consentimento_politica?: boolean | null; versao_termos_aceita?: string | null } | null) {
  if (!profile) return false

  // Compatibilidade: em bancos antigos, a coluna `versao_termos_aceita` pode ainda nÃ£o existir.
  // Nesse caso, nÃ£o podemos exigir versionamento e usamos apenas `consentimento_politica`.
  const hasVersionField = Object.prototype.hasOwnProperty.call(profile, "versao_termos_aceita")
  if (!hasVersionField) {
    return profile.consentimento_politica !== true
  }

  if (profile.consentimento_politica !== true) return true
  if (!profile.versao_termos_aceita) return true
  return profile.versao_termos_aceita !== CURRENT_TERMS_VERSION
}
