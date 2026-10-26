import type { HttpScripts } from '@shared/types/protocol'

export interface ScriptPhaseInfo {
  key: keyof HttpScripts
  label: string
  hint: string
}

export const SCRIPT_PHASES: ScriptPhaseInfo[] = [
  {
    key: 'pre',
    label: 'Pre-request',
    hint: 'Runs before sending. Change wm.request, or set wm.env values used in {{placeholders}}.'
  },
  {
    key: 'post',
    label: 'Post-response',
    hint: 'Runs after the response. Read wm.response, write wm.test(...) and save values with wm.env.set.'
  }
]

export function scriptCount(scripts: HttpScripts): number {
  return SCRIPT_PHASES.filter(({ key }) => scripts[key].trim() !== '').length
}
