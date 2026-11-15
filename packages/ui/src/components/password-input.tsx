'use client'

import * as React from 'react'
import { Eye, EyeClosed } from 'iconoir-react'
import { Button } from './button'
import { Input, type InputProps } from './input'
import { useSatinLabels } from './labels'

/**
 * PasswordInput: an Input of type password with a show / hide button in the trailing slot.
 * The button is an xs tertiary icon button named "Show password" / "Hide password" (from
 * SatinLabels) with `aria-pressed`, and showing the password never moves the caret or the
 * focus. `autoComplete` defaults to `current-password`; pass `new-password` on sign-up.
 *
 * Everything else is Input: sizes, `leadingIcon`, `hint`, `error`, and FormField wiring.
 */
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'trailingIcon' | 'trailingText'> {
  /** Show the password; leave out to let the button control it. */
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
}

export function PasswordInput({ visible, onVisibleChange, autoComplete = 'current-password', disabled, ...props }: PasswordInputProps) {
  const labels = useSatinLabels()
  const [own, setOwn] = React.useState(false)
  const shown = visible ?? own
  const toggle = () => {
    if (visible === undefined) setOwn(!shown)
    onVisibleChange?.(!shown)
  }
  return (
    <Input
      {...props}
      disabled={disabled}
      type={shown ? 'text' : 'password'}
      autoComplete={autoComplete}
      trailingIcon={
        <Button
          variant="tertiary"
          size="xs"
          iconOnly
          disabled={disabled}
          aria-label={shown ? labels.hidePassword : labels.showPassword}
          aria-pressed={shown}
          // Keep the focus (and the caret) in the field while toggling.
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          // 24px in the 16px icon slot: -4px all round keeps it centred on the field.
          className="-m-1"
        >
          {shown ? <EyeClosed /> : <Eye />}
        </Button>
      }
    />
  )
}
