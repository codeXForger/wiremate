import type { Variables } from '../types/scripting'

const PLACEHOLDER = /\{\{\s*([\w.-]+)\s*\}\}/g

/** Replaces `{{name}}` with its variable. Unknown names stay as written and are added to `missing`. */
export function interpolate(text: string, variables: Variables, missing?: Set<string>): string {
  return text.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = variables[name]
    if (value !== undefined) return value
    missing?.add(name)
    return placeholder
  })
}
