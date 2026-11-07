import * as React from 'react'
import { Check, Copy } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * CodeBlock, 1:1 with the uiKit `CodeBlock` set (3179:20414) and its `CodeLine` rows
 * (3124:20131): a card-surface block, 1px border-default, radius-2xl, 12px bottom padding.
 * The header holds the file icon, the filename (medium 13/18), diff stats in a diff, and a
 * tertiary xs Copy button that reads "Copied" with a check for 1.5 s. Lines are Geist Mono
 * 13/19.5, 24 high, 16px side padding, a 20px right-aligned number column 16px from the
 * code (8px, plus an 8px sign column, in a diff).
 *
 * Line types: highlighted (code/line-highlight fill), added (status green bg, green number
 * and +), removed (status red bg, red number and −).
 *
 * `code` is plain text. In `view="diff"` each line starts with "+", "-" or a space, like a
 * unified diff. Highlighting is a small JS/TS tokenizer: keyword, string, function, parameter
 * and variable, in the `code/*` colours.
 *
 * The `code/*` variables exist only in Figma so far, not in theme.css, so each colour is
 * `var(--code-…, <Figma light value>)` with the Figma dark value under `dark:`. Once the
 * theme defines them, the variables take over.
 */

type LineKind = 'default' | 'highlighted' | 'added' | 'removed' | 'context'
type TokenKind = 'plain' | 'keyword' | 'string' | 'function' | 'parameter' | 'variable' | 'comment'

const tokenClass: Record<TokenKind, string> = {
  plain: 'text-[var(--code-plain,#18181b)] dark:text-[var(--code-plain,#fafafa)]',
  keyword: 'text-[var(--code-keyword,#dc2626)] dark:text-[var(--code-keyword,#f87171)]',
  string: 'text-[var(--code-string,#0369a1)] dark:text-[var(--code-string,#7dd3fc)]',
  function: 'text-[var(--code-function,#8b5cf6)] dark:text-[var(--code-function,#a78bfa)]',
  parameter: 'text-[var(--code-parameter,#b45309)] dark:text-[var(--code-parameter,#fcd34d)]',
  variable: 'text-[var(--code-variable,#0284c7)] dark:text-[var(--code-variable,#38bdf8)]',
  // No comment colour in Figma: comments take the line-number grey.
  comment: 'text-[var(--code-line-number,#a1a1aa)] dark:text-[var(--code-line-number,#71717a)]',
}

const lineNumberClass = 'text-[var(--code-line-number,#a1a1aa)] dark:text-[var(--code-line-number,#71717a)]'
const highlightClass = 'bg-[var(--code-line-highlight,rgba(0,0,0,0.05))] dark:bg-[var(--code-line-highlight,rgba(255,255,255,0.06))]'

const KEYWORDS = new Set([
  'import', 'from', 'export', 'default', 'async', 'await', 'function', 'return', 'const', 'let', 'var',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends',
  'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'type', 'interface', 'as',
  'true', 'false', 'null', 'undefined', 'this', 'yield', 'void', 'delete', 'static', 'public', 'private',
])

type Token = { text: string; kind: TokenKind }

/** A deliberately small tokenizer for JS/TS-like code, one line at a time. */
function tokenize(line: string): Token[] {
  const out: Token[] = []
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|([A-Za-z_$][\w$]*)|(=>|===|!==|==|=)|(\s+)|(.)/g
  let declaring = false // after const / let / var, until "="
  let params = false // inside a function's parameter list
  let depth = 0
  let afterFunction = false
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const [text, comment, str, ident, op, space] = m
    if (comment) out.push({ text, kind: 'comment' })
    else if (str) out.push({ text, kind: 'string' })
    else if (space) out.push({ text, kind: 'plain' })
    else if (op) {
      if (op === '=') declaring = false
      out.push({ text, kind: 'keyword' })
    } else if (ident) {
      const rest = line.slice(re.lastIndex)
      if (KEYWORDS.has(ident)) {
        if (ident === 'const' || ident === 'let' || ident === 'var') declaring = true
        if (ident === 'function') afterFunction = true
        out.push({ text, kind: 'keyword' })
      } else if (params && /^\s*[:,)=?]/.test(rest)) out.push({ text, kind: 'parameter' })
      else if (/^\s*\(/.test(rest) || /^[A-Z]/.test(ident)) {
        // Calls and PascalCase names (types, components) take the function colour, as in Figma.
        if (afterFunction) params = true
        afterFunction = false
        out.push({ text, kind: 'function' })
      } else if (declaring) out.push({ text, kind: 'variable' })
      else out.push({ text, kind: 'plain' })
    } else {
      if (params && text === '(') depth++
      if (params && text === ')' && --depth <= 0) params = false
      out.push({ text, kind: 'plain' })
    }
  }
  // Merge neighbours of the same kind so the DOM stays small.
  return out.reduce<Token[]>((acc, t) => {
    const last = acc[acc.length - 1]
    if (last && last.kind === t.kind) last.text += t.text
    else acc.push({ ...t })
    return acc
  }, [])
}

type Line = { kind: LineKind; number: number; text: string }

function parse(code: string, view: 'code' | 'diff', highlightLines: number[]): Line[] {
  const raw = code.replace(/\n$/, '').split('\n')
  if (view === 'code') {
    return raw.map((text, i) => ({
      text,
      number: i + 1,
      kind: highlightLines.includes(i + 1) ? 'highlighted' : 'default',
    }))
  }
  // Diff: a removed line shows the number the next line will take; added and context count up.
  let n = 1
  return raw.map((line) => {
    const sign = line[0]
    const text = line.slice(1)
    if (sign === '-') return { text, number: n, kind: 'removed' as const }
    if (sign === '+') return { text, number: n++, kind: 'added' as const }
    return { text: sign === ' ' ? text : line, number: n++, kind: 'context' as const }
  })
}

/** The file icon from Figma (fileCode, 16 at 1.25). */
function FileCodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-text-muted">
      <path
        d="M13.333 5.333L9.333 1.333H4C3.264 1.333 2.667 1.93 2.667 2.667V13.333C2.667 14.07 3.264 14.667 4 14.667H12C12.736 14.667 13.333 14.07 13.333 13.333V5.333ZM9.333 1.333V5.333H13.333M6.667 8.333L5.333 9.667L6.667 11M9.333 8.333L10.667 9.667L9.333 11"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface CodeBlockProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  code: string
  filename?: string
  view?: 'code' | 'diff'
  showHeader?: boolean
  showActions?: boolean
  /** 1-based line numbers to mark (code view). */
  highlightLines?: number[]
  /** Turn syntax colours off for plain output such as logs. */
  highlight?: boolean
}

export function CodeBlock({
  code,
  filename,
  view = 'code',
  showHeader = true,
  showActions = true,
  highlightLines = [],
  highlight = true,
  className,
  ...props
}: CodeBlockProps) {
  const lines = React.useMemo(() => parse(code, view, highlightLines), [code, view, highlightLines])
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const added = lines.filter((l) => l.kind === 'added').length
  const removed = lines.filter((l) => l.kind === 'removed').length

  const copy = async () => {
    // A diff copies the new version of the file.
    const text = lines.filter((l) => l.kind !== 'removed').map((l) => l.text).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const diff = view === 'diff'

  return (
    <div
      data-slot="code-block"
      data-view={view}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-card pb-3',
        className,
      )}
      {...props}
    >
      {showHeader && (
        <div className="flex items-center gap-2 pt-2 pr-2 pb-1 pl-4">
          <FileCodeIcon />
          <span className="min-w-0 flex-1 truncate text-sm leading-[18px] font-medium text-text-default">{filename}</span>
          {diff && (
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-sm leading-(--text-sm--line-height) tracking-normal">
              <span className="text-status-green-fg">+{added}</span>
              <span className="text-status-red-fg">−{removed}</span>
            </span>
          )}
          {showActions && (
            <Button variant="tertiary" size="xs" onClick={copy} className="text-text-default">
              {copied ? <Check /> : <Copy />}
              <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          )}
        </div>
      )}
      {/* Long lines scroll sideways, so the code is a focusable region keyboard users can scroll. */}
      <pre
        tabIndex={0}
        role="region"
        aria-label={filename ? `${filename} code` : 'Code'}
        className={cn(
          'outline-none focus-visible:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)]',
          'overflow-x-auto font-mono text-sm leading-(--text-sm--line-height) font-normal tracking-normal',
          // Without the header the code sits in the middle: 12px above, as below.
          showHeader ? 'pt-1' : 'pt-3',
          tokenClass.plain,
        )}
      >
        <code className="block w-max min-w-full">
          {lines.map((line, i) => (
            <span
              key={i}
              data-line={line.kind}
              className={cn(
                'flex h-6 items-center px-4',
                diff ? 'gap-2' : 'gap-4',
                line.kind === 'highlighted' && highlightClass,
                line.kind === 'added' && 'bg-status-green-bg',
                line.kind === 'removed' && 'bg-status-red-bg',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'w-5 shrink-0 text-right select-none',
                  line.kind === 'added' ? 'text-status-green-fg' : line.kind === 'removed' ? 'text-status-red-fg' : lineNumberClass,
                )}
              >
                {line.number}
              </span>
              {diff && (
                <span
                  className={cn(
                    'w-2 shrink-0 text-center select-none',
                    line.kind === 'added' ? 'text-status-green-fg' : line.kind === 'removed' ? 'text-status-red-fg' : lineNumberClass,
                  )}
                >
                  {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}
                  {/* Screen readers hear the change, not the glyph. */}
                  {line.kind === 'added' && <span className="sr-only"> added</span>}
                  {line.kind === 'removed' && <span className="sr-only"> removed</span>}
                </span>
              )}
              <span className="whitespace-pre">
                {line.text === ''
                  ? '​'
                  : highlight
                    ? tokenize(line.text).map((t, j) => (
                        <span key={j} className={t.kind === 'plain' ? undefined : tokenClass[t.kind]}>
                          {t.text}
                        </span>
                      ))
                    : line.text}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
