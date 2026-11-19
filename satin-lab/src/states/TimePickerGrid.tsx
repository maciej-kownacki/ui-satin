import * as React from 'react'
import { FormField } from '@uisatin/ui/form-field'
import { DateTimePickerPanel, TimeList, TimePicker, type TimeValue } from '@uisatin/ui/time-picker'

/**
 * Time picker states: rows are state × size, columns empty / typed / typed invalid / unavailable /
 * FormField error; then the open list and the date-and-time panel with times before 9:00 disabled.
 */
const states = ['default', 'hover', 'focus', 'disabled'] as const
const sizes = ['sm', 'md', 'lg'] as const
const NINE: TimeValue = { hours: 9, minutes: 0 }

/** Types `text` into the picker's field and leaves it, as a person would, so it shows what it read. */
function Typed({ text, ...props }: { text: string } & React.ComponentProps<typeof TimePicker>) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    const input = ref.current
    if (!input) return
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    // Typing opens the list; leaving the field reads the text and closes it.
    requestAnimationFrame(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
  }, [text])
  return <TimePicker {...props} ref={ref} />
}

const cols = [
  { name: 'empty', render: (p: React.ComponentProps<typeof TimePicker>) => <TimePicker {...p} /> },
  { name: 'filled', render: (p: React.ComponentProps<typeof TimePicker>) => <TimePicker {...p} defaultValue={{ hours: 14, minutes: 30 }} /> },
  { name: 'typed invalid', render: (p: React.ComponentProps<typeof TimePicker>) => <Typed {...p} text="25:99" /> },
  { name: 'unavailable', render: (p: React.ComponentProps<typeof TimePicker>) => <Typed {...p} text="8:00am" /> },
  {
    name: 'FormField error',
    render: (p: React.ComponentProps<typeof TimePicker>) => (
      <FormField label="Start time" error="Pick a slot from 9:00">
        <TimePicker {...p} label={undefined} defaultValue={{ hours: 14, minutes: 30 }} />
      </FormField>
    ),
  },
]

export function TimePickerGrid() {
  return (
    <div className="grid gap-8 p-8 text-xs text-text-muted">
      {sizes.map((size) => (
        <div key={size} className="inline-grid grid-cols-[90px_repeat(5,220px)] items-start gap-x-8 gap-y-6">
          <span />
          {cols.map((c) => (
            <span key={c.name}>{c.name}</span>
          ))}
          {states.map((state) => (
            <div key={state} className="contents">
              <span>
                {state} · {size}
              </span>
              {cols.map((c) => (
                <div key={c.name}>
                  {c.render({
                    size,
                    label: 'Start time',
                    min: NINE,
                    step: 30,
                    disabled: state === 'disabled',
                    'data-force': state === 'hover' || state === 'focus' ? state : undefined,
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-start gap-8">
        <div className="grid gap-2">
          <span>list · disabled before 9:00, 13:00 booked</span>
          <TimeList
            aria-label="Start time"
            className="h-60 w-48 rounded-xl border border-border-subtle bg-bg-popover"
            step={30}
            min={NINE}
            isTimeDisabled={(t) => t.hours === 13}
            defaultValue={{ hours: 14, minutes: 30 }}
          />
        </div>
        <div className="grid gap-2">
          <span>date and time panel</span>
          <DateTimePickerPanel value={new Date(2026, 10, 26, 14, 30)} step={30} minTime={NINE} today={new Date(2026, 10, 19)} />
        </div>
      </div>
    </div>
  )
}
