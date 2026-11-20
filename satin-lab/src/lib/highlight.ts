import { codeToHtml } from 'shiki'
import type { ShowcaseOption } from '../components/Showcase'
import { hideProSource } from '../nav'

/**
 * Highlights every option's code at build time, in both themes; CSS picks the one that matches <html>.
 * In the public build a demo that uses Satin Pro gets no code at all, so its Showcase has no Code
 * tab: Pro is docs-only there (nav.ts, hideProSource).
 */
export async function highlight(options: ShowcaseOption[]) {
  if (hideProSource && options.some((o) => o.code.includes('@uisatin/pro'))) return {} as Record<string, string>
  const entries = await Promise.all(
    options.map(async (o) => [
      o.id,
      await codeToHtml(o.code, {
        lang: 'tsx',
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      }),
    ]),
  )
  return Object.fromEntries(entries) as Record<string, string>
}
