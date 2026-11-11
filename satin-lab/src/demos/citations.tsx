import { Citation, Sources, type CitationSource } from '@satin/ui/citations'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Real favicons for the demo; in an app pass the logo you already have.
const favicon = (domain: string) => <img alt="" src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} />

const sources: CitationSource[] = [
  { title: 'Fresh Farm price list, November 2026', origin: 'Gmail', icon: favicon('mail.google.com'), quote: 'Tomatoes €2.10/kg for orders over 20 kg, delivered Mon–Sat before 9:00.' },
  { title: 'Supplier contract · Fresh Farm', origin: 'Notion', icon: favicon('notion.so'), quote: 'Orders over €500 need a manager’s approval.' },
  { title: 'Stock count, Nov 10', origin: 'ClickUp', icon: favicon('clickup.com'), quote: 'Tomatoes 6 kg left, 2.1 days at the current pace.' },
]

export const controls: ShowcaseControl[] = [{ id: 'list', label: 'Sources open', type: 'switch', default: 'off' }]

const code = (v: Record<string, string>) => `import { Citation, Sources } from '@satin/ui/citations'

const sources = [
  { title: 'Fresh Farm price list, November 2026', origin: 'Gmail', icon: <GmailLogo />, quote: 'Tomatoes €2.10/kg for orders over 20 kg…' },
  { title: 'Supplier contract · Fresh Farm', origin: 'Notion', icon: <NotionLogo />, quote: 'Orders over €500 need a manager’s approval.' },
  { title: 'Stock count, Nov 10', origin: 'ClickUp', icon: <ClickUpLogo />, quote: 'Tomatoes 6 kg left…' },
]

<p>
  Order 24 kg of tomatoes from Fresh Farm: it drops to €2.10/kg over 20 kg<Citation index={1} source={sources[0]} />{' '}
  and you have only 2 days of stock left<Citation index={3} source={sources[2]} />. At €842.50 the order needs a
  manager’s approval<Citation index={2} source={sources[1]} />.
</p>
<Sources sources={sources}${v.list === 'on' ? ' defaultOpen' : ''} />`

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.list === 'on' ? 'Sources open' : 'Sources folded', code: code(v) }))

export default function CitationsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Citations"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex w-[520px] max-w-full flex-col gap-4">
          <p className="text-body-lg text-text-default">
            Order 24 kg of tomatoes from Fresh Farm: it drops to €2.10/kg over 20 kg
            <Citation index={1} source={sources[0]} /> and you have only 2 days of stock left
            <Citation index={3} source={sources[2]} />. At €842.50 the order needs a manager’s approval
            <Citation index={2} source={sources[1]} />.
          </p>
          <Sources key={v.list} sources={sources} defaultOpen={v.list === 'on'} />
        </div>
      )}
    />
  )
}
