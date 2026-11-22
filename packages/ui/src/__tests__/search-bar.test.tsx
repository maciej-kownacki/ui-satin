import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
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

  it('leaves ⌘K to a field that already handled it', async () => {
    const { user } = renderWithSatin(
      <>
        <SearchBar />
        <div role="textbox" tabIndex={0} aria-label="Editor" onKeyDown={(e) => e.key === 'k' && e.metaKey && e.preventDefault()} />
      </>,
    )
    const editor = screen.getByRole('textbox', { name: 'Editor' })
    editor.focus()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(document.activeElement).toBe(editor)
  })

  it('takes its name from the labels', () => {
    renderWithSatin(<SearchBar />, { labels: { searchField: 'Szukaj', search: 'Szukaj…' } })
    expect(screen.getByRole('searchbox', { name: 'Szukaj' }).getAttribute('placeholder')).toBe('Szukaj…')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<SearchBar />, { theme })
    await expectNoAxeViolations()
  })
})
