/**
 * Every component's props, Satin Free's and Satin Pro's, read from the TypeScript source, as data:
 * satin-lab/src/props.json (keyed by file name; a Pro file never shares a name with a Free one).
 * The registry puts each file's entry in its items' `meta.props`, and the docs' markdown pages
 * (/components/<name>.md) and llms-full.txt print them, so an agent gets the real API, not a
 * hand-written copy of it.
 *
 * For each component file: every exported `XProps` interface (or object type) with its own
 * members (name, type as written, required, the JSDoc), what it extends (the HTML element or
 * Radix part the other props go to), and the defaults from the matching `export function X({
 * a = 1 })`. Figma node ids in the JSDoc are dropped, as in the published types.
 *
 *   node scripts/props.mjs           # write satin-lab/src/props.json
 *   node scripts/props.mjs --check   # fail if it's stale (CI)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dirs = [join(root, 'packages/ui/src/components'), join(root, 'packages/ui-pro/src/components')].filter((d) => existsSync(d))
const out = join(root, 'satin-lab/src/props.json')

const squash = (s) => s.replace(/\s+/g, ' ').trim()
const noFigma = (s) =>
  s
    .replace(/ ?\((?:[^()]|\([^()]*\))*?\b\d{1,5}:\d{2,6}\b(?:[^()]|\([^()]*\))*\)/g, '')
    .replace(/,? ?\b\d{1,5}:\d{2,6}\b/g, '')
const jsdoc = (node) => {
  const c = node.leadingComments?.filter((c) => c.type === 'CommentBlock' && c.value.startsWith('*')).at(-1)
  if (!c) return undefined
  const text = c.value
    .replace(/^\*/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\* ?/, ''))
    .join('\n')
    .trim()
  return text ? noFigma(squash(text)) : undefined
}

function read(dir, file) {
  const code = readFileSync(join(dir, file), 'utf8')
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
  const src = (n) => (n ? squash(code.slice(n.start, n.end)) : undefined)
  const types = new Map() // XProps → { extends, members }
  const defaults = new Map() // X → { prop: default }
  const components = [] // exported function names, in file order

  const memberOf = (m) => {
    if (m.type !== 'TSPropertySignature' && m.type !== 'TSMethodSignature') return null
    const name = m.key.type === 'Identifier' ? m.key.name : m.key.value
    const type = m.type === 'TSMethodSignature' ? src(m).replace(/^[^(]*/, '') : src(m.typeAnnotation?.typeAnnotation)
    return { name, type, required: !m.optional, description: jsdoc(m) }
  }
  const objectMembers = (t) => {
    if (!t) return { members: [], extends: [] }
    if (t.type === 'TSTypeLiteral') return { members: t.members.map(memberOf).filter(Boolean), extends: [] }
    if (t.type === 'TSIntersectionType') {
      const parts = t.types.map(objectMembers)
      return { members: parts.flatMap((p) => p.members), extends: [...parts.flatMap((p) => p.extends), ...t.types.filter((x) => x.type !== 'TSTypeLiteral').map(src)] }
    }
    return { members: [], extends: [src(t)] }
  }

  for (const stmt of ast.program.body) {
    const decl = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : null
    if (!decl) continue
    // Comments before `export` belong to the declaration.
    if (stmt.leadingComments && !decl.leadingComments) decl.leadingComments = stmt.leadingComments
    if (decl.type === 'TSInterfaceDeclaration' && /Props$/.test(decl.id.name)) {
      types.set(decl.id.name, {
        extends: (decl.extends ?? []).map(src),
        members: decl.body.body.map(memberOf).filter(Boolean),
      })
    }
    if (decl.type === 'TSTypeAliasDeclaration' && /Props$/.test(decl.id.name)) {
      types.set(decl.id.name, objectMembers(decl.typeAnnotation))
    }
    if (decl.type === 'FunctionDeclaration' && /^[A-Z]/.test(decl.id?.name ?? '')) {
      const annotation = decl.params[0]?.typeAnnotation?.typeAnnotation
      components.push({ name: decl.id.name, description: jsdoc(decl), propsType: src(annotation), inline: annotation && objectMembers(annotation) })
      const param = decl.params[0]
      if (param?.type === 'ObjectPattern') {
        const d = {}
        for (const p of param.properties) {
          if (p.type !== 'ObjectProperty' || p.value.type !== 'AssignmentPattern') continue
          const key = p.key.type === 'Identifier' ? p.key.name : p.key.value
          d[key] = src(p.value.right)
        }
        defaults.set(decl.id.name, d)
      }
    }
  }

  const entry = {}
  for (const c of components) {
    // A component's props: its own XProps, or the type its parameter names.
    const typeName = types.has(`${c.name}Props`) ? `${c.name}Props` : c.propsType && types.has(c.propsType) ? c.propsType : null
    // Otherwise what the parameter's annotation says: an inline object, ComponentProps<'div'>…
    const t = typeName ? types.get(typeName) : c.inline
    const d = defaults.get(c.name) ?? {}
    entry[c.name] = {
      ...(c.description ? { description: noFigma(c.description) } : {}),
      ...(typeName ? { type: typeName } : {}),
      extends: t?.extends ?? [],
      props: (t?.members ?? []).map((m) => ({
        name: m.name,
        type: m.type,
        required: m.required,
        ...(d[m.name] !== undefined ? { default: d[m.name] } : {}),
        ...(m.description ? { description: m.description } : {}),
      })),
    }
  }
  return entry
}

const result = {}
const files = dirs.flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith('.tsx')).map((file) => ({ dir, file })))
for (const { dir, file } of files.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))) {
  const name = file.replace(/\.tsx$/, '')
  if (files.filter((f) => f.file === file).length > 1) throw new Error(`${name}.tsx is in Satin Free and Satin Pro: give the Pro file another name`)
  const entry = read(dir, file)
  if (Object.keys(entry).length) result[name] = entry
}
const json = JSON.stringify(result, null, 2) + '\n'

if (process.argv.includes('--check')) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : ''
  if (current !== json) {
    console.error('satin-lab/src/props.json is stale: run `node scripts/props.mjs` and commit it.')
    process.exit(1)
  }
  console.log(`props.json is up to date (${Object.keys(result).length} files)`)
} else {
  writeFileSync(out, json)
  const count = Object.values(result).reduce((n, e) => n + Object.keys(e).length, 0)
  console.log(`props.json: ${count} components in ${Object.keys(result).length} files`)
}
