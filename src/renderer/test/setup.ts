import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub
Element.prototype.scrollIntoView ??= function scrollIntoView(): void {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= function releasePointerCapture(): void {}
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false
  }) as MediaQueryList
