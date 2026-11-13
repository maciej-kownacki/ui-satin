import { HoverCard } from '@uisatin/ui/hover-card'
import { Avatar } from '@uisatin/ui/avatar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [{ id: 'open', label: 'Open', type: 'switch', default: 'off' }]

const code = () => `import { HoverCard } from '@uisatin/ui/hover-card'
import { Avatar } from '@uisatin/ui/avatar'

<p>
  Assigned to{' '}
  <HoverCard trigger={<a href="/team/ola">Ola Wrona</a>}>
    <div className="flex items-center gap-3">
      <Avatar initials="OW" tone="plum" size={40} />
      <div>
        <p className="text-sm font-medium">Ola Wrona</p>
        <p className="text-sm text-text-muted">Head chef · Bistro Wola</p>
      </div>
    </div>
    <p className="text-body">Runs the autumn menu and approves supplier orders over €500.</p>
  </HoverCard>
</p>`

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.open === 'on' ? 'Open' : 'Closed', code: code() }))

export default function HoverCardDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Hover card"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="h-[220px] text-sm text-text-muted">
          Assigned to{' '}
          <HoverCard
            open={v.open === 'on' ? true : undefined}
            trigger={
              <a href="#ola" onClick={(e) => e.preventDefault()} className="font-medium text-text-default underline underline-offset-2 outline-none focus-visible:rounded-sm focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]">
                Ola Wrona
              </a>
            }
          >
            <div className="flex items-center gap-3">
              <Avatar initials="OW" tone="plum" size={40} />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text-default">Ola Wrona</span>
                <span className="text-sm text-text-muted">Head chef · Bistro Wola</span>
              </div>
            </div>
            <p className="text-body text-text-default">Runs the autumn menu and approves supplier orders over €500.</p>
            <div className="flex gap-6 border-t border-border-subtle pt-3">
              {[['Orders approved', '1,240'], ['Joined', 'Mar 2024']].map(([k, val]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-xs text-text-muted">{k}</span>
                  <span className="text-sm font-medium text-text-default">{val}</span>
                </div>
              ))}
            </div>
          </HoverCard>
        </div>
      )}
    />
  )
}
