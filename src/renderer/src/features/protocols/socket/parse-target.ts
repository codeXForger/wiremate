export function formatTarget({ host, port }: { host: string; port: number }): string {
  return `${host}:${port}`
}

/** Accepts only whole port numbers in the valid range; anything else becomes 0 (unset). */
export function parsePort(value: string): number {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 0
}
