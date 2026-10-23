import type { ScriptOutcome, ScriptRun } from '../types/scripting'
import { ScriptSession } from './script-session'

/** Runs code with the given globals. Main uses `node:vm`; nothing here depends on how. */
export type Evaluate = (code: string, globals: Record<string, unknown>) => unknown

/** Wraps the script in an async function so it can use `await` and `return` at the top level. */
export function wrapScript(code: string): string {
  return `(async () => {\n${code}\n})()`
}

export function isBlankScript(code: string): boolean {
  return code.trim() === ''
}

export async function executeScript(run: ScriptRun, evaluate: Evaluate): Promise<ScriptOutcome> {
  const session = new ScriptSession(run)
  if (isBlankScript(run.code)) return session.finish()
  try {
    await evaluate(wrapScript(run.code), session.globals())
    return await session.finish()
  } catch (error) {
    return session.finish(error)
  }
}
