import type { APIRoute } from 'astro'

/** Search engines and agents may read every docs page; the internal comparison pages stay out. */
export const GET: APIRoute = ({ site }) =>
  new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /states/', 'Disallow: /preview/', 'Disallow: /playground/', 'Disallow: /film/', '', `Sitemap: ${new URL('/sitemap.xml', site)}`, ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
