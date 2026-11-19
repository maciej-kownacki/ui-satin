import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Combobox } from '../components/combobox'

const options = [
  { value: 'ams', label: 'Amsterdam' },
  { value: 'ber', label: 'Berlin' },
  { value: 'waw', label: 'Warsaw' },
]

describe('Combobox', () => {
  it('opens with Enter, filters as you type, picks with the arrows and Enter', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<Combobox label="City" options={options} onValueChange={onValueChange} />)
    const trigger = screen.getByRole('button', { name: /City/ })
    await user.tab()
    expect(document.activeElement).toBe(trigger)
    await user.keyboard('{Enter}')
    const search = screen.getByRole('combobox')
    expect(document.activeElement).toBe(search)
    await user.keyboard('ar')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Warsaw'])
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(['waw'])
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('closes with Escape and gives focus back to the field', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={options} />)
    const trigger = screen.getByRole('button', { name: /City/ })
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('says "no results" in the words it is given', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={options} />, { labels: { noResults: 'Brak wyników' } })
    await user.click(screen.getByRole('button', { name: /City/ }))
    await user.keyboard('xyz')
    expect(screen.getByText('Brak wyników')).toBeTruthy()
  })

  it('keeps the row the arrows reach in view', async () => {
    // jsdom has no layout: watch the call instead of the scroll.
    const scrolled: string[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.textContent ?? '')
    }
    try {
      const { user } = renderWithSatin(<Combobox label="City" options={options} />)
      await user.click(screen.getByRole('button', { name: /City/ }))
      await user.keyboard('{ArrowDown}{ArrowDown}')
      expect(scrolled.at(-1)).toBe('Warsaw')
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('names its panel after the field', async () => {
    const { user } = renderWithSatin(<Combobox label="City" options={options} />)
    await user.click(screen.getByRole('button', { name: /City/ }))
    expect(screen.getByRole('dialog', { name: 'City' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations open, in %s', async (theme) => {
    const { user } = renderWithSatin(<Combobox label="City" options={options} />, { theme })
    await user.click(screen.getByRole('button', { name: /City/ }))
    await expectNoAxeViolations()
  })
})

const skills = [
  { value: 'react', label: 'React' },
  { value: 'figma', label: 'Figma' },
  { value: 'motion', label: 'Motion design' },
]

/** A promise the test settles by hand, to see the row while it waits. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const names = () => screen.getAllByRole('option').map((o) => o.textContent)

describe('Combobox creatable', () => {
  it('stays as it was without creatable: no create row, just "No results"', async () => {
    const { user } = renderWithSatin(<Combobox label="Skills" options={skills} />)
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    await user.keyboard('Framer Motion')
    expect(screen.queryByRole('option')).toBeNull()
    expect(screen.getByText('No results')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('ends the list with Create "…" while no label is exactly the query', async () => {
    const { user } = renderWithSatin(<Combobox label="Skills" options={skills} creatable />)
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    expect(screen.queryByRole('option', { name: /Create/ })).toBeNull()
    await user.keyboard('Framer Motion')
    expect(names()).toEqual(['Create “Framer Motion”'])
    expect(screen.queryByText('No results')).toBeNull()
    await user.clear(screen.getByRole('combobox'))
    await user.keyboard('mot')
    expect(names()).toEqual(['Motion design', 'Create “mot”'])
  })

  it('hides the create row on an exact match, case aside', async () => {
    const { user } = renderWithSatin(<Combobox label="Skills" options={skills} creatable />)
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    await user.keyboard('  fIGMA ')
    expect(names()).toEqual(['Figma'])
  })

  it('creates with the arrows and Enter, picks the new option and keeps the list open (multiple)', async () => {
    const onCreate = vi.fn((query: string) => ({ value: 'framer-motion', label: query }))
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(
      <Combobox label="Skills" multiple options={skills} defaultValue={['react']} creatable onCreate={onCreate} onValueChange={onValueChange} />,
    )
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    const search = screen.getByRole('combobox')
    await user.keyboard(' Motion ')
    // Motion design first, then the create row: one step down.
    await user.keyboard('{ArrowDown}')
    const row = screen.getByRole('option', { name: 'Create “Motion”' })
    expect(search.getAttribute('aria-activedescendant')).toBe(row.id)
    await user.keyboard('{Enter}')
    expect(onCreate).toHaveBeenCalledWith('Motion')
    expect(onValueChange).toHaveBeenLastCalledWith(['react', 'framer-motion'])
    // The whole list is back, the new option at its end, picked and highlighted.
    expect(search).toHaveProperty('value', '')
    const created = screen.getAllByRole('option').at(-1)!
    expect(names()).toEqual(['React(selected)', 'Figma', 'Motion design', 'Motion(selected)'])
    expect(created.getAttribute('aria-selected')).toBe('true')
    expect(search.getAttribute('aria-activedescendant')).toBe(created.id)
    expect(screen.getByRole('button', { name: 'Remove Motion' })).toBeTruthy()
  })

  it('shows a Spinner while onCreate is on its way, then picks what it made', async () => {
    const pending = deferred<{ value: string; label: string }>()
    const { user } = renderWithSatin(<Combobox label="Skills" multiple options={skills} creatable onCreate={() => pending.promise} />)
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    await user.keyboard('Framer Motion{Enter}')
    const row = screen.getByRole('option', { name: 'Create “Framer Motion”' })
    expect(row.getAttribute('aria-busy')).toBe('true')
    expect(row.getAttribute('aria-disabled')).toBe('true')
    expect(row.querySelector('[data-slot="spinner"]')).toBeTruthy()
    await act(async () => pending.resolve({ value: 'framer-motion', label: 'Framer Motion' }))
    expect(screen.queryByRole('option', { name: /Create/ })).toBeNull()
    expect(screen.getByRole('option', { name: /Framer Motion/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Remove Framer Motion' })).toBeTruthy()
  })

  it('says when creating failed, and Enter tries again', async () => {
    const onCreate = vi
      .fn<(query: string) => Promise<{ value: string; label: string }>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ value: 'framer-motion', label: 'Framer Motion' })
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<Combobox label="Skills" options={skills} creatable onCreate={onCreate} onValueChange={onValueChange} />)
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    await user.keyboard('Framer Motion{Enter}')
    expect(screen.getByRole('status').textContent).toBe('Couldn’t create it. Try again.')
    const row = screen.getByRole('option', { name: /Create “Framer Motion”/ })
    expect(row.textContent).toContain('Couldn’t create it. Try again.')
    expect(row.getAttribute('data-state')).toBe('failed')
    expect(onValueChange).not.toHaveBeenCalled()
    // A single pick fills the field and closes the list.
    await user.keyboard('{Enter}')
    expect(onCreate).toHaveBeenCalledTimes(2)
    expect(onValueChange).toHaveBeenLastCalledWith(['framer-motion'])
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('button', { name: /Skills/ }).textContent).toContain('Framer Motion')
  })

  it('says it failed when onCreate throws', async () => {
    const { user } = renderWithSatin(
      <Combobox
        label="Skills"
        options={skills}
        creatable
        onCreate={() => {
          throw new Error('no')
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    await user.keyboard('Framer Motion')
    await user.click(screen.getByRole('option', { name: /Create/ }))
    expect(screen.getByRole('status').textContent).toBe('Couldn’t create it. Try again.')
  })

  it('without onCreate, makes the option from the query', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<Combobox label="Skills" options={skills} creatable onValueChange={onValueChange} />)
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    await user.keyboard('Framer Motion{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith(['Framer Motion'])
  })

  it('with a footer, the new option waits for Apply; Cancel drops the pick but keeps the option', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(
      <Combobox label="Skills" multiple footer options={skills} creatable onCreate={(q) => ({ value: 'fm', label: q })} onValueChange={onValueChange} />,
    )
    const trigger = screen.getByRole('button', { name: /Skills/ })
    await user.click(trigger)
    await user.keyboard('Framer Motion{Enter}')
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { name: /Framer Motion/ }).getAttribute('aria-selected')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onValueChange).not.toHaveBeenCalled()
    await user.click(trigger)
    const option = screen.getByRole('option', { name: 'Framer Motion' })
    expect(option.getAttribute('aria-selected')).toBe('false')
    await user.click(option)
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onValueChange).toHaveBeenLastCalledWith(['fm'])
  })

  it('words the row with creatable.label', async () => {
    const { user } = renderWithSatin(<Combobox label="Skills" options={skills} creatable={{ label: (q) => `Add skill “${q}”` }} />)
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    await user.keyboard('Framer Motion')
    expect(names()).toEqual(['Add skill “Framer Motion”'])
  })

  it('speaks the language it is given', async () => {
    const { user } = renderWithSatin(<Combobox label="Umiejętności" options={skills} creatable onCreate={() => Promise.reject(new Error('x'))} />, {
      labels: { createOption: (q) => `Utwórz „${q}”`, createFailed: 'Nie udało się utworzyć. Spróbuj ponownie.' },
    })
    await user.click(screen.getByRole('button', { name: /Umiejętności/ }))
    await user.keyboard('Framer Motion')
    expect(screen.getByRole('option', { name: 'Utwórz „Framer Motion”' })).toBeTruthy()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status').textContent).toBe('Nie udało się utworzyć. Spróbuj ponownie.')
  })

  it.each(['light', 'dark'] as const)('has no axe violations with the create row, in %s', async (theme) => {
    const { user } = renderWithSatin(<Combobox label="Skills" multiple options={skills} creatable onCreate={() => Promise.reject(new Error('x'))} />, { theme })
    await user.click(screen.getByRole('button', { name: /Skills/ }))
    await user.keyboard('mot{ArrowDown}')
    await expectNoAxeViolations()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('option', { name: /Create “mot”/ }).getAttribute('data-state')).toBe('failed')
    await expectNoAxeViolations()
  })
})
