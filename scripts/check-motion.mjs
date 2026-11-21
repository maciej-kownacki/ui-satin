/**
 * Layout properties move only through pixel-motion or a named exception (packages/ui/MOTION.md,
 * rule 1). Eased in CSS, a height or width lands between device pixels on most frames, and eased
 * between offsetHeight/offsetWidth/offsetLeft values it ends half a pixel from where layout puts
 * it, so the content snaps when the animation hands back. This fails on new motion of that kind:
 *
 * - a CSS or inline `transition` / `transition-property` naming a layout property, or `all`
 *   (a transition that names no property is `all`), Tailwind `transition-all`, `transition-[…]`
 * - an `@keyframes` block that sets one, and `animate-[…]` or `animation` using such a block
 * - an `.animate(` call whose keyframes name one, in the call or built in the lines above it
 * - offsetHeight, offsetWidth, offsetLeft or offsetTop within 10 lines of an `.animate(` call or
 *   a transition set from script
 *
 * A tripwire, not a parser: it reads the source as text. What it lets through on purpose is in
 * ALLOW below, each with its reason; MOTION.md names the same exceptions.
 *
 *   npm run check:motion        (VERBOSE=1 lists what the exceptions let through)
 */
import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const DIRS = ['packages/ui/src', 'packages/ui-pro/src', 'satin-lab/src/components']
const EXTS = new Set(['.ts', '.tsx', '.css', '.astro'])
const SKIP = /(^|\/)(__tests__|node_modules)\/|\.(test|typetest)\.tsx?$/
const NEAR = 10

const RULE = 'animate transform and opacity; a layout property moves only through pixel-motion.tsx or an exception named in packages/ui/MOTION.md, rule 1'

/** Layout properties, CSS names (JS keys are turned into these first). */
const LAYOUT =
  /^(all|(min-|max-)?(width|height|inline-size|block-size)|top|left|right|bottom|inset(-[a-z-]+)?|(margin|padding)(-[a-z-]+)?|grid-template(-rows|-columns)?|flex|flex-basis)$/
const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
const isLayout = (name) => LAYOUT.test(kebab(name))

/** Words in a transition value that are not a property. */
const NOT_PROPERTY = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end', 'allow-discrete', 'normal'])

/*
 * What moves a layout property on purpose. `match` is tested against what was found (the
 * transition's value, the keyframes' name and properties, the line); without it the whole file
 * is allowed.
 */
const ALLOW = [
  {
    file: 'packages/ui/src/components/pixel-motion.tsx',
    reason: 'The shared piece itself: easeSize and pixelKeyframes ease height or width on the device-pixel grid, counted from the exact end, content frozen.',
  },
  {
    file: 'packages/ui/src/components/sliding-indicator.tsx',
    match: /width/,
    reason:
      "The sliding pill (Tabs, Segmented control, Pagination) animates its width with its transform, so its corners don't stretch; both edges from rects, put on the device grid.",
  },
  {
    file: 'packages/ui/src/components/avatar.tsx',
    match: /width/,
    reason: "Avatar group's tooltip: the bubble's width follows the next name, for the pill's reason (a scaled bubble stretches its corners and text); measured from a rect.",
  },
  {
    file: 'packages/ui/src/styles/motion.css',
    match: /satin-accordion-(down|up)/,
    reason: "The Accordion's CSS expander: Radix measures the content and the section grows to that height; the content inside doesn't move. On CSS, since a script version changes mounting (forceMount).",
  },
  {
    file: 'packages/ui/src/styles/motion.css',
    match: /grid-template-rows/,
    reason:
      ".satin-expand, the CSS expander (Sidebar groups, Thinking, Citations, Tool call, Agent undo log, the docs sidebar): grid rows 0fr to 1fr, laid out by the browser, content still. On CSS, since a script version changes mounting, streaming content and nested groups.",
  },
  {
    file: 'packages/ui/src/components/toast.tsx',
    match: /height/,
    reason: "The toast stack: the viewport's height follows the stack's, measured unrounded from computed style (the cards behind are scaled, so a rect would be wrong).",
  },
  {
    file: 'packages/ui/src/components/notification.tsx',
    match: /height/,
    reason: "The notification stack: the front card's height eases to the next one's, measured unrounded from computed style (the cards behind are scaled).",
  },
  {
    file: 'packages/ui-pro/src/styles/components/activity-timeline.css',
    match: /grid-template-rows/,
    reason: "Activity timeline's fold: a run's entries and \"Reverted by you\" open in grid rows, so the rows below glide instead of jumping.",
  },
  {
    file: 'packages/ui-pro/src/styles/components/agent-presence.css',
    match: /width|height/,
    reason: "Agent presence: the layer's width and height glide with its transform to the next target, since an edge can't be scaled without stretching its line and corners. Unmeasured; to revisit.",
  },
]

function files(dir) {
  const out = []
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (SKIP.test(path)) continue
    if (entry.isDirectory()) out.push(...files(path))
    else if (EXTS.has(extname(entry.name))) out.push(path)
  }
  return out
}

/** Comments out, line count kept: block comments everywhere, `//` comments outside CSS. */
function strip(text, css) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  if (!css) out = out.replace(/(^|[\s;{}(),])\/\/.*$/gm, (m, lead) => lead + ' '.repeat(m.length - lead.length))
  return out
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length

/** Splits on commas outside (), {}, []. */
function topLevel(value) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if ('({['.includes(c)) depth++
    else if (')}]'.includes(c)) depth--
    else if (c === ',' && depth === 0) {
      parts.push(value.slice(start, i))
      start = i + 1
    }
  }
  parts.push(value.slice(start))
  return parts.map((p) => p.trim()).filter(Boolean)
}

/**
 * The layout properties a transition value moves: each part's property, or `all` when a part
 * names none (`implicitAll`; off where the value was only guessed at).
 */
function transitionLayout(value, implicitAll = true) {
  const found = []
  for (const part of topLevel(value)) {
    if (/^(none|inherit|initial|unset|revert(-layer)?)$/.test(part)) continue
    // Words outside functions and template holes; `_` is a space in a Tailwind arbitrary value.
    const words = part
      .replace(/\$\{[^}]*\}/g, ' ')
      .replace(/[a-z-]+\([^)]*\)/gi, ' ')
      .split(/[\s_]+/)
      .filter((w) => /^-?[a-zA-Z][\w-]*$/.test(w) && !NOT_PROPERTY.has(w))
    const property = words[0] ?? (implicitAll ? 'all' : undefined)
    if (property && isLayout(property)) found.push(property)
  }
  return found
}

const literal = (text, at) => {
  const q = text[at]
  const end = text.indexOf(q, at + 1)
  return end < 0 ? '' : text.slice(at + 1, end)
}

/**
 * The value after `transition:` or `transition =`: a string literal; in Tailwind's
 * `[transition:…]`, up to the bracket; in CSS, up to the end of the declaration; in script, a
 * constant's string from the same file, else the rest of the line, read for property names only.
 */
function readValue(text, at, script, bracket) {
  if (/['"`]/.test(text[at])) return { value: literal(text, at), set: true }
  const rest = text.slice(at)
  if (bracket) return { value: rest.slice(0, rest.search(/[\]\s"'`]|$/)) }
  if (!script) return { value: rest.slice(0, rest.search(/[;{}]|$/)) }
  const id = rest.match(/^[A-Za-z_$][\w$]*/)?.[0]
  const def = id && text.match(new RegExp(`(?:const|let|var)\\s+${id.replace('$', '\\$')}\\s*=\\s*(?=['"\`])`))
  if (def) return { value: literal(text, def.index + def[0].length), set: true }
  return { value: rest.slice(0, rest.search(/[;{}\n]|$/)), guessed: true }
}

function blockAt(text, open) {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i)
  }
  return text.slice(open + 1)
}

function callAt(text, open) {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')' && --depth === 0) return text.slice(open + 1, i)
  }
  return text.slice(open + 1)
}

const sources = DIRS.flatMap(files).map((path) => {
  const raw = readFileSync(join(root, path), 'utf8')
  return { path: relative(root, join(root, path)), text: strip(raw, extname(path) === '.css'), script: extname(path) !== '.css' }
})

const findings = []
const add = (path, line, what, detail) => findings.push({ path, line, what, detail })

// Keyframes that set a layout property, by name, for the uses below.
const layoutKeyframes = new Set()
for (const { path, text } of sources) {
  for (const m of text.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    const body = blockAt(text, m.index + m[0].length - 1)
    const props = [...new Set([...body.matchAll(/(?:^|[{;\s])([a-z-]+)\s*:/g)].map((d) => d[1]).filter((p) => p !== 'all' && isLayout(p)))]
    if (!props.length) continue
    layoutKeyframes.add(m[1])
    add(path, lineAt(text, m.index), '@keyframes sets a layout property', `${m[1]}: ${props.join(', ')}`)
  }
}

for (const { path, text, script } of sources) {
  const anchors = []

  // transition / transition-property / transitionProperty, in CSS, style objects, assignments and Tailwind's [transition:…].
  for (const m of text.matchAll(/(?<![\w-])(transition(?:-property|Property)?)\s*(=(?!=)|:)\s*/g)) {
    const bracket = text[m.index - 1] === '['
    const { value, set, guessed } = readValue(text, m.index + m[0].length, script, bracket)
    const line = lineAt(text, m.index)
    if (script && !bracket && (set || m[2] === '=')) anchors.push(line)
    const props = transitionLayout(value, !guessed)
    if (props.length) add(path, line, `${m[1]} names ${props.join(', ')}`, value.trim())
  }

  // Tailwind utilities.
  for (const m of text.matchAll(/(?<![\w-])transition-all(?![\w-])/g)) add(path, lineAt(text, m.index), 'transition-all', m[0])
  for (const m of text.matchAll(/(?<![\w-])transition-\[([^\]]*)\]/g)) {
    const props = m[1].split(/[,_]/).filter(isLayout)
    if (props.length) add(path, lineAt(text, m.index), `${m[0]} names ${props.join(', ')}`, m[0])
  }
  for (const m of text.matchAll(/(?<![\w-])animate-\[([a-zA-Z0-9-]+)/g)) {
    if (layoutKeyframes.has(m[1])) add(path, lineAt(text, m.index), `animate-[${m[1]}] uses keyframes that set a layout property`, m[1])
  }
  for (const m of text.matchAll(/(?<![\w-])animation(?:-name)?\s*:\s*([^;{}]*)/g)) {
    const used = m[1].split(/[\s,]+/).filter((w) => layoutKeyframes.has(w))
    if (used.length) add(path, lineAt(text, m.index), `animation uses keyframes that set a layout property`, used.join(', '))
  }

  if (!script) continue

  // .animate( calls: keys in the call, and keyframe-like keys (`width: \`…px\``) in the lines above it.
  const lines = text.split('\n')
  for (const m of text.matchAll(/\.animate\(/g)) {
    const line = lineAt(text, m.index)
    anchors.push(line)
    const call = callAt(text, m.index + m[0].length - 1)
    const inCall = [...call.matchAll(/(?<![\w$.-])['"]?([a-zA-Z][\w-]*)['"]?\s*:/g)].map((k) => k[1]).filter((k) => k !== 'all' && isLayout(k))
    if (inCall.length) add(path, line, `.animate() keyframes name ${[...new Set(inCall)].join(', ')}`, call.slice(0, 120))
    for (let l = Math.max(0, line - 1 - 12); l < line - 1; l++) {
      for (const k of lines[l].matchAll(/(?<![\w$.-])['"]?([a-zA-Z][\w-]*)['"]?\s*:\s*`[^`]*px`/g)) {
        if (isLayout(k[1]) && k[1] !== 'all') add(path, l + 1, `keyframes for the .animate() on line ${line} name ${k[1]}`, lines[l].trim())
      }
    }
  }

  // offset* near an .animate( or a transition set from script.
  if (anchors.length) {
    lines.forEach((text, i) => {
      const m = text.match(/\boffset(Height|Width|Left|Top)\b/)
      if (m && anchors.some((a) => Math.abs(a - (i + 1)) <= NEAR)) add(path, i + 1, `${m[0]} within ${NEAR} lines of motion: it rounds, so the end snaps`, text.trim())
    })
  }
}

const used = new Set()
const failed = findings.filter((f) => {
  const allow = ALLOW.find((a) => a.file === f.path && (!a.match || a.match.test(f.detail) || a.match.test(f.what)))
  if (allow) used.add(allow)
  if (allow && process.env.VERBOSE) console.log(`allowed  ${f.path}:${f.line}  ${f.what}`)
  return !allow
})

for (const a of ALLOW) if (!used.has(a)) console.warn(`check-motion: allow entry matched nothing, remove it: ${a.file}${a.match ? ` ${a.match}` : ''}`)

if (failed.length) {
  for (const f of failed) console.error(`${f.path}:${f.line}  ${f.what}\n    ${f.detail.split('\n')[0].slice(0, 140)}`)
  console.error(`\n${failed.length} motion ${failed.length === 1 ? 'finding' : 'findings'}: ${RULE}. Deliberate? Add it to ALLOW in scripts/check-motion.mjs with its reason, and to MOTION.md.`)
  process.exit(1)
}
console.log(`check-motion: ${sources.length} files, ${findings.length} layout animations, all named exceptions.`)
