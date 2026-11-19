/**
 * The last steps of a Satin package build, shared by Satin Free (build/manifest.mjs) and Satin
 * Pro (packages/ui-pro/build/manifest.mjs): they run on the package's dist folder after tsup and
 * tsc have written it.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const declarations = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const path = join(dir, f)
    return statSync(path).isDirectory() ? declarations(path) : f.endsWith('.d.ts') ? [path] : []
  })

/**
 * tsc writes relative imports in the .d.ts files as they are in the source ('./button'). Under
 * moduleResolution node16 / nodenext an ES module's imports need their extension, so point each
 * one at the file it means: './button' → './button.js', a folder like './theme' → './theme/index.js'.
 * Bundler resolution reads the same files and keeps working. Returns how many it rewrote.
 */
export function addDeclarationExtensions(dist) {
  let rewritten = 0
  for (const file of declarations(dist)) {
    const src = readFileSync(file, 'utf8')
    const out = src.replace(/((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, (match, lead, quote, spec) => {
      if (/\.(js|mjs|cjs|json|css)$/.test(spec)) return match
      const target = join(dirname(file), spec)
      const resolved = existsSync(`${target}.d.ts`) ? `${spec}.js` : existsSync(join(target, 'index.d.ts')) ? `${spec}/index.js` : null
      if (!resolved) throw new Error(`${relative(dist, file)}: can't resolve ${spec}`)
      rewritten++
      return `${lead}${quote}${resolved}${quote}`
    })
    if (out !== src) writeFileSync(file, out)
  }
  return rewritten
}

/**
 * The JSDoc in the source points at the Figma frames each part follows, by node id: '(3822:3475)',
 * 'Avatar 992:20199'. Useful in the repo, noise in an app's editor: the published types drop
 * them (a parenthesis that holds one goes whole), and the build fails if one is left. Returns how
 * many it dropped.
 */
export function dropFigmaIds(dist) {
  const FIGMA_ID = /\b\d{1,5}:\d{2,6}\b/
  let figmaRefs = 0
  for (const file of declarations(dist)) {
    const src = readFileSync(file, 'utf8')
    const out = src
      .replace(/ ?\((?:[^()]|\([^()]*\))*?\b\d{1,5}:\d{2,6}\b(?:[^()]|\([^()]*\))*\)/g, () => (figmaRefs++, ''))
      .replace(/,? ?\b\d{1,5}:\d{2,6}\b/g, () => (figmaRefs++, ''))
    if (out !== src) writeFileSync(file, out)
    const left = out.match(FIGMA_ID)
    if (left) throw new Error(`${relative(dist, file)}: Figma node id left in the types: ${left[0]}`)
  }
  return figmaRefs
}

/**
 * esbuild drops 'use client' when it bundles, so put it back on every entry a React Server
 * Components app can import: the barrel and each component. Returns how many entries it marked.
 */
export function markUseClient(dist) {
  const components = existsSync(join(dist, 'components')) ? readdirSync(join(dist, 'components')).filter((f) => f.endsWith('.js')) : []
  const entries = [join(dist, 'index.js'), ...components.map((f) => join(dist, 'components', f))]
  for (const f of entries) {
    const js = readFileSync(f, 'utf8')
    if (!js.startsWith("'use client'")) writeFileSync(f, `'use client';${js}`)
  }
  return entries.length
}
