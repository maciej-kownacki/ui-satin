import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Chip } from '../components/chip'
import { SearchBar } from '../components/search-bar'

describe('SearchBar', () => {
  it('focuses and selects the query on ⌘K and Ctrl+K, and Escape clears it', async () => {
    const { user } = renderWithSatin(<SearchBar defaultValue="react" />)
    const field = screen.getByRole('searchbox', { name: 'Search' })
    await user.keyboard('{Meta>}k{/Meta}')
    expect(document.activeElement).toBe(field)
    field.blur()
    await user.keyboard('{Control>}k{/Control}')
    expect(document.activeElement).toBe(field)
    await user.keyboard('{Escape}')
    expect((field as HTMLInputElement).value).toBe('')
  })

  it('shows `leading` before the query, and a click on the field focuses the query, not a chip button', async () => {
    const onRemove = vi.fn()
    const { user, container } = renderWithSatin(
      <SearchBar
        leading={
          <Chip size="sm" variant="outline" onRemove={onRemove}>
            Stage: Interview
          </Chip>
        }
      />,
    )
    await user.click(container.querySelector('[data-slot="search-bar"]')!)
    expect(onRemove).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search' }))
    await user.click(screen.getByRole('button', { name: 'Remove Stage: Interview' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('takes its name from the labels', () => {
    renderWithSatin(<SearchBar />, { labels: { searchField: 'Szukaj', search: 'Szukaj…' } })
    expect(screen.getByRole('searchbox', { name: 'Szukaj' }).getAttribute('placeholder')).toBe('Szukaj…')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<SearchBar leading={<Chip size="sm" variant="outline" onRemove={() => {}}>Owner: Ada</Chip>} />, { theme })
    await expectNoAxeViolations()
  })
})
