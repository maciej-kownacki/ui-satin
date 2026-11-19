import * as React from 'react'
import { Mail } from 'iconoir-react'
import { AgentSuggestion } from '@uisatin/ui/agent-suggestion'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Button } from '@uisatin/ui/button'
import { Input } from '@uisatin/ui/input'
import { Textarea } from '@uisatin/ui/textarea'
import { ReviewQueue, type ReviewDecisions } from '@uisatin/pro/review-queue'
import { Showcase, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/** A follow-up the agent drafted from the booth notes after Packaging Expo North. */
type FollowUp = { id: string; name: string; company: string; initials: string; tone: AvatarTone; subject: string; body: string }

const FOLLOW_UPS: FollowUp[] = [
  {
    id: 'anna',
    name: 'Anna Kowalska',
    company: 'Brightloaf Bakery',
    initials: 'AK',
    tone: 'amber',
    subject: 'Kraft bags for your sourdough line',
    body: 'Hi Anna, thanks for stopping by on Thursday. You said your sourdough bags tear at the seal: our 70-micron kraft bag holds a 1.2 kg loaf. Shall I send 50 samples to Kraków next week?',
  },
  {
    id: 'jonas',
    name: 'Jonas Weber',
    company: 'Alpenmilch',
    initials: 'JW',
    tone: 'sky',
    subject: 'The oat-milk carton samples',
    body: 'Hi Jonas, good to meet you at the fair. The plant-based carton you held at the stand ships from our Leipzig plant in four weeks. I can have ten blanks with you by Friday for your line trial.',
  },
  {
    id: 'lea',
    name: 'Léa Martin',
    company: 'Maison Céleste',
    initials: 'LM',
    tone: 'plum',
    subject: 'Gift boxes for the spring range',
    body: 'Bonjour Léa, you liked the magnetic gift box with the paper hinge. It comes in the sage you pointed at, and we can foil your logo from 2,000 units. Would a call on Tuesday suit you?',
  },
  {
    id: 'marcus',
    name: 'Marcus Lindqvist',
    company: 'Nordvik Coffee',
    initials: 'ML',
    tone: 'neutral',
    subject: 'Valve bags: lead times',
    body: 'Hi Marcus, as promised, the lead times for the compostable valve bag: six weeks for the first run, three after that. The degassing valve is the one you tested at the booth.',
  },
  {
    id: 'priya',
    name: 'Priya Raman',
    company: 'Greenleaf Grocers',
    initials: 'PR',
    tone: 'green',
    subject: 'Pricing for 20,000 trays',
    body: 'Hi Priya, here is the pricing you asked for: 20,000 moulded-fibre trays at €0.11 each, falling to €0.09 above 50,000. They go in your existing sealing machines without a change of tooling.',
  },
  {
    id: 'tomas',
    name: 'Tomás Ortega',
    company: 'Ortega Olive Oil',
    initials: 'TO',
    tone: 'amber',
    subject: 'Tins or glass: the comparison',
    body: 'Hola Tomás, I put the tin and the glass bottle side by side as we discussed: the tin is 60% lighter to ship and keeps the light out, the glass shows the colour of the oil. Both sheets attached.',
  },
  {
    id: 'hannah',
    name: 'Hannah Brooks',
    company: 'Little Sprout Snacks',
    initials: 'HB',
    tone: 'fuchsia',
    subject: 'Recyclable pouches for the kids’ range',
    body: 'Hi Hannah, the mono-material pouch goes in household recycling in the UK and keeps the puffs crisp for nine months. I can send printed mock-ups of the giraffe design within two weeks.',
  },
  {
    id: 'kenji',
    name: 'Kenji Watanabe',
    company: 'Umami Pantry',
    initials: 'KW',
    tone: 'red',
    subject: 'The noodle box prototype',
    body: 'Hi Kenji, our designer turned your sketch into a prototype: a folding noodle box with no glue and a window for the broth sachet. Photos attached; the first ten can go out on Monday.',
  },
  {
    id: 'sofia',
    name: 'Sofia Rossi',
    company: 'Dolce Vita Gelato',
    initials: 'SR',
    tone: 'brand',
    subject: 'Insulated tubs for summer delivery',
    body: 'Ciao Sofia, the insulated paper tub kept gelato below −12 °C for 40 minutes in our test, enough for your city deliveries. It stacks like your current tubs, so the freezers need no change.',
  },
  {
    id: 'ole',
    name: 'Ole Hansen',
    company: 'Fjord Seafood',
    initials: 'OH',
    tone: 'sky',
    subject: 'Wet-strength boxes, as promised',
    body: 'Hi Ole, here are the wet-strength boxes I mentioned: they hold 10 kg of ice and fish for 48 hours without softening, and they replace polystyrene on your Oslo routes. Spec sheet attached.',
  },
  {
    id: 'amara',
    name: 'Amara Okafor',
    company: 'Sunbeam Juices',
    initials: 'AO',
    tone: 'green',
    subject: 'Labels in recycled paper',
    body: 'Hi Amara, the recycled-paper labels survive the fridge and condensation, and they wash off in the bottle-return line. I’ve reserved a press slot in March for your three flavours.',
  },
  {
    id: 'lukas',
    name: 'Lukas Novák',
    company: 'Brewhouse Praha',
    initials: 'LN',
    tone: 'plum',
    subject: 'Six-pack carriers without plastic',
    body: 'Ahoj Lukas, the paper six-pack carrier clips onto standard cans and takes your logo on both sides. We can run 5,000 for the summer festival; samples are on their way to the brewery.',
  },
]

const states = [
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'editing', label: 'Editing' },
  { value: 'done', label: 'All done' },
]

export const controls: ShowcaseControl[] = [{ id: 'state', label: 'State', items: states }]

const code = (state: string) => `import { AgentSuggestion } from '@uisatin/ui/agent-suggestion'
import { Avatar } from '@uisatin/ui/avatar'
import { Input } from '@uisatin/ui/input'
import { Textarea } from '@uisatin/ui/textarea'
import { ReviewQueue } from '@uisatin/pro/review-queue'
import { Mail } from 'iconoir-react'

export function FollowUps({ drafts }: { drafts: FollowUp[] }) {
  const [emails, setEmails] = React.useState(drafts)
${state === 'editing' ? '  const [editing, setEditing] = React.useState(true)\n' : ''}
  return (
    <ReviewQueue
      title="Packaging Expo North: follow-ups"
      items={emails}
      itemLabel={(email) => email.name}
      renderItem={(email) => (
        <AgentSuggestion
          className="max-w-none"
          kind="Follow-up email"
          icon={<Mail />}
          meta={<Avatar initials={email.initials} tone={email.tone} size={24} />}
          title={email.subject}
          description={email.body}
        />
      )}
      onApprove={(email) => sendEmail(email)}
      onSkip={(email) => keepAsDraft(email)}
      // Edit opens these fields in a Sheet; Save brings you back to the same email.
      renderEditor={(email) => (
        <>
          <Input label="Subject" name="subject" defaultValue={email.subject} />
          <Textarea label="Message" name="body" defaultValue={email.body} rows={6} />
        </>
      )}
      onEdit={(email, values) =>
        setEmails((all) => all.map((e) => (e.id === email.id ? { ...e, subject: String(values?.subject), body: String(values?.body) } : e)))
      }
      editTitle={(email) => \`Email to \${email.name}\`}${state === 'editing' ? '\n      editing={editing}\n      onEditingChange={setEditing}' : ''}${
        state === 'done' ? '\n      summaryActions={<Button onClick={backToInbox}>Back to inbox</Button>}' : ''
      }
    />
  )
}`

export const options: ShowcaseOption[] = states.map((s) => ({ id: s.value, label: s.label, code: code(s.value) }))

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Where each state starts: three decided and the fourth on show, or all twelve decided. */
const START: Record<string, { index: number; decisions: ReviewDecisions }> = {
  reviewing: { index: 3, decisions: { anna: 'approved', jonas: 'approved', lea: 'skipped' } },
  editing: { index: 3, decisions: { anna: 'approved', jonas: 'approved', lea: 'skipped' } },
  done: {
    index: 11,
    decisions: Object.fromEntries(FOLLOW_UPS.map((f) => [f.id, ['lea', 'tomas', 'kenji'].includes(f.id) ? 'skipped' : 'approved'])),
  },
}

/** The trade fair scenario: twelve follow-ups the agent drafted, gone through one by one. */
function Preview({ state }: { state: string }) {
  // Start over begins again from the first email, with nothing decided.
  const [round, setRound] = React.useState(0)
  const start = round > 0 ? { index: 0, decisions: {} } : (START[state] ?? START.reviewing)
  const [emails, setEmails] = React.useState(FOLLOW_UPS)
  const [editing, setEditing] = React.useState(state === 'editing')
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const boxRef = React.useRef<HTMLDivElement>(null)
  const openedOnce = React.useRef(false)

  // A press outside the preview is the docs page, not this page: the editor stays open (like the Sheet demo).
  const pressedOutside = React.useRef(false)
  React.useEffect(() => {
    const onDown = (e: PointerEvent) => {
      pressedOutside.current = !boxRef.current?.contains(e.target as Node)
    }
    const onKey = () => {
      pressedOutside.current = false
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [])

  return (
    <div ref={boxRef} className="relative -mx-10 -my-6 flex min-w-0 flex-1 justify-center self-stretch px-4 py-6 sm:px-10">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 overflow-hidden *:pointer-events-auto" />
      <ReviewQueue
        key={round}
        title="Packaging Expo North: follow-ups"
        items={emails}
        itemLabel={(email) => email.name}
        defaultIndex={start.index}
        defaultDecisions={start.decisions}
        renderItem={(email) => (
          <AgentSuggestion
            className="max-w-none"
            kind="Follow-up email"
            icon={<Mail />}
            meta={
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Avatar initials={email.initials} tone={email.tone} size={20} aria-hidden />
                {email.company}
              </span>
            }
            title={email.subject}
            description={email.body}
          />
        )}
        onApprove={() => wait(450)}
        renderEditor={(email) => (
          <div className="flex flex-col gap-4">
            <Input label="Subject" name="subject" defaultValue={email.subject} />
            <Textarea label="Message" name="body" defaultValue={email.body} rows={7} />
          </div>
        )}
        onEdit={(email, values) =>
          setEmails((all) => all.map((e) => (e.id === email.id ? { ...e, subject: String(values?.subject ?? e.subject), body: String(values?.body ?? e.body) } : e)))
        }
        editTitle={(email) => `Email to ${email.name}`}
        editing={editing}
        onEditingChange={(next) => {
          if (!next && pressedOutside.current) return
          setEditing(next)
        }}
        sheetProps={
          stage
            ? {
                container: stage,
                modal: false,
                // Opened by the State control on load: leave focus on the page.
                onOpenAutoFocus: (e) => {
                  if (!openedOnce.current && state === 'editing') e.preventDefault()
                  openedOnce.current = true
                },
              }
            : undefined
        }
        summaryActions={
          <Button variant="tertiary" onClick={() => setRound((n) => n + 1)}>
            Start over
          </Button>
        }
      />
    </div>
  )
}

export default function ReviewQueueDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Review queue" options={options} codeHtml={codeHtml} controls={controls} align="top" render={(id, v) => <Preview key={id} state={v.state} />} />
}
