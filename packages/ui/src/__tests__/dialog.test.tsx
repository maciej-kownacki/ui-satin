import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Button } from '../components/button'
import { Dialog } from '../components/dialog'

const dialog = (
  <Dialog trigger={<Button>Rename</Button>} title="Rename project" description="Up to 40 characters." footer={<Button>Save</Button>}>
    <input aria-label="Name" />
  </Dialog>
)

describe('Dialog', () => {
  it('opens from its trigger with Enter and closes with Escape, focus back on the trigger', async () => {
    const { user } = renderWithSatin(dialog)
    const trigger = screen.getByRole('button', { name: 'Rename' })
    await user.tab()
    expect(document.activeElement).toBe(trigger)
    await user.keyboard('{Enter}')
    const open = screen.getByRole('dialog', { name: 'Rename project' })
    expect(open.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('names its close button with the labels', async () => {
    const { user } = renderWithSatin(dialog, { labels: { close: 'Zamknij' } })
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    await user.click(screen.getByRole('button', { name: 'Zamknij' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each(['light', 'dark'] as const)('has no axe violations open, in %s', async (theme) => {
    const { user } = renderWithSatin(dialog, { theme })
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    await expectNoAxeViolations()
  })
})
