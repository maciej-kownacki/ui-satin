import * as React from 'react'
import { Button, SegmentedControl, Switch, cn } from '@satin/ui'
import { DropdownMenu, DropdownMenuItem } from '@satin/ui/dropdown'
import { Check, Collapse, Copy, Expand, NavArrowDown } from 'iconoir-react'
import { CodeIcon, PreviewIcon } from './icons'
import { stageHeights } from '../lib/stage-heights'

/**
 * The interactive part of a component page, from the docs template (uiKit 3857:6013–6016):
 * Preview / Code tabs with a full-screen button on the right, then a stage (at least 442px) with the
 * live component in the middle and a segmented control for its options at the bottom.
 * The Code tab shows the selected option's code in the same frame, with a copy button.
 *
 * With `controls`, the single option bar becomes a properties bar under the stage: one labelled
 * control per prop, in the order given (the prop that changes the most comes first), and the
 * option id is the selected values joined with "-", so every combination has its own code.
 */
export type ShowcaseOption = { id: string; label: string; code: string }

/**
 * A prop the reader can change: a segmented control, a menu for longer lists (with an
 * optional swatch per item), or a switch with `on`/`off` values.
 */
export type ShowcaseControl =
  | { id: string; label: string; items: { value: string; label: string }[]; default?: string; type?: 'segmented' }
  | { id: string; label: string; items: { value: string; label: string; icon?: React.ReactNode }[]; default?: string; type: 'menu' }
  | { id: string; label: string; type: 'switch'; default?: 'on' | 'off' }

const initialValue = (c: ShowcaseControl) => c.default ?? ('items' in c ? c.items[0].value : 'off')

/** The option id of one combination of control values. */
export const comboId = (controls: ShowcaseControl[], values: Record<string, string>) =>
  controls.map((c) => values[c.id]).join('-')

/** Every combination of control values, for building one option per combination. */
export function combos(controls: ShowcaseControl[]): Record<string, string>[] {
  return controls.reduce<Record<string, string>[]>(
    (acc, c) => {
      const values = 'items' in c ? c.items.map((i) => i.value) : ['on', 'off']
      return acc.flatMap((v) => values.map((x) => ({ ...v, [c.id]: x })))
    },
    [{}],
  )
}

export interface ShowcaseProps {
  /** Used in accessible names: "Button preview", "Button options". */
  name: string
  options: ShowcaseOption[]
  /** Shiki HTML per option id, rendered at build time. */
  codeHtml: Record<string, string>
  /** Props the reader can set, most structural first. Replaces the option bar. */
  controls?: ShowcaseControl[]
  render: (optionId: string, values: Record<string, string>) => React.ReactNode
}

type Tab = 'preview' | 'code'

export function Showcase({ name, options, codeHtml, controls, render }: ShowcaseProps) {
  const [values, setValues] = React.useState(() =>
    Object.fromEntries((controls ?? []).map((c) => [c.id, initialValue(c)])),
  )
  const [picked, setOption] = React.useState(options[0].id)
  const option = controls ? comboId(controls, values) : picked
  const [tab, setTab] = React.useState<Tab>('preview')
  const [fullscreen, setFullscreen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const fullscreenRef = React.useRef<HTMLButtonElement>(null)
  const ids = React.useId()
  const current = options.find((o) => o.id === option) ?? options[0]
  const stageRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  // The stage keeps one height whatever the props, so nothing under it moves.
  const measuring = typeof location !== 'undefined' && new URLSearchParams(location.search).has('measure')
  const heights = measuring ? undefined : stageHeights[name]
  const fixed = heights && !fullscreen
  const stageStyle = heights
    ? ({ '--stage-h': `${heights[0]}px`, '--stage-h-m': `${heights[1]}px` } as React.CSSProperties)
    : undefined

  // `?measure` walks every combination and leaves the tallest stage in window.__stageHeight.
  React.useEffect(() => {
    if (!measuring || !controls) return
    let stop = false
    ;(async () => {
      let max = 0
      for (const v of combos(controls)) {
        if (stop) return
        setValues(v)
        await new Promise((r) => setTimeout(r, 250))
        max = Math.max(max, stageRef.current?.offsetHeight ?? 0)
      }
      ;(window as unknown as { __stageHeight: number }).__stageHeight = max
    })()
    return () => {
      stop = true
    }
  }, [])

  // Full screen: Escape leaves, the page behind doesn't scroll, focus comes back to the toggle.
  React.useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false)
    document.addEventListener('keydown', onKey)
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = overflow
    }
  }, [fullscreen])
  // It covers the page, so the page behind is inert: Tab can't reach what's hidden under it.
  React.useEffect(() => {
    const panel = panelRef.current
    if (!fullscreen || !panel) return
    const inerted: Element[] = []
    for (let el: Element = panel; el.parentElement && el !== document.body; el = el.parentElement) {
      for (const sibling of el.parentElement.children) {
        if (sibling === el || sibling.hasAttribute('inert')) continue
        sibling.setAttribute('inert', '')
        inerted.push(sibling)
      }
    }
    return () => inerted.forEach((el) => el.removeAttribute('inert'))
  }, [fullscreen])
  const mounted = React.useRef(false)
  React.useEffect(() => {
    if (mounted.current) fullscreenRef.current?.focus({ preventScroll: true })
    mounted.current = true
  }, [fullscreen])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  // Tabs follow the WAI-ARIA pattern: arrow keys move between them.
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next: Tab = tab === 'preview' ? 'code' : 'preview'
    setTab(next)
    document.getElementById(`${ids}-tab-${next}`)?.focus()
  }

  const tabs: { id: Tab; label: string; Icon: typeof PreviewIcon }[] = [
    { id: 'preview', label: 'Preview', Icon: PreviewIcon },
    { id: 'code', label: 'Code', Icon: CodeIcon },
  ]

  // One prop per row, label left and control right. From md the rows split into two columns,
  // filled top to bottom so the first column keeps the most structural props.
  const rows = controls ? Math.ceil(controls.length / 2) : 0
  const bar = controls ? (
    <div className="shrink-0 border-t border-border-subtle px-4 py-2 md:px-6 md:py-3">
      <div
        role="group"
        aria-label={`${name} properties`}
        style={{ '--rows': rows } as React.CSSProperties}
        className="mx-auto grid w-full max-w-[720px] grid-cols-1 md:grid-flow-col md:grid-cols-2 md:grid-rows-[repeat(var(--rows),auto)] md:gap-x-10"
      >
        {controls.map((c, i) => (
          <div
            key={c.id}
            className={cn(
              'flex min-h-11 items-center justify-between gap-3 py-1.5',
              i > 0 && 'border-t border-border-subtle',
              // In two columns the first row of the second column starts flush, without a line.
              i === rows && 'md:border-t-0',
            )}
          >
            <span aria-hidden className="text-sm text-text-muted">
              {c.label}
            </span>
            {c.type === 'menu' ? (
              <MenuControl control={c} value={values[c.id]} onChange={(v) => setValues((s) => ({ ...s, [c.id]: v }))} />
            ) : 'items' in c ? (
              <SegmentedControl
                aria-label={c.label}
                size="xs"
                shape="rounded"
                items={c.items}
                value={values[c.id]}
                onValueChange={(v) => setValues((s) => ({ ...s, [c.id]: v }))}
              />
            ) : (
              <Switch
                aria-label={c.label}
                checked={values[c.id] === 'on'}
                onCheckedChange={(on) => setValues((s) => ({ ...s, [c.id]: on ? 'on' : 'off' }))}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  ) : null

  const toggle = (
    <Button
      ref={fullscreenRef}
      variant="tertiary"
      size="lg"
      shape="rounded"
      iconOnly
      aria-label={fullscreen ? 'Exit full screen' : 'Open full screen'}
      onClick={() => setFullscreen((v) => !v)}
      className="text-text-muted hover:text-text-default"
    >
      {fullscreen ? <Collapse /> : <Expand />}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div role="tablist" aria-label={`${name} view`} onKeyDown={onTabKey} className="flex flex-1 items-center gap-1">
          {tabs.map(({ id, label, Icon }) => {
            const selected = tab === id
            return (
              <button
                key={id}
                id={`${ids}-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${ids}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(id)}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-pill px-3 text-base font-medium select-none',
                  'transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)',
                  'focus-visible:shadow-border-focus focus-visible:outline-none',
                  selected
                    ? 'bg-bg-selected text-text-default'
                    : 'text-text-muted hover:bg-bg-hover hover:text-text-default active:bg-bg-selected',
                )}
              >
                <Icon className="shrink-0" />
                {label}
              </button>
            )
          })}
        </div>
        {!fullscreen && toggle}
      </div>

      <div
        ref={panelRef}
        id={`${ids}-panel`}
        role={fullscreen ? 'dialog' : 'tabpanel'}
        aria-modal={fullscreen || undefined}
        aria-label={fullscreen ? `${name} preview` : undefined}
        aria-labelledby={fullscreen ? undefined : `${ids}-tab-${tab}`}
        className={cn(
          'relative flex flex-col overflow-hidden border border-border-subtle bg-bg-field [box-shadow:0_1px_1px_var(--effect-shadow-xs)]',
          fullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : cn('rounded-2xl', !heights && 'min-h-[442px]'),
        )}
        style={stageStyle}
      >
        {/* In the Code tab the toggle sits in the code header, next to Copy code. */}
        {fullscreen && tab !== 'code' && <div className="absolute top-3 right-3 z-10">{toggle}</div>}

        {tab === 'preview' ? (
          <>
            {/* Too wide for the stage? It scrolls sideways instead of squeezing the component. */}
            <div className={cn('flex overflow-auto', fixed ? 'h-(--stage-h-m) shrink-0 md:h-(--stage-h)' : 'flex-1')}>
              <div
                ref={stageRef}
                className={cn('m-auto flex w-max min-w-full items-center justify-center px-10 pt-6', bar ? 'pb-6' : 'pb-16')}
              >
                {render(current.id, values)}
              </div>
            </div>
            {bar}
            {!bar && options.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
                <SegmentedControl
                  aria-label={`${name} options`}
                  size="xs"
                  shape="rounded"
                  items={options.map((o) => ({ value: o.id, label: o.label }))}
                  value={option}
                  onValueChange={setOption}
                />
              </div>
            )}
          </>
        ) : (
          <div className={cn('flex flex-1 flex-col', !fullscreen && !heights && 'max-h-[600px]')}>
            <div className={cn('flex min-h-0 flex-col', fixed ? 'h-(--stage-h-m) shrink-0 md:h-(--stage-h)' : 'flex-1')}>
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle pr-2 pl-4">
                <span className="text-sm text-text-muted">{current.label}</span>
                <div className="flex items-center gap-1">
                  <Button variant="tertiary" shape="rounded" onClick={copy} className="text-text-muted hover:text-text-default">
                    {copied ? <Check /> : <Copy />}
                    <span aria-live="polite">{copied ? 'Copied' : 'Copy code'}</span>
                  </Button>
                  {fullscreen && toggle}
                </div>
              </div>
              <div className="code-block min-h-0 flex-1 overflow-auto" dangerouslySetInnerHTML={{ __html: codeHtml[current.id] ?? '' }} />
            </div>
            {bar}
            {!bar && options.length > 1 && (
              <div className="flex shrink-0 justify-center border-t border-border-subtle py-3">
                <SegmentedControl
                  aria-label={`${name} options`}
                  size="xs"
                  shape="rounded"
                  items={options.map((o) => ({ value: o.id, label: o.label }))}
                  value={option}
                  onValueChange={setOption}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** A menu control: a small rounded trigger with the current item, the items below it. */
function MenuControl({
  control,
  value,
  onChange,
}: {
  control: Extract<ShowcaseControl, { type: 'menu' }>
  value: string
  onChange: (value: string) => void
}) {
  const current = control.items.find((i) => i.value === value) ?? control.items[0]
  return (
    <DropdownMenu
      modal={false}
      align="start"
      trigger={
        <Button variant="secondary" size="lg" shape="rounded" aria-label={`${control.label}: ${current.label}`}>
          {current.icon}
          {current.label}
          <NavArrowDown data-chevron />
        </Button>
      }
    >
      {control.items.map((i) => (
        <DropdownMenuItem key={i.value} icon={i.icon} label={i.label} selected={i.value === value} onSelect={() => onChange(i.value)} />
      ))}
    </DropdownMenu>
  )
}
