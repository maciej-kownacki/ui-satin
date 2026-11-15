import type { APIRoute, GetStaticPaths } from 'astro'
import { componentMarkdown, componentPages } from '../../lib/markdown'

/** /components/<name>.md: the page as markdown for agents (lib/markdown.ts). */
export const getStaticPaths: GetStaticPaths = () =>
  componentPages.filter((p) => p.href.startsWith('/components/')).map((p) => ({ params: { name: p.href.split('/').pop() }, props: { page: p } }))

export const GET: APIRoute = async ({ props }) =>
  new Response(await componentMarkdown(props.page), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
