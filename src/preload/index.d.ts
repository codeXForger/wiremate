import type { WireMateApi } from '../shared/ipc'

declare global {
  interface Window {
    wiremate?: WireMateApi
  }
}
