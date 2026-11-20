/**
 * satin-release: makes `astro build` safe to publish (uisatin.dev). One list decides what is
 * unfinished, `unreleased` in src/nav.ts; Satin Pro is docs-only.
 *
 * Which build is public:
 *   astro build                    public (what uisatin.dev serves)
 *   SATIN_PREVIEW=1 astro build    everything, for a preview deploy (also when VERCEL_ENV=preview)
 *   astro dev                      everything; SATIN_PUBLIC=1 astro dev shows the public site
 * It sets SATIN_PUBLIC=1 or 0 for the rest of the build; nav.ts reads it as `publicBuild`, and the
 * pages filter themselves with it (nav, sitemap, llms.txt, markdown twins, Code tabs, Installation).
 *
 * What only a build step can do, it does here, in the public build:
 * - An unreleased page is still a file in src/pages, so Astro routes it. Astro has no way to drop
 *   a file-based route, so its source (and its demo's, and its states page's) is swapped for an
 *   empty page before it compiles, its demo likewise, and the globs over every demo skip it: none
 *   of its code or text reaches the bundle. The empty HTML pages are deleted from dist once the
 *   build is done.
 * - public/r is copied verbatim, so the registry files of unreleased pages and of Satin Pro (its
 *   components, satin-pro-styles) are deleted from dist/r and registry.json is rewritten without
 *   them. The build fails if what's left points at a removed item or still carries Pro source.
 * - No sourcemaps, so no .tsx source of packages/ui-pro ships with the compiled demos.
 */
import { existsSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const EMPTY_PAGE = '---\n---\n'
const EMPTY_DEMO = 'export default function Unreleased() {\n  return null\n}\nexport const options = []\nexport const controls = []\n'

/** Every file under a folder. */
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))

export default function satinRelease() {
  let isPublic = false
  /** @type {Set<string>} */
  let unreleased = new Set()
  /** @type {Map<string, { href: string }>} */
  let pages = new Map()
  let publicR = ''

  return {
    name: 'satin-release',
    hooks: {
      'astro:config:setup': async ({ command, config, updateConfig, logger }) => {
        const preview = process.env.SATIN_PREVIEW === '1' || process.env.VERCEL_ENV === 'preview'
        isPublic = command === 'build' ? !preview : process.env.SATIN_PUBLIC === '1'
        process.env.SATIN_PUBLIC = isPublic ? '1' : '0'
        const nav = await import('../src/nav.ts')
        unreleased = nav.unreleased
        pages = new Map(nav.pagesOf(nav.allNav.flatMap((g) => g.items)).map((p) => [p.id, p]))
        for (const id of unreleased) if (!pages.has(id)) throw new Error(`nav.ts: unreleased lists "${id}", which is no page`)
        publicR = fileURLToPath(new URL('./r/', config.publicDir))
        if (command !== 'build') return
        logger.info(isPublic ? `public build: ${unreleased.size} unreleased pages left out, Satin Pro docs-only` : 'preview build: every page, Pro registry included')
        if (!isPublic) return

        const ids = [...unreleased].join('|')
        const unreleasedPage = new RegExp(`/src/pages/(components|ai-patterns|states)/(${ids})\\.astro$`)
        const unreleasedDemo = new RegExp(`/src/demos/(${ids})\\.tsx$`)
        updateConfig({
          vite: {
            build: { sourcemap: false },
            plugins: [
              {
                name: 'satin-release:unreleased',
                enforce: 'pre',
                // Before the file is read, so Astro compiles the empty page in its place.
                load(id) {
                  if (id.includes('?')) return
                  const file = id.split(sep).join('/')
                  if (unreleasedPage.test(file)) return EMPTY_PAGE
                  if (unreleasedDemo.test(file)) return EMPTY_DEMO
                },
                // The globs over every demo (the home page's card previews) skip the unreleased
                // ones, so the client gets no chunk for them, not even an empty one by their name.
                transform(code, id) {
                  if (!/\/src\/.*\.(tsx?|astro)$/.test(id.split('?')[0].split(sep).join('/')) || !code.includes("'../demos/*.tsx'")) return
                  const skip = [...unreleased].map((u) => `'!../demos/${u}.tsx'`).join(', ')
                  return { code: code.replace(/(import\.meta\.glob(?:<[^>]*>)?\()'\.\.\/demos\/\*\.tsx'\)/g, `$1['../demos/*.tsx', ${skip}])`), map: null }
                },
              },
            ],
          },
        })
      },

      'astro:build:done': async ({ dir, logger }) => {
        if (!isPublic) return
        const dist = fileURLToPath(dir)

        // The empty pages of unreleased routes, and the folders they leave.
        let pagesRemoved = 0
        for (const id of unreleased) {
          for (const href of [pages.get(id).href, `/states/${id}`]) {
            for (const file of [join(dist, href, 'index.html'), join(dist, `${href}.html`), join(dist, `${href}.md`)]) {
              if (!existsSync(file)) continue
              rmSync(file)
              pagesRemoved++
              try {
                rmdirSync(join(dist, href))
              } catch {
                // Not a folder of its own, or not empty.
              }
            }
          }
        }

        // The registry: no unreleased item, no Satin Pro item.
        const r = join(dist, 'r')
        const edition = (name) => {
          const file = join(publicR, `${name}.json`)
          return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).meta?.edition : undefined
        }
        const withheld = (name) => {
          const base = name.replace(/-demo$/, '')
          return unreleased.has(base) || base === 'satin-pro-styles' || edition(base) === 'pro'
        }
        let itemsRemoved = 0
        for (const f of readdirSync(r).filter((f) => f.endsWith('.json') && f !== 'registry.json')) {
          if (!withheld(f.replace(/\.json$/, ''))) continue
          rmSync(join(r, f))
          itemsRemoved++
        }
        const left = new Set(readdirSync(r).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')))
        const index = JSON.parse(readFileSync(join(r, 'registry.json'), 'utf8'))
        index.items = index.items.filter((i) => left.has(i.name))
        writeFileSync(join(r, 'registry.json'), JSON.stringify(index, null, 2) + '\n')

        // What's left must stand on its own and hold nothing of Satin Pro.
        const problems = []
        for (const name of left) {
          const text = readFileSync(join(r, `${name}.json`), 'utf8')
          if (/"edition": "pro"|@uisatin\/pro|satin-pro-styles/.test(text)) problems.push(`r/${name}.json mentions Satin Pro`)
          if (name === 'registry') continue
          for (const dep of JSON.parse(text).registryDependencies ?? []) {
            const n = dep.replace(/^.*\/r\//, '').replace(/\.json$/, '')
            if (!left.has(n)) problems.push(`r/${name}.json depends on ${n}, which this build doesn't publish`)
          }
        }
        const maps = walk(dist).filter((f) => f.endsWith('.map'))
        for (const m of maps) problems.push(`${relative(dist, m)}: a sourcemap`)
        if (problems.length) throw new Error(`satin-release: the public build isn't safe to publish:\n  ${problems.join('\n  ')}`)

        logger.info(`removed ${pagesRemoved} unreleased pages and ${itemsRemoved} registry items; ${index.items.length} items in r/registry.json`)
      },
    },
  }
}
