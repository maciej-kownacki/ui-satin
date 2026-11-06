import * as React from 'react'
import { Button } from '@satin/ui'
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem } from '@satin/ui/dropdown'
import { Brain, Code, Copy, Download, EditPencil, Eye, Flash, NavArrowDown, Sparks, Trash } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const code = {
  icons: `import { Button } from '@satin/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@satin/ui/dropdown'
import { Code, Copy, Download, Eye } from 'iconoir-react'

<DropdownMenu trigger={<Button variant="secondary">Actions</Button>}>
  <DropdownMenuItem icon={<Eye />} label="Open preview" />
  <DropdownMenuItem icon={<Code />} label="View code" />
  <DropdownMenuItem icon={<Copy />} label="Duplicate" />
  <DropdownMenuItem icon={<Download />} label="Export" />
</DropdownMenu>`,
  description: `import { Button } from '@satin/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@satin/ui/dropdown'
import { Brain, Flash, Sparks } from 'iconoir-react'

const [model, setModel] = React.useState('balanced')

<DropdownMenu trigger={<Button variant="secondary">Model</Button>}>
  <DropdownMenuItem icon={<Flash />} label="Fast" description="Quick answers"
    selected={model === 'fast'} onSelect={() => setModel('fast')} />
  <DropdownMenuItem icon={<Sparks />} label="Balanced" description="Best for most tasks"
    selected={model === 'balanced'} onSelect={() => setModel('balanced')} />
  <DropdownMenuItem icon={<Brain />} label="Deep" description="Thinks before it answers"
    selected={model === 'deep'} onSelect={() => setModel('deep')} />
</DropdownMenu>`,
  groups: `import { Button } from '@satin/ui/button'
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem } from '@satin/ui/dropdown'
import { Copy, EditPencil, Eye, Trash } from 'iconoir-react'

<DropdownMenu trigger={<Button variant="secondary">File</Button>}>
  <DropdownMenuGroup label="View">
    <DropdownMenuItem icon={<Eye />} label="Open preview" />
    <DropdownMenuItem icon={<EditPencil />} label="Rename" />
  </DropdownMenuGroup>
  <DropdownMenuGroup label="Manage">
    <DropdownMenuItem icon={<Copy />} label="Duplicate" />
    <DropdownMenuItem icon={<Trash />} label="Delete" />
  </DropdownMenuGroup>
</DropdownMenu>`,
  inline: `import { Button } from '@satin/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@satin/ui/dropdown'

<DropdownMenu trigger={<Button variant="secondary">Sort by</Button>}>
  <DropdownMenuItem layout="inline" label="Newest" description="Created" selected />
  <DropdownMenuItem layout="inline" label="Oldest" description="Created" />
  <DropdownMenuItem layout="inline" label="Name" description="A to Z" />
</DropdownMenu>`,
}

export const options: ShowcaseOption[] = [
  { id: 'icons', label: 'Leading icon', code: code.icons },
  { id: 'description', label: 'Description', code: code.description },
  { id: 'groups', label: 'Groups', code: code.groups },
  { id: 'inline', label: 'Inline', code: code.inline },
]

/** The menu opens on load (non-modal, so the docs page keeps scrolling) and portals into the stage. */
function Preview({ id }: { id: string }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const [model, setModel] = React.useState('balanced')
  const [sort, setSort] = React.useState('newest')
  const shared = { container: stage, defaultOpen: true, modal: false, align: 'start' as const }
  const trigger = (label: string) => (
    <Button variant="secondary">
      {label}
      <NavArrowDown />
    </Button>
  )

  // Leave room under the trigger: the stage is 442px and the menu opens below.
  return (
    <div className="flex h-[300px] w-[255px] items-start">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10" />
      {stage && id === 'icons' && (
        <DropdownMenu {...shared} trigger={trigger('Actions')}>
          <DropdownMenuItem icon={<Eye />} label="Open preview" />
          <DropdownMenuItem icon={<Code />} label="View code" />
          <DropdownMenuItem icon={<Copy />} label="Duplicate" />
          <DropdownMenuItem icon={<Download />} label="Export" />
        </DropdownMenu>
      )}
      {stage && id === 'description' && (
        <DropdownMenu {...shared} trigger={trigger('Model')}>
          {[
            { value: 'fast', icon: <Flash />, label: 'Fast', description: 'Quick answers' },
            { value: 'balanced', icon: <Sparks />, label: 'Balanced', description: 'Best for most tasks' },
            { value: 'deep', icon: <Brain />, label: 'Deep', description: 'Thinks before it answers' },
          ].map((m) => (
            <DropdownMenuItem
              key={m.value}
              icon={m.icon}
              label={m.label}
              description={m.description}
              selected={model === m.value}
              onSelect={() => setModel(m.value)}
            />
          ))}
        </DropdownMenu>
      )}
      {stage && id === 'groups' && (
        <DropdownMenu {...shared} trigger={trigger('File')}>
          <DropdownMenuGroup label="View">
            <DropdownMenuItem icon={<Eye />} label="Open preview" />
            <DropdownMenuItem icon={<EditPencil />} label="Rename" />
          </DropdownMenuGroup>
          <DropdownMenuGroup label="Manage">
            <DropdownMenuItem icon={<Copy />} label="Duplicate" />
            <DropdownMenuItem icon={<Trash />} label="Delete" />
          </DropdownMenuGroup>
        </DropdownMenu>
      )}
      {stage && id === 'inline' && (
        <DropdownMenu {...shared} trigger={trigger('Sort by')}>
          {[
            { value: 'newest', label: 'Newest', description: 'Created' },
            { value: 'oldest', label: 'Oldest', description: 'Created' },
            { value: 'name', label: 'Name', description: 'A to Z' },
          ].map((s) => (
            <DropdownMenuItem
              key={s.value}
              layout="inline"
              label={s.label}
              description={s.description}
              selected={sort === s.value}
              onSelect={() => setSort(s.value)}
            />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}

export default function DropdownDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Dropdown" options={options} codeHtml={codeHtml} render={(id) => <Preview key={id} id={id} />} />
}
