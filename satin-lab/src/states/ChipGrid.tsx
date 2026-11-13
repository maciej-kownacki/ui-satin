import { Chip } from '@uisatin/ui/chip'

/**
 * Chip states laid out like the uiKit `Chip` set (3206:79959): rows are states, columns are
 * Outline and Subtle in md and sm, for every tone. Hover, Pressed and Focus use data-force.
 */
const tones = ['neutral', 'brand', 'sky', 'green', 'amber', 'red', 'fuchsia', 'plum'] as const
const states = ['default', 'hover', 'pressed', 'focus', 'disabled'] as const
const force = (s: string) => (s === 'hover' || s === 'pressed' || s === 'focus' ? s : undefined)

export function ChipGrid() {
  return (
    <div className="flex flex-col gap-10 p-8 text-xs text-text-muted">
      {tones.map((tone) => (
        <div key={tone} className="inline-grid grid-cols-[70px_repeat(4,max-content)] items-center gap-x-6 gap-y-3">
          <span className="text-sm text-text-default">{tone}</span>
          <span>outline md</span>
          <span>subtle md</span>
          <span>outline sm</span>
          <span>subtle sm</span>
          {states.map((state) => (
            <div key={state} className="contents">
              <span>{state}</span>
              {(['md', 'sm'] as const).flatMap((size) =>
                (['outline', 'subtle'] as const).map((variant) => (
                  <span key={variant + size}>
                    <Chip
                      tone={tone}
                      variant={variant}
                      size={size}
                      dot
                      disabled={state === 'disabled'}
                      data-force={force(state)}
                      onRemove={() => {}}
                    >
                      Gluten-free
                    </Chip>
                  </span>
                )),
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
