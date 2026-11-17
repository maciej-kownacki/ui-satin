/**
 * Radix moves focus from script on a pointer press: Tabs focus the tab on mousedown, menus
 * focus the row under the pointer and give focus back to their trigger when they close. Chrome
 * shows focus set from script as :focus-visible, so those drew the keyboard ring after a mouse
 * click. This notes the last input on <html>: `data-satin-pointer` after a pointer press,
 * removed by the next key. satin.css draws no ring on those elements while it is set.
 * Installed once, by the components that need it; nothing on the server.
 */
let installed = false

export function trackPointerModality() {
  if (installed || typeof document === 'undefined') return
  installed = true
  const root = document.documentElement
  document.addEventListener('pointerdown', () => root.setAttribute('data-satin-pointer', ''), true)
  document.addEventListener(
    'keydown',
    (e) => {
      // A shortcut with a modifier isn't moving focus around; Tab, arrows and the rest are.
      if (!e.metaKey && !e.ctrlKey && !e.altKey) root.removeAttribute('data-satin-pointer')
    },
    true,
  )
}
