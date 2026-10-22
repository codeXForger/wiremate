export interface FolderPicker {
  pick(): Promise<string | null>
}

/** Uses the native dialog exposed by the preload bridge; returns null outside Electron. */
export class NativeFolderPicker implements FolderPicker {
  public pick(): Promise<string | null> {
    return window.wiremate?.selectFolder() ?? Promise.resolve(null)
  }
}
