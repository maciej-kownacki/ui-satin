import { Breadcrumb, type BreadcrumbItem } from '@satin/ui/breadcrumb'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'levels', label: 'Levels', items: [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: 'collapsed', label: 'Collapsed' }] },
]

const path: BreadcrumbItem[] = [
  { label: 'Home', href: '#' },
  { label: 'Workspace', href: '#' },
  { label: 'Projects', href: '#' },
  { label: 'Settings', href: '#' },
  { label: 'Members', href: '#' },
  { label: 'Invite' },
]
const itemsFor = (levels: string) => (levels === 'collapsed' ? path : [...path.slice(0, Number(levels) - 1), path[path.length - 1]])

function code(v: Record<string, string>) {
  const items = itemsFor(v.levels)
  const lines = items.map((i) => `  { label: '${i.label}'${i.href ? `, href: '/${i.label.toLowerCase()}'` : ''} },`).join('\n')
  return `import { Breadcrumb } from '@satin/ui/breadcrumb'

<Breadcrumb${v.levels === 'collapsed' ? ' maxItems={4}' : ''} items={[
${lines}
]} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: v.levels === 'collapsed' ? 'Collapsed' : `${v.levels} levels`,
  code: code(v),
}))

export default function BreadcrumbDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Breadcrumb"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <Breadcrumb
          items={itemsFor(v.levels).map((i) => ({ ...i, href: undefined, onSelect: i.href ? () => {} : undefined }))}
          maxItems={v.levels === 'collapsed' ? 4 : undefined}
        />
      )}
    />
  )
}
