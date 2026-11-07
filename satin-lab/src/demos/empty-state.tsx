import { EmptyState } from '@satin/ui/empty-state'
import { Button } from '@satin/ui/button'
import { ArrowRight } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const description = 'Create a project to start tracking deals, or import one from a CSV.'

// The three action rows uiKit draws, plus none.
const actionSets = {
  pair: {
    label: 'Primary + secondary',
    node: (
      <>
        <Button>Create project</Button>
        <Button variant="secondary">Import project</Button>
      </>
    ),
    code: `
    <>
      <Button>Create project</Button>
      <Button variant="secondary">Import project</Button>
    </>`,
  },
  secondary: {
    label: 'Secondary',
    node: <Button variant="secondary">Import project</Button>,
    code: `<Button variant="secondary">Import project</Button>`,
  },
  'learn-more': {
    label: 'Learn more',
    node: (
      <Button variant="tertiary">
        Learn more
        <ArrowRight aria-hidden />
      </Button>
    ),
    code: `
    <Button variant="tertiary">
      Learn more
      <ArrowRight />
    </Button>`,
  },
  none: { label: 'None', node: undefined, code: '' },
}
type ActionSet = keyof typeof actionSets

// The border is the frame, so it leads; the icon, description and actions are content in it.
export const controls: ShowcaseControl[] = [
  {
    id: 'border',
    label: 'Border',
    items: [{ value: 'ghost', label: 'Ghost' }, { value: 'dashed', label: 'Dashed' }, { value: 'outline', label: 'Outline' }],
  },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  {
    id: 'actions',
    label: 'Actions',
    type: 'menu',
    items: Object.entries(actionSets).map(([value, a]) => ({ value, label: a.label })),
  },
]

function code(v: Record<string, string>) {
  const actions = actionSets[v.actions as ActionSet]
  const attrs = [
    v.border !== 'ghost' && `border="${v.border}"`,
    v.icon === 'on' && 'icon={<ArrowRight />}',
    'title="No projects yet"',
    v.description === 'on' && `description="${description}"`,
    actions.code && `actions={${actions.code}${actions.code.startsWith('\n') ? '\n  ' : ''}}`,
  ].filter(Boolean)
  const arrow = v.icon === 'on' || v.actions === 'learn-more'
  return `import { EmptyState } from '@satin/ui/empty-state'
${v.actions !== 'none' ? "import { Button } from '@satin/ui/button'\n" : ''}${arrow ? "import { ArrowRight } from 'iconoir-react'\n" : ''}
${attrs.length > 2 ? `<EmptyState\n${attrs.map((a) => `  ${a}`).join('\n')}\n/>` : `<EmptyState ${attrs.join(' ')} />`}`
}

const title = (s: string) => s[0].toUpperCase() + s.slice(1)

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    title(v.border),
    v.icon === 'on' ? 'Icon' : 'No icon',
    v.description === 'on' ? 'Description' : 'No description',
    v.actions === 'none' ? 'No actions' : actionSets[v.actions as ActionSet].label,
  ].join(' · '),
  code: code(v),
}))

export default function EmptyStateDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Empty state"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <EmptyState
          border={v.border as 'ghost' | 'dashed' | 'outline'}
          icon={v.icon === 'on' ? <ArrowRight /> : undefined}
          title="No projects yet"
          description={v.description === 'on' ? description : undefined}
          actions={actionSets[v.actions as ActionSet].node}
        />
      )}
    />
  )
}
