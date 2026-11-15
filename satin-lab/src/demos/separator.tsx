import { Button } from '@uisatin/ui/button'
import { Link } from '@uisatin/ui/link'
import { Separator } from '@uisatin/ui/separator'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  {
    id: 'kind',
    label: 'Example',
    items: [
      { value: 'horizontal', label: 'Between blocks' },
      { value: 'label', label: 'With a label' },
      { value: 'vertical', label: 'Vertical' },
    ],
  },
]

const codes: Record<string, string> = {
  horizontal: `import { Separator } from '@uisatin/ui/separator'

<div className="grid gap-4">
  <section>…</section>
  <Separator />
  <section>…</section>
</div>`,
  label: `import { Separator } from '@uisatin/ui/separator'
import { Button } from '@uisatin/ui/button'

<Button variant="secondary">Continue with Google</Button>
<Separator label="or" />
<Button>Continue with email</Button>`,
  vertical: `import { Separator } from '@uisatin/ui/separator'
import { Link } from '@uisatin/ui/link'

<nav className="flex items-center gap-3 text-sm">
  <Link variant="muted" href="/docs">Docs</Link>
  <Separator orientation="vertical" className="h-4 self-center" />
  <Link variant="muted" href="/blog">Blog</Link>
  <Separator orientation="vertical" className="h-4 self-center" />
  <Link variant="muted" href="/changelog">Changelog</Link>
</nav>`,
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.kind, code: codes[v.kind] }))

export default function SeparatorDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Separator"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) =>
        v.kind === 'label' ? (
          <div className="grid w-72 gap-4">
            <Button variant="secondary">Continue with Google</Button>
            <Separator label="or" />
            <Button>Continue with email</Button>
          </div>
        ) : v.kind === 'vertical' ? (
          <nav className="flex items-center gap-3 text-sm">
            <Link variant="muted" href="#">Docs</Link>
            <Separator orientation="vertical" className="h-4 self-center" />
            <Link variant="muted" href="#">Blog</Link>
            <Separator orientation="vertical" className="h-4 self-center" />
            <Link variant="muted" href="#">Changelog</Link>
          </nav>
        ) : (
          <div className="grid w-80 gap-4 text-sm">
            <div>
              <p className="font-medium text-text-default">Workspace</p>
              <p className="text-text-muted">Name, logo and the URL people sign in at.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-text-default">Members</p>
              <p className="text-text-muted">Who can see and edit this workspace.</p>
            </div>
          </div>
        )
      }
    />
  )
}
