import { EmptyState } from '@satin/ui/empty-state'
import { Button } from '@satin/ui/button'
import { ArrowRight } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const actions = (
  <>
    <Button>Create project</Button>
    <Button variant="secondary">Import project</Button>
  </>
)

export const options: ShowcaseOption[] = [
  {
    id: 'ghost',
    label: 'Ghost',
    code: `import { EmptyState } from '@satin/ui/empty-state'
import { Button } from '@satin/ui/button'
import { ArrowRight } from 'iconoir-react'

<EmptyState
  icon={<ArrowRight />}
  title="No projects yet"
  description="Create a project to start tracking deals, or import one from a CSV."
  actions={
    <>
      <Button>Create project</Button>
      <Button variant="secondary">Import project</Button>
    </>
  }
/>`,
  },
  {
    id: 'dashed',
    label: 'Dashed',
    code: `<EmptyState border="dashed" icon={<ArrowRight />} title="No projects yet" … />`,
  },
  {
    id: 'outline',
    label: 'Outline',
    code: `<EmptyState border="outline" icon={<ArrowRight />} title="No projects yet" … />`,
  },
  {
    id: 'learn-more',
    label: 'No icon',
    code: `import { EmptyState } from '@satin/ui/empty-state'
import { Button } from '@satin/ui/button'
import { ArrowRight } from 'iconoir-react'

<EmptyState
  title="No results"
  description="Nothing matches these filters. Try a wider date range."
  actions={
    <Button variant="tertiary">
      Learn more
      <ArrowRight />
    </Button>
  }
/>`,
  },
]

export default function EmptyStateDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Empty state"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'learn-more' ? (
          <EmptyState
            title="No results"
            description="Nothing matches these filters. Try a wider date range."
            actions={
              <Button variant="tertiary">
                Learn more
                <ArrowRight aria-hidden />
              </Button>
            }
          />
        ) : (
          <EmptyState
            border={id as 'ghost' | 'dashed' | 'outline'}
            icon={<ArrowRight />}
            title="No projects yet"
            description="Create a project to start tracking deals, or import one from a CSV."
            actions={actions}
          />
        )
      }
    />
  )
}
