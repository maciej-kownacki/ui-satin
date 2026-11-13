import * as React from 'react'
import { CookieConsent } from '@uisatin/ui/cookie-consent'
import { Button } from '@uisatin/ui/button'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { MockView } from '../components/MockView'

export const controls: ShowcaseControl[] = [{ id: 'customize', label: 'Customize', type: 'switch', default: 'on' }]

const code = (v: Record<string, string>) => `import { CookieConsent } from '@uisatin/ui/cookie-consent'

{!answered && (
  <CookieConsent
    floating
    onAccept={() => save({ optional: true })}
    onReject={() => save({ optional: false })}${v.customize === 'on' ? '\n    onCustomize={openCookieSettings}' : ''}
  />
)}`

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: v.customize === 'on' ? 'With Customize' : 'Accept or reject',
  code: code(v),
}))

function Demo({ customize }: { customize: boolean }) {
  const [answer, setAnswer] = React.useState<string | null>(null)
  return (
    <MockView
      overlay={
        <div className="absolute inset-x-2 bottom-3 flex justify-center">
          {answer ? (
            <div className="flex items-center gap-3 text-sm text-text-muted">
              {answer}
              <Button variant="secondary" size="xs" onClick={() => setAnswer(null)}>
                Show again
              </Button>
            </div>
          ) : (
            <CookieConsent
              onAccept={() => setAnswer('All cookies accepted.')}
              onReject={() => setAnswer('Only essential cookies.')}
              onCustomize={customize ? () => setAnswer('Cookie settings would open here.') : undefined}
            />
          )}
        </div>
      }
    />
  )
}

export default function CookieConsentDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Cookie consent"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Demo key={id} customize={v.customize === 'on'} />}
    />
  )
}
