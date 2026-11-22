import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { CharacterCount, Textarea } from '../components/textarea'

describe('CharacterCount', () => {
  it('reads the count against a limit', () => {
    renderWithSatin(<CharacterCount data-testid="count" count={134} max={120} />)
    const el = screen.getByTestId('count')
    expect(el.textContent).toBe('Characters used: 134/120')
    expect(el.className).toContain('text-text-destructive')
  })

  it('stays muted under the limit', () => {
    renderWithSatin(<CharacterCount data-testid="count" count={12} max={120} />)
    expect(screen.getByTestId('count').className).not.toContain('text-text-destructive')
  })

  it('says the count in words without a limit', () => {
    const { rerender } = renderWithSatin(<CharacterCount data-testid="count" count={1948} />)
    expect(screen.getByTestId('count').textContent).toBe('1,948 characters')
    rerender(<CharacterCount data-testid="count" count={1} />)
    expect(screen.getByTestId('count').textContent).toBe('1 character')
  })

  it('takes its words and number format from SatinLabels', () => {
    renderWithSatin(
      <>
        <CharacterCount data-testid="free" count={1948} />
        <CharacterCount data-testid="max" count={3} max={10} />
      </>,
      {
        labels: {
          dateLocale: 'de-DE',
          charactersUsed: 'Zeichen',
          characterCount: (count, formatted) => `${formatted} ${count === 1 ? 'Zeichen' : 'Zeichen gesamt'}`,
        },
      },
    )
    expect(screen.getByTestId('free').textContent).toBe('1.948 Zeichen gesamt')
    expect(screen.getByTestId('max').textContent).toBe('Zeichen: 3/10')
  })

  it('is the counter Textarea describes itself with', () => {
    renderWithSatin(<Textarea label="Bio" id="bio" defaultValue="Hello" maxLength={120} />)
    const field = screen.getByRole('textbox', { name: 'Bio' })
    expect(field.getAttribute('aria-describedby')).toBe('bio-counter')
    expect(document.getElementById('bio-counter')!.textContent).toBe('Characters used: 5/120')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <>
        <Textarea label="Bio" defaultValue="Hello" maxLength={3} />
        <CharacterCount count={948} />
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
