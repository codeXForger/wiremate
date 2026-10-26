import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/language/json/json.worker?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker'

const WORKERS: Record<string, new () => Worker> = { json: JsonWorker, javascript: TsWorker, typescript: TsWorker }

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    const SelectedWorker = WORKERS[label] ?? EditorWorker
    return new SelectedWorker()
  }
}

/** Autocomplete for the globals that request scripts see (see src/shared/scripting/script-session.ts). */
const SCRIPT_GLOBALS = `
interface WmHeaders {
  get(name: string): string | undefined
  has(name: string): boolean
  all(): Record<string, string>
}
interface WmRequestHeaders extends WmHeaders {
  set(name: string, value: string | number): void
  remove(name: string): void
}
/**
 * Query parameters of the request URL, decoded. Read them as params.page or params.get('page'). In the pre-request
 * script, assigning (params.page = 2), delete, set and remove rewrite the URL.
 */
interface WmParamMethods {
  get(name: string): string | undefined
  has(name: string): boolean
  all(): Record<string, string>
  set(name: string, value: string | number): void
  remove(name: string): void
}
type WmParams = WmParamMethods & { [name: string]: any }
interface WmMatchers {
  readonly not: WmMatchers
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toBeTruthy(): void
  toBeFalsy(): void
  toBeDefined(): void
  toBeNull(): void
  toBeTypeOf(type: 'string' | 'number' | 'boolean' | 'object' | 'undefined' | 'function'): void
  toBeOneOf(options: unknown[]): void
  toContain(item: unknown): void
  toHaveProperty(path: string, value?: unknown): void
  toHaveLength(length: number): void
  toMatch(pattern: RegExp | string): void
  toBeGreaterThan(limit: number): void
  toBeLessThan(limit: number): void
}
declare const wm: {
  /** 'pre' in the pre-request script, 'post' in the post-response script. */
  readonly phase: 'pre' | 'post'
  /** Variables of the active environment. Changes are saved when the request finishes. */
  env: {
    get(name: string): string | undefined
    set(name: string, value: unknown): void
    unset(name: string): void
    has(name: string): boolean
    all(): Record<string, string>
  }
  /**
   * The request being sent; in the post-response script, the one that was sent, with {{variables}} filled in.
   * In the pre-request script it can still be changed. console.log(wm.request) shows all of it.
   */
  request: { method: string; url: string; body: string | null; headers: WmRequestHeaders; params: WmParams }
  /** The response. Only defined in the post-response script. */
  response: {
    status: number
    statusText: string
    /** Total time in milliseconds. */
    time: number
    size: number
    headers: WmHeaders
    text(): string
    json(): any
  }
  /** Records a named test. It fails if the function throws or its promise rejects. */
  test(name: string, fn: () => unknown): void
  expect(actual: unknown): WmMatchers
}
`

monaco.typescript.javascriptDefaults.addExtraLib(SCRIPT_GLOBALS, 'ts:wiremate/wm.d.ts')

monaco.editor.defineTheme('wiremate-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: { 'editor.background': '#1b2030', 'editor.lineHighlightBackground': '#222838' }
})

loader.config({ monaco })
