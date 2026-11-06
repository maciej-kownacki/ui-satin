import { Radio, RadioGroup } from '@satin/ui/radio'

/** _radioBase states laid out like uiKit 852:22410: rows are states, columns unchecked / checked. */
const rows = ['default', 'hover', 'focus', 'pressed', 'disabled'] as const

export function RadioGrid() {
  return (
    <div className="inline-grid grid-cols-[70px_40px_40px_160px_160px] items-center gap-x-2 gap-y-4 p-8 text-xs text-text-muted">
      <span />
      <span>off</span>
      <span>on</span>
      <span>label, left</span>
      <span>label, right</span>
      {rows.map((state) => {
        const force = state === 'hover' || state === 'focus' || state === 'pressed' ? state : undefined
        const disabled = state === 'disabled'
        return (
          <div key={state} className="contents">
            <span>{state}</span>
            <RadioGroup value="on" aria-label={`${state} off`}>
              <Radio value="off" aria-label="off" disabled={disabled} data-force={force} />
            </RadioGroup>
            <RadioGroup value="on" aria-label={`${state} on`}>
              <Radio value="on" aria-label="on" disabled={disabled} data-force={force} />
            </RadioGroup>
            <RadioGroup value="on" aria-label={`${state} left`}>
              <Radio value="on" label="Gluten-free" description="Description text" disabled={disabled} data-force={force} />
            </RadioGroup>
            <RadioGroup value="off" aria-label={`${state} right`}>
              <Radio
                value="on"
                label="Gluten-free"
                description="Description text"
                placement="right"
                disabled={disabled}
                data-force={force}
              />
            </RadioGroup>
          </div>
        )
      })}
    </div>
  )
}
