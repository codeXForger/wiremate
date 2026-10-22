import { useState } from 'react'
import { services } from '@/services'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { validateWorkspaceInput, type WorkspaceInput, type WorkspaceInputErrors } from './workspace-schema'

const EMPTY: WorkspaceInput = { name: '', path: '' }

export interface WorkspaceForm {
  values: WorkspaceInput
  errors: WorkspaceInputErrors
  setField: (field: keyof WorkspaceInput, value: string) => void
  browse: () => Promise<void>
  submit: () => Promise<boolean>
}

export async function submitWorkspace(values: WorkspaceInput): Promise<WorkspaceInputErrors> {
  const errors = validateWorkspaceInput(values)
  if (Object.keys(errors).length > 0) return errors
  await useWorkspaceStore.getState().createWorkspace({ name: values.name.trim(), path: values.path.trim() })
  return {}
}

async function applyPickedFolder(setField: WorkspaceForm['setField']): Promise<void> {
  const path = await services.folderPicker.pick()
  if (path) setField('path', path)
}

export function useWorkspaceForm(): WorkspaceForm {
  const [values, setValues] = useState<WorkspaceInput>(EMPTY)
  const [errors, setErrors] = useState<WorkspaceInputErrors>({})
  const setField = (field: keyof WorkspaceInput, value: string): void =>
    setValues((prev) => ({ ...prev, [field]: value }))
  const browse = async (): Promise<void> => applyPickedFolder(setField)
  const submit = async (): Promise<boolean> => {
    const found = await submitWorkspace(values)
    setErrors(found)
    return Object.keys(found).length === 0
  }
  return { values, errors, setField, browse, submit }
}
