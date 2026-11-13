import * as React from 'react'
import { StreamingText } from '@uisatin/ui/streaming-text'
import { Button } from '@uisatin/ui/button'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  {
    id: 'reveal',
    label: 'Reveal',
    items: [
      { value: 'blur', label: 'Blur' },
      { value: 'fade', label: 'Fade' },
      { value: 'word', label: 'Words' },
      { value: 'none', label: 'None' },
    ],
  },
  { id: 'speed', label: 'Speed', items: [{ value: '45', label: 'Calm' }, { value: '80', label: 'Default' }, { value: '160', label: 'Fast' }], default: '80' },
  { id: 'caret', label: 'Caret', type: 'switch', default: 'on' },
]

const answer = `Three deals moved to Negotiation this week, worth $184k together. Northwind is the largest at $96k; their legal team asked for a shorter notice period, so I drafted a reply for you to check.

Two renewals are at risk: Acme hasn't opened the last three emails, and Globex cut their seat count by a third. I'd call Acme first.`

function code(v: Record<string, string>) {
  const p = [
    'text={received}',
    'streaming={!finished}',
    v.reveal !== 'blur' && `reveal="${v.reveal}"`,
    v.speed !== '80' && `speed={${v.speed}}`,
    v.caret === 'off' && 'caret={false}',
  ].filter(Boolean)
  return `import { StreamingText } from '@uisatin/ui/streaming-text'

// received: everything the model has sent so far; it grows as chunks arrive.
<StreamingText ${p.join(' ')} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [{ blur: 'Blur', fade: 'Fade', word: 'Words', none: 'None' }[v.reveal], { '45': 'Calm', '80': 'Default', '160': 'Fast' }[v.speed]].join(' · '),
  code: code(v),
}))

/** Sends the answer the way a model does: uneven chunks at uneven intervals. */
function useFakeStream(run: number) {
  const [received, setReceived] = React.useState('')
  const [finished, setFinished] = React.useState(false)
  React.useEffect(() => {
    setReceived('')
    setFinished(false)
    let at = 0
    let timer = 0
    const send = () => {
      const size = 2 + Math.floor(Math.random() * 14)
      at = Math.min(answer.length, at + size)
      setReceived(answer.slice(0, at))
      if (at < answer.length) timer = window.setTimeout(send, 40 + Math.random() * 120)
      else setFinished(true)
    }
    timer = window.setTimeout(send, 400)
    return () => clearTimeout(timer)
  }, [run])
  return { received, finished }
}

function Preview({ v }: { v: Record<string, string> }) {
  const [run, setRun] = React.useState(0)
  const [written, setWritten] = React.useState(false)
  const { received, finished } = useFakeStream(run)
  return (
    <div className="flex w-[440px] max-w-full flex-col items-start gap-4">
      <StreamingText
        key={run}
        text={received}
        streaming={!finished}
        reveal={v.reveal as 'blur' | 'fade' | 'word' | 'none'}
        speed={Number(v.speed)}
        caret={v.caret === 'on'}
        onDone={() => setWritten(true)}
        className="min-h-[156px] w-full"
      />
      <Button
        variant="secondary"
        disabled={!written}
        onClick={() => {
          setWritten(false)
          setRun((r) => r + 1)
        }}
      >
        Replay
      </Button>
    </div>
  )
}

export default function StreamingTextDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Streaming text"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Preview key={id} v={v} />}
    />
  )
}
