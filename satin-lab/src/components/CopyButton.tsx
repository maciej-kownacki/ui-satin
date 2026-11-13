import * as React from 'react'
import { Check, Copy } from 'iconoir-react'
import { Button } from '@uisatin/ui/button'

/** The Copy code button from the Showcase code header, for code frames rendered by Astro. */
export default function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Button variant="tertiary" shape="rounded" onClick={copy} className="text-text-muted hover:text-text-default">
      {copied ? <Check /> : <Copy />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  )
}
