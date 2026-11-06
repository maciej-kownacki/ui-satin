import * as React from 'react'
import { DecisionCard, type DecisionOption, type DecisionValue } from '@satin/ui/decision-card'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

/** The 14px ingredient icons from uiKit (3112:39109 …), drawn on Iconoir's grid. */
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.09375" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}
const icons = {
  peanut: (
    <Icon>
      <path d="M10.0113 2.69945C11.2059 3.53592 11.2869 4.94569 10.5174 6.04472C9.91511 6.90483 8.89242 7.04327 8.24238 7.86992C7.65926 8.60101 8.28035 9.74802 7.47734 10.8948C6.64088 12.0894 5.18332 12.137 3.98872 11.3005C2.79413 10.4641 2.34033 9.07815 3.17679 7.88356C3.9798 6.73674 5.27007 6.92808 5.75762 6.13008C6.31209 5.23651 6.0924 4.22814 6.69466 3.36803C7.46421 2.269 8.81668 1.86299 10.0113 2.69945Z" />
      <path d="M8.36239 4.0373L8.36716 4.04065M8.64889 5.66215L8.65367 5.6655M5.35111 8.33785L5.35589 8.34119M5.63761 9.9627L5.64239 9.96604" />
    </Icon>
  ),
  shell: (
    <Icon>
      <path d="M7 11.6667L3.04024 6.46948C2.6034 5.89613 2.48862 5.11796 2.87993 4.51262C3.84003 3.0274 5.32144 2.04167 7 2.04167C8.67856 2.04167 10.16 3.0274 11.1201 4.51262C11.5114 5.11796 11.3966 5.89613 10.9598 6.46948L7 11.6667Z" />
      <path d="M9.21667 2.625L7 11.6667L4.78333 2.625M7 11.6667V2.04167" />
      <path d="M5.54167 12.25H8.45833" />
    </Icon>
  ),
  bread: (
    <Icon>
      <path d="M4.08339 11.6667V5.25C4.08339 5.25 1.75002 2.33333 5.54172 2.33333H9.91672C14.0001 2.33333 11.6667 5.25 11.6667 5.25V10.5C11.6667 11.1443 11.1444 11.6667 10.5001 11.6667H4.08339Z" />
      <path d="M4.08339 11.6667H3.50005C2.85572 11.6667 2.33339 11.1443 2.33339 10.5V5.25C2.33339 5.25 2.34842e-05 2.33333 3.79172 2.33333H5.83339" />
    </Icon>
  ),
  milk: (
    <Icon>
      <path d="M4.66667 5.25L5.83333 2.91667H8.16667L9.33333 5.25V11.6667C9.33333 11.9888 9.07217 12.25 8.75 12.25H5.25C4.92784 12.25 4.66667 11.9888 4.66667 11.6667V5.25Z" />
      <path d="M4.66667 5.25H9.33333" />
      <path d="M5.83333 2.91667V1.75H8.16667V2.91667" />
      <path d="M7 7.29167C7.58333 7.99167 7.875 8.45833 7.875 8.89583C7.875 9.38 7.48417 9.77083 7 9.77083C6.51583 9.77083 6.125 9.38 6.125 8.89583C6.125 8.45833 6.41667 7.99167 7 7.29167Z" />
    </Icon>
  ),
  egg: (
    <Icon>
      <path d="M7 12.8333C9.57734 12.8333 11.6667 10.744 11.6667 8.16667C11.6667 5.58934 9.57734 1.16667 7 1.16667C4.42267 1.16667 2.33333 5.58934 2.33333 8.16667C2.33333 10.744 4.42267 12.8333 7 12.8333Z" />
    </Icon>
  ),
  soy: (
    <Icon>
      <path d="M3.28769 7.57747L7.57747 3.28769C8.44313 2.42203 9.84665 2.42203 10.7123 3.28769C11.578 4.15335 11.578 5.55687 10.7123 6.42253L6.42253 10.7123C5.55687 11.578 4.15335 11.578 3.28769 10.7123C2.42203 9.84665 2.42203 8.44313 3.28769 7.57747Z" />
      <path d="M7.7 7C7.7 7.3866 7.3866 7.7 7 7.7C6.6134 7.7 6.3 7.3866 6.3 7C6.3 6.6134 6.6134 6.3 7 6.3C7.3866 6.3 7.7 6.6134 7.7 7Z" />
      <path d="M5.71667 8.98333C5.71667 9.36993 5.40327 9.68333 5.01667 9.68333C4.63007 9.68333 4.31667 9.36993 4.31667 8.98333C4.31667 8.59673 4.63007 8.28333 5.01667 8.28333C5.40327 8.28333 5.71667 8.59673 5.71667 8.98333Z" />
      <path d="M9.68333 5.01667C9.68333 5.40327 9.36993 5.71667 8.98333 5.71667C8.59673 5.71667 8.28333 5.40327 8.28333 5.01667C8.28333 4.63007 8.59673 4.31667 8.98333 4.31667C9.36993 4.31667 9.68333 4.63007 9.68333 5.01667Z" />
      <path d="M11.0833 2.91667L12.25 1.75" />
    </Icon>
  ),
  sesame: (
    <Icon>
      <path d="M3.20833 2.64594C4.48329 2.98756 5.3541 3.56252 5.82077 4.37081C6.25827 5.12858 6.0234 6.00512 5.36667 6.38428C4.70993 6.76345 3.8334 6.52858 3.3959 5.77081C2.92923 4.96252 2.86671 3.9209 3.20833 2.64594Z" />
      <path d="M10.3194 2.26028C10.7709 3.50061 10.7994 4.54372 10.4049 5.38961C10.0352 6.18263 9.18242 6.493 8.49514 6.17251C7.80786 5.85203 7.49749 4.9993 7.86728 4.20628C8.26172 3.36039 9.07911 2.71173 10.3194 2.26028Z" />
      <path d="M6.79664 7.30055C7.80776 8.14898 8.354 9.03809 8.43535 9.96787C8.51161 10.8395 7.92831 11.5347 7.17286 11.6008C6.41741 11.6669 5.72226 11.0836 5.646 10.2119C5.56465 9.28213 5.9482 8.31167 6.79664 7.30055Z" />
    </Icon>
  ),
  mustard: (
    <Icon>
      <path d="M6.41667 1.45833H7.58333L7.875 3.20833H6.125L6.41667 1.45833Z" />
      <path d="M5.54167 3.20833H8.45833V4.66667H5.54167V3.20833Z" />
      <path d="M5.25 4.66667H8.75L9.33333 5.83333V11.375C9.33333 11.8582 8.94157 12.25 8.45833 12.25H5.54167C5.05842 12.25 4.66667 11.8582 4.66667 11.375V5.83333L5.25 4.66667Z" />
      <path d="M6.125 7.29167H7.875V9.625H6.125V7.29167Z" />
    </Icon>
  ),
}

type Example = {
  id: string
  label: string
  props: React.ComponentProps<typeof DecisionCard>
  code: string
}

const examples: Example[] = [
  {
    id: 'radio',
    label: 'Single choice',
    props: {
      type: 'radio',
      title: 'What’s your dietary preference?',
      step: '1/3',
      options: [
        { value: 'gluten', label: 'Gluten-free' },
        { value: 'dairy', label: 'Dairy-free' },
        { value: 'nut', label: 'Nut-free' },
        { value: 'other', label: 'Other' },
      ],
      defaultValue: 'gluten',
    },
    code: `<DecisionCard
  type="radio"
  title="What’s your dietary preference?"
  step="1/3"
  options={[
    { value: 'gluten', label: 'Gluten-free' },
    { value: 'dairy', label: 'Dairy-free' },
    { value: 'nut', label: 'Nut-free' },
    { value: 'other', label: 'Other' },
  ]}
  onContinue={(value) => answer(value)}
  onSkip={skip}
/>`,
  },
  {
    id: 'chips',
    label: 'Chips',
    props: {
      type: 'chips',
      title: 'Which ingredients should I avoid?',
      hint: 'Select up to 5',
      max: 5,
      step: '1/3',
      options: [
        { value: 'peanuts', label: 'Peanuts', icon: icons.peanut },
        { value: 'shellfish', label: 'Shellfish', icon: icons.shell },
        { value: 'gluten', label: 'Gluten', icon: icons.bread },
        { value: 'dairy', label: 'Dairy', icon: icons.milk },
        { value: 'eggs', label: 'Eggs', icon: icons.egg },
        { value: 'soy', label: 'Soy', icon: icons.soy },
        { value: 'sesame', label: 'Sesame', icon: icons.sesame },
        { value: 'mustard', label: 'Mustard', icon: icons.mustard },
      ] satisfies DecisionOption[],
      defaultValue: ['peanuts', 'shellfish'],
    },
    code: `<DecisionCard
  type="chips"
  title="Which ingredients should I avoid?"
  hint="Select up to 5"
  max={5}
  step="1/3"
  options={ingredients} // { value, label, icon }
  onContinue={(values) => answer(values)}
  onSkip={skip}
/>`,
  },
  {
    id: 'ranking',
    label: 'Ranking',
    props: {
      type: 'ranking',
      title: 'What matters most this week?',
      step: '1/3',
      options: [
        { value: 'cost', label: 'Cost' },
        { value: 'time', label: 'Cooking time' },
        { value: 'protein', label: 'Protein' },
        { value: 'variety', label: 'Variety' },
      ],
    },
    code: `<DecisionCard
  type="ranking"
  title="What matters most this week?"
  step="1/3"
  options={[
    { value: 'cost', label: 'Cost' },
    { value: 'time', label: 'Cooking time' },
    { value: 'protein', label: 'Protein' },
    { value: 'variety', label: 'Variety' },
  ]}
  onContinue={(order) => answer(order)}
  onSkip={skip}
/>`,
  },
  {
    id: 'draft',
    label: 'Draft',
    props: {
      type: 'draft',
      title: 'Reply to Anna from Green Farm',
      step: '1/3',
      draftTitle: 'Title: About Friday’s order...',
      defaultValue:
        'Hi Anna,\nthanks for the quick delivery. Could we move Friday’s order to Thursday morning? Everything else stays the same.\n\nBest,\nMaciej',
    },
    code: `<DecisionCard
  type="draft"
  title="Reply to Anna from Green Farm"
  step="1/3"
  draftTitle="Title: About Friday’s order..."
  defaultValue={reply}
  onContinue={(text) => send(text)}
  onSkip={skip}
/>`,
  },
]

export const options: ShowcaseOption[] = examples.map((e) => ({
  id: e.id,
  label: e.label,
  code: `import { DecisionCard } from '@satin/ui/decision-card'\n\n${e.code}`,
}))

function Demo({ example }: { example: Example }) {
  const [answer, setAnswer] = React.useState<DecisionValue | null>(null)
  const { options: opts = [], title } = example.props

  if (answer !== null) {
    const summaryValue = example.id === 'draft' ? ['Reply sent'] : answer
    return (
      <DecisionCard
        type="summary"
        title={title}
        options={opts}
        value={summaryValue}
        onEdit={() => setAnswer(null)}
      />
    )
  }
  return (
    <DecisionCard
      {...example.props}
      onContinue={(v) => setAnswer(example.id === 'ranking' ? (v as string[]).slice(0, 2) : v)}
      onSkip={() => setAnswer(['Skipped'])}
    />
  )
}

export default function DecisionCardDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Decision card"
      options={options}
      codeHtml={codeHtml}
      render={(id) => {
        const example = examples.find((e) => e.id === id) ?? examples[0]
        return <Demo key={id} example={example} />
      }}
    />
  )
}
