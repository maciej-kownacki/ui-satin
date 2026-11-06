import * as React from 'react'
import { Button, SegmentedControl, cn } from '@satin/ui'
import { Check, Copy, Collapse, Expand, NavArrowDown } from 'iconoir-react'

/**
 * The block every component page is built from: a preview with the live component
 * in the middle, a segmented control at the bottom that switches between its
 * high-level options, a full-screen button in the top right, and the code for the
 * selected option underneath.
 */
export type ShowcaseOption = { id: string; label: string; code: string }

export interface ShowcaseProps {
  /** Used in accessible names: "Button preview", "Button options". */
  name: string
  options: ShowcaseOption[]
  /** Shiki HTML per option id, rendered at build time. */
  codeHtml: Record<string, string>
  render: (optionId: string) => React.ReactNode
}

export function Showcase({ name, options, codeHtml, render }: ShowcaseProps) {
  const [option, setOption] = React.useState(options[0].id)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [codeOpen, setCodeOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const toggleRef = React.useRef<HTMLButtonElement>(null)
  const codeId = React.useId()

  const current = options.find((o) => o.id === option) ?? options[0]

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
  const mounted = React.useRef(false)
  React.useEffect(() => {
    if (mounted.current) toggleRef.current?.focus({ preventScroll: true })
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

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-bg-card shadow-xs">
      <div
        role={fullscreen ? 'dialog' : 'region'}
        aria-modal={fullscreen || undefined}
        aria-label={`${name} preview`}
        className={cn(
          'relative flex flex-col bg-bg-canvas',
          fullscreen ? 'fixed inset-0 z-50' : 'min-h-80',
        )}
      >
        <Button
          ref={toggleRef}
          variant="tertiary"
          size="lg"
          iconOnly
          aria-label={fullscreen ? 'Exit full screen' : 'Open full screen'}
          onClick={() => setFullscreen((v) => !v)}
          className="absolute top-3 right-3 z-10 text-text-muted"
        >
          {fullscreen ? <Collapse /> : <Expand />}
        </Button>

        {/* Too wide for the column? The stage scrolls sideways instead of squeezing the component. */}
        <div className="flex flex-1 overflow-x-auto">
          <div className="m-auto flex w-max min-w-full items-center justify-center px-4 pt-14 pb-6 sm:px-12">
            {render(current.id)}
          </div>
        </div>

        {options.length > 1 && (
          <div className="flex justify-center px-4 pb-4">
            <SegmentedControl
              aria-label={`${name} options`}
              size="xs"
              shape="rounded"
              border
              items={options.map((o) => ({ value: o.id, label: o.label }))}
              value={option}
              onValueChange={setOption}
            />
          </div>
        )}
      </div>

      <div className="flex h-11 items-center justify-between border-t border-border-subtle px-2">
        <Button
          variant="tertiary"
          aria-expanded={codeOpen}
          aria-controls={codeId}
          onClick={() => setCodeOpen((v) => !v)}
          className="text-text-muted hover:text-text-default"
        >
          <NavArrowDown
            className={cn(
              'transition-transform duration-(--duration-base) ease-(--ease-out)',
              !codeOpen && '-rotate-90',
            )}
          />
          {codeOpen ? 'Hide code' : 'Show code'}
        </Button>
        <Button variant="tertiary" onClick={copy} className="text-text-muted hover:text-text-default">
          {copied ? <Check /> : <Copy />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy code'}</span>
        </Button>
      </div>
      <div
        id={codeId}
        hidden={!codeOpen}
        className="code-block satin-collapsible border-t border-border-subtle bg-bg-card"
        data-state={codeOpen ? 'open' : 'closed'}
        dangerouslySetInnerHTML={{ __html: codeHtml[current.id] ?? '' }}
      />
    </div>
  )
}
