import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Button } from '../components/button'
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem } from '../components/dropdown'

function Menu({ onSelect }: { onSelect?: (label: string) => void }) {
  return (
    <DropdownMenu trigger={<Button>Actions</Button>}>
      <DropdownMenuGroup label="Deal">
        <DropdownMenuItem label="Rename" shortcut="⌘R" onSelect={() => onSelect?.('Rename')} />
        <DropdownMenuItem label="Duplicate" onSelect={() => onSelect?.('Duplicate')} />
        <DropdownMenuItem label="Archive" onSelect={() => onSelect?.('Archive')} />
      </DropdownMenuGroup>
    </DropdownMenu>
  )
}

describe('DropdownMenu', () => {
  it('opens with Enter, runs an item with the arrows and Enter, focus back on the trigger', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithSatin(<Menu onSelect={onSelect} />)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(document.activeElement?.textContent).toContain('Rename')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('Duplicate')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes with Escape without running anything', async () => {
    const onSelect = vi.fn()
    const { user } = renderWithSatin(<Menu onSelect={onSelect} />)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    await user.tab()
    await user.keyboard('{Enter}')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it.each(['light', 'dark'] as const)('has no axe violations open, in %s', async (theme) => {
    const { user } = renderWithSatin(<Menu />, { theme })
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await expectNoAxeViolations()
  })
})
