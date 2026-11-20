import * as React from 'react'
import { DecisionCard, type DecisionOption, type DecisionValue } from '@uisatin/ui/decision-card'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/** One question per type: the props the stage renders, and the same props as code. */
type Example = {
  label: string
  title: string
  hint: string
  props: Partial<React.ComponentProps<typeof DecisionCard>>
  code: string[]
  onContinue: string
}

const examples: Record<string, Example> = {
  radio: {
    label: 'Radio',
    title: 'What’s your dietary preference?',
    hint: 'Pick one',
    props: {
      options: [
        { value: 'gluten', label: 'Gluten-free' },
        { value: 'dairy', label: 'Dairy-free' },
        { value: 'nut', label: 'Nut-free' },
        { value: 'other', label: 'Other' },
      ],
      defaultValue: 'gluten',
    },
    code: [
      `options={[
    { value: 'gluten', label: 'Gluten-free' },
    { value: 'dairy', label: 'Dairy-free' },
    { value: 'nut', label: 'Nut-free' },
    { value: 'other', label: 'Other' },
  ]}`,
      `defaultValue="gluten"`,
    ],
    onContinue: 'onContinue={(value) => answer(value)}',
  },
  checkbox: {
    label: 'Checkbox',
    title: 'Which meals should I plan?',
    hint: 'Select all that apply',
    props: {
      options: [
        { value: 'breakfast', label: 'Breakfast' },
        { value: 'lunch', label: 'Lunch' },
        { value: 'dinner', label: 'Dinner' },
        { value: 'snacks', label: 'Snacks' },
      ],
      defaultValue: ['lunch', 'dinner'],
    },
    code: [
      `options={[
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snacks', label: 'Snacks' },
  ]}`,
      `defaultValue={['lunch', 'dinner']}`,
    ],
    onContinue: 'onContinue={(values) => answer(values)}',
  },
  chips: {
    label: 'Chips',
    title: 'Which ingredients should I avoid?',
    hint: 'Select up to 5',
    props: {
      max: 5,
      options: [
        { value: 'peanuts', label: 'Peanuts' },
        { value: 'shellfish', label: 'Shellfish' },
        { value: 'gluten', label: 'Gluten' },
        { value: 'dairy', label: 'Dairy' },
        { value: 'eggs', label: 'Eggs' },
        { value: 'soy', label: 'Soy' },
        { value: 'sesame', label: 'Sesame' },
        { value: 'mustard', label: 'Mustard' },
      ] satisfies DecisionOption[],
      defaultValue: ['peanuts', 'shellfish'],
    },
    code: ['max={5}', 'options={ingredients} // { value, label }', `defaultValue={['peanuts', 'shellfish']}`],
    onContinue: 'onContinue={(values) => answer(values)}',
  },
  ranking: {
    label: 'Ranking',
    title: 'What matters most this week?',
    hint: 'Drag to reorder',
    props: {
      options: [
        { value: 'cost', label: 'Cost' },
        { value: 'time', label: 'Cooking time' },
        { value: 'protein', label: 'Protein' },
        { value: 'variety', label: 'Variety' },
      ],
    },
    code: [
      `options={[
    { value: 'cost', label: 'Cost' },
    { value: 'time', label: 'Cooking time' },
    { value: 'protein', label: 'Protein' },
    { value: 'variety', label: 'Variety' },
  ]}`,
    ],
    onContinue: 'onContinue={(order) => answer(order)}',
  },
  draft: {
    label: 'Draft',
    title: 'Reply to Anna from Green Farm',
    hint: 'Edit it before sending',
    props: {
      draftTitle: 'Title: About Friday’s order...',
      defaultValue:
        'Hi Anna,\nthanks for the quick delivery. Could we move Friday’s order to Thursday morning? Everything else stays the same.\n\nBest,\nMaciej',
    },
    code: ['draftTitle="Title: About Friday’s order..."', 'defaultValue={reply}'],
    onContinue: 'onContinue={(text) => send(text)}',
  },
}

// Type is the card itself, so it leads (a menu, six is too many to segment). Step, hint and
// skip are optional parts of a question; a summary has none of them, only Change.
export const controls: ShowcaseControl[] = [
  {
    id: 'type',
    label: 'Type',
    type: 'menu',
    items: [...Object.entries(examples).map(([value, e]) => ({ value, label: e.label })), { value: 'summary', label: 'Summary' }],
  },
  { id: 'step', label: 'Step', type: 'switch', default: 'on' },
  { id: 'hint', label: 'Hint', type: 'switch', default: 'off' },
  { id: 'skip', label: 'Skip', type: 'switch', default: 'on' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

const summary = { title: examples.radio.title, value: ['Gluten-free'] }

function code(v: Record<string, string>) {
  const props =
    v.type === 'summary'
      ? ['type="summary"', `title="${summary.title}"`, `value={['Gluten-free']}`, 'onEdit={edit}']
      : [
          v.type !== 'radio' && `type="${v.type}"`,
          `title="${examples[v.type].title}"`,
          v.hint === 'on' && `hint="${examples[v.type].hint}"`,
          v.step === 'on' && 'step={`${index + 1}/${questions.length}`}',
          v.step === 'on' && 'onPreviousStep={index > 0 ? () => setIndex(index - 1) : undefined}',
          v.step === 'on' && 'onNextStep={index < questions.length - 1 ? () => setIndex(index + 1) : undefined}',
          ...examples[v.type].code,
          v.step === 'on' ? examples[v.type].onContinue.replace(/=> (\w+)\((\w+)\)\}$/, '=> {\n    $1($2)\n    setIndex(index + 1)\n  }}') : examples[v.type].onContinue,
          v.skip === 'on' && (v.step === 'on' ? 'onSkip={() => setIndex(index + 1)}' : 'onSkip={skip}'),
        ].filter(Boolean)
  const flow =
    v.type !== 'summary' && v.step === 'on'
      ? `\n// One question of several: Continue and Skip go to the next, the arrows move between them.\nconst [index, setIndex] = React.useState(0)\n`
      : ''
  return `${flow ? "import * as React from 'react'\n" : ''}import { DecisionCard } from '@uisatin/ui/decision-card'
${flow}
<DecisionCard
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('type', v.type),
    v.step === 'on' ? 'Step' : 'No step',
    v.hint === 'on' ? 'Hint' : 'No hint',
    v.skip === 'on' ? 'Skip' : 'No skip',
  ].join(' · '),
  code: code(v),
}))

const order = Object.keys(examples)

/**
 * With Step on, the stage runs the question types as one flow: Continue and Skip go to the next
 * one and the arrows move between them; the counter and the Type picker follow, and a question
 * you come back to keeps its answer. Continue on the last question (or on the only one, with Step
 * off) collapses the card to its summary; Change brings the question back. The card hangs from
 * the top of the stage, so a taller or shorter question never moves its title.
 */
function Demo({ v, set }: { v: Record<string, string>; set: (id: string, value: string) => void }) {
  // The active question is the Type prop itself, so the picker (and the code) follow the arrows.
  const index = Math.max(0, order.indexOf(v.type))
  const setIndex = (i: number) => set('type', order[i])
  const [answers, setAnswers] = React.useState<Record<string, DecisionValue>>({})
  // What was picked on a question before moving on, so coming back shows it.
  const [picks, setPicks] = React.useState<Record<string, DecisionValue>>({})
  if (v.type === 'summary') return <DecisionCard type="summary" title={summary.title} value={summary.value} onEdit={() => {}} />

  const stepped = v.step === 'on'
  const type = stepped ? order[index] : v.type
  const example = examples[type]
  const opts = example.props.options ?? []
  const answer = answers[type]
  const answerWith = (value: DecisionValue) => setAnswers((a) => ({ ...a, [type]: value }))
  const last = index === order.length - 1

  if (answer !== undefined) {
    return (
      <DecisionCard
        type="summary"
        title={example.title}
        options={opts}
        value={type === 'draft' ? ['Reply sent'] : answer}
        onEdit={() =>
          setAnswers((a) => {
            const { [type]: _, ...rest } = a
            return rest
          })
        }
      />
    )
  }
  return (
    <DecisionCard
      {...example.props}
      defaultValue={picks[type] ?? example.props.defaultValue}
      type={type as 'radio' | 'checkbox' | 'chips' | 'ranking' | 'draft'}
      title={example.title}
      hint={v.hint === 'on' ? example.hint : undefined}
      step={stepped ? `${index + 1}/${order.length}` : undefined}
      onPreviousStep={stepped && index > 0 ? () => setIndex(index - 1) : undefined}
      onNextStep={stepped && !last ? () => setIndex(index + 1) : undefined}
      onContinue={(value) => {
        if (stepped && !last) {
          setPicks((p) => ({ ...p, [type]: value }))
          setIndex(index + 1)
        } else answerWith(type === 'ranking' ? (value as string[]).slice(0, 2) : value)
      }}
      onSkip={v.skip === 'on' ? () => (stepped && !last ? setIndex(index + 1) : answerWith(['Skipped'])) : undefined}
    />
  )
}

export default function DecisionCardDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Decision card"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v, set) => (
        <div className="h-[344px] w-[364px] max-w-full self-start md:h-[320px]">
          {/* Kept across Type changes, so stepping keeps the answers; the other props start over. */}
          <Demo key={`${v.step}-${v.hint}-${v.skip}`} v={v} set={set} />
        </div>
      )}
    />
  )
}
