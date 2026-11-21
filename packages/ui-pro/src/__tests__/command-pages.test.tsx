import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { Toaster, toast } from '@uisatin/ui/toast'
import { CommandPages, type CommandPage, type CommandPageGroup, type CommandPagesControl, type CommandPagesProps } from '../components/command-pages'

const moveTo = (onMove: (stage: string) => void): CommandPage => ({
  groups: [{ label: 'Stages', items: ['Lead', 'Proposal', 'Negotiation', 'Won'].map((s) => ({ id: s, label: s, onSelect: () => onMove(s) })) }],
})

function groupsFor(onMove = vi.fn(), onCall = vi.fn()): CommandPageGroup[] {
  return [
    {
      label: 'Acme Corp',
      items: [
        { id: 'call', label: 'Log a call', onSelect: onCall },
        { id: 'move', label: 'Move deal to…', page: moveTo(onMove) },
        { id: 'owner', label: 'Assign owner…', onSelect: (menu) => menu.push({ title: 'Owners', groups: [{ label: 'People', items: [{ id: 'tara', label: 'Tara Mendes' }] }] }) },
      ],
    },
  ]
}

/** With an agent that answers when asked: the answer arrives in two pieces. */
function WithAgent(props: Partial<CommandPagesProps> & { onAskSpy?: (q: string) => void }) {
  const { onAskSpy, ...rest } = props
  const [answer, setAnswer] = React.useState('')
  const [answering, setAnswering] = React.useState(false)
  return (
    <>
      <button
        onClick={() => {
          setAnswer('Budget approved; legal wants the DPA.')
          setAnswering(false)
        }}
      >
        Finish
      </button>
      <CommandPages
        defaultOpen
        hotkey={false}
        rootTitle="Acme Corp"
        groups={groupsFor()}
        onAsk={(q) => {
          onAskSpy?.(q)
          setAnswer('')
          setAnswering(true)
        }}
        answer={answer}
        answering={answering}
        {...rest}
      />
    </>
  )
}

const field = () => screen.getByRole('combobox') as HTMLInputElement
const options = () => screen.getAllByRole('option').map((o) => o.textContent)
const highlighted = () => screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')?.textContent
/** The breadcrumb's pages, the current one last. */
const path = () => [...screen.getByRole('navigation', { name: 'Breadcrumb' }).querySelectorAll('li:not([role="presentation"])')].map((li) => li.textContent)
const status = () => screen.getAllByRole('status').find((s) => !s.hasAttribute('data-slot'))!

afterEach(async () => {
  setReducedMotion(false)
  // @ts-expect-error: put jsdom back as it was
  delete HTMLElement.prototype.animate
  // @ts-expect-error: put jsdom back as it was
  delete HTMLElement.prototype.getAnimations
  act(() => toast.dismiss())
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
})

describe('CommandPages', () => {
  it('opens a page from an item, with a breadcrumb, and runs a row there, closing the menu', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<CommandPages defaultOpen hotkey={false} rootTitle="Acme Corp" groups={groupsFor(onMove)} />)
    // There from the first page, so the search under it never moves.
    expect(path()).toEqual(['Acme Corp'])
    expect(screen.getByText('Acme Corp', { selector: '[aria-current="page"]' })).toBeTruthy()
    await user.type(field(), 'move')
    await user.keyboard('{Enter}')

    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(crumbs.getByRole('button', { name: 'Acme Corp' })).toBeTruthy()
    expect(crumbs.getByText('Move deal to…').getAttribute('aria-current')).toBe('page')
    expect(field().value).toBe('')
    expect(field().placeholder).toBe('Move deal to…')
    expect(options()).toEqual(['Lead', 'Proposal', 'Negotiation', 'Won'])
    expect(highlighted()).toBe('Lead')
    expect(status().textContent).toBe('Move deal to…. Backspace goes back.')
    expect(screen.getByText('Back')).toBeTruthy()

    await user.type(field(), 'nego')
    await user.keyboard('{Enter}')
    expect(onMove).toHaveBeenCalledWith('Negotiation')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('goes back with Backspace in the empty search, once per press, putting the search back', async () => {
    const { user } = renderWithSatin(<CommandPages defaultOpen hotkey={false} groups={groupsFor()} />)
    await user.type(field(), 'move')
    await user.keyboard('{Enter}')
    await user.type(field(), 'le')
    // Backspace with text deletes it, and stays on the page.
    await user.keyboard('{Backspace}{Backspace}')
    expect(field().value).toBe('')
    expect(options()).toHaveLength(4)
    // Held down: it goes back once, and the repeats keep the search it put back.
    await user.keyboard('{Backspace>3/}')
    expect(field().value).toBe('move')
    expect(options()).toEqual(['Move deal to…'])
    expect(path()).toEqual(['Commands'])
    expect(status().textContent).toBe('Commands')
  })

  it('goes back to an earlier page from the breadcrumb, with focus back in the search', async () => {
    const { user } = renderWithSatin(<CommandPages defaultOpen hotkey={false} groups={groupsFor()} />)
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(field().placeholder).toBe('Owners')
    await user.click(screen.getByRole('button', { name: 'Commands' }))
    expect(path()).toEqual(['Commands'])
    expect(document.activeElement).toBe(field())
    expect(options()).toEqual(['Log a call', 'Move deal to…', 'Assign owner…'])
  })

  it('opens again on the first page after Escape', async () => {
    function Reopen() {
      const [open, setOpen] = React.useState(true)
      return (
        <>
          <button onClick={() => setOpen(true)}>Commands</button>
          <CommandPages open={open} onOpenChange={setOpen} hotkey={false} groups={groupsFor()} />
        </>
      )
    }
    const { user } = renderWithSatin(<Reopen />)
    await user.type(field(), 'move')
    await user.keyboard('{Enter}')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Commands' }))
    expect(field().value).toBe('')
    expect(options()).toEqual(['Log a call', 'Move deal to…', 'Assign owner…'])
  })

  it('hands a query nothing matches to the agent, then shows the answer and takes follow-ups', async () => {
    const asked = vi.fn()
    const { user } = renderWithSatin(<WithAgent onAskSpy={asked} />)
    await user.type(field(), 'move')
    // A query adds the ask row last, under its own heading.
    expect(options()).toEqual(['Move deal to…', 'Ask the agent about “move”'])
    expect(screen.getByRole('group', { name: 'Agent' })).toBeTruthy()
    await user.clear(field())
    await user.type(field(), 'what did Acme say last call')
    expect(options()).toEqual(['Ask the agent about “what did Acme say last call”'])
    await user.keyboard('{Enter}')
    expect(asked).toHaveBeenCalledWith('what did Acme say last call')

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain('Ask the agent')
    expect(screen.getByRole('region', { name: 'what did Acme say last call' })).toBeTruthy()
    expect(within(screen.getByRole('region')).getAllByText('Thinking…').length).toBeGreaterThan(0)
    expect(field().placeholder).toBe('Ask a follow-up…')
    expect(field().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('listbox')).toBeNull()

    // Focus is in the menu's search; the app finishes the answer from outside.
    act(() => (screen.getByRole('button', { name: 'Finish', hidden: true }) as HTMLButtonElement).click())
    expect(screen.getByRole('region').textContent).toContain('Budget approved; legal wants the DPA.')
    expect(status().textContent).toBe('Budget approved; legal wants the DPA.')

    await user.type(field(), 'and the price?{Enter}')
    expect(asked).toHaveBeenLastCalledWith('and the price?')
    expect(screen.getByRole('region', { name: 'and the price?' })).toBeTruthy()
    expect(field().value).toBe('')

    // Back to the list, with the question in the search.
    await user.keyboard('{Backspace}')
    expect(field().value).toBe('what did Acme say last call')
  })

  it('closes after onAsk when the app answers elsewhere', async () => {
    const onAsk = vi.fn()
    const { user } = renderWithSatin(<CommandPages defaultOpen hotkey={false} groups={groupsFor()} onAsk={onAsk} />)
    await user.type(field(), 'summarise Acme{Enter}')
    expect(onAsk).toHaveBeenCalledWith('summarise Acme')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens on a page, a search or an answer from outside, through controlRef', async () => {
    const menu = React.createRef<CommandPagesControl>()
    function Outside() {
      const [open, setOpen] = React.useState(false)
      return <WithAgent open={open} onOpenChange={setOpen} controlRef={menu} />
    }
    renderWithSatin(<Outside />)
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => menu.current!.push({ title: 'Move deal to…', groups: moveTo(() => {}).groups }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(field().placeholder).toBe('Move deal to…')
    act(() => menu.current!.close())
    act(() => menu.current!.search('pricing'))
    expect(field().value).toBe('pricing')
    expect(options()).toEqual(['Ask the agent about “pricing”'])
    act(() => menu.current!.ask('what did Acme say last call'))
    expect(screen.getByRole('region', { name: 'what did Acme say last call' })).toBeTruthy()
  })

  it('moves page to page as DecisionCard steps do, and not under reduced motion', async () => {
    const calls: Keyframe[][] = []
    HTMLElement.prototype.animate = vi.fn((keyframes: Keyframe[]) => {
      calls.push(keyframes)
      return { finished: Promise.resolve(), cancel: () => {} }
    }) as unknown as HTMLElement['animate']
    HTMLElement.prototype.getAnimations = () => []
    const { user } = renderWithSatin(<CommandPages defaultOpen hotkey={false} groups={groupsFor()} />)
    await user.type(field(), 'move{Enter}')
    // One track, the menu's width plus 24px (jsdom has no width): the new page in from the end
    // side and fading in, a copy of the old one out the other way and fading out. The track moves
    // in whole pixels, each held (steps), from and to exact values.
    const xs = (k: Keyframe[]) => k.map((f) => f.transform)
    expect(calls[0][0]).toEqual({ transform: 'translate3d(24px, 0, 0)', offset: 0, easing: 'steps(1, end)' })
    expect(calls[0].at(-1)).toMatchObject({ transform: 'translate3d(0px, 0, 0)', offset: 1 })
    for (const t of xs(calls[0])) expect(t).toMatch(/^translate3d\(-?\d+px, 0, 0\)$/)
    expect(calls[1]).toEqual([{ opacity: 0 }, { opacity: 1 }])
    expect(calls[2][0]).toMatchObject({ transform: 'translate3d(0px, 0, 0)' })
    expect(calls[2].at(-1)).toMatchObject({ transform: 'translate3d(-24px, 0, 0)' })
    expect(calls[3]).toEqual([{ opacity: 1 }, { opacity: 0 }])
    await user.keyboard('{Backspace}')
    expect(calls[4][0]).toMatchObject({ transform: 'translate3d(-24px, 0, 0)' })
    expect(calls[6].at(-1)).toMatchObject({ transform: 'translate3d(24px, 0, 0)' })

    setReducedMotion(true)
    await user.clear(field())
    await user.type(field(), 'move{Enter}')
    expect(calls).toHaveLength(8)
  })

  it('slides out the old page as it looked at the key press: its highlight, and a page pushed without a title too', async () => {
    const calls: Keyframe[][] = []
    // Slides that never finish, so the outgoing copy stays to be looked at.
    HTMLElement.prototype.animate = vi.fn((keyframes: Keyframe[]) => {
      calls.push(keyframes)
      return { finished: new Promise(() => {}), cancel: () => {} }
    }) as unknown as HTMLElement['animate']
    HTMLElement.prototype.getAnimations = () => []
    const menu = React.createRef<CommandPagesControl>()
    const { user } = renderWithSatin(<CommandPages defaultOpen hotkey={false} groups={groupsFor()} controlRef={menu} />)
    // The arrows move CommandMenu's highlight without CommandPages rendering.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    const copy = document.querySelector('[data-step-copy]')!
    expect(copy.getAttribute('aria-hidden')).toBe('true')
    expect(copy.hasAttribute('id')).toBe(false)
    expect(copy.querySelector('[aria-selected="true"]')?.textContent).toBe('Assign owner…')
    expect(calls).toHaveLength(4)

    // From the first page, a page with no title still counts as another page.
    await user.click(screen.getByRole('button', { name: 'Commands' }))
    const before = calls.length
    act(() => menu.current!.push({ groups: [{ label: 'Stages', items: [{ id: 'won', label: 'Won' }] }] }))
    expect(calls.length).toBeGreaterThan(before)
  })

  it('shows a group’s icon, the kind of record it lists, on each row without its own', async () => {
    const people: CommandPageGroup[] = [
      {
        label: 'People',
        icon: <svg data-testid="person" />,
        items: [
          { id: 'tara', label: 'Tara Mendes' },
          { id: 'acme', label: 'Acme Corp', icon: <svg data-testid="company" /> },
        ],
      },
    ]
    renderWithSatin(<CommandPages defaultOpen hotkey={false} groups={people} />)
    const [tara, acme] = screen.getAllByRole('option')
    expect(within(tara).getByTestId('person')).toBeTruthy()
    expect(within(acme).queryByTestId('person')).toBeNull()
    expect(within(acme).getByTestId('company')).toBeTruthy()
  })

  it('says what a completed command did in a success toast, after its promise, and not for a page', async () => {
    let resolve = () => {}
    const groups: CommandPageGroup[] = [
      {
        label: 'Deal',
        items: [
          { id: 'call', label: 'Log a call', success: 'Call logged' },
          { id: 'save', label: 'Save', onSelect: () => new Promise<void>((r) => (resolve = r)), success: 'Saved' },
          { id: 'move', label: 'Move deal to…', page: { groups: [] }, success: 'Never shown' },
        ],
      },
    ]
    function Menu() {
      const [open, setOpen] = React.useState(true)
      return (
        <>
          <button onClick={() => setOpen(true)}>Commands</button>
          <CommandPages open={open} onOpenChange={setOpen} hotkey={false} groups={groups} />
          <Toaster />
        </>
      )
    }
    const { user } = renderWithSatin(<Menu />)
    await user.type(field(), 'move{Enter}')
    expect(screen.queryByText('Never shown')).toBeNull()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Commands' }))
    await user.type(field(), 'call{Enter}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText('Call logged')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Commands' }))
    await user.type(field(), 'save{Enter}')
    expect(screen.queryByText('Saved')).toBeNull()
    await act(async () => resolve())
    expect(await screen.findByText('Saved')).toBeTruthy()
  })

  it('keeps its top edge where it opened as pages change', async () => {
    const offsetTop = vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(120)
    const { user } = renderWithSatin(<CommandPages defaultOpen hotkey={false} groups={groupsFor()} />)
    const panel = screen.getByRole('dialog')
    expect(panel.style.alignSelf).toBe('flex-start')
    expect(panel.style.marginTop).toBe('120px')
    // Measured once: a page of another length doesn't move it.
    offsetTop.mockReturnValue(40)
    await user.type(field(), 'move{Enter}')
    expect(panel.style.marginTop).toBe('120px')
    offsetTop.mockRestore()
  })

  it('speaks the app’s language', async () => {
    const { user } = renderWithSatin(<WithAgent rootTitle={undefined} />, {
      labels: {
        commands: 'Polecenia',
        agent: 'Agent',
        commandAskAbout: (q) => `Zapytaj agenta o „${q}”`,
        commandAskAgent: 'Zapytaj agenta',
        commandAskFollowUp: 'Dopytaj…',
        commandBack: 'Wstecz',
        commandPageOpened: (title) => `${title}. Backspace wraca.`,
      },
    })
    await user.type(field(), 'move{Enter}')
    expect(screen.getByRole('button', { name: 'Polecenia' })).toBeTruthy()
    expect(status().textContent).toBe('Move deal to…. Backspace wraca.')
    expect(screen.getByText('Wstecz')).toBeTruthy()
    await user.type(field(), 'xyz')
    expect(options()).toEqual(['Zapytaj agenta o „xyz”'])
    await user.keyboard('{Enter}')
    expect(field().placeholder).toBe('Dopytaj…')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain('Zapytaj agenta')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, on a page and on the agent’s', async (theme) => {
    const { user } = renderWithSatin(<WithAgent />, { theme })
    await expectNoAxeViolations()
    await user.type(field(), 'move{Enter}')
    await expectNoAxeViolations()
    await user.type(field(), 'what did Acme say{Enter}')
    await expectNoAxeViolations()
  })
})
