import { describe, expect, it } from 'vitest'
import { validateWorkspaceInput } from './workspace-schema'

describe('validateWorkspaceInput', () => {
  it('accepts a name and a folder', () => {
    expect(validateWorkspaceInput({ name: 'API', path: '/work/api' })).toEqual({})
  })

  it('reports each missing field', () => {
    expect(validateWorkspaceInput({ name: '  ', path: '' })).toEqual({
      name: 'Give the workspace a name',
      path: 'Choose a folder to store the workspace in'
    })
  })
})
