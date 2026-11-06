import * as React from 'react'
import { Banner } from '@satin/ui/banner'
import { Button } from '@satin/ui/button'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'mesh',
    label: 'Mesh',
    code: `import { Banner } from '@satin/ui/banner'
import { Button } from '@satin/ui/button'

<Banner
  title="Not sure what you can ask?"
  description="Check out our guide and start using AI today."
  action={<Button variant="secondary">Cheat sheet</Button>}
  onDismiss={() => setOpen(false)}
/>`,
  },
  {
    id: 'plain',
    label: 'Plain',
    code: `import { Banner } from '@satin/ui/banner'
import { Button } from '@satin/ui/button'

<Banner
  background="plain"
  shape="pill"
  title="Not sure what you can ask?"
  action={<Button variant="secondary">Cheat sheet</Button>}
  onDismiss={() => setOpen(false)}
/>`,
  },
  {
    id: 'sidebar',
    label: 'Sidebar',
    code: `import { Banner } from '@satin/ui/banner'
import { Button } from '@satin/ui/button'

<Banner
  layout="sidebar"
  title="Not sure what you can ask?"
  description="Check out our guide and start using AI today."
  action={<Button variant="secondary">Cheat sheet</Button>}
  onDismiss={() => setOpen(false)}
/>`,
  },
]

function Example({ id }: { id: string }) {
  const [open, setOpen] = React.useState(true)
  React.useEffect(() => setOpen(true), [id])
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Show banner
      </Button>
    )
  const action = <Button variant="secondary">Cheat sheet</Button>
  if (id === 'plain')
    return (
      <Banner
        background="plain"
        shape="pill"
        title="Not sure what you can ask?"
        action={action}
        onDismiss={() => setOpen(false)}
      />
    )
  return (
    <Banner
      layout={id === 'sidebar' ? 'sidebar' : 'horizontal'}
      title="Not sure what you can ask?"
      description="Check out our guide and start using AI today."
      action={action}
      onDismiss={() => setOpen(false)}
    />
  )
}

export default function BannerDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Banner" options={options} codeHtml={codeHtml} render={(id) => <Example id={id} />} />
}
