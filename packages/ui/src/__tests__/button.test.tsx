import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Button } from '../components/button'

describe('Button', () => {
  it('renders a button that Enter and Space press', async () => {
    const onClick = vi.fn()
    const { user } = renderWithSatin(<Button onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveProperty('type', 'button')
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('does nothing while loading, and says so', async () => {
    const onClick = vi.fn()
    const { user } = renderWithSatin(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.getAttribute('aria-busy')).toBe('true')
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <>
        <Button>Save</Button>
        <Button variant="secondary" iconOnly aria-label="More">
          <svg aria-hidden />
        </Button>
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
