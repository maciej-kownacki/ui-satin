/**
 * Runs before every test file in packages/ui and packages/ui-pro (test/vitest.ts): fills the
 * gaps between jsdom and a browser that Radix and Satin rely on, and resets the page after each
 * test so one test's theme, labels or media settings never leak into the next.
 */
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { matchMedia, resetMedia } from './media'

// React only treats updates as tests' own (no act() warnings) with this flag.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

window.matchMedia = matchMedia

// Radix measures with ResizeObserver; jsdom has no layout, so nothing ever resizes.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Radix Select and the menus scroll the highlighted row into view and capture the pointer.
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}

// The sliding pill (Tabs, SegmentedControl) cancels its running animations before it moves.
// jsdom has no layout, so every place is 0 and it never starts one.
Element.prototype.getAnimations ??= () => []

afterEach(() => {
  cleanup()
  resetMedia()
  const html = document.documentElement
  html.removeAttribute('data-theme')
  html.removeAttribute('dir')
  html.removeAttribute('data-satin-pointer')
  html.classList.remove('dark')
})
