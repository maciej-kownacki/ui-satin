/**
 * client:near (integrations/near.mjs): hydrates an island once it is within a margin of its own
 * scroller's view. While the page first loads, one not yet in view waits until the page has
 * loaded and been idle once (1.5 s at most), so it doesn't compete with those on screen; after
 * that, islands coming near hydrate at once.
 * @type {import('astro').ClientDirective}
 */
const firstIdle = new Promise((resolve) => {
  const idle = () => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => resolve(), { timeout: 1500 }) : setTimeout(resolve))
  if (document.readyState === 'complete') idle()
  else addEventListener('load', idle, { once: true })
})

export default (load, opts, el) => {
  let root = el.parentElement
  while (root && root !== document.body && !/auto|scroll/.test(getComputedStyle(root).overflowY)) root = root.parentElement
  if (root === document.body) root = null
  const hydrate = async () => (await load())()
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries.find((x) => x.isIntersecting)
      if (!e) return
      io.disconnect()
      const view = root ? root.getBoundingClientRect() : { top: 0, bottom: innerHeight }
      const inView = e.boundingClientRect.top < view.bottom && e.boundingClientRect.bottom > view.top
      if (inView) hydrate()
      else firstIdle.then(hydrate)
    },
    { root, rootMargin: typeof opts.value === 'string' && opts.value ? opts.value : '100% 0px' },
  )
  // An island is display: contents, so watch what it renders instead (as client:visible does).
  for (const child of el.children) io.observe(child)
}
