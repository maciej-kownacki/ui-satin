import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { FormField, useFormField } from '../components/form-field'
import { Input } from '../components/input'

/** A control that isn't natively labelable, named by the field's label. */
function Editable() {
  const field = useFormField()!
  return <div id={field.id} role="textbox" contentEditable suppressContentEditableWarning tabIndex={0} aria-labelledby={field.labelId} />
}

describe('FormField', () => {
  it('gives the label an id in context', () => {
    renderWithSatin(
      <FormField label="Notes" htmlFor="notes">
        <Editable />
      </FormField>,
    )
    expect(screen.getByText('Notes').id).toBe('notes-label')
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeTruthy()
  })

  it('focuses a control that is not natively labelable when the label is clicked', async () => {
    const { user } = renderWithSatin(
      <FormField label="Notes">
        <Editable />
      </FormField>,
    )
    await user.click(screen.getByText('Notes'))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Notes' }))
  })

  it('leaves an input to the native label', async () => {
    const { user } = renderWithSatin(
      <FormField label="Name">
        <Input />
      </FormField>,
    )
    await user.click(screen.getByText('Name'))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }))
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <FormField label="Notes" description="Shown to the team">
        <Editable />
      </FormField>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
