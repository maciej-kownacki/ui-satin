'use client'

import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { SelectableCardBody, useSelectableIds, type SelectableCardBaseProps } from './selectable-card'

/**
 * SelectableRadio: one option of a RadioGroup drawn as a whole card, with no radio circle: the
 * card itself is the radio (`role="radio"`), and the selected one is the card with the
 * action/primary border. For choices that need a line of explanation or an icon: plans,
 * roles, the mode an agent runs in.
 *
 * Put the cards in a `RadioGroup`, which owns the value: a click or Space picks a card, arrow
 * keys move between them, Tab enters and leaves the group. `icon` adds a 16px glyph in a tile
 * as tall as the title and description.
 */
export interface SelectableRadioProps
  extends Omit<React.ComponentProps<typeof RadioGroupPrimitive.Item>, 'title' | 'children' | 'asChild'>,
    SelectableCardBaseProps {}

export function SelectableRadio({ title, description, icon, size = 'md', className, children, id, ...props }: SelectableRadioProps) {
  const { controlId, ...aria } = useSelectableIds(id, description)
  return (
    <RadioGroupPrimitive.Item
      id={controlId}
      data-slot="selectable-card"
      data-size={size}
      data-kind="radio"
      {...aria}
      {...props}
      className={cn('w-full text-left', className)}
    >
      <SelectableCardBody id={controlId} title={title} description={description} icon={icon} size={size}>
        {children}
      </SelectableCardBody>
    </RadioGroupPrimitive.Item>
  )
}
