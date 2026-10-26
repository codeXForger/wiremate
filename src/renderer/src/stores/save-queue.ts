export const SAVE_DELAY_MS = 400

type Task = () => Promise<void>

interface Pending {
  timer: ReturnType<typeof setTimeout>
  task: Task
}

/** Debounced writes keyed by what they save, so a burst of edits to one request becomes one write. */
export class SaveQueue {
  private readonly pending = new Map<string, Pending>()

  public constructor(
    private readonly onError: (error: unknown) => void,
    /** How long a write waits for more edits. Tests raise it so writes happen only when they flush. */
    public delayMs = SAVE_DELAY_MS
  ) {}

  /** Replaces any write already waiting under the same key. */
  public schedule(key: string, task: Task): void {
    this.cancel(key)
    this.pending.set(key, { timer: setTimeout(() => void this.run(key), this.delayMs), task })
  }

  public isPending(key: string): boolean {
    return this.pending.has(key)
  }

  /** Writes everything that is waiting, now. */
  public async flush(): Promise<void> {
    await Promise.all([...this.pending.keys()].map((key) => this.run(key)))
  }

  /** Drops everything that is waiting, without writing it. */
  public clear(): void {
    ;[...this.pending.keys()].forEach((key) => this.cancel(key))
  }

  private cancel(key: string): void {
    clearTimeout(this.pending.get(key)?.timer)
    this.pending.delete(key)
  }

  private async run(key: string): Promise<void> {
    const entry = this.pending.get(key)
    if (!entry) return
    this.cancel(key)
    await entry.task().catch(this.onError)
  }
}
