/**
 * The npm build ships Satin's CSS with its own prefix, so it can sit next to an app's Tailwind
 * without a single shared name: Satin's classes are `sa:flex` (`.sa\:flex`), its theme variables
 * `--sa-text-sm`, and its base rules only touch Satin's elements. The source keeps plain Tailwind
 * classes (the docs site compiles them with its own Tailwind); these helpers rewrite the build.
 *
 * - utilityClasses(css): every utility class in a compiled stylesheet, unescaped.
 * - prefixSource(code, classes): adds `sa:` to those classes wherever the source writes classes.
 * - prefixThemeVars(text, declared): `--text-sm` → `--sa-text-sm` for every variable Tailwind
 *   declared with the prefix (in CSS and in JS, so inline styles and theme helpers match).
 * - scopeRules(css): limits a stylesheet's rules to Satin's elements and what's inside them.
 */
import { parse } from '@babel/parser'
import MagicString from 'magic-string'
import postcss from 'postcss'

export const PREFIX = 'sa'

/** Elements with a Satin class, and everything inside them. */
export const SCOPE = `[class*="${PREFIX}:"]`

/** Unescapes a CSS identifier: `hover\:bg-x` → `hover:bg-x`. */
const unescape = (s) => s.replace(/\\([0-9a-fA-F]{1,6}\s?|.)/g, (_, c) => (/^[0-9a-fA-F]/.test(c) && c.length > 1 ? String.fromCodePoint(parseInt(c, 16)) : c))

/** The class names the utilities layer of a compiled stylesheet defines. */
export function utilityClasses(css) {
  const classes = new Set()
  postcss.parse(css).walkAtRules('layer', (layer) => {
    if (layer.params !== 'utilities') return
    layer.walkRules((rule) => {
      for (const m of rule.selector.matchAll(/\.((?:\\.|[\w-])+)/g)) classes.add(unescape(m[1]))
    })
  })
  return classes
}

/** Markers that carry no styles of their own but take part in group-* and peer-* variants. */
const isMarker = (t) => /^(group|peer)(\/[\w-]+)?$/.test(t)

/** Where the source writes classes: className-like props and names, and class helpers' arguments. */
const CLASS_NAME = /^(className|class|\w+ClassName|\w+Class|\w+Classes)$/
const CLASS_CALLS = new Set(['cn', 'cva', 'clsx', 'cx', 'twMerge'])

export function prefixSource(code, classes, file = '') {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'], errorRecovery: false })
  const out = new MagicString(code)
  let count = 0

  const rewrite = (text) =>
    text.replace(/[^\s]+/g, (token) => {
      if (token.startsWith(`${PREFIX}:`)) return token
      if (classes.has(token) || isMarker(token)) {
        count++
        return `${PREFIX}:${token}`
      }
      return token
    })

  // A string anywhere else counts as a class list when every token is a Satin class and one
  // of them can only be a class (has -, :, [ or /): `left-1/2`, a tone map's 'bg-x text-y'.
  // Not inside style objects or animation options, where 'inline-block' or 'ease-in-out' are CSS.
  const looksLikeClasses = (text) => {
    const t = text.trim().split(/\s+/).filter(Boolean)
    return t.length > 0 && t.every((x) => classes.has(x) || isMarker(x)) && t.some((x) => /[-:[/]/.test(x))
  }

  // Strings in class positions; cva's variant names (object keys) are never classes.
  // Variables the source hands to cn() or className hold classes, whatever they're called:
  // `const position = container ? 'absolute' : 'fixed'` … `cn(position, …)`. Single words like
  // these don't look like classes on their own, so collect the names first.
  const classVars = new Set()
  const collect = (node, inClassArg = false) => {
    if (!node || typeof node.type !== 'string') return
    if (inClassArg && node.type === 'Identifier') classVars.add(node.name)
    const classArg =
      (node.type === 'CallExpression' && CLASS_CALLS.has(node.callee?.name)) ||
      (node.type === 'JSXAttribute' && CLASS_NAME.test(node.name?.name ?? ''))
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'callee') continue
      const child = node[key]
      // Through conditionals and && / ||, not into calls or members (their results aren't the variable).
      const pass = (c) => (classArg || (inClassArg && /^(ConditionalExpression|LogicalExpression|JSXExpressionContainer|ArrayExpression)$/.test(node.type)) ? collect(c, true) : collect(c, false))
      if (Array.isArray(child)) child.forEach(pass)
      else if (child && typeof child === 'object') pass(child)
    }
  }
  collect(ast.program)
  const LITERAL_INIT = /^(StringLiteral|TemplateLiteral|ConditionalExpression|LogicalExpression|ArrayExpression)$/

  const visit = (node, inClass, inStyle = false) => {
    if (!node || typeof node.type !== 'string') return
    if (!inClass && !inStyle && node.type === 'StringLiteral' && looksLikeClasses(code.slice(node.start + 1, node.end - 1))) inClass = true
    if (!inClass && !inStyle && node.type === 'TemplateLiteral' && node.expressions.length === 0 && looksLikeClasses(node.quasis[0].value.raw)) inClass = true
    if (inClass && node.type === 'StringLiteral') {
      const raw = code.slice(node.start + 1, node.end - 1)
      const next = rewrite(raw)
      if (next !== raw) out.overwrite(node.start + 1, node.end - 1, next)
      return
    }
    if (inClass && node.type === 'TemplateElement') {
      const raw = node.value.raw
      // Only whole tokens: a quasi that ends mid-token (`size-${n}`) is left alone and reported.
      const next = rewrite(raw)
      if (next !== raw) out.overwrite(node.start, node.end, next)
      return
    }
    let classy = inClass
    let style = inStyle
    if (node.type === 'JSXAttribute' && node.name?.name === 'style') style = true
    if (node.type === 'CallExpression' && node.callee?.property?.name === 'animate') style = true
    if (node.type === 'ObjectProperty' && /^(style|easing|transition|animation)$/.test(node.key?.name ?? '')) style = true
    if (node.type === 'JSXAttribute' && CLASS_NAME.test(node.name?.name ?? '')) classy = true
    if (node.type === 'CallExpression' && CLASS_CALLS.has(node.callee?.name)) classy = true
    if (node.type === 'VariableDeclarator' && CLASS_NAME.test(node.id?.name ?? '')) classy = true
    if (node.type === 'VariableDeclarator' && classVars.has(node.id?.name) && LITERAL_INIT.test(node.init?.type ?? '')) classy = true
    if ((node.type === 'ObjectProperty' || node.type === 'ClassProperty') && CLASS_NAME.test(node.key?.name ?? node.key?.value ?? '')) classy = true
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue
      // Object keys are names (variant values), not classes.
      if (key === 'key' && (node.type === 'ObjectProperty' || node.type === 'ObjectMethod')) continue
      const child = node[key]
      if (Array.isArray(child)) child.forEach((c) => visit(c, classy, style))
      else if (child && typeof child === 'object') visit(child, classy, style)
    }
  }
  visit(ast.program, false)
  return { code: out.toString(), count, map: out.generateMap({ source: file, hires: true }) }
}

/** Every `--sa-*` custom property a stylesheet declares, without the prefix: `text-sm`, `color-blue-600`… */
export function declaredThemeVars(css) {
  const names = new Set()
  for (const m of css.matchAll(new RegExp(`--${PREFIX}-([A-Za-z0-9-]+)\\s*:`, 'g'))) names.add(m[1])
  return names
}

/** `--x` → `--sa-x` wherever x is a prefixed theme variable. Leaves `--tw-*` and anything else. */
export function prefixThemeVars(text, declared) {
  return text.replace(/(?<![\w-])--([A-Za-z0-9-]+)/g, (match, name) => (declared.has(name) && !name.startsWith(`${PREFIX}-`) ? `--${PREFIX}-${name}` : match))
}

/**
 * Scopes a stylesheet (Tailwind's preflight, Satin's base rules) to Satin's elements. Rules for
 * html, :host and body set what a Satin element inherits, so they go on the outermost Satin
 * elements only; every other rule applies to Satin elements and their content, never to the
 * rest of the app.
 */
export function scopeRules(css) {
  const root = postcss.parse(css)
  // :is(), not :where(): one class worth of specificity, so an app's element rules in its own
  // base layer (Tailwind's preflight sets button { font: inherit }) don't win on Satin's elements.
  const outer = `${SCOPE}:not(${SCOPE} *)`
  const inside = `:is(${SCOPE}, ${SCOPE} *)`
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return
    rule.selectors = rule.selectors.flatMap((sel) => {
      if (/^(html|:host|body)\b|^:root$/.test(sel.trim())) return [outer]
      if (/\b(html|body)\b|:host/.test(sel)) return []
      const [base, ...pseudo] = sel.split('::')
      const tail = pseudo.length ? `::${pseudo.join('::')}` : ''
      const b = base.trim()
      if (!b || b === '*') return [`${inside}${tail}`]
      return [`${inside}:where(${b})${tail}`]
    })
    if (!rule.selectors.length) return rule.remove()
    // What the page sits on stays the app's: a Satin element never paints the canvas behind it.
    if (rule.selector === outer) {
      rule.walkDecls(/^background/, (d) => d.remove())
      rule.walkAtRules('apply', (a) => {
        a.params = a.params.split(/\s+/).filter((t) => !/^bg-/.test(t)).join(' ')
      })
    }
    // In the prefixed build @apply takes prefixed classes too.
    rule.walkAtRules('apply', (a) => {
      a.params = a.params.split(/\s+/).map((t) => (t && !t.startsWith(`${PREFIX}:`) ? `${PREFIX}:${t}` : t)).join(' ')
    })
  })
  return root.toString()
}
