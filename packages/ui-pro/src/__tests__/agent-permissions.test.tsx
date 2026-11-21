import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Dialog } from '@uisatin/ui/dialog'
import { AgentPermissionRequest, type AgentPermissionScope } from '../components/agent-permissions'

// The docs scenario: a recruiting agent asks to read candidates, write notes and send emails as you.
const scopes: AgentPermissionScope[] = [
  { resource: 'candidates', actions: ['read'], detail: 'Profiles, CVs and interview stages' },
  { resource: 'notes', actions: ['write'], detail: 'On the candidates it screens' },
  { resource: 'emails', actions: ['send'], detail: 'From maciej@acme.com, to candidates you shortlist' },
]

const card = () => screen.getByRole('group', { name: /Recruiting agent/ })
const box = (name: string | RegExp) => screen.getByRole('checkbox', { name })
const button = (name: string | RegExp) => screen.getByRole('button', { name })

describe('AgentPermissionRequest', () => {
  it('lists each scope with a plain verb, ticked, and sets the sending one apart', () => {
    renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} description="To screen this week's applicants." />)
    expect(screen.getByRole('group', { name: 'Recruiting agent wants to:' })).toBeTruthy()
    expect(card().getAttribute('aria-describedby')).toBeTruthy()
    // The aura is decoration only.
    expect(card().querySelector('[data-slot="agent-permissions-aura"]')?.getAttribute('aria-hidden')).toBe('true')
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(box('Read candidates').getAttribute('aria-checked')).toBe('true')
    expect(box('Write notes').getAttribute('aria-checked')).toBe('true')
    // The sending scope says so in its name, and its row is marked for the amber tile.
    const send = box('Send emails, Sends as you')
    expect(send.getAttribute('aria-checked')).toBe('true')
    expect(send.closest('[data-slot="agent-permissions-scope"]')?.getAttribute('data-action')).toBe('send')
    // "Sends as you" is muted words on the title's line, not a Badge, and no rule runs between rows.
    expect(screen.getByText('Sends as you').closest('[data-slot="badge"]')).toBeNull()
    expect(list.getAttribute('data-variant')).toBe('plain')
    expect(box('Read candidates').closest('[data-slot="agent-permissions-scope"]')?.getAttribute('data-action')).toBe('read')
    // The detail describes the checkbox.
    const detail = document.getElementById(send.getAttribute('aria-describedby') ?? '')
    expect(detail?.textContent).toBe('From maciej@acme.com, to candidates you shortlist')
  })

  it('joins several verbs and keeps them in the order read, write, send', () => {
    renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={[{ resource: 'notes', actions: ['write', 'read'] }]} />)
    expect(box('Read and write notes')).toBeTruthy()
  })

  it('becomes partial when a scope is unticked, and turns Allow off when none are left', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} onValueChange={onValueChange} />)
    expect(screen.queryByText(/selected/)).toBeNull()
    // Clicking anywhere on the row ticks it: the row is the checkbox's label.
    await user.click(screen.getByText('From maciej@acme.com, to candidates you shortlist'))
    expect(onValueChange).toHaveBeenLastCalledWith(['candidates', 'notes'])
    expect(box(/Send emails/).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText('2 of 3 selected')).toBeTruthy()
    expect(card().hasAttribute('data-partial')).toBe(true)
    await user.click(box('Read candidates'))
    await user.click(box('Write notes'))
    expect(button('Allow once').hasAttribute('disabled')).toBe(true)
    expect(button('Don’t allow').hasAttribute('disabled')).toBe(false)
  })

  it('ticks and unticks with Space, and tabs from the scopes to the answers', async () => {
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} />)
    await user.tab()
    expect(document.activeElement).toBe(box('Read candidates'))
    await user.keyboard(' ')
    expect(box('Read candidates').getAttribute('aria-checked')).toBe('false')
    await user.keyboard(' ')
    expect(box('Read candidates').getAttribute('aria-checked')).toBe('true')
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(button('Don’t allow'))
    await user.tab()
    expect(document.activeElement).toBe(button('Allow once'))
    await user.tab()
    expect(document.activeElement).toBe(button('More ways to allow'))
  })

  it('allows once with what is ticked, and leaves what follows to the app', async () => {
    const onAllow = vi.fn()
    const { user } = renderWithSatin(
      <AgentPermissionRequest agent="Recruiting agent" scopes={scopes} defaultValue={['candidates', 'notes']} onAllow={onAllow} />,
    )
    await user.click(button('Allow once'))
    expect(onAllow).toHaveBeenCalledWith('once', [scopes[0], scopes[1]])
    // No answered state: the request stays as it is until the app closes it.
    expect(card()).toBeTruthy()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('always allows from the menu, by keyboard', async () => {
    const onAllow = vi.fn()
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} onAllow={onAllow} />)
    button('More ways to allow').focus()
    await user.keyboard('{Enter}')
    const item = await screen.findByRole('menuitem', { name: /Always allow/ })
    expect(item.textContent).toContain('Until you remove access')
    await user.keyboard('{Enter}')
    expect(onAllow).toHaveBeenCalledWith('always', scopes)
  })

  it("doesn't allow", async () => {
    const onDeny = vi.fn()
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} onDeny={onDeny} />)
    await user.click(button('Don’t allow'))
    expect(onDeny).toHaveBeenCalledOnce()
    expect(card()).toBeTruthy()
  })

  it('holds the button busy while a promise runs, and stays put if it rejects', async () => {
    let settle: { resolve: () => void; reject: () => void } = { resolve: () => {}, reject: () => {} }
    const onAllow = vi.fn(() => new Promise<void>((resolve, reject) => (settle = { resolve, reject })))
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} onAllow={onAllow} />)
    await user.click(button('Allow once'))
    expect(button('Allow once').getAttribute('aria-busy')).toBe('true')
    expect(button('Don’t allow').hasAttribute('disabled')).toBe(true)
    expect(box('Read candidates').hasAttribute('disabled')).toBe(true)
    // A second press while it runs does nothing.
    await user.click(button('Allow once'))
    expect(onAllow).toHaveBeenCalledOnce()
    await act(async () => settle.reject())
    expect(button('Allow once').getAttribute('aria-busy')).toBeNull()
    expect(box('Read candidates').hasAttribute('disabled')).toBe(false)
    await user.click(button('Allow once'))
    await act(async () => settle.resolve())
    expect(onAllow).toHaveBeenCalledTimes(2)
    expect(button('Allow once').getAttribute('aria-busy')).toBeNull()
  })

  it('starts on Don’t allow inside a Dialog, and leaves focus alone inline', () => {
    const { unmount } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} />)
    expect(document.activeElement).toBe(document.body)
    unmount()
    renderWithSatin(
      <Dialog defaultOpen title="Before it starts">
        <AgentPermissionRequest agent="Recruiting agent" scopes={scopes} />
      </Dialog>,
    )
    expect(document.activeElement).toBe(button('Don’t allow'))
  })

  it('speaks the words SatinLabels gives it', async () => {
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Agent rekrutacyjny" scopes={scopes} />, {
      labels: {
        agentPermissionsTitle: (agent) => `${agent} chce:`,
        agentPermissionsScope: (actions, resource) => `${actions.map((a) => ({ read: 'Odczyt', write: 'Zapis', send: 'Wysyłanie' })[a]).join(' i ')}: ${resource}`,
        agentPermissionsSendsAsYou: 'Wysyła jako Ty',
        agentPermissionsSelected: (count, total) => `Wybrano ${count} z ${total}`,
        agentPermissionsDeny: 'Nie zezwalaj',
        agentPermissionsAllowOnce: 'Zezwól raz',
        agentPermissionsAllowOptions: 'Inne opcje',
      },
    })
    expect(screen.getByRole('group', { name: 'Agent rekrutacyjny chce:' })).toBeTruthy()
    expect(box('Wysyłanie: emails, Wysyła jako Ty')).toBeTruthy()
    await user.click(box('Odczyt: candidates'))
    expect(screen.getByText('Wybrano 2 z 3')).toBeTruthy()
    expect(button('Zezwól raz')).toBeTruthy()
    expect(button('Inne opcje')).toBeTruthy()
    expect(button('Nie zezwalaj')).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, whole and partial', async (theme) => {
    const { user } = renderWithSatin(
      <AgentPermissionRequest agent="Recruiting agent" scopes={scopes} description="To screen this week's applicants." />,
      { theme },
    )
    await expectNoAxeViolations()
    await user.click(box(/Send emails/))
    await expectNoAxeViolations()
  })
})
