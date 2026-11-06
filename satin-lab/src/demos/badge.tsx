import { Badge, type BadgeTone } from '@satin/ui'
import { Calendar, Check, Flash, List, Group, EditPencil, Prohibition, Shop } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const badges: { tone: BadgeTone; label: string; Icon: typeof Check }[] = [
  { tone: 'neutral', label: 'Productivity', Icon: List },
  { tone: 'brand', label: 'Planning', Icon: Calendar },
  { tone: 'sky', label: 'CRM', Icon: Group },
  { tone: 'green', label: 'Published', Icon: Check },
  { tone: 'amber', label: 'E-commerce', Icon: Shop },
  { tone: 'red', label: 'Blocked', Icon: Prohibition },
  { tone: 'fuchsia', label: 'Payments', Icon: Flash },
  { tone: 'plum', label: 'Design', Icon: EditPencil },
]

export const options: ShowcaseOption[] = [
  {
    id: 'soft',
    label: 'Soft',
    code: `import { Badge } from '@satin/ui/badge'
import { Check } from 'iconoir-react'

<Badge tone="green"><Check />Published</Badge>
<Badge tone="red">Blocked</Badge>`,
  },
  {
    id: 'plain',
    label: 'Plain',
    code: `import { Badge } from '@satin/ui/badge'

<Badge tone="green" look="plain">Published</Badge>
<Badge tone="red" look="plain">Blocked</Badge>`,
  },
  {
    id: 'rounded',
    label: 'Rounded',
    code: `import { Badge } from '@satin/ui/badge'

<Badge tone="green" shape="rounded" size="sm">Published</Badge>
<Badge tone="red" shape="rounded" size="sm">Blocked</Badge>`,
  },
]

export default function BadgeDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Badge"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="flex max-w-xl flex-wrap justify-center gap-2">
          {badges.map(({ tone, label, Icon }) => (
            <Badge
              key={tone}
              tone={tone}
              look={id === 'plain' ? 'plain' : 'soft'}
              shape={id === 'rounded' ? 'rounded' : 'default'}
              size={id === 'rounded' ? 'sm' : 'lg'}
            >
              {id === 'soft' && <Icon aria-hidden />}
              {label}
            </Badge>
          ))}
        </div>
      )}
    />
  )
}
