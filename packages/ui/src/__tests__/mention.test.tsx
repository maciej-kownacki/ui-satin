import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import {
  Mention,
  PromptMentionsMenu,
  usePromptMenuState,
  type PromptMenuItem,
  type PromptMenuQuery,
  type PromptMention,
} from '../components/prompt-mentions'

const people: PromptMention[] = [
  { id: 'tara', label: 'Tara Mendes', description: 'Recruiter' },
  { id: 'tom', label: 'Tom Okafor', description: 'Engineering manager' },
]
const search = (query: string) => people.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))

describe('Mention', () => {
  it('reads as its trigger and label and carries its id', () => {
    renderWithSatin(<Mention label="Tara Mendes" id="tara" data-testid="m" />)
    const el = screen.getByTestId('m')
    expect(el.textContent).toBe('@Tara Mendes')
    expect(el.getAttribute('data-slot')).toBe('mention')
    expect(el.getAttribute('data-mention-id')).toBe('tara')
    expect(el.id).toBe('')
    expect(screen.getByText('@Tara Mendes')).toBe(el)
  })

  it('takes another trigger and passes ref', () => {
    const ref = React.createRef<HTMLSpanElement>()
    renderWithSatin(<Mention label="ACME-12" trigger="#" ref={ref} />)
    expect(ref.current?.textContent).toBe('#ACME-12')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <p>
        Ask <Mention label="Tara Mendes" id="tara" /> about it.
      </p>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})

describe('Mention preview', () => {
  const avatar = <span data-testid="pic">TM</span>

  it('without avatar or name: not focusable, no tooltip', () => {
    renderWithSatin(<Mention label="Tara Mendes" data-testid="m" />)
    expect(screen.getByTestId('m').hasAttribute('tabindex')).toBe(false)
  })

  it('shows the avatar and the full name on focus', async () => {
    const { user } = renderWithSatin(<Mention label="Tara" name="Tara Mendes" avatar={avatar} data-testid="m" />)
    await user.tab()
    const el = screen.getByTestId('m')
    expect(document.activeElement).toBe(el)
    expect(el.getAttribute('tabindex')).toBe('0')
    expect(el.textContent).toBe('@Tara')
    const tip = await screen.findByRole('tooltip')
    // The avatar sits in an aria-hidden wrapper: the tooltip reads as the name alone.
    expect(tip.textContent).toBe('TMTara Mendes')
    for (const pic of screen.getAllByTestId('pic')) expect(pic.closest('[aria-hidden="true"]')).toBeTruthy()
  })

  it('shows the label as the name on hover when only an avatar is given', async () => {
    const { user } = renderWithSatin(<Mention label="Tara Mendes" avatar={avatar} data-testid="m" />)
    await user.hover(screen.getByTestId('m'))
    expect((await screen.findByRole('tooltip')).textContent).toBe('TMTara Mendes')
  })

  it.each(['light', 'dark'] as const)('has no axe violations with the tooltip open in %s', async (theme) => {
    const { user } = renderWithSatin(
      <p>
        Ask <Mention label="Tara Mendes" id="tara" avatar={avatar} /> about it.
      </p>,
      { theme },
    )
    await user.tab()
    await screen.findByRole('tooltip')
    await expectNoAxeViolations()
  })
})

/** A host that isn't a textarea: it sets the query itself and anchors the menu to a rect. */
function Host({ onPick, query: initial }: { onPick: (item: PromptMenuItem) => void; query: PromptMenuQuery | null }) {
  const [query, setQuery] = React.useState(initial)
  const menu = usePromptMenuState({ query, mentions: { search }, commands: [{ name: 'schedule' }] })
  const box = React.useRef<HTMLDivElement>(null)
  return (
    <>
      <div
        ref={box}
        role="textbox"
        aria-label="Note"
        tabIndex={0}
        aria-controls={menu.listed ? menu.listId : undefined}
        aria-activedescendant={menu.activeId}
        onKeyDown={(e) => {
          if (!menu.open) return
          if (e.key === 'ArrowDown') menu.move(1)
          if (e.key === 'Escape') menu.dismiss()
          if (e.key === 'Enter' && menu.current) {
            onPick(menu.current)
            menu.announce(`${menu.current.kind} added`)
            setQuery(null)
          }
        }}
      />
      <button type="button" onClick={() => setQuery({ kind: 'mention', trigger: '@', text: 'to', start: 0 })}>
        type
      </button>
      <PromptMentionsMenu
        {...menu.menuProps}
        virtualAnchor={{ getBoundingClientRect: () => new DOMRect(10, 10, 0, 16) }}
        side="bottom"
        matchAnchorWidth={false}
        onPick={onPick}
      />
    </>
  )
}

describe('usePromptMenuState with PromptMentionsMenu', () => {
  it('drives the menu from a host of its own', async () => {
    const onPick = vi.fn()
    const { user } = renderWithSatin(<Host onPick={onPick} query={{ kind: 'mention', trigger: '@', text: '', start: 0 }} />)
    const field = screen.getByRole('textbox', { name: 'Note' })
    expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(screen.getByRole('status').textContent).toBe('2 suggestions')
    expect(screen.getByRole('listbox').parentElement!.parentElement!.className).toContain('w-72')
    field.focus()
    await user.keyboard('{ArrowDown}')
    expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[1]!.id)
    await user.keyboard('{Enter}')
    expect(onPick).toHaveBeenCalledWith({ kind: 'mention', mention: people[1] })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('mention added')
  })

  it('stays dismissed until the trigger changes', async () => {
    const { user } = renderWithSatin(<Host onPick={() => {}} query={{ kind: 'mention', trigger: '@', text: 't', start: 0 }} />)
    screen.getByRole('textbox', { name: 'Note' }).focus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    // Same trigger, more text: still shut.
    await act(() => user.click(screen.getByRole('button', { name: 'type' })))
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Host onPick={() => {}} query={{ kind: 'command', trigger: '/', text: '', start: 0 }} />, { theme })
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeTruthy()
    await expectNoAxeViolations()
  })
})

describe('PromptMentionsMenu heading', () => {
  const items: PromptMenuItem[] = [{ kind: 'command', command: { name: 'scorecard', description: 'Insert a scorecard' } }]
  const menu = (heading?: boolean) => (
    <PromptMentionsMenu
      open
      kind="command"
      items={items}
      index={0}
      viaKeys={false}
      query="/"
      listId="menu"
      message=""
      onPick={() => {}}
      onHighlight={() => {}}
      onDismiss={() => {}}
      virtualAnchor={{ getBoundingClientRect: () => new DOMRect(10, 10, 0, 16) }}
      heading={heading}
    />
  )

  it('shows the group header by default, as PromptBar has it', () => {
    renderWithSatin(menu())
    expect(screen.getByText('Commands')).toBeTruthy()
  })

  it('leaves it out with heading={false}; the listbox keeps its name', () => {
    renderWithSatin(menu(false))
    expect(screen.queryByText('Commands')).toBeNull()
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeTruthy()
  })
})
