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

/** A piece of a template: plain text, or a `{{variable}}` placeholder. Offsets are into the whole template. */
export interface TemplateSegment {
  text: string
  start: number
  variable?: string
}

/** Splits text into plain runs and `{{placeholders}}`, in order, so they can be shown differently. */
export function templateSegments(text: string): TemplateSegment[] {
  const segments: TemplateSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), start: cursor })
    segments.push({ text: match[0], start: match.index, variable: match[1] })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), start: cursor })
  return segments
}

/** The placeholder that contains `offset` (edges included), if any. */
export function segmentAt(segments: TemplateSegment[], offset: number): TemplateSegment | undefined {
  return segments.find((s) => s.variable !== undefined && offset >= s.start && offset <= s.start + s.text.length)
}
