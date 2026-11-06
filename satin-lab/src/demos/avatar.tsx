import { Avatar, type AvatarSize, type AvatarTone } from '@satin/ui/avatar'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const people: { initials: string; tone: AvatarTone }[] = [
  { initials: 'MK', tone: 'brand' },
  { initials: 'AN', tone: 'sky' },
  { initials: 'JD', tone: 'green' },
  { initials: 'EW', tone: 'amber' },
  { initials: 'TS', tone: 'red' },
  { initials: 'LB', tone: 'fuchsia' },
  { initials: 'OP', tone: 'plum' },
  { initials: 'RC', tone: 'neutral' },
]
const sizes: AvatarSize[] = [16, 20, 24, 32, 40, 48]

export const options: ShowcaseOption[] = [
  {
    id: 'sizes',
    label: 'Sizes',
    code: `import { Avatar } from '@satin/ui/avatar'

<Avatar initials="MK" tone="brand" size={20} />
<Avatar initials="MK" tone="brand" size={32} />
<Avatar initials="MK" tone="brand" size={48} />`,
  },
  {
    id: 'tones',
    label: 'Tones',
    code: `import { Avatar } from '@satin/ui/avatar'

<Avatar initials="MK" tone="brand" />
<Avatar initials="AN" tone="sky" />
<Avatar initials="JD" tone="green" />`,
  },
  {
    id: 'shape',
    label: 'Shape',
    code: `import { Avatar } from '@satin/ui/avatar'

<Avatar initials="MK" tone="brand" size={40} />
<Avatar initials="AC" tone="sky" size={40} shape="rounded" />`,
  },
  {
    id: 'group',
    label: 'Group',
    code: `import { Avatar } from '@satin/ui/avatar'

<div className="isolate flex items-center">
  <Avatar initials="MK" tone="brand" className="z-4 -mr-2" />
  <Avatar initials="AN" tone="sky" className="z-3 -mr-2" />
  <Avatar initials="JD" tone="green" className="z-2 -mr-2" />
  <Avatar initials="+3" className="z-1" aria-label="3 more" />
</div>`,
  },
]

export default function AvatarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Avatar"
      options={options}
      codeHtml={codeHtml}
      render={(id) => {
        if (id === 'sizes')
          return (
            <div className="flex items-center gap-2">
              {sizes.map((size) => (
                <Avatar key={size} initials="MK" tone="brand" size={size} />
              ))}
            </div>
          )
        if (id === 'tones')
          return (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {people.map((p) => (
                <Avatar key={p.tone} {...p} />
              ))}
            </div>
          )
        if (id === 'shape')
          return (
            <div className="flex items-center gap-2">
              <Avatar initials="MK" tone="brand" size={40} />
              <Avatar initials="AC" tone="sky" size={40} shape="rounded" />
            </div>
          )
        return (
          <div className="isolate flex items-center">
            <Avatar initials="MK" tone="brand" className="z-4 -mr-2" />
            <Avatar initials="AN" tone="sky" className="z-3 -mr-2" />
            <Avatar initials="JD" tone="green" className="z-2 -mr-2" />
            <Avatar initials="+3" className="z-1" aria-label="3 more" />
          </div>
        )
      }}
    />
  )
}
