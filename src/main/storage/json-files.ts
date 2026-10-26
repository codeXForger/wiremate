import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { z } from 'zod'

/** Writes pretty JSON through a temp file and a rename, so a crash never leaves half a file behind. */
export async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${randomUUID()}.tmp`
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`)
  await rename(temp, path)
}

/** Reads and validates a JSON file; undefined when it is missing, unreadable or not valid. */
export async function readJson<T>(path: string, schema: z.ZodType<T>): Promise<T | undefined> {
  try {
    return schema.parse(JSON.parse(await readFile(path, 'utf8')))
  } catch {
    return undefined
  }
}

/** Reads every valid `*.json` file in a folder, skipping the rest. A missing folder reads as empty. */
export async function readJsonFolder<T>(folder: string, schema: z.ZodType<T>): Promise<T[]> {
  const names = await readdir(folder).catch(() => [])
  const files = names.filter((name) => name.endsWith('.json'))
  const parsed: (T | undefined)[] = await Promise.all(files.map((name) => readJson(join(folder, name), schema)))
  return parsed.filter((value) => value !== undefined)
}
