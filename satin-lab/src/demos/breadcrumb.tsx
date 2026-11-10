import { Home } from 'iconoir-react'
import { Breadcrumb, type BreadcrumbItem } from '@satin/ui/breadcrumb'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'levels', label: 'Levels', items: [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: 'collapsed', label: 'Collapsed' }] },
  { id: 'icon', label: 'First item', items: [{ value: 'text', label: 'Text' }, { value: 'icon', label: 'Icon and text' }, { value: 'only', label: 'Icon only' }] },
]

// The first item's icon, as the First item control asks.
const withIcon = (items: BreadcrumbItem[], icon: string) =>
  icon === 'text' ? items : items.map((it, i) => (i === 0 ? { ...it, icon: <Home />, hideLabel: icon === 'only' } : it))

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
  const lines = items
    .map((it, i) => {
      const icon = i === 0 && v.icon !== 'text' ? `, icon: <Home />${v.icon === 'only' ? ', hideLabel: true' : ''}` : ''
      return `  { label: '${it.label}'${icon}${it.href ? `, href: '/${it.label.toLowerCase()}'` : ''} },`
    })
    .join('\n')
  return `${v.icon !== 'text' ? "import { Home } from 'iconoir-react'\n" : ''}import { Breadcrumb } from '@satin/ui/breadcrumb'

<Breadcrumb${v.levels === 'collapsed' ? ' maxItems={4}' : ''} items={[
${lines}
]} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.levels === 'collapsed' ? 'Collapsed' : `${v.levels} levels`, { text: 'Text', icon: 'Icon and text', only: 'Icon only' }[v.icon]].join(' · '),
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
          items={withIcon(itemsFor(v.levels), v.icon).map((i) => ({ ...i, href: undefined, onSelect: i.href ? () => {} : undefined }))}
          maxItems={v.levels === 'collapsed' ? 4 : undefined}
        />
      )}
    />
  )
}
