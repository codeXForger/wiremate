import { runInNewContext } from 'node:vm'
import type { Evaluate } from '@shared/scripting/script-host'

export const SCRIPT_TIMEOUT_MS = 5000

/** Runs each script in a fresh vm context. The timeout stops synchronous loops; the worker stops the rest. */
export function createVmEvaluate(timeoutMs = SCRIPT_TIMEOUT_MS): Evaluate {
  return (code, globals): unknown =>
    runInNewContext(code, { ...globals, setTimeout, clearTimeout }, { timeout: timeoutMs }) as unknown
}
