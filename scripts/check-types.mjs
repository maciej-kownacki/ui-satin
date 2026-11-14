/**
 * Checks the built @uisatin/ui the way an app sees it: packs packages/ui/dist, installs the
 * tarball into a throwaway project, and type-checks an import of every entry point (the root and
 * each component) under moduleResolution node16, nodenext and bundler, strictly, with
 * skipLibCheck off. A `@ts-expect-error` line makes sure the types are real, not `any`.
 * Run `npm run build:ui` first (CI does).
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, readdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString()
const root = resolve(import.meta.dirname, '..')
const dir = mkdtempSync(join(tmpdir(), 'satin-types-'))
try {
  const tgz = run(`npm pack ${join(root, 'packages/ui/dist')} --pack-destination ${dir}`, root).trim().split('\n').pop()
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'satin-types-check', private: true, type: 'module' }))
  run(`npm i --no-audit --no-fund typescript react@19 react-dom@19 @types/react@19 @types/react-dom@19 ./${tgz}`, dir)

  const components = readdirSync(join(dir, 'node_modules/@uisatin/ui/components'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => f.replace(/\.js$/, ''))
  const ident = (c) => `c_${c.replaceAll('-', '_')}`
  writeFileSync(
    join(dir, 'entries.tsx'),
    [
      `import * as root from '@uisatin/ui'`,
      ...components.map((c) => `import * as ${ident(c)} from '@uisatin/ui/${c}'`),
      `import { themeCss } from '@uisatin/ui/theme'`,
      `import { cn } from '@uisatin/ui/lib/utils'`,
      `import { Button, type ButtonProps } from '@uisatin/ui/button'`,
      `// @ts-expect-error: not a Button variant, so the types resolved to something real`,
      `const wrong: ButtonProps['variant'] = 'nope'`,
      `export const all = [root, ${components.map(ident).join(', ')}, themeCss, cn, <Button>ok</Button>, wrong]`,
    ].join('\n'),
  )

  let failed = false
  for (const [module, moduleResolution] of [['node16', 'node16'], ['nodenext', 'nodenext'], ['esnext', 'bundler']]) {
    const config = `tsconfig.${moduleResolution}.json`
    writeFileSync(
      join(dir, config),
      JSON.stringify({
        compilerOptions: { strict: true, skipLibCheck: false, noEmit: true, jsx: 'react-jsx', target: 'es2022', lib: ['dom', 'es2022'], module, moduleResolution, types: [] },
        files: ['entries.tsx'],
      }),
    )
    try {
      run(`npx tsc -p ${config}`, dir)
      console.log(`✓ ${moduleResolution}: ${components.length + 1} entry points`)
    } catch (e) {
      failed = true
      console.error(`✗ ${moduleResolution}\n${e.stdout}`)
    }
  }
  if (failed) process.exit(1)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
