import { Github } from 'iconoir-react'
import { Button } from '@uisatin/ui/button'
import { GITHUB } from '../lib/site'

/** The repo link in the top bar, the same size and shape as Customize next to it. */
export function GithubLink() {
  return (
    <Button asChild variant="secondary" size="lg" shape="rounded" iconOnly>
      <a href={GITHUB} target="_blank" rel="noreferrer" aria-label="Satin on GitHub" data-track="github" data-track-from="header">
        <Github />
      </a>
    </Button>
  )
}
