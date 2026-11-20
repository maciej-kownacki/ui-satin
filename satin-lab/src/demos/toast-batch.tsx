import * as React from 'react'
import { Sparks } from 'iconoir-react'
import { AgentLoading } from '@uisatin/ui/agent-loading'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Button } from '@uisatin/ui/button'
import { Toaster, toast } from '@uisatin/ui/toast'
import { toastBatch, type ToastBatchItem } from '@uisatin/pro/toast-batch'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Stage = 'Screening' | 'Interview'
type Candidate = { id: string; name: string; initials: string; tone: AvatarTone; stage: Stage; passed?: boolean }

const CANDIDATES: Candidate[] = [
  { id: 'tara', name: 'Tara Mendes', initials: 'TM', tone: 'plum', stage: 'Screening', passed: true },
  { id: 'jon', name: 'Jon Park', initials: 'JP', tone: 'sky', stage: 'Screening', passed: true },
  { id: 'ada', name: 'Ada Novak', initials: 'AN', tone: 'green', stage: 'Screening', passed: true },
  { id: 'leo', name: 'Leo Okafor', initials: 'LO', tone: 'amber', stage: 'Screening' },
  { id: 'mia', name: 'Mia Chen', initials: 'MC', tone: 'fuchsia', stage: 'Interview' },
]
const STAGES: Stage[] = ['Screening', 'Interview']

export const controls: ShowcaseControl[] = [
  {
    id: 'arrival',
    label: 'Changes arrive',
    items: [
      { value: 'stream', label: 'One by one' },
      { value: 'batch', label: 'All at once' },
    ],
  },
  { id: 'media', label: 'Avatars', type: 'switch', default: 'on' },
]

const setup = `// Once, near the root of the app:
import { Toaster } from '@uisatin/ui/toast'
<Toaster />
`

function code(v: Record<string, string>) {
  const imports = `${v.media === 'on' ? "import { Avatar } from '@uisatin/ui/avatar'\n" : ''}import { toastBatch } from '@uisatin/pro/toast-batch'`
  const title = "title: (count) => `${count} ${count === 1 ? 'candidate' : 'candidates'} moved`,"
  // One candidate's item, its fields two spaces in from `base`.
  const fields = [
    'id: c.id,',
    'label: c.name,',
    'description: `From ${c.stage}`,',
    ...(v.media === 'on' ? ['media: <Avatar initials={c.initials} tone={c.tone} size={24} aria-hidden />,'] : []),
    'undo: () => moveCandidate(c.id, c.stage),',
  ]
  const item = (base: string) => `{\n${fields.map((f) => `${base}  ${f}`).join('\n')}\n${base}}`
  if (v.arrival === 'stream')
    return `${setup}
${imports}

// The agent moves each candidate who passed the screen and reports it.
// The same id keeps one toast: the count rolls up instead of new toasts stacking.
for (const c of passed) {
  await moveCandidate(c.id, 'Interview')
  toastBatch({
    id: 'move-to-interview',
    ${title}
    change: 'move', // names each Undo "Undo move of Tara Mendes"
    items: [${item('    ')}],
  })
}

// ⌘Z (Ctrl+Z) undoes the whole batch while the toast is open.`
  return `${setup}
${imports}

await moveCandidates(passed.map((c) => c.id), 'Interview')
toastBatch({
  ${title}
  change: 'move', // names each Undo "Undo move of Tara Mendes"
  items: passed.map((c) => (${item('  ')})),
  // Undo and ⌘Z send one request for everyone still moved, instead of one each.
  undoAll: (items) => moveCandidates(items.map((i) => i.id), 'Screening'),
})`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.arrival === 'stream' ? 'One by one' : 'All at once', v.media === 'on' ? 'Avatars' : 'No avatars'].join(' · '),
  code: code(v),
}))

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The hiring scenario: the agent moves the three candidates who passed the screen to Interview.
 * One toast counts them ("3 candidates moved"); Show lists them, each with its own Undo.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stages, setStages] = React.useState<Record<string, Stage>>(() => Object.fromEntries(CANDIDATES.map((c) => [c.id, c.stage])))
  // The agent starts on mount, so the first render already says it's working.
  const [running, setRunning] = React.useState(true)
  const run = React.useRef(0)
  // When each card arrived in a column it wasn't in: newcomers go to the end, a card put back takes its old place.
  const arrived = React.useRef(new Map<string, number>())
  const tick = React.useRef(0)

  const moveTo = (ids: string[], stage: Stage) => {
    for (const id of ids) arrived.current.set(id, ++tick.current)
    setStages((all) => ({ ...all, ...Object.fromEntries(ids.map((id) => [id, stage])) }))
  }

  const start = React.useCallback(async () => {
    const round = ++run.current
    toast.dismiss()
    setStages(Object.fromEntries(CANDIDATES.map((c) => [c.id, c.stage])))
    setRunning(true)
    const passed = CANDIDATES.filter((c) => c.passed)
    const itemOf = (c: Candidate): ToastBatchItem => ({
      id: c.id,
      label: c.name,
      description: `From ${c.stage}`,
      media: v.media === 'on' ? <Avatar initials={c.initials} tone={c.tone} size={24} aria-hidden /> : undefined,
      undo: () => moveTo([c.id], c.stage),
    })
    const options = {
      // A new id each run, so a replay never joins the batch on its way out.
      id: `move-to-interview-${round}`,
      title: (count: number) => `${count} ${count === 1 ? 'candidate' : 'candidates'} moved`,
      change: 'move',
      // It stays for the reader here; an app keeps the default (8 s, paused on hover).
      duration: Infinity,
    }
    await wait(900)
    if (round !== run.current) return
    if (v.arrival === 'stream') {
      for (const c of passed) {
        moveTo([c.id], 'Interview')
        toastBatch({ ...options, items: [itemOf(c)] })
        await wait(650)
        if (round !== run.current) return
      }
    } else {
      moveTo(
        passed.map((c) => c.id),
        'Interview',
      )
      toastBatch({ ...options, items: passed.map(itemOf), undoAll: (items) => moveTo(items.map((i) => i.id), 'Screening') })
    }
    setRunning(false)
  }, [v.arrival, v.media])

  React.useEffect(() => {
    void start()
    return () => {
      run.current++
      toast.dismiss()
    }
  }, [start])

  return (
    // The toast comes up in the room under the board, inside the stage.
    <div className="relative flex w-[600px] max-w-full flex-col gap-3 pb-[252px]">
      <div className="flex h-8 items-center justify-between gap-3">
        <p className="text-sm leading-5 font-medium text-text-default">Product Designer</p>
        {running ? (
          <AgentLoading label="Moving candidates who passed the screen…" />
        ) : (
          <Button variant="secondary" onClick={() => void start()}>
            <Sparks aria-hidden />
            Run again
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {STAGES.map((stage) => {
          const rank = (c: Candidate) => (c.stage === stage ? CANDIDATES.indexOf(c) : CANDIDATES.length + (arrived.current.get(c.id) ?? 0))
          const here = CANDIDATES.filter((c) => stages[c.id] === stage).sort((a, b) => rank(a) - rank(b))
          return (
            <section key={stage} aria-label={stage} className="flex flex-col gap-1.5 rounded-xl bg-bg-muted p-2">
              <h3 className="flex items-center justify-between px-1 pb-0.5 text-sm leading-5 font-medium text-text-muted">
                {stage}
                <span className="tabular-nums">{here.length}</span>
              </h3>
              {/* Room for every card, so the board keeps its height as they move. */}
              <ul className="m-0 flex min-h-[188px] list-none flex-col gap-1.5 p-0">
                {here.map((c) => (
                  <li
                    key={c.id}
                    className="flex h-11 items-center gap-2 rounded-lg border border-border-subtle bg-bg-card px-2.5 text-sm leading-5 text-text-default animate-[satin-enter_var(--duration-base)_var(--ease-out)]"
                  >
                    {v.media === 'on' && <Avatar initials={c.initials} tone={c.tone} size={24} aria-hidden />}
                    {c.name}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      <Toaster className="absolute inset-x-0 bottom-0 mx-auto w-[397px] max-w-full" />
    </div>
  )
}

export default function ToastBatchDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Toast batch" options={options} codeHtml={codeHtml} controls={controls} align="top" render={(id, v) => <Preview key={id} v={v} />} />
}
