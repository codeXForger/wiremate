export const IpcChannel = {
  selectFolder: 'dialog:select-folder'
} as const

export interface WireMateApi {
  readonly platform: string
  selectFolder(): Promise<string | null>
}
