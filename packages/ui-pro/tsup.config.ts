import { existsSync, readFileSync, readdirSync } from 'node:fs'
import type { Plugin } from 'esbuild'
// @ts-expect-error: a plain .mjs build helper, shared with Satin Free
import { prefixSource } from '../ui/build/prefix.mjs'
import { defineConfig } from 'tsup'

/**
 * The npm build of Satin Pro, the same as Satin Free's (packages/ui/tsup.config.ts): one ESM
 * entry for `@uisatin/pro` and one per component (`@uisatin/pro/bulk-action-bar`), every class
 * in the source prefixed with `sa:`. Satin Free stays an import (`@uisatin/ui/button`), never
 * bundled: it's a peer dependency, so the app has one copy of it and of its React contexts.
 */
const components = existsSync('src/components')
  ? readdirSync('src/components')
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => f.replace(/\.tsx$/, ''))
  : []

/** Adds Satin's `sa:` prefix to every class in the source; classes from build/.classes.json. */
const prefixClasses: Plugin = {
  name: 'satin-prefix',
  setup(build) {
    const classes = new Set<string>(JSON.parse(readFileSync('build/.classes.json', 'utf8')))
    build.onLoad({ filter: /src\/.*\.tsx?$/ }, (args) => {
      const code = readFileSync(args.path, 'utf8')
      return { contents: prefixSource(code, classes, args.path).code, loader: args.path.endsWith('x') ? 'tsx' : 'ts' }
    })
  },
}

export default defineConfig({
  esbuildPlugins: [prefixClasses],
  entry: {
    index: 'src/index.ts',
    ...Object.fromEntries(components.map((c) => [`components/${c}`, `src/components/${c}.tsx`])),
  },
  format: ['esm'],
  target: 'es2022',
  platform: 'browser',
  splitting: true,
  treeshake: true,
  sourcemap: false,
  clean: true,
  dts: false,
  outDir: 'dist',
  external: [/^@uisatin\/ui($|\/)/, /^react($|\/)/, /^react-dom($|\/)/, /^radix-ui($|\/)/, /^@radix-ui\//],
})
