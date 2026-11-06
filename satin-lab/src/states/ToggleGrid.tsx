import { Toggle } from '@satin/ui/toggle'
import { HomeSimple } from 'iconoir-react'

/** Toggle states laid out like uiKit 852:21771: per variant and size, rows are pressed off / on, columns states. */
const variants = ['outline', 'ghost'] as const
const sizes = ['md', 'sm'] as const
const states = ['default', 'hover', 'focus', 'disabled'] as const

export function ToggleGrid() {
  return (
    <div className="grid gap-8 p-8 text-xs text-text-muted">
      {variants.map((variant) =>
        sizes.map((size) => (
          <div key={variant + size} className="inline-grid grid-cols-[120px_repeat(4,112px)] items-center gap-4">
            <span />
            {states.map((s) => (
              <span key={s}>{s}</span>
            ))}
            {[false, true].map((pressed) =>
              [false, true].map((iconOnly) => (
                <div key={`${pressed}${iconOnly}`} className="contents">
                  <span>
                    {variant} {size} {pressed ? 'on' : 'off'}
                    {iconOnly ? ' icon' : ''}
                  </span>
                  {states.map((state) => (
                    <span key={state}>
                      <Toggle
                        variant={variant}
                        size={size}
                        iconOnly={iconOnly}
                        icon={<HomeSimple />}
                        aria-label={iconOnly ? 'Action' : undefined}
                        pressed={pressed}
                        disabled={state === 'disabled'}
                        data-force={state === 'hover' || state === 'focus' ? state : undefined}
                      >
                        Action
                      </Toggle>
                    </span>
                  ))}
                </div>
              )),
            )}
          </div>
        )),
      )}
    </div>
  )
}
