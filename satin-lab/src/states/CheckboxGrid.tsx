import { Checkbox } from '@satin/ui'

/** checkboxBase states laid out like uiKit 849:57531: rows are states, columns unchecked / checked / indeterminate. */
const rows = ['default', 'hover', 'focus', 'pressed', 'disabled'] as const
const cols = [false, true, 'indeterminate'] as const

export function CheckboxGrid() {
  return (
    <div className="inline-grid grid-cols-[70px_repeat(3,40px)] items-center gap-y-4 p-8 text-xs text-text-muted">
      <span />
      <span>off</span>
      <span>on</span>
      <span>mixed</span>
      {rows.map((state) => (
        <div key={state} className="contents">
          <span>{state}</span>
          {cols.map((checked) => (
            <span key={String(checked)}>
              <Checkbox
                aria-label={`${state} ${String(checked)}`}
                checked={checked}
                disabled={state === 'disabled'}
                data-force={state === 'hover' || state === 'focus' || state === 'pressed' ? state : undefined}
              />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
