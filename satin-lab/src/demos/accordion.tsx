import { Accordion, AccordionItem } from '@satin/ui/accordion'
import { CreditCard, Group, Lock } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const items = [
  { value: 'plan', title: 'How do I change my plan?', content: 'Open Settings → Billing and pick a new plan. The change applies from the next billing date.', Icon: CreditCard, icon: 'CreditCard' },
  { value: 'seats', title: 'Can I add people later?', content: 'Yes. Invite them from Members; each seat is billed for the days it is used.', Icon: Group, icon: 'Group' },
  { value: 'data', title: 'Where is my data stored?', content: 'In the EU, encrypted at rest and in transit. You can export it at any time.', Icon: Lock, icon: 'Lock' },
]

// How sections open first, then what the headers carry.
export const controls: ShowcaseControl[] = [
  { id: 'type', label: 'Open', items: [{ value: 'single', label: 'One at a time' }, { value: 'multiple', label: 'Any number' }] },
  { id: 'icon', label: 'Lead icon', type: 'switch', default: 'off' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const root = v.type === 'single' ? 'type="single" collapsible defaultValue="plan"' : 'type="multiple" defaultValue={["plan"]}'
  return `import { Accordion, AccordionItem } from '@satin/ui/accordion'
${on(v, 'icon') ? `import { ${items.map((i) => i.icon).sort().join(', ')} } from 'iconoir-react'\n` : ''}
<Accordion ${root}>
${items
  .map((i) => `  <AccordionItem value="${i.value}"${on(v, 'icon') ? ` icon={<${i.icon} />}` : ''} title="${i.title}">\n    ${i.content}\n  </AccordionItem>`)
  .join('\n')}
</Accordion>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.type === 'single' ? 'One at a time' : 'Any number', on(v, 'icon') ? 'Lead icon' : 'No icon'].join(' · '),
  code: code(v),
}))

export default function AccordionDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Accordion"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => {
        const rows = items.map((i) => (
          <AccordionItem key={i.value} value={i.value} icon={on(v, 'icon') ? <i.Icon /> : undefined} title={i.title}>
            {i.content}
          </AccordionItem>
        ))
        return (
          <div key={id} className="w-[480px] max-w-full">
            {v.type === 'single' ? (
              <Accordion type="single" collapsible defaultValue="plan">
                {rows}
              </Accordion>
            ) : (
              <Accordion type="multiple" defaultValue={['plan']}>
                {rows}
              </Accordion>
            )}
          </div>
        )
      }}
    />
  )
}
