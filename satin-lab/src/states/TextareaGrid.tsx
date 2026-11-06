import { Textarea } from '@satin/ui/textarea'

/** Textarea states laid out like uiKit 3647:17812: rows are states, columns empty / filled / error / error filled. */
const states = ['default', 'hover', 'focus', 'disabled'] as const
const text = 'Table by the window, one high chair. Guest is allergic to peanuts — please flag it for the kitchen.'
const cols = [
  { name: 'empty', filled: false, error: false },
  { name: 'filled', filled: true, error: false },
  { name: 'error', filled: false, error: true },
  { name: 'error filled', filled: true, error: true },
]

export function TextareaGrid() {
  return (
    <div className="inline-grid grid-cols-[70px_repeat(4,320px)] items-start gap-x-8 gap-y-6 p-8 text-xs text-text-muted">
      <span />
      {cols.map((c) => (
        <span key={c.name}>{c.name}</span>
      ))}
      {states.map((state) => (
        <div key={state} className="contents">
          <span>{state}</span>
          {cols.map((c) =>
            state === 'disabled' && c.error ? (
              <span key={c.name} />
            ) : (
              <Textarea
                key={c.name}
                label="Special requests"
                optional
                placeholder="Allergies, seating, occasion…"
                defaultValue={c.filled ? text : undefined}
                hint="Shown to the host and printed on the kitchen ticket."
                error={c.error ? 'Keep it under 120 characters so it fits on the ticket.' : undefined}
                maxLength={120}
                disabled={state === 'disabled'}
                data-force={state === 'hover' || state === 'focus' ? state : undefined}
              />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
