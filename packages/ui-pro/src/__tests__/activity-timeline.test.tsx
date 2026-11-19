import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Toaster, toast } from '@uisatin/ui/toast'
import { ActivityTimeline, type ActivityActor, type ActivityItem } from '../components/activity-timeline'

const MIN = 60_000
const agent: ActivityActor = { name: 'Agent', kind: 'agent' }
const you: ActivityActor = { name: 'You', kind: 'person' }
const jon: ActivityActor = { name: 'Jon Park', kind: 'person' }

/** Noon today, so "minutes ago" never crosses midnight. */
const noon = () => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}
const yesterday = (now: number, h: number, m = 0) => {
  const d = new Date(now)
  d.setDate(d.getDate() - 1)
  d.setHours(h, m, 0, 0)
  return d
}

/** Tara Mendes's history from the docs: two agent entries and a stage move today, an agent run yesterday. */
function history(now: number): ActivityItem[] {
  return [
    {
      id: 'salary',
      actor: agent,
      verb: 'changed',
      target: 'salary range',
      changes: [{ field: 'Salary range', from: '7–9k', to: '8–10k' }],
      label: 'salary range change',
      revertible: true,
      at: new Date(now - 2 * MIN),
    },
    { id: 'offer', actor: agent, verb: 'drafted', target: 'offer email', revertible: true, at: new Date(now - 3 * MIN) },
    { id: 'stage', actor: you, verb: 'moved to', target: 'Interview', at: new Date(now - 18 * MIN) },
    { id: 'schedule', actor: agent, verb: 'scheduled', target: 'interview', at: yesterday(now, 16, 42) },
    { id: 'tag', actor: agent, verb: 'tagged', target: 'Senior', at: yesterday(now, 16, 38) },
    { id: 'summary', actor: agent, verb: 'summarised', target: 'CV', at: yesterday(now, 16, 35) },
    { id: 'screening', actor: jon, verb: 'moved to', target: 'Screening', at: yesterday(now, 11, 20) },
  ]
}

afterEach(async () => {
  act(() => toast.dismiss())
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
})

/** An entry's sentence (its words sit in several spans), and the entry around it. */
const matchSentence = (text: string | RegExp) => (_: string, el: Element | null) =>
  el?.tagName === 'P' && (typeof text === 'string' ? el.textContent === text : text.test(el.textContent ?? ''))
const sentence = (text: string | RegExp) => screen.getByText(matchSentence(text))
const querySentence = (text: string | RegExp) => screen.queryByText(matchSentence(text))
const entry = (text: string | RegExp) => sentence(text).closest('li')!

describe('ActivityTimeline', () => {
  // The clock at noon, so "18 minutes ago" is always today; timers stay real for user-event.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(noon())
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('puts each day in an ordered list named after it, newest first', () => {
    const now = Date.now()
    // Given oldest first: the timeline sorts.
    renderWithSatin(<ActivityTimeline items={[...history(now)].reverse()} />)
    const today = screen.getByRole('list', { name: 'Today' })
    expect(today.tagName).toBe('OL')
    const rows = within(today).getAllByRole('listitem')
    expect(rows.map((r) => r.querySelector('p')!.textContent)).toEqual([
      'Agent changed salary range',
      'Agent drafted offer email',
      'You moved to Interview',
    ])
    expect(screen.getByRole('list', { name: 'Yesterday' })).toBeTruthy()
  })

  it('writes times in <time>, with the full date for screen readers', () => {
    const now = Date.now()
    renderWithSatin(<ActivityTimeline items={history(now).slice(0, 1)} />)
    const time = entry(/salary range/).querySelector('time')!
    expect(time.getAttribute('dateTime')).toBe(new Date(now - 2 * MIN).toISOString())
    expect(time.querySelector('[aria-hidden]')!.textContent).toBe('2 min. ago')
    const full = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(now - 2 * MIN)
    expect(time.querySelector('.sr-only')!.textContent).toBe(full)
  })

  it('draws an agent’s changes as AgentSuggestion does', () => {
    renderWithSatin(<ActivityTimeline items={history(Date.now()).slice(0, 1)} />)
    const changes = entry(/salary range/).querySelector('[data-slot=agent-suggestion-changes]')!
    expect(changes.querySelector('dt')!.textContent).toBe('Salary range')
    expect(changes.querySelector('del')!.textContent).toBe('7–9k')
  })

  it('folds a run of one actor and opens it with Enter or Space', async () => {
    const { user } = renderWithSatin(<ActivityTimeline items={history(Date.now())} />)
    const run = screen.getByRole('button', { name: 'Agent made 3 changes' })
    expect(run.getAttribute('aria-expanded')).toBe('false')
    expect(querySentence('Agent tagged Senior')).toBeNull()
    run.focus()
    await user.keyboard('{Enter}')
    expect(run.getAttribute('aria-expanded')).toBe('true')
    const list = document.getElementById(run.getAttribute('aria-controls')!)!
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    // Its entries mount after the first render, so they fade in.
    expect(list.querySelector('li')!.hasAttribute('data-enter')).toBe(true)
    await user.keyboard(' ')
    expect(run.getAttribute('aria-expanded')).toBe('false')
    // Two agent entries today stay unfolded: a run needs three.
    expect(sentence('Agent drafted offer email')).toBeTruthy()
  })

  it('keeps runs open with collapseRuns={false}, and reports open runs when controlled', async () => {
    const { rerender, user } = renderWithSatin(<ActivityTimeline items={history(Date.now())} collapseRuns={false} />)
    expect(screen.queryByRole('button', { name: /made/ })).toBeNull()
    expect(sentence('Agent tagged Senior')).toBeTruthy()

    const onExpandedChange = vi.fn()
    const items = history(Date.now())
    rerender(<ActivityTimeline items={items} expanded={['tag']} onExpandedChange={onExpandedChange} />)
    const run = screen.getByRole('button', { name: 'Agent made 3 changes' })
    expect(run.getAttribute('aria-expanded')).toBe('true')
    await user.click(run)
    expect(onExpandedChange).toHaveBeenCalledWith([])
    // A new agent entry joins the run at the top; the run is still open, now four long.
    const joined: ActivityItem = { id: 'notes', actor: agent, verb: 'added', target: 'notes', at: yesterday(Date.now(), 17) }
    rerender(<ActivityTimeline items={[joined, ...items]} expanded={['tag']} />)
    expect(screen.getByRole('button', { name: 'Agent made 4 changes' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('reverts: the button spins, the entry says so and takes focus, a toast offers Undo', async () => {
    let finish!: () => void
    const onRevert = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    const onUndoRevert = vi.fn()
    const { user } = renderWithSatin(
      <>
        <ActivityTimeline items={history(Date.now())} onRevert={onRevert} onUndoRevert={onUndoRevert} />
        <Toaster />
      </>,
    )
    const button = screen.getByRole('button', { name: 'Revert salary range change' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(onRevert).toHaveBeenCalledWith(expect.objectContaining({ id: 'salary' }))
    const li = entry(/salary range/)
    expect(li.getAttribute('aria-busy')).toBe('true')
    expect(button.getAttribute('aria-busy')).toBe('true')

    await act(async () => finish())
    expect(li.getAttribute('data-state')).toBe('reverted')
    expect(li.querySelector('s')!.textContent).toBe('Agent changed salary range')
    expect(within(li).getByText('Reverted by you')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Revert salary range change' })).toBeNull()
    expect(document.activeElement).toBe(li)
    expect(screen.getByText('Reverted salary range change')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndoRevert).toHaveBeenCalledWith(expect.objectContaining({ id: 'salary' }))
    expect(screen.getByRole('button', { name: 'Revert salary range change' })).toBeTruthy()
  })

  it('puts the button back when the revert fails, without a toast', async () => {
    const { user } = renderWithSatin(
      <>
        <ActivityTimeline items={history(Date.now())} onRevert={() => Promise.reject(new Error('offline'))} />
        <Toaster />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Revert salary range change' }))
    expect(screen.getByRole('button', { name: 'Revert salary range change' }).getAttribute('aria-busy')).toBeNull()
    expect(screen.queryByText('Reverted salary range change')).toBeNull()
  })

  it('names Revert after the sentence when the entry has no label', () => {
    renderWithSatin(<ActivityTimeline items={history(Date.now())} onRevert={() => {}} />)
    expect(screen.getByRole('button', { name: 'Revert Agent drafted offer email' })).toBeTruthy()
  })

  it('shows Revert only with onRevert, and a reverted entry by someone else', () => {
    const items = history(Date.now()).slice(0, 2)
    items[0] = { ...items[0], reverted: { by: 'Jon Park' } }
    renderWithSatin(<ActivityTimeline items={items} />)
    expect(screen.queryByRole('button', { name: /Revert/ })).toBeNull()
    expect(within(entry(/salary range/)).getByText('Reverted by Jon Park')).toBeTruthy()
  })

  it('fades in entries that arrive after it first showed', () => {
    const items = history(Date.now())
    const { rerender } = renderWithSatin(<ActivityTimeline items={items} />)
    expect(entry(/salary range/).hasAttribute('data-enter')).toBe(false)
    const fresh: ActivityItem = { id: 'note', actor: jon, verb: 'left', target: 'a note', at: new Date() }
    rerender(<ActivityTimeline items={[fresh, ...items]} />)
    expect(entry(/left a note/).hasAttribute('data-enter')).toBe(true)
    expect(entry(/salary range/).hasAttribute('data-enter')).toBe(false)
  })

  it('without days is one list named Activity, with dates before the times', () => {
    const now = Date.now()
    renderWithSatin(<ActivityTimeline items={history(now)} groupBy="none" />)
    const list = screen.getByRole('list', { name: 'Activity' })
    expect(within(list).queryByRole('list', { name: 'Today' })).toBeNull()
    const time = entry(/^Jon Park/).querySelector('time [aria-hidden]')!
    const expected = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric', ...(yesterday(now, 11, 20).getFullYear() !== new Date(now).getFullYear() && { year: 'numeric' }) }).format(yesterday(now, 11, 20))
    expect(time.textContent).toBe(expected)
  })

  it('shows skeletons while loading, and a line when empty', () => {
    const { rerender, container } = renderWithSatin(<ActivityTimeline items={[]} loading />)
    expect(container.querySelector('[data-slot=activity-timeline]')!.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe('Loading')
    expect(container.querySelectorAll('[data-slot=activity-timeline-skeleton]')).toHaveLength(3)
    rerender(<ActivityTimeline items={[]} />)
    expect(screen.getByText('No activity yet')).toBeTruthy()
    rerender(<ActivityTimeline items={[]} empty="Nothing yet." />)
    expect(screen.getByText('Nothing yet.')).toBeTruthy()
  })

  it('speaks the app’s language, dates included', () => {
    renderWithSatin(<ActivityTimeline items={history(Date.now())} onRevert={() => {}} />, {
      labels: {
        dateLocale: 'pl-PL',
        activityRun: (actor, count) => <>{actor}: {count} zmiany</>,
        revertChange: (label) => `Cofnij: ${label}`,
        revert: 'Cofnij',
      },
    })
    expect(screen.getByRole('list', { name: 'Dzisiaj' })).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Wczoraj' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Agent: 3 zmiany' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cofnij: salary range change' })).toBeTruthy()
    expect(entry(/salary range/).querySelector('time [aria-hidden]')!.textContent).toBe('2 min temu')
  })

  it('passes ref and other props to the root', () => {
    const ref = React.createRef<HTMLDivElement>()
    renderWithSatin(<ActivityTimeline ref={ref} items={[]} id="history" className="mt-4" />)
    expect(ref.current?.id).toBe('history')
    expect(ref.current?.getAttribute('data-slot')).toBe('activity-timeline')
  })

  it.each(['light', 'dark'] as const)('has no axe violations, a run open and an entry reverted, in %s', async (theme) => {
    const items = history(Date.now())
    items[0] = { ...items[0], reverted: true }
    const { user } = renderWithSatin(
      <>
        <ActivityTimeline items={items} onRevert={() => {}} />
        <Toaster />
      </>,
      { theme },
    )
    await user.click(screen.getByRole('button', { name: 'Agent made 3 changes' }))
    await expectNoAxeViolations()
  })
})

describe('ActivityTimeline times', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('move on with one shared clock, and a tick that changes no text renders nothing', () => {
    vi.useFakeTimers()
    const now = noon()
    vi.setSystemTime(now)
    let commits = 0
    const items: ActivityItem[] = [
      { id: 'a', actor: agent, verb: 'changed', target: 'salary range', at: new Date(now - 30_000) },
      ...Array.from({ length: 20 }, (_, i) => ({ id: `old-${i}`, actor: i % 2 ? jon : you, verb: 'edited', target: `note ${i}`, at: yesterday(now, 9, i) })),
    ]
    const view = render(
      <React.Profiler id="timeline" onRender={() => commits++}>
        <ActivityTimeline items={items} />
      </React.Profiler>,
    )
    const text = () => view.container.querySelector('time [aria-hidden]')!.textContent
    expect(text()).toBe('now')
    expect(vi.getTimerCount()).toBe(1)

    // 20 s on: still under a minute, nothing to change, nothing renders.
    const before = commits
    act(() => void vi.advanceTimersByTime(20_000))
    expect(commits).toBe(before)

    // Past the next tick it reads a minute, and that's all that rendered.
    act(() => void vi.advanceTimersByTime(40_000))
    expect(text()).toBe('1 min. ago')
    expect(commits).toBe(before + 1)

    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('turns Today into Yesterday at midnight', () => {
    vi.useFakeTimers()
    const d = new Date()
    d.setHours(23, 59, 50, 0)
    vi.setSystemTime(d)
    const view = render(<ActivityTimeline items={[{ id: 'a', actor: you, verb: 'moved to', target: 'Interview', at: new Date(d.getTime() - 5 * MIN) }]} />)
    expect(screen.getByRole('list', { name: 'Today' })).toBeTruthy()
    act(() => void vi.advanceTimersByTime(30_000))
    expect(screen.getByRole('list', { name: 'Yesterday' })).toBeTruthy()
    view.unmount()
  })
})
