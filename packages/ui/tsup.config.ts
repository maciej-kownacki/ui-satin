import { readFileSync, readdirSync } from 'node:fs'
import type { Plugin } from 'esbuild'
// @ts-expect-error: a plain .mjs build helper
import { prefixSource } from './build/prefix.mjs'
import { defineConfig } from 'tsup'

/**
 * The npm build: one ESM entry for `@uisatin/ui` and one per component (`@uisatin/ui/button`),
 * so apps only ship what they import. Shared code lands in chunks. Types come from
 * `tsc -p tsconfig.build.json`, the CSS from the Tailwind CLI (see build/styles.css).
 */
const components = readdirSync('src/components')
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => f.replace(/\.tsx$/, ''))

/** Adds Satin's `sa:` prefix to every class in the source (build/prefix.mjs); classes from build/.classes.json. */
const prefixClasses: Plugin = {
  name: 'satin-prefix',
  setup(build) {
    const classes = new Set<string>(JSON.parse(readFileSync('build/.classes.json', 'utf8')))
    build.onLoad({ filter: /src\/.*\.tsx?$/ }, (args) => {
      const code = readFileSync(args.path, 'utf8')
      let contents = prefixSource(code, classes, args.path).code
      // themeCss() writes the prefixed primitive variables in the package (src/theme/create-theme.ts).
      if (args.path.endsWith('create-theme.ts')) {
        if (!contents.includes("const VAR_PREFIX = ''")) throw new Error('create-theme.ts: VAR_PREFIX not found')
        contents = contents.replace("const VAR_PREFIX = ''", "const VAR_PREFIX = 'sa-'")
      }
      return { contents, loader: args.path.endsWith('x') ? 'tsx' : 'ts' }
    })
  },
}

export default defineConfig({
  esbuildPlugins: [prefixClasses],
  entry: {
    index: 'src/index.ts',
    'lib/utils': 'src/lib/utils.ts',
    'theme/index': 'src/theme/index.ts',
    ...Object.fromEntries(components.map((c) => [`components/${c}`, `src/components/${c}.tsx`])),
  },
  format: ['esm'],
  target: 'es2022',
  platform: 'browser',
  splitting: true,
  treeshake: true,
  // The maps pointed at nothing (no sources, no content); the source is on GitHub instead.
  sourcemap: false,
  clean: true,
  dts: false,
  outDir: 'dist',
  // Everything in dependencies / peerDependencies stays an import (tsup does this by default);
  // listed here too so subpaths like react/jsx-runtime and radix-ui never get inlined.
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^radix-ui($|\/)/, /^@radix-ui\//, /^@floating-ui\//, 'class-variance-authority', 'clsx', 'tailwind-merge', /^iconoir-react($|\/)/],
})
