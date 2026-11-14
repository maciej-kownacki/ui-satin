import type { APIRoute } from 'astro'
import { nav, pagesOf } from '../nav'

/** Every page in the sidebar, nothing else: the nav is the list of public pages. */
export const GET: APIRoute = ({ site }) => {
  const urls = [...new Set(nav.flatMap((g) => pagesOf(g.items)).map((p) => p.href))]
  const body = urls.map((href) => `  <url><loc>${new URL(href, site)}</loc></url>`).join('\n')
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
