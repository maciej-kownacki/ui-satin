import type { APIRoute } from 'astro'
import agents from '../../../packages/ui/AGENTS.md?raw'

/**
 * /AGENTS.md: the rules for coding agents that use the package, the same file npm ships: without
 * its sections for work on the repo ("## Testing (repo only)"), as packages/ui/build/manifest.mjs
 * leaves them out.
 */
const forApps = agents.replace(/\n## [^\n]*\(repo only\)[\s\S]*?(?=\n## |$)/g, '').trimEnd() + '\n'

export const GET: APIRoute = () => new Response(forApps, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
