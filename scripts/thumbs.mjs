/**
 * Previews for the All components page (satin-lab/src/pages/components/index.astro): a shot of
 * each component and AI pattern page's stage, as the page first shows it, in Light and Dark.
 *
 *   npm run build -w satin-lab && npx astro preview --root satin-lab --port 4341   # or any server
 *   BASE=http://localhost:4341 node scripts/thumbs.mjs [id …]                       # all when none
 *
 * Uses the Chrome installed on the machine (playwright-core, channel chrome). Writes
 * satin-lab/public/thumbs/<id>-light.webp and -dark.webp: the crop at 2× (at least 720px wide, twice
 * the card on a Retina screen), as lossless WebP, since lossy blurs small UI text. Run it again
 * when a component's demo changes.
 */
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE ?? 'http://localhost:4341'
const OUT = fileURLToPath(new URL('../satin-lab/public/thumbs/', import.meta.url))
mkdirSync(OUT, { recursive: true })

// The page list, read from the built sitemap's source of truth: the nav, through the dev API.
const { componentPages } = await import('../satin-lab/src/nav.ts').catch(() => ({}))
const pages = componentPages
  ? componentPages().map((p) => ({ id: p.id, href: p.href }))
  : await fetch(`${BASE}/sitemap.xml`)
      .then((r) => r.text())
      .then((xml) => [...xml.matchAll(/<loc>[^<]*?(\/(?:components|ai-patterns)\/[^<]+)<\/loc>/g)].map((m) => ({ id: m[1].split('/').pop(), href: m[1] })))
const only = process.argv.slice(2)
const todo = only.length ? pages.filter((p) => only.includes(p.id)) : pages

const browser = await chromium.launch({ channel: 'chrome', headless: true })
for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: 'reduce' })
  await context.addInitScript((t) => localStorage.setItem('satin-theme', t), theme)
  const page = await context.newPage()
  for (const p of todo) {
    await page.goto(BASE + p.href, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    // The options switcher at the bottom of the stage belongs to the docs, not the component.
    await page.addStyleTag({ content: '[role=tabpanel] > .absolute { display: none !important }' })
    await page.waitForTimeout(500)
    // The crop: what is actually drawn in the stage (text, fills, edges, shadows, images), with
    // room around it, widened to the card's 16:10 and never smaller than the card itself (so a
    // badge shows at its real size), inside the stage.
    const box = await page.evaluate(() => {
      const area = document.querySelector('[role=tabpanel]')?.firstElementChild
      if (!area) return null
      const a = area.getBoundingClientRect()
      let [l, t, r, b] = [Infinity, Infinity, -Infinity, -Infinity]
      const add = (q) => {
        if (q.width < 1 || q.height < 1) return
        l = Math.min(l, q.left), t = Math.min(t, q.top), r = Math.max(r, q.right), b = Math.max(b, q.bottom)
      }
      for (const el of area.querySelectorAll('*')) {
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || +cs.opacity === 0) continue
        const drawn =
          !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) ||
          parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) > 0 ||
          cs.boxShadow !== 'none' ||
          /^(svg|img|canvas|video|input|textarea)$/i.test(el.tagName) ||
          [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        if (drawn) add(el.getBoundingClientRect())
      }
      if (!isFinite(l)) return { x: a.x, y: a.y, width: a.width, height: a.height }
      const pad = 28
      let [w, h] = [r - l + pad * 2, b - t + pad * 2]
      w = Math.max(w, 360, h * 1.6)
      h = Math.max(h, 225, w / 1.6)
      const cx = (l + r) / 2, cy = (t + b) / 2
      const x0 = Math.max(a.left, Math.min(cx - w / 2, a.right - w))
      const y0 = Math.max(a.top, Math.min(cy - h / 2, a.bottom - h))
      return { x: x0, y: y0, width: Math.min(w, a.width), height: Math.min(h, a.height) }
    })
    if (!box) {
      console.warn(`${p.id}: no stage`)
      continue
    }
    const cdp = await context.newCDPSession(page)
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 2 } })
    await cdp.detach()
    writeFileSync(`${OUT}${p.id}-${theme}.webp`, await sharp(Buffer.from(data, 'base64')).webp({ lossless: true, effort: 6 }).toBuffer())
    process.stdout.write(`\r${theme} ${p.id.padEnd(24)}`)
  }
  await context.close()
}
await browser.close()
console.log(`\n${todo.length} pages → ${OUT}`)
