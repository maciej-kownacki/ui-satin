/**
 * Checks the built @uisatin/ui and @uisatin/pro the way an app sees them: packs both dist folders,
 * installs the tarballs into a throwaway project, and type-checks an import of every entry point
 * (each root and each component) under moduleResolution node16, nodenext and bundler, strictly,
 * with skipLibCheck off. A `@ts-expect-error` line makes sure the types are real, not `any`.
 * Pro's optional peers (the Lexical packages behind Rich text editor) are installed too, the way an
 * app that uses that component has them, with `esnext.disposable` in lib, which Lexical's types need. Run `npm run build:ui` and `npm run build:pro` first (CI does).
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString()
const root = resolve(import.meta.dirname, '..')
const dir = mkdtempSync(join(tmpdir(), 'satin-types-'))
try {
  const pack = (folder) => run(`npm pack ${join(root, folder)} --pack-destination ${dir}`, root).trim().split('\n').pop()
  const tgz = pack('packages/ui/dist')
  const proTgz = existsSync(join(root, 'packages/ui-pro/dist/package.json')) ? pack('packages/ui-pro/dist') : null
  const proPkg = proTgz ? JSON.parse(readFileSync(join(root, 'packages/ui-pro/dist/package.json'), 'utf8')) : {}
  const optionalPeers = Object.entries(proPkg.peerDependenciesMeta ?? {})
    .filter(([, meta]) => meta.optional)
    .map(([name]) => `"${name}@${proPkg.peerDependencies[name]}"`)
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'satin-types-check', private: true, type: 'module' }))
  run(`npm i --no-audit --no-fund typescript react@19 react-dom@19 @types/react@19 @types/react-dom@19 ./${tgz}${proTgz ? ` ./${proTgz}` : ''} ${optionalPeers.join(' ')}`, dir)

  const entriesOf = (pkg) =>
    existsSync(join(dir, 'node_modules', pkg, 'components'))
      ? readdirSync(join(dir, 'node_modules', pkg, 'components'))
          .filter((f) => f.endsWith('.js'))
          .map((f) => f.replace(/\.js$/, ''))
      : []
  const components = entriesOf('@uisatin/ui')
  const proComponents = proTgz ? entriesOf('@uisatin/pro') : []
  const ident = (c) => `c_${c.replaceAll('-', '_')}`
  const proIdent = (c) => `p_${c.replaceAll('-', '_')}`
  writeFileSync(
    join(dir, 'entries.tsx'),
    [
      `import * as root from '@uisatin/ui'`,
      ...components.map((c) => `import * as ${ident(c)} from '@uisatin/ui/${c}'`),
      ...(proTgz ? [`import * as proRoot from '@uisatin/pro'`] : []),
      ...proComponents.map((c) => `import * as ${proIdent(c)} from '@uisatin/pro/${c}'`),
      `import { themeCss } from '@uisatin/ui/theme'`,
      `import { cn } from '@uisatin/ui/lib/utils'`,
      `import { Button, type ButtonProps } from '@uisatin/ui/button'`,
      `// @ts-expect-error: not a Button variant, so the types resolved to something real`,
      `const wrong: ButtonProps['variant'] = 'nope'`,
      `export const all = [root, ${[...components.map(ident), ...(proTgz ? ['proRoot'] : []), ...proComponents.map(proIdent)].join(', ')}, themeCss, cn, <Button>ok</Button>, wrong]`,
    ].join('\n'),
  )

  let failed = false
  for (const [module, moduleResolution] of [['node16', 'node16'], ['nodenext', 'nodenext'], ['esnext', 'bundler']]) {
    const config = `tsconfig.${moduleResolution}.json`
    writeFileSync(
      join(dir, config),
      JSON.stringify({
        compilerOptions: { strict: true, skipLibCheck: false, noEmit: true, jsx: 'react-jsx', target: 'es2022', lib: ['dom', 'es2022', 'esnext.disposable'], module, moduleResolution, types: [] },
        files: ['entries.tsx'],
      }),
    )
    try {
      run(`npx tsc -p ${config}`, dir)
      console.log(`✓ ${moduleResolution}: ${components.length + 1} Free and ${proTgz ? proComponents.length + 1 : 0} Pro entry points`)
    } catch (e) {
      failed = true
      console.error(`✗ ${moduleResolution}\n${e.stdout}`)
    }
  }
  if (failed) process.exit(1)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
