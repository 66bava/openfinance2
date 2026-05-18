export type BankConnectionStatus = "connected" | "disconnected" | "pending" | "error"

export type BankInstitution = {
  id: string
  name: string
  brandColor?: string | null
  logoUrl?: string | null
}

export type BankConnection = {
  id: string
  userId: string
  institution: BankInstitution
  status: BankConnectionStatus
  createdAt: string
  updatedAt: string
  lastSyncAt?: string | null
}

