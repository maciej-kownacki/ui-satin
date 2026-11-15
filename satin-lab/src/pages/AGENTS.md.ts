import type { APIRoute } from 'astro'
import agents from '../../../packages/ui/AGENTS.md?raw'

/** /AGENTS.md: the rules for coding agents that use the package, the same file npm ships. */
export const GET: APIRoute = () => new Response(agents, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
