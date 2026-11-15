import type { APIRoute } from 'astro'
import { llmsText } from './llms.txt'
import { componentMarkdown, componentPages } from '../lib/markdown'

/** llms-full.txt: llms.txt, then every component page in markdown, one after another. */
export const GET: APIRoute = async ({ site }) => {
  const pages = await Promise.all(componentPages.map((p) => componentMarkdown(p)))
  const text = `${llmsText(site)}\n${pages.map((p) => `---\n\n${p}`).join('\n')}`
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
