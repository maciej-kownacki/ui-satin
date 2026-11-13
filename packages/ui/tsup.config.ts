import { readdirSync } from 'node:fs'
import { defineConfig } from 'tsup'

/**
 * The npm build: one ESM entry for `@uisatin/ui` and one per component (`@uisatin/ui/button`),
 * so apps only ship what they import. Shared code lands in chunks. Types come from
 * `tsc -p tsconfig.build.json`, the CSS from the Tailwind CLI (see build/styles.css).
 */
const components = readdirSync('src/components')
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => f.replace(/\.tsx$/, ''))

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'lib/utils': 'src/lib/utils.ts',
    ...Object.fromEntries(components.map((c) => [`components/${c}`, `src/components/${c}.tsx`])),
  },
  format: ['esm'],
  target: 'es2022',
  platform: 'browser',
  splitting: true,
  treeshake: true,
  sourcemap: true,
  clean: true,
  dts: false,
  outDir: 'dist',
  // Everything in dependencies / peerDependencies stays an import (tsup does this by default);
  // listed here too so subpaths like react/jsx-runtime and radix-ui never get inlined.
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^radix-ui($|\/)/, /^@radix-ui\//, /^@floating-ui\//, 'class-variance-authority', 'clsx', 'tailwind-merge', /^iconoir-react($|\/)/],
})
