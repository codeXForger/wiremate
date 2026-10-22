import { OptionSelect } from '../../request/components/OptionSelect'
import { TextField } from '../../request/components/TextField'
import { useConfigBinder } from '../../request/use-field-binder'
import type { EditorProps } from '../types'
import { AUTH_FIELDS, AUTH_TYPES, type HttpAuth } from './auth-fields'

type PatchAuth = (change: Partial<HttpAuth>) => void

export function AuthPanel({ requestId }: EditorProps) {
  const { value: auth, onChange } = useConfigBinder<'http', HttpAuth>(requestId)('auth')
  const patch: PatchAuth = (change) => onChange({ ...auth, ...change })
  const setType = (type: HttpAuth['type']): void => patch({ type })
  return (
    <div className="flex max-w-md flex-col gap-3 p-3">
      <OptionSelect label="Auth type" className="w-32" options={AUTH_TYPES} value={auth.type} onChange={setType} />
      <CredentialFields auth={auth} patch={patch} />
    </div>
  )
}

function CredentialFields({ auth, patch }: { auth: HttpAuth; patch: PatchAuth }) {
  return AUTH_FIELDS[auth.type].map(({ key, label, secret }) => (
    <TextField
      key={key}
      id={`auth-${key}`}
      label={label}
      type={secret ? 'password' : 'text'}
      value={auth[key]}
      onChange={(value) => patch({ [key]: value })}
    />
  ))
}
