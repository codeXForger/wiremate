import type { AuthType, HttpConfig } from '@shared/types/protocol'

export type HttpAuth = HttpConfig['auth']

export interface CredentialField {
  key: Exclude<keyof HttpAuth, 'type'>
  label: string
  secret?: boolean
}

export const AUTH_TYPES: readonly AuthType[] = ['none', 'bearer', 'basic']

export const AUTH_FIELDS: Record<AuthType, CredentialField[]> = {
  none: [],
  bearer: [{ key: 'token', label: 'Token', secret: true }],
  basic: [
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', secret: true }
  ]
}
