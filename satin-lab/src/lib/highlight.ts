import { codeToHtml } from 'shiki'
import type { ShowcaseOption } from '../components/Showcase'

/** Highlights every option's code at build time, in both themes; CSS picks the one that matches <html>. */
export async function highlight(options: ShowcaseOption[]) {
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
