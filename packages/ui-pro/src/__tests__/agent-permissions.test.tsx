import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Dialog } from '@uisatin/ui/dialog'
import { AgentPermissionRequest, type AgentPermissionScope, type AgentPermissionStatus } from '../components/agent-permissions'

// The docs scenario: a recruiting agent asks to read candidates, write notes and send emails as you.
const scopes: AgentPermissionScope[] = [
  { resource: 'candidates', actions: ['read'], detail: 'Profiles, CVs and interview stages' },
  { resource: 'notes', actions: ['write'], detail: 'On the candidates it screens' },
  { resource: 'emails', actions: ['send'], detail: 'From maciej@acme.com, to candidates you shortlist' },
]

const card = () => screen.getByRole('group', { name: /Recruiting agent/ })
const box = (name: string | RegExp) => screen.getByRole('checkbox', { name })
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const status = () => within(document.querySelector('[data-slot="agent-permissions"]') as HTMLElement).getByRole('status')

describe('AgentPermissionRequest', () => {
  it('lists each scope with a plain verb, ticked, and sets the sending one apart', () => {
    renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} description="To screen this week's applicants." />)
    expect(screen.getByRole('group', { name: 'Recruiting agent wants to:' })).toBeTruthy()
    expect(card().getAttribute('aria-describedby')).toBeTruthy()
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(box('Read candidates').getAttribute('aria-checked')).toBe('true')
    expect(box('Write notes').getAttribute('aria-checked')).toBe('true')
    // The sending scope says so in its name, and its row is marked for the amber tile.
    const send = box('Send emails, Sends as you')
    expect(send.getAttribute('aria-checked')).toBe('true')
    expect(send.closest('[data-slot="agent-permissions-scope"]')?.getAttribute('data-action')).toBe('send')
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

  it('allows once with what is ticked, folds to its summary and moves focus there', async () => {
    const onAllow = vi.fn()
    const onStatusChange = vi.fn()
    const { user } = renderWithSatin(
      <AgentPermissionRequest agent="Recruiting agent" scopes={scopes} defaultValue={['candidates', 'notes']} onAllow={onAllow} onStatusChange={onStatusChange} onRevoke={() => {}} />,
    )
    await user.click(button('Allow once'))
    expect(onAllow).toHaveBeenCalledWith('once', [scopes[0], scopes[1]])
    expect(onStatusChange).toHaveBeenLastCalledWith('allowed')
    expect(screen.getByRole('group', { name: 'Recruiting agent · Allowed once' })).toBeTruthy()
    expect(screen.getByText('Read candidates · Write notes')).toBeTruthy()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(document.activeElement).toBe(button('Remove access'))
    expect(status().textContent).toBe('Allowed once: Read candidates, Write notes')
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
    expect(screen.getByRole('group', { name: 'Recruiting agent · Always allowed' })).toBeTruthy()
    // No onRevoke, so nothing to press: the summary itself takes focus.
    expect(document.activeElement).toBe(card())
  })

  it("doesn't allow, and Change brings the request back with focus on Don't allow", async () => {
    const onDeny = vi.fn()
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} onDeny={onDeny} />)
    await user.click(button('Don’t allow'))
    expect(onDeny).toHaveBeenCalledOnce()
    expect(screen.getByRole('group', { name: 'Recruiting agent · Not allowed' })).toBeTruthy()
    expect(screen.getByText('Read candidates · Write notes · Send emails')).toBeTruthy()
    expect(document.activeElement).toBe(button('Change'))
    expect(status().textContent).toBe('Not allowed: Read candidates, Write notes, Send emails')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('group', { name: 'Recruiting agent wants to:' })).toBeTruthy()
    expect(document.activeElement).toBe(button('Don’t allow'))
  })

  it('removes access later, and says so', async () => {
    const onRevoke = vi.fn()
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} defaultStatus="allowed" mode="always" onRevoke={onRevoke} />)
    expect(screen.getByRole('group', { name: 'Recruiting agent · Always allowed' })).toBeTruthy()
    await user.click(button('Remove access'))
    expect(onRevoke).toHaveBeenCalledOnce()
    expect(screen.getByRole('group', { name: 'Recruiting agent · Access removed' })).toBeTruthy()
    expect(document.activeElement).toBe(button('Change'))
  })

  it('holds the button busy while a promise runs, and stays put if it rejects', async () => {
    let settle: { resolve: () => void; reject: () => void } = { resolve: () => {}, reject: () => {} }
    const onAllow = vi.fn(() => new Promise<void>((resolve, reject) => (settle = { resolve, reject })))
    const { user } = renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} onAllow={onAllow} />)
    await user.click(button('Allow once'))
    expect(button('Allow once').getAttribute('aria-busy')).toBe('true')
    expect(button('Don’t allow').hasAttribute('disabled')).toBe(true)
    expect(box('Read candidates').hasAttribute('disabled')).toBe(true)
    await act(async () => settle.reject())
    expect(screen.getByRole('group', { name: 'Recruiting agent wants to:' })).toBeTruthy()
    expect(button('Allow once').getAttribute('aria-busy')).toBeNull()
    await user.click(button('Allow once'))
    await act(async () => settle.resolve())
    expect(screen.getByRole('group', { name: 'Recruiting agent · Allowed once' })).toBeTruthy()
  })

  it('follows a controlled status, and asks for changes instead of making them', async () => {
    const onStatusChange = vi.fn()
    function Controlled() {
      const [current, setCurrent] = React.useState<AgentPermissionStatus>('allowed')
      return (
        <>
          <AgentPermissionRequest agent="Recruiting agent" scopes={scopes} status={current} mode="always" onStatusChange={onStatusChange} onRevoke={() => {}} />
          <button type="button" onClick={() => setCurrent('revoked')}>
            Revoke in settings
          </button>
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    await user.click(button('Remove access'))
    expect(onStatusChange).toHaveBeenLastCalledWith('revoked')
    expect(screen.getByRole('group', { name: 'Recruiting agent · Always allowed' })).toBeTruthy()
    // Removed elsewhere: it shows, but focus stays where it was.
    await user.click(button('Revoke in settings'))
    expect(screen.getByRole('group', { name: 'Recruiting agent · Access removed' })).toBeTruthy()
    expect(document.activeElement).toBe(button('Revoke in settings'))
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
        agentPermissionsDenied: 'Brak zgody',
        change: 'Zmień',
      },
    })
    expect(screen.getByRole('group', { name: 'Agent rekrutacyjny chce:' })).toBeTruthy()
    expect(box('Wysyłanie: emails, Wysyła jako Ty')).toBeTruthy()
    await user.click(box('Odczyt: candidates'))
    expect(screen.getByText('Wybrano 2 z 3')).toBeTruthy()
    expect(button('Zezwól raz')).toBeTruthy()
    expect(button('Inne opcje')).toBeTruthy()
    await user.click(button('Nie zezwalaj'))
    expect(screen.getByRole('group', { name: 'Agent rekrutacyjny · Brak zgody' })).toBeTruthy()
    expect(button('Zmień')).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, asking and answered', async (theme) => {
    const { user, unmount } = renderWithSatin(
      <AgentPermissionRequest agent="Recruiting agent" scopes={scopes} description="To screen this week's applicants." onRevoke={() => {}} />,
      { theme },
    )
    await expectNoAxeViolations()
    await user.click(box(/Send emails/))
    await expectNoAxeViolations()
    await user.click(button('Allow once'))
    await expectNoAxeViolations()
    unmount()
    renderWithSatin(<AgentPermissionRequest agent="Recruiting agent" scopes={scopes} defaultStatus="denied" />, { theme })
    await expectNoAxeViolations()
  })
})
