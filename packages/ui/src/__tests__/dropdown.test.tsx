import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Button } from '../components/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../components/dropdown'

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

/* Submenus and checkable rows: a candidate's ⋯ menu with Move to ›, and a board's view options. */

const stages = [
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
]

function CandidateMenu({ onMove, onArchive }: { onMove?: (stage: string) => void; onArchive?: () => void }) {
  const [stage, setStage] = React.useState('screening')
  return (
    <DropdownMenu trigger={<Button>More</Button>}>
      <DropdownMenuItem label="Open profile" />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger label="Move to" />
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup
            value={stage}
            onValueChange={(next) => {
              setStage(next)
              onMove?.(next)
            }}
          >
            {stages.map((s) => (
              <DropdownMenuRadioItem key={s.value} value={s.value} label={s.label} disabled={s.value === 'offer'} />
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem label="Archive" onSelect={onArchive} />
    </DropdownMenu>
  )
}

function ViewMenu({ onColumns }: { onColumns?: (column: string, on: boolean) => void }) {
  return (
    <DropdownMenu trigger={<Button>View</Button>}>
      <DropdownMenuGroup label="Show columns">
        {stages.map((s) => (
          <DropdownMenuCheckboxItem
            key={s.value}
            label={s.label}
            defaultChecked={s.value !== 'offer'}
            onCheckedChange={(on) => onColumns?.(s.value, on)}
          />
        ))}
      </DropdownMenuGroup>
      <DropdownMenuRadioGroup label="Sort by" defaultValue="newest">
        <DropdownMenuRadioItem value="newest" label="Newest first" />
        <DropdownMenuRadioItem value="name" label="Name" />
      </DropdownMenuRadioGroup>
    </DropdownMenu>
  )
}

const focused = () => document.activeElement?.textContent

describe('DropdownMenu submenus', () => {
  it('opens a submenu with → on its first row and closes it with ←, back on its row', async () => {
    const { user } = renderWithSatin(<CandidateMenu />)
    await user.tab()
    await user.keyboard('{Enter}{ArrowDown}')
    const row = screen.getByRole('menuitem', { name: 'Move to' })
    expect(row.getAttribute('aria-haspopup')).toBe('menu')
    expect(row.getAttribute('aria-expanded')).toBe('false')
    await user.keyboard('{ArrowRight}')
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('menu')).toHaveLength(2)
    await waitFor(() => expect(focused()).toBe('Screening'))
    await user.keyboard('{ArrowLeft}')
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(document.activeElement).toBe(row)
  })

  it('opens with Enter, and Escape closes every menu and returns to the trigger', async () => {
    const { user } = renderWithSatin(<CandidateMenu />)
    await user.tab()
    await user.keyboard('{Enter}{ArrowDown}{Enter}')
    await waitFor(() => expect(focused()).toBe('Screening'))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'More' }))
  })

  it('opens on hover', async () => {
    const { user } = renderWithSatin(<CandidateMenu />)
    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.hover(screen.getByRole('menuitem', { name: 'Move to' }))
    expect(await screen.findByRole('menuitemradio', { name: 'Interview' })).toBeTruthy()
  })

  it('mirrors right to left: ← opens the submenu, → closes it', async () => {
    const { user } = renderWithSatin(<CandidateMenu />, { dir: 'rtl' })
    await user.tab()
    await user.keyboard('{Enter}{ArrowDown}')
    expect(screen.getByRole('menu').getAttribute('dir')).toBe('rtl')
    await user.keyboard('{ArrowRight}')
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    await user.keyboard('{ArrowLeft}')
    expect(screen.getAllByRole('menu')).toHaveLength(2)
    await waitFor(() => expect(focused()).toBe('Screening'))
    await user.keyboard('{ArrowRight}')
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(focused()).toBe('Move to')
  })

  it('a radio row marks the current one, skips a disabled one, and closes the menu once chosen', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<CandidateMenu onMove={onMove} />)
    await user.tab()
    await user.keyboard('{Enter}{ArrowDown}{ArrowRight}')
    await waitFor(() => expect(focused()).toBe('Screening'))
    expect(screen.getByRole('menuitemradio', { name: 'Screening' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('menuitemradio', { name: 'Offer' }).getAttribute('aria-disabled')).toBe('true')
    // Down past Interview: the disabled Offer is skipped, focus wraps no further.
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(focused()).toBe('Interview')
    await user.keyboard('{Enter}')
    expect(onMove).toHaveBeenCalledWith('interview')
    expect(screen.queryByRole('menu')).toBeNull()
    await user.keyboard('{Enter}{ArrowDown}{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'Interview' }).getAttribute('aria-checked')).toBe('true'))
  })
})

describe('DropdownMenu checkable rows', () => {
  it('Space toggles a checkbox row and the menu stays open', async () => {
    const onColumns = vi.fn()
    const { user } = renderWithSatin(<ViewMenu onColumns={onColumns} />)
    await user.tab()
    await user.keyboard('{Enter}')
    const screening = screen.getByRole('menuitemcheckbox', { name: 'Screening' })
    expect(screening.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('menuitemcheckbox', { name: 'Offer' }).getAttribute('aria-checked')).toBe('false')
    await user.keyboard(' ')
    expect(onColumns).toHaveBeenCalledWith('screening', false)
    expect(screening.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(document.activeElement).toBe(screening)
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onColumns).toHaveBeenLastCalledWith('offer', true)
    expect(screen.getByRole('menuitemcheckbox', { name: 'Offer' }).getAttribute('aria-checked')).toBe('true')
  })

  it('a controlled checkbox row follows its checked prop; closeOnSelect closes the menu', async () => {
    function Controlled() {
      const [on, setOn] = React.useState<boolean | 'indeterminate'>('indeterminate')
      return (
        <DropdownMenu trigger={<Button>Columns</Button>}>
          <DropdownMenuCheckboxItem label="All columns" checked={on} onCheckedChange={setOn} closeOnSelect />
        </DropdownMenu>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitemcheckbox', { name: 'All columns' }).getAttribute('aria-checked')).toBe('mixed')
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('menu')).toBeNull()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitemcheckbox', { name: 'All columns' }).getAttribute('aria-checked')).toBe('true')
  })

  it('names its groups after their headers', async () => {
    const { user } = renderWithSatin(<ViewMenu />)
    await user.click(screen.getByRole('button', { name: 'View' }))
    expect(screen.getByRole('group', { name: 'Show columns' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Sort by' })).toBeTruthy()
    expect(screen.getByRole('menuitemradio', { name: 'Newest first' }).getAttribute('aria-checked')).toBe('true')
  })

  it.each(['light', 'dark'] as const)('has no axe violations with a submenu open, in %s', async (theme) => {
    const { user } = renderWithSatin(<CandidateMenu />, { theme })
    await user.tab()
    await user.keyboard('{Enter}{ArrowDown}{ArrowRight}')
    await waitFor(() => expect(focused()).toBe('Screening'))
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations with checkable rows, in %s', async (theme) => {
    const { user } = renderWithSatin(<ViewMenu />, { theme })
    await user.click(screen.getByRole('button', { name: 'View' }))
    await expectNoAxeViolations()
  })
})
