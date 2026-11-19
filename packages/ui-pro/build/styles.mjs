/**
 * Satin Pro's CSS build, the steps of Satin Free's (packages/ui/build/styles.mjs) on Pro's source,
 * plus one: Pro's stylesheet holds only what Free's doesn't.
 *
 * 1. classes: compile Pro's classes unprefixed (build/scan.css) and list them → build/.classes.json;
 * 2. js: tsup prefixes them in the source (tsup.config.ts);
 * 3. css: Tailwind with the `sa` prefix over the built JS (build/styles.css), every variable as
 *    `--sa-*` in the CSS and the JS, as in Free;
 * 4. dedupe: every rule, declaration, keyframes and @property that Free's dist/styles.css already
 *    has is dropped, so the two sheets never repeat each other (Pro loads after Free);
 * 5. check: no class and no variable left unprefixed in the built JS.
 *
 *   node build/styles.mjs classes | css     (run Satin Free's build first: it reads its dist)
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'
import { PREFIX, declaredThemeVars, prefixThemeVars, utilityClasses } from '../../ui/build/prefix.mjs'

const tailwind = (input, output, minify) =>
  execFileSync('npx', ['tailwindcss', '-i', input, '-o', output, ...(minify ? ['--minify'] : [])], { stdio: ['ignore', 'ignore', 'inherit'] })

const files = (dir, ext) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p, ext) : p.endsWith(ext) ? [p] : []
  })

const FREE_CSS = '../ui/dist/styles.css'
const step = process.argv[2]

if (step === 'classes') {
  tailwind('build/scan.css', 'build/.scan.out.css')
  const classes = [...utilityClasses(readFileSync('build/.scan.out.css', 'utf8'))].sort()
  writeFileSync('build/.classes.json', JSON.stringify(classes))
  console.log(`${classes.length} classes to prefix`)
}

/** Where a node sits: its at-rules and rules from the root down, as one string. */
const contextOf = (node) => {
  const path = []
  for (let n = node.parent; n && n.type !== 'root'; n = n.parent) path.unshift(n.type === 'atrule' ? `@${n.name} ${n.params}` : n.selector)
  return path.join(' > ')
}
const declKey = (d) => `${contextOf(d)} | ${d.prop}:${d.value}${d.important ? '!important' : ''}`
// Keyframes go whole or not at all: half of one would be a different animation.
const keyframesKey = (a) => `${contextOf(a)} | @${a.name} ${a.params} ${a.toString()}`

/** Drops from `css` what `base` already declares. */
function dedupe(css, base) {
  const known = new Set()
  const baseRoot = postcss.parse(base)
  baseRoot.walkAtRules(/keyframes$/, (a) => known.add(keyframesKey(a)))
  baseRoot.walkDecls((d) => {
    if (!d.parent?.parent || !/keyframes$/.test(d.parent.parent.name ?? '')) known.add(declKey(d))
  })
  const root = postcss.parse(css)
  let dropped = 0
  root.walkAtRules(/keyframes$/, (a) => {
    if (known.has(keyframesKey(a))) (a.remove(), dropped++)
  })
  root.walkDecls((d) => {
    if (d.parent?.parent?.type === 'atrule' && /keyframes$/.test(d.parent.parent.name)) return
    if (known.has(declKey(d))) (d.remove(), dropped++)
  })
  // Rules and at-rules left empty go too (the `@layer a, b;` statement has no body and stays).
  const prune = (container) => {
    container.each((node) => {
      if (node.nodes) prune(node)
      if (node.nodes && node.nodes.length === 0) node.remove()
    })
  }
  prune(root)
  // The `@layer theme, base, components, utilities;` statement can end the sheet: keep its semicolon.
  root.raws.semicolon = true
  return { css: root.toString(), dropped }
}

if (step === 'css') {
  if (!existsSync(FREE_CSS)) throw new Error(`${FREE_CSS} is missing: build Satin Free first (npm run build -w @uisatin/ui)`)
  const free = readFileSync(FREE_CSS, 'utf8')

  tailwind('build/styles.css', 'dist/styles.css', true)
  const css = readFileSync('dist/styles.css', 'utf8')

  // The variables to prefix: Free's (all --sa-* in its sheet), and every other one Pro declares
  // or reads, the way Free's build finds them. Only Radix's and Tailwind's internals keep their names.
  const declared = new Set([...declaredThemeVars(free), ...declaredThemeVars(css)])
  for (const name of ['radius', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']) declared.add(name)
  for (const m of css.matchAll(/(?<![\w-])--([A-Za-z][\w-]*)\s*:/g)) if (!/^(sa|tw)-/.test(m[1])) declared.add(m[1])
  for (const m of css.matchAll(/var\(\s*--([A-Za-z][\w-]*)/g)) if (!/^(sa|tw|radix)-/.test(m[1])) declared.add(m[1])

  const { css: own, dropped } = dedupe(prefixThemeVars(css, declared), free)
  writeFileSync('dist/styles.css', `/* @uisatin/pro: load after @uisatin/ui/styles.css. */\n${own}`)
  let touched = 0
  for (const f of files('dist', '.js')) {
    const js = readFileSync(f, 'utf8')
    const next = prefixThemeVars(js, declared)
    if (next !== js) (writeFileSync(f, next), touched++)
  }
  console.log(`styles.css: ${(own.length / 1000).toFixed(1)} kB of Pro's own CSS (${dropped} declarations already in Free's dropped), ${touched} JS files pointed at --${PREFIX}-* variables`)

  // A string made only of Satin classes, none prefixed, is a class list the rewrite didn't reach.
  const classes = new Set(JSON.parse(readFileSync('build/.classes.json', 'utf8')))
  const missed = []
  for (const f of files('dist', '.js')) {
    const js = readFileSync(f, 'utf8')
    for (const m of js.matchAll(/(["'`])((?:(?!\1)[^\\\n$]|\\.)*)\1/g)) {
      const tokens = m[2].trim().split(/\s+/).filter(Boolean)
      if (!tokens.length || !tokens.every((t) => classes.has(t))) continue
      if (!tokens.some((t) => /[-:[]/.test(t))) continue
      if (/^ease-(in|out|in-out)$/.test(m[2])) continue
      missed.push(`${m[2]}  (${f})`)
    }
    for (const m of js.matchAll(/var\(--(?!(sa|tw|radix)-)[\w$-]*/g)) missed.push(`${m[0]}  (${f}: a variable without the prefix)`)
  }
  if (missed.length) {
    console.error(`Class lists or variables left unprefixed in dist:\n  ${missed.join('\n  ')}`)
    process.exit(1)
  }
}
