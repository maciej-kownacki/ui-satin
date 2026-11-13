import { Input } from '@uisatin/ui/input'
import { NavArrowDown, HomeSimple } from 'iconoir-react'

/** Input states laid out like uiKit 820:51657: rows are state × size, columns empty / filled / error / error filled. */
const states = ['default', 'hover', 'focus', 'disabled'] as const
const sizes = ['sm', 'md', 'lg'] as const
const cols = [
  { name: 'empty', filled: false, error: false },
  { name: 'filled', filled: true, error: false },
  { name: 'error', filled: false, error: true },
  { name: 'error filled', filled: true, error: true },
]

export function InputGrid() {
  return (
    <div className="grid gap-8 p-8 text-xs text-text-muted">
      {sizes.map((size) => (
        <div key={size} className="inline-grid grid-cols-[90px_repeat(4,247px)] items-start gap-x-8 gap-y-6">
          <span />
          {cols.map((c) => (
            <span key={c.name}>{c.name}</span>
          ))}
          {states.map((state) => (
            <div key={state} className="contents">
              <span>
                {state} · {size}
              </span>
              {cols.map((c) =>
                state === 'disabled' && c.error ? (
                  <span key={c.name} />
                ) : (
                  <Input
                    key={c.name}
                    size={size}
                    label="Label"
                    placeholder="Placeholder"
                    defaultValue={c.filled ? 'Placeholder' : undefined}
                    hint="This is an input description"
                    error={c.error ? 'Error message for input' : undefined}
                    disabled={state === 'disabled'}
                    leadingIcon={<HomeSimple />}
                    trailingIcon={<NavArrowDown />}
                    data-force={state === 'hover' || state === 'focus' ? state : undefined}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
