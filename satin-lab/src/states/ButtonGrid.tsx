import { Button } from '@satin/ui'
import { Calendar } from 'iconoir-react'

/**
 * Every Button style × state × size, laid out like the `Variants` frame on the uiKit button
 * page (3058:30253), so the two can be compared side by side. Hover, Pressed and Focus are
 * forced with data-force, which the satin-* variants treat like the real pseudo-classes.
 */
const styles = ['primary', 'destructive', 'secondary', 'tertiary', 'inverse'] as const
const states = ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled'] as const
const sizes = ['xs', 'default', 'lg', 'xl'] as const
const label = (s: string) => s[0].toUpperCase() + s.slice(1)
const force = (state: string) => (['Hover', 'Pressed', 'Focus'].includes(state) ? state.toLowerCase() : undefined)

export function ButtonGrid() {
  return (
    <div className="inline-grid grid-cols-[100px_80px_repeat(4,auto)] items-center gap-x-8 gap-y-6 p-8 text-xs text-text-muted">
      <span />
      <span />
      {sizes.map((size) => (
        <span key={size} className="text-text-default">{size}</span>
      ))}
      {styles.map((style) =>
        states.map((state, i) => (
          <div key={style + state} className="contents">
            <span className="text-sm text-text-default">{i === 0 ? label(style) : ''}</span>
            <span>{state}</span>
            {sizes.map((size) => (
              <div key={size} className="flex items-center gap-2">
                <Button variant={style} size={size} disabled={state === 'Disabled'} data-force={force(state)}>
                  <Calendar />
                  Button
                </Button>
                <Button variant={style} size={size} shape="rounded" disabled={state === 'Disabled'} data-force={force(state)}>
                  <Calendar />
                  Button
                </Button>
                <Button variant={style} size={size} iconOnly aria-label="Button" disabled={state === 'Disabled'} data-force={force(state)}>
                  <Calendar />
                </Button>
                <Button variant={style} size={size} shape="rounded" iconOnly aria-label="Button" disabled={state === 'Disabled'} data-force={force(state)}>
                  <Calendar />
                </Button>
              </div>
            ))}
          </div>
        )),
      )}
    </div>
  )
}
