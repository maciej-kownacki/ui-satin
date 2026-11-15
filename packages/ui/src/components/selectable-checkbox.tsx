'use client'

import * as React from 'react'
import { Checkbox, type CheckboxProps } from './checkbox'
import { SelectableCardBody, useSelectableIds, type SelectableCardBaseProps } from './selectable-card'

/**
 * SelectableCheckbox: a Checkbox as a whole card, for picking several options that each need a
 * line of explanation or an icon: integrations to connect, tools an agent may use, add-ons.
 * The card is the checkbox's `<label>`, so a click anywhere on it toggles the box, which sits
 * at the card's right edge, on the middle of the title's first line. Checked cards take the
 * action/primary border. Lay them out in a grid, or a FieldGroup with `variant="choices"` for
 * one legend and one error.
 */
export interface SelectableCheckboxProps
  extends Omit<CheckboxProps, 'label' | 'description' | 'placement' | 'title' | 'children'>,
    SelectableCardBaseProps {}

export function SelectableCheckbox({ title, description, icon, size = 'md', className, children, id, ...props }: SelectableCheckboxProps) {
  const { controlId, ...aria } = useSelectableIds(id, description)
  return (
    <label htmlFor={controlId} data-slot="selectable-card" data-size={size} data-kind="checkbox" className={className}>
      <SelectableCardBody id={controlId} title={title} description={description} icon={icon} size={size}>
        {children}
      </SelectableCardBody>
      {/* A direct child of the label, so hovering the card hovers the box. */}
      <Checkbox id={controlId} {...aria} {...props} />
    </label>
  )
}
