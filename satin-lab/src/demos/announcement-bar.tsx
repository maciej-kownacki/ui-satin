import * as React from 'react'
import { AnnouncementBar } from '@satin/ui/announcement-bar'
import { Button } from '@satin/ui/button'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { MockView } from '../components/MockView'

export const controls: ShowcaseControl[] = [
  { id: 'tone', label: 'Tone', items: [{ value: 'primary', label: 'Primary' }, { value: 'inverse', label: 'Inverse' }, { value: 'default', label: 'Default' }] },
  { id: 'position', label: 'Position', items: [{ value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }] },
  { id: 'action', label: 'Link', type: 'switch', default: 'on' },
  { id: 'background', label: 'Background', items: [{ value: 'plain', label: 'Plain' }, { value: 'mesh', label: 'Mesh' }] },
  { id: 'dismiss', label: 'Dismissible', type: 'switch', default: 'on' },
  { id: 'shimmer', label: 'Shimmer', type: 'switch', default: 'off' },
]

const MESSAGE = 'Fieldwork 4.0 is here: docs, plans, and cycles in one place'

const code = (v: Record<string, string>) => {
  const props = [
    v.tone !== 'primary' && `tone="${v.tone}"`,
    `sticky="${v.position}"`,
    v.action === 'on' && `action={{ label: "See what's new", href: '/changelog' }}`,
    v.background === 'mesh' && 'background="mesh"',
    v.dismiss === 'on' && 'onDismiss={() => setOpen(false)}',
    v.shimmer === 'on' && 'shimmer',
  ].filter(Boolean)
  return `import { AnnouncementBar } from '@satin/ui/announcement-bar'

{open && (
  <AnnouncementBar
${props.map((p) => `    ${p}`).join('\n')}
  >
    ${MESSAGE}
  </AnnouncementBar>
)}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.tone[0].toUpperCase() + v.tone.slice(1), v.position === 'top' ? 'Top' : 'Bottom', v.action === 'on' ? 'Link' : 'No link', v.background === 'mesh' ? 'Mesh' : 'Plain', v.dismiss === 'on' ? 'Dismissible' : 'Fixed', v.shimmer === 'on' ? 'Shimmer' : 'Still'].join(' · '),
  code: code(v),
}))

function Demo({ v }: { v: Record<string, string> }) {
  const [open, setOpen] = React.useState(true)
  const bar = open && (
    <AnnouncementBar
      action={v.action === 'on' ? { label: "See what's new", onClick: () => {} } : undefined}
      onDismiss={v.dismiss === 'on' ? () => setOpen(false) : undefined}
      tone={v.tone as 'primary' | 'inverse' | 'default'}
      background={v.background as 'plain' | 'mesh'}
      shimmer={v.shimmer === 'on'}
    >
      {MESSAGE}
    </AnnouncementBar>
  )
  return (
    <MockView
      top={v.position === 'top' ? bar : undefined}
      bottom={v.position === 'bottom' ? bar : undefined}
      overlay={
        !open && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <Button variant="secondary" size="xs" onClick={() => setOpen(true)}>
              Show again
            </Button>
          </div>
        )
      }
    />
  )
}

export default function AnnouncementBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Announcement bar"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Demo key={id} v={v} />}
    />
  )
}
