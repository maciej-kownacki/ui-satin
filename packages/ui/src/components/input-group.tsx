'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { ButtonDefaultsContext } from './button'
import { FieldSizeContext } from './form-field'

/**
 * InputGroup: a field joined with what belongs to it, in one block: an addon before or after
 * (`https://`, `.satin.dev`, a currency), a Select (country code, unit), or a Button (Copy,
 * Send, Subscribe). The inner corners go square and neighbours share one 1px border; the
 * focused field comes to the front so its ring is whole.
 *
 * `size` sizes every part to the same height: Inputs and Selects take it, Buttons take the
 * matching button size (sm 28 → md, md 32 → lg, lg 36 → xl) and secondary by default. In a
 * group a button draws its outline as a border, like the field, so both read the same height.
 *
 * Text that sits inside the field belongs on the Input itself (`leadingText`, `trailingText`,
 * icons); an addon is for a separate, boxed segment. Wrap the group in a FormField for the
 * label, description and error: the field inside picks them up.
 */
export interface InputGroupProps extends React.ComponentProps<'div'> {
  size?: 'sm' | 'md' | 'lg'
}

const buttonSize = { sm: 'md', md: 'lg', lg: 'xl' } as const

export function InputGroup({ size = 'md', className, ...props }: InputGroupProps) {
  const buttons = React.useMemo(() => ({ size: buttonSize[size], variant: 'secondary' as const }), [size])
  return (
    <FieldSizeContext.Provider value={size}>
      <ButtonDefaultsContext.Provider value={buttons}>
        <div
          role="group"
          data-slot="input-group"
          data-size={size}
          className={cn('flex w-full items-stretch', className)}
          {...props}
        />
      </ButtonDefaultsContext.Provider>
    </FieldSizeContext.Provider>
  )
}

/** A boxed segment of an InputGroup: text (`https://`, `€`), an icon, or a Kbd. */
export function InputGroupAddon({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="input-group-addon" className={cn('satin-input-addon', className)} {...props} />
}
