import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Card } from '@uisatin/ui/card'
import { Table, type Column } from '@uisatin/ui/table'
import { AgentPresence, useAgentPresence, type AgentPresenceList } from '../components/agent-presence'

type Candidate = { id: string; name: string; stage: 'Screening' | 'Interview' }
const candidates: Candidate[] = [
  { id: 'tara', name: 'Tara Mendes', stage: 'Screening' },
  { id: 'omar', name: 'Omar Haddad', stage: 'Screening' },
  { id: 'lena', name: 'Lena Fischer', stage: 'Screening' },
]
const columns: Column<Candidate>[] = [
  { key: 'name', header: 'Candidate' },
  { key: 'stage', header: 'Stage' },
]

/*
 * jsdom has no layout: every box is 0 × 0, which the presence reads as "not on screen". Rows get
 * 40px each by their place in the table (the header is row 0), an element with data-rect the box
 * it names ("x,y,w,h"), and everything else a 600 × 800 page.
 */
const box = (x: number, y: number, width: number, height: number) =>
  ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) }) as DOMRect
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const at = this.dataset.rect?.split(',').map(Number)
    if (at) return box(at[0], at[1], at[2], at[3])
    if (this instanceof HTMLTableRowElement) return box(0, this.rowIndex * 40, 600, 40)
    return box(0, 0, 600, 800)
  })
})
afterEach(() => vi.restoreAllMocks())

let list: AgentPresenceList
/** The candidates in a Table, each row a target, with the presence beside it, the way the docs wire it. */
function Candidates({ doneDuration }: { doneDuration?: number }) {
  const presence = useAgentPresence()
  list = presence
  return (
    <div className="relative">
      <Table
        label="Candidates"
        columns={columns}
        rows={candidates}
        renderRow={({ row, rowProps, children }) => (
          <tr {...rowProps} {...presence.item(row.id)}>
            {children}
          </tr>
        )}
      />
      <AgentPresence {...presence.props} agent="Satin" doneDuration={doneDuration} />
    </div>
  )
}

const layer = () => document.querySelector<HTMLElement>('[data-slot="agent-presence"]')!
const status = () => screen.getByRole('status')
const shown = () => layer().hasAttribute('data-shown')

describe('AgentPresence', () => {
  it('stays hidden and silent with no target', async () => {
    renderWithSatin(<AgentPresence target={null} agent="Satin" label="Tara Mendes" />)
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(shown()).toBe(false)
    expect(layer().getAttribute('aria-hidden')).toBe('true')
    expect(status().textContent).toBe('')
  })

  it('outlines the row the agent is on and says so politely, then follows it to the next', async () => {
    renderWithSatin(<Candidates />)
    act(() => list.start('tara', 'Tara Mendes'))
    await waitFor(() => expect(shown()).toBe(true))
    expect(layer().style.transform).toBe('translate(0px, 40px)')
    expect([layer().style.width, layer().style.height]).toEqual(['600px', '40px'])
    expect(status().textContent).toBe('Satin is updating Tara Mendes')
    expect(screen.getByText('Satin')).toBeTruthy()

    act(() => list.start('omar', 'Omar Haddad'))
    // Another target while it shows: it glides there.
    await waitFor(() => expect(layer().style.transform).toBe('translate(0px, 80px)'))
    expect(layer().hasAttribute('data-glide')).toBe(true)
    expect(status().textContent).toBe('Satin is updating Omar Haddad')
  })

  it('says the step it is on in place of its name, and stays put as the steps change', async () => {
    renderWithSatin(<Candidates />)
    act(() => list.start('tara', 'Tara Mendes', 'Drafting invite…'))
    await waitFor(() => expect(shown()).toBe(true))
    expect(screen.getByText('Drafting invite…')).toBeTruthy()
    expect(screen.queryByText('Satin')).toBeNull()
    await waitFor(() => expect(status().textContent).toBe('Satin, Tara Mendes: Drafting invite…'))

    act(() => list.start('tara', 'Tara Mendes', 'Sending…'))
    expect(screen.getByText('Sending…')).toBeTruthy()
    await waitFor(() => expect(status().textContent).toBe('Satin, Tara Mendes: Sending…'))
    // The same row: no glide, only the words change.
    expect(layer().style.transform).toBe('translate(0px, 40px)')
    expect(layer().hasAttribute('data-glide')).toBe(false)

    // Done and waiting have words of their own; the step goes with the work.
    act(() => list.done())
    expect(list.value?.activity).toBeUndefined()
    expect(screen.getByText('Done')).toBeTruthy()
  })

  it('never touches its target, so nothing moves', async () => {
    renderWithSatin(<Candidates />)
    const row = screen.getByRole('row', { name: /Tara Mendes/ })
    const before = row.outerHTML
    act(() => list.start('tara', 'Tara Mendes'))
    await waitFor(() => expect(shown()).toBe(true))
    expect(row.outerHTML).toBe(before)
    expect(row.contains(layer())).toBe(false)
  })

  it('turns to Done, says so, and fades out after doneDuration', async () => {
    renderWithSatin(<Candidates doneDuration={80} />)
    act(() => list.start('lena', 'Lena Fischer'))
    await waitFor(() => expect(shown()).toBe(true))
    act(() => list.done())
    expect(layer().getAttribute('data-state')).toBe('done')
    expect(layer().getAttribute('data-tone')).toBe('green')
    expect(screen.getByText('Done')).toBeTruthy()
    await waitFor(() => expect(status().textContent).toBe('Satin updated Lena Fischer'))
    await waitFor(() => expect(shown()).toBe(false))
  })

  it('shows the person in a conflict, dashed and amber, and says the agent waits', async () => {
    renderWithSatin(<Candidates />)
    act(() => list.start('omar', 'Omar Haddad'))
    await waitFor(() => expect(shown()).toBe(true))
    act(() => list.conflict({ name: 'Jon Park', initials: 'JP' }))
    expect(layer().getAttribute('data-tone')).toBe('amber')
    expect(document.querySelector('[data-slot="agent-presence-outline"]')!.getAttribute('data-state')).toBe('conflict')
    expect(screen.getByText('Jon Park is editing')).toBeTruthy()
    expect(screen.getByText('JP')).toBeTruthy()
    await waitFor(() => expect(status().textContent).toBe('Jon Park is editing Omar Haddad; Satin is waiting'))
    // The agent carries on.
    act(() => list.start('omar', 'Omar Haddad'))
    await waitFor(() => expect(status().textContent).toBe('Satin is updating Omar Haddad'))
  })

  it('takes no focus: Tab goes past it', async () => {
    const { user } = renderWithSatin(
      <>
        <button type="button">Before</button>
        <Candidates />
        <button type="button">After</button>
      </>,
    )
    // In a conflict the label holds the person's avatar: still nothing to focus.
    act(() => list.start('tara', 'Tara Mendes'))
    act(() => list.conflict({ name: 'Jon Park' }))
    await waitFor(() => expect(shown()).toBe(true))
    screen.getByRole('button', { name: 'Before' }).focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
  })

  it('says its words in the app language', async () => {
    renderWithSatin(<Candidates doneDuration={Infinity} />, {
      labels: {
        agentPresenceWorking: (agent, target) => `${agent} aktualizuje: ${target}`,
        agentPresenceActivity: (agent, target, activity) => `${agent} (${target}): ${activity}`,
        agentPresenceDone: (agent, target) => `${agent} zaktualizował: ${target}`,
        agentPresenceConflict: (agent, target, person) => `${person} edytuje: ${target}. ${agent} czeka`,
        agentPresenceEditing: (person) => `${person} edytuje`,
        done: 'Gotowe',
      },
    })
    act(() => list.start('tara', 'Tara Mendes'))
    await waitFor(() => expect(status().textContent).toBe('Satin aktualizuje: Tara Mendes'))
    act(() => list.start('tara', 'Tara Mendes', 'Wysyłanie…'))
    await waitFor(() => expect(status().textContent).toBe('Satin (Tara Mendes): Wysyłanie…'))
    act(() => list.conflict('Jon Park'))
    expect(screen.getByText('Jon Park edytuje')).toBeTruthy()
    await waitFor(() => expect(status().textContent).toBe('Jon Park edytuje: Tara Mendes. Satin czeka'))
    act(() => list.done())
    expect(screen.getByText('Gotowe')).toBeTruthy()
    await waitFor(() => expect(status().textContent).toBe('Satin zaktualizował: Tara Mendes'))
  })

  it('works on Kanban cards, and follows a card that moves to another column', async () => {
    function Board() {
      const presence = useAgentPresence()
      list = presence
      const [moved, setMoved] = React.useState(false)
      const columnsOf = moved ? [['omar'], ['tara']] : [['tara', 'omar'], []]
      return (
        <div className="relative">
          <button type="button" onClick={() => setMoved(true)}>
            Move
          </button>
          {columnsOf.map((ids, col) => (
            <section key={col} aria-label={col ? 'Interview' : 'Screening'}>
              {ids.map((id, i) => (
                <Card key={id} size="sm" title={id} data-rect={`${col * 200},${10 + i * 70},190,62`} {...presence.item(id)} />
              ))}
            </section>
          ))}
          <AgentPresence {...presence.props} agent="Satin" />
        </div>
      )
    }
    const { user } = renderWithSatin(<Board />)
    act(() => list.start('tara', 'Tara Mendes'))
    await waitFor(() => expect(layer().style.transform).toBe('translate(0px, 10px)'))
    expect([layer().style.width, layer().style.height]).toEqual(['190px', '62px'])
    // The card re-renders in the Interview column, a new element: the presence finds it and glides there.
    await user.click(screen.getByRole('button', { name: 'Move' }))
    await waitFor(() => expect(layer().style.transform).toBe('translate(200px, 10px)'))
    expect(layer().hasAttribute('data-glide')).toBe(true)
  })

  it('takes a ref as its target', async () => {
    function One() {
      const ref = React.useRef<HTMLDivElement>(null)
      return (
        <div className="relative">
          <div ref={ref} data-rect="10,20,300,50">
            Tara Mendes
          </div>
          <AgentPresence target={ref} agent={{ name: 'Satin', tone: 'plum', avatar: 'flappy' }} label="Tara Mendes" />
        </div>
      )
    }
    renderWithSatin(<One />)
    await waitFor(() => expect(layer().style.transform).toBe('translate(10px, 20px)'))
    expect(layer().getAttribute('data-tone')).toBe('plum')
    await waitFor(() => expect(status().textContent).toBe('Satin is updating Tara Mendes'))
  })

  it('sits on its target inside a scaled container (a preview shrunk with scale())', async () => {
    // The box is 600 × 800 of its own pixels, drawn at half size from (100, 50); the row inside
    // it shows at (110, 70), 250 × 20 on screen. In the box's own pixels: (20, 40), 500 × 40.
    function Scaled({ on }: { on: boolean }) {
      const ref = React.useRef<HTMLDivElement>(null)
      return (
        <div data-testid="box" className="relative" data-rect="100,50,300,400">
          <div ref={ref} data-rect="110,70,250,20">
            Tara Mendes
          </div>
          <AgentPresence target={on ? ref : null} agent="Satin" label="Tara Mendes" />
        </div>
      )
    }
    const { rerender } = renderWithSatin(<Scaled on={false} />)
    const parent = screen.getByTestId('box')
    // jsdom has no layout: give the box its own size and make it the layer's positioned parent.
    Object.defineProperty(parent, 'offsetWidth', { value: 600 })
    Object.defineProperty(parent, 'offsetHeight', { value: 800 })
    Object.defineProperty(layer(), 'offsetParent', { get: () => parent })
    rerender(<Scaled on />)
    await waitFor(() => expect(layer().style.transform).toBe('translate(20px, 40px)'))
    expect([layer().style.width, layer().style.height]).toEqual(['500px', '40px'])
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Candidates />, { theme })
    act(() => list.start('omar', 'Omar Haddad'))
    act(() => list.conflict({ name: 'Jon Park', initials: 'JP' }))
    await waitFor(() => expect(shown()).toBe(true))
    await expectNoAxeViolations()
  })
})
