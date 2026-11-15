import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@uisatin/ui/dropdown'
import { Item, List } from '@uisatin/ui/list'
import { Switch } from '@uisatin/ui/switch'
import { Bell, Folder, MoreHoriz, Page, PageEdit } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  {
    id: 'example',
    label: 'Example',
    type: 'menu',
    items: [
      { value: 'files', label: 'Files' },
      { value: 'people', label: 'People' },
      { value: 'settings', label: 'Settings' },
    ],
  },
  { id: 'variant', label: 'Variant', default: 'card', items: [{ value: 'plain', label: 'Plain' }, { value: 'divided', label: 'Divided' }, { value: 'card', label: 'Card' }] },
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'sm', label: 'SM' }, { value: 'md', label: 'MD' }] },
]

const files = [
  { Icon: Folder, icon: 'Folder', title: 'Brand assets', description: '24 files', meta: 'Today' },
  { Icon: PageEdit, icon: 'PageEdit', title: 'Q3 planning.md', description: 'Edited by Ada', meta: '2h ago' },
  { Icon: Page, icon: 'Page', title: 'Contract — Acme.pdf', description: '1.2 MB', meta: 'May 2' },
]
const people = [
  { initials: 'AL', tone: 'brand', title: 'Ada Lovelace', description: 'ada@satin.dev', role: 'Owner' },
  { initials: 'GH', tone: 'green', title: 'Grace Hopper', description: 'grace@satin.dev', role: 'Admin' },
  { initials: 'AT', tone: 'amber', title: 'Alan Turing', description: 'alan@satin.dev', role: 'Member' },
] as const
const settings = [
  { title: 'Mentions', description: 'When someone @-mentions you', on: true },
  { title: 'Weekly digest', description: 'A summary every Monday morning', on: false },
  { title: 'Agent runs', description: 'When an agent finishes a task', on: true },
]

function code(v: Record<string, string>) {
  const listProps = [v.variant !== 'plain' && `variant="${v.variant}"`, v.size !== 'md' && `size="${v.size}"`].filter(Boolean).join(' ')
  const open = `<List${listProps ? ` ${listProps}` : ''}>`
  if (v.example === 'files')
    return `import { Item, List } from '@uisatin/ui/list'
import { ${files.map((f) => f.icon).join(', ')} } from 'iconoir-react'

${open}
${files.map((f) => `  <Item href="/files/1" icon={<${f.icon} />} title="${f.title}" description="${f.description}" meta="${f.meta}" />`).join('\n')}
</List>`
  if (v.example === 'people')
    return `import { Item, List } from '@uisatin/ui/list'
import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { DropdownMenu, DropdownMenuItem } from '@uisatin/ui/dropdown'

${open}
${people
  .map(
    (p) => `  <Item
    media={<Avatar initials="${p.initials}" tone="${p.tone}" size={32} />}
    title="${p.title}"
    description="${p.description}"
    meta={<Badge>${p.role}</Badge>}
    actions={<DropdownMenu trigger={…}>…</DropdownMenu>}
  />`,
  )
  .join('\n')}
</List>`
  return `import { Item, List } from '@uisatin/ui/list'
import { Switch } from '@uisatin/ui/switch'

${open}
${settings.map((s) => `  <Item title="${s.title}" description="${s.description}" actions={<Switch aria-label="${s.title}"${s.on ? ' defaultChecked' : ''} />} />`).join('\n')}
</List>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: Object.values(v).join(' · '), code: code(v) }))

export default function ListDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="List"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-[420px] max-w-full">
          <List variant={v.variant as 'card'} size={v.size as 'md'} aria-label={v.example}>
            {v.example === 'files' &&
              files.map((f) => <Item key={f.title} href="#" icon={<f.Icon />} title={f.title} description={f.description} meta={f.meta} />)}
            {v.example === 'people' &&
              people.map((p) => (
                <Item
                  key={p.title}
                  media={<Avatar initials={p.initials} tone={p.tone} size={v.size === 'sm' ? 24 : 32} />}
                  title={p.title}
                  description={p.description}
                  meta={<Badge>{p.role}</Badge>}
                  actions={
                    <DropdownMenu
                      align="end"
                      trigger={
                        <Button variant="tertiary" size="xs" iconOnly aria-label={`Actions for ${p.title}`}>
                          <MoreHoriz />
                        </Button>
                      }
                    >
                      <DropdownMenuItem label="Change role" />
                      <DropdownMenuItem label="Remove from workspace" />
                    </DropdownMenu>
                  }
                />
              ))}
            {v.example === 'settings' &&
              settings.map((s) => (
                <Item key={s.title} icon={<Bell />} title={s.title} description={s.description} actions={<Switch aria-label={s.title} defaultChecked={s.on} />} />
              ))}
          </List>
        </div>
      )}
    />
  )
}
