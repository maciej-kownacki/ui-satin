import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { DropdownMenu, DropdownMenuItem } from '../components/dropdown'
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggle, type ToolbarProps } from '../components/toolbar'

const Icon = () => <svg aria-hidden />

function Formatting(props: Partial<ToolbarProps>) {
  return (
    <>
      <button>Before</button>
      <Toolbar aria-label="Formatting" {...props}>
        <ToolbarButton>Paragraph</ToolbarButton>
        <ToolbarSeparator />
        <ToolbarToggle icon={<Icon />} label="Bold" shortcut="⌘B" />
        <ToolbarToggle icon={<Icon />} label="Italic" shortcut="⌘I" />
        <ToolbarSeparator />
        <ToolbarButton icon={<Icon />} label="Link" />
      </Toolbar>
      <button>After</button>
    </>
  )
}

const item = (name: string) => screen.getByRole('button', { name })

afterEach(() => document.documentElement.removeAttribute('dir'))

describe('Toolbar', () => {
  it('is a named toolbar with separators across it', () => {
    renderWithSatin(<Formatting />)
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })
    expect(toolbar.getAttribute('data-slot')).toBe('toolbar')
    expect(toolbar.getAttribute('aria-orientation')).toBe('horizontal')
    const separators = screen.getAllByRole('separator')
    expect(separators).toHaveLength(2)
    expect(separators[0].getAttribute('aria-orientation')).toBe('vertical')
    expect(separators[0].getAttribute('data-slot')).toBe('toolbar-separator')
  })

  it('moves focus with the arrows, Home and End, and wraps', async () => {
    const { user } = renderWithSatin(<Formatting />)
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(item('Paragraph'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(item('Bold'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(item('Italic'))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(item('Bold'))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(item('Link'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(item('Paragraph'))
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(item('Paragraph'))
  })

  it('is one tab stop: Tab enters it once and leaves it', async () => {
    const { user } = renderWithSatin(<Formatting />)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Before' }))
    await user.tab()
    expect(document.activeElement).toBe(item('Paragraph'))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
    // Back in, it lands on the item focused last.
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(item('Paragraph'))
  })

  it.each([
    ['a dir on the toolbar', { dir: 'rtl' as const }, undefined],
    ['a right-to-left page', {}, 'rtl' as const],
  ])('flips the arrows with %s', async (_, props, dir) => {
    const { user } = renderWithSatin(<Formatting {...props} />, { dir })
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(item('Paragraph'))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(item('Bold'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(item('Paragraph'))
  })

  it('moves with ↑ and ↓ when vertical', async () => {
    const { user } = renderWithSatin(<Formatting orientation="vertical" />)
    expect(screen.getAllByRole('separator')[0].getAttribute('aria-orientation')).toBe('horizontal')
    await user.tab()
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(item('Bold'))
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(item('Paragraph'))
  })

  it('toggles aria-pressed on click, Enter and Space', async () => {
    const onPressedChange = vi.fn()
    const { user } = renderWithSatin(
      <Toolbar aria-label="Formatting">
        <ToolbarToggle icon={<Icon />} label="Bold" onPressedChange={onPressedChange} />
      </Toolbar>,
    )
    const bold = item('Bold')
    expect(bold.getAttribute('aria-pressed')).toBe('false')
    await user.click(bold)
    expect(bold.getAttribute('aria-pressed')).toBe('true')
    // The pressed look reads data-state, which the tooltip's trigger must not take over.
    expect(bold.getAttribute('data-state')).toBe('on')
    bold.focus()
    await user.keyboard('{Enter}')
    expect(bold.getAttribute('aria-pressed')).toBe('false')
    await user.keyboard(' ')
    expect(bold.getAttribute('aria-pressed')).toBe('true')
    expect(onPressedChange.mock.calls).toEqual([[true], [false], [true]])
  })

  it('follows a controlled pressed', async () => {
    const { user, rerender } = renderWithSatin(
      <Toolbar aria-label="Formatting">
        <ToolbarToggle icon={<Icon />} label="Bold" pressed />
      </Toolbar>,
    )
    await user.click(item('Bold'))
    expect(item('Bold').getAttribute('aria-pressed')).toBe('true')
    rerender(
      <Toolbar aria-label="Formatting">
        <ToolbarToggle icon={<Icon />} label="Bold" pressed={false} />
      </Toolbar>,
    )
    expect(item('Bold').getAttribute('aria-pressed')).toBe('false')
  })

  it('shows the label and the shortcut in a tooltip on focus', async () => {
    const { user } = renderWithSatin(<Formatting />)
    await user.tab()
    await user.tab()
    await user.keyboard('{ArrowRight}')
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip.textContent).toContain('Bold')
    expect(tooltip.textContent).toContain('⌘')
    expect(tooltip.textContent).toContain('B')
    expect(item('Bold').getAttribute('aria-keyshortcuts')).toBe('Meta+B')
  })

  it('keeps focus where it is on press with preventFocusOnPress', () => {
    const onMouseDown = vi.fn()
    renderWithSatin(
      <Toolbar aria-label="Formatting" preventFocusOnPress>
        <ToolbarToggle icon={<Icon />} label="Bold" onMouseDown={onMouseDown} />
        <ToolbarButton icon={<Icon />} label="Link" />
      </Toolbar>,
    )
    expect(fireEvent.mouseDown(item('Bold'))).toBe(false)
    expect(fireEvent.mouseDown(item('Link'))).toBe(false)
    expect(onMouseDown).toHaveBeenCalledTimes(1)
  })

  it('lets a press take focus by default', () => {
    renderWithSatin(<Formatting />)
    expect(fireEvent.mouseDown(item('Link'))).toBe(true)
  })

  it('takes a ToolbarButton as a menu trigger', async () => {
    const { user } = renderWithSatin(
      <Toolbar aria-label="Formatting">
        <DropdownMenu trigger={<ToolbarButton>Paragraph</ToolbarButton>}>
          <DropdownMenuItem label="Heading 1" />
        </DropdownMenu>
        <ToolbarToggle icon={<Icon />} label="Bold" />
      </Toolbar>,
    )
    await user.tab()
    expect(document.activeElement).toBe(item('Paragraph'))
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('menuitem', { name: 'Heading 1' })).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(item('Paragraph'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(item('Bold'))
  })

  it('skips disabled items', async () => {
    const { user } = renderWithSatin(
      <Toolbar aria-label="Formatting">
        <ToolbarToggle icon={<Icon />} label="Bold" />
        <ToolbarToggle icon={<Icon />} label="Italic" disabled />
        <ToolbarButton icon={<Icon />} label="Link" />
      </Toolbar>,
    )
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(item('Link'))
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <>
        <Formatting />
        <Toolbar aria-label="Selection" variant="floating" size="md">
          <ToolbarToggle icon={<Icon />} label="Strikethrough" defaultPressed />
          <ToolbarButton>Ask AI</ToolbarButton>
        </Toolbar>
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
