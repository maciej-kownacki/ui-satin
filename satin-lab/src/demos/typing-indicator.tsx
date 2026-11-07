import { TypingIndicator, type TypingIndicatorTone } from '@satin/ui/typing-indicator'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const agents: { tone: TypingIndicatorTone; name: string; initials: string }[] = [
  { tone: 'fuchsia', name: 'Atlas', initials: 'AT' },
  { tone: 'sky', name: 'Nova', initials: 'NO' },
  { tone: 'plum', name: 'Iris', initials: 'IR' },
  { tone: 'green', name: 'Sage', initials: 'SA' },
]

const swatch = (tone: TypingIndicatorTone) => <span aria-hidden data-tone={tone} className="size-2.5 rounded-full bg-tone-fg" />
const title = (s: string) => s[0].toUpperCase() + s.slice(1)

// Tone colours the dots and the avatar; the avatar and label are content around the dots.
// "All" shows one agent per tone and turns the code into a loop.
export const controls: ShowcaseControl[] = [
  {
    id: 'tone',
    label: 'Tone',
    type: 'menu',
    items: [{ value: 'all', label: 'All tones' }, ...agents.map((a) => ({ value: a.tone, label: title(a.tone), icon: swatch(a.tone) }))],
  },
  { id: 'avatar', label: 'Avatar', type: 'switch', default: 'on' },
  { id: 'label', label: 'Label', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
  const avatar = v.avatar === 'on'
  const label = v.label === 'on'
  const head = `import { TypingIndicator } from '@satin/ui/typing-indicator'\n\n`
  if (v.tone === 'all') {
    const fields = ['tone', label && 'name', avatar && 'initials'].filter(Boolean) as string[]
    const rows = agents
      .map((a) => `  { ${fields.map((f) => `${f}: '${a[f as keyof typeof a]}'`).join(', ')} },`)
      .join('\n')
    const attrs = ['key={tone}', 'tone={tone}', avatar && 'showAvatar initials={initials}', label && 'label={`${name} is typing…`}']
    return `${head}const agents = [
${rows}
] as const

{agents.map(({ ${fields.join(', ')} }) => (
  <TypingIndicator ${attrs.filter(Boolean).join(' ')} />
))}`
  }
  const a = agents.find((a) => a.tone === v.tone)!
  const attrs = [
    a.tone !== 'fuchsia' && `tone="${a.tone}"`,
    avatar && `showAvatar initials="${a.initials}"`,
    label && `label="${a.name} is typing…"`,
  ].filter(Boolean)
  return `${head}<TypingIndicator${attrs.map((x) => ` ${x}`).join('')} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.tone === 'all' ? 'All tones' : title(v.tone), v.avatar === 'on' ? 'Avatar' : 'No avatar', v.label === 'on' ? 'Label' : 'No label'].join(' · '),
  code: code(v),
}))

export default function TypingIndicatorDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Typing indicator"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex flex-col items-start gap-4">
          {agents
            .filter(({ tone }) => v.tone === 'all' || v.tone === tone)
            .map(({ tone, name, initials }) => (
              <TypingIndicator
                key={tone}
                tone={tone}
                showAvatar={v.avatar === 'on'}
                initials={initials}
                label={v.label === 'on' ? `${name} is typing…` : undefined}
              />
            ))}
        </div>
      )}
    />
  )
}
