import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  if (typeof window !== 'undefined') delete window.wiremate
})

class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

function stubDom(): void {
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
}

// Main-process tests run in the node environment, which has no DOM to stub.
if (typeof window !== 'undefined') stubDom()
