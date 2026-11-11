import * as React from 'react'
import { InputOTP } from '@satin/ui/input-otp'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'state', label: 'State', items: [{ value: 'empty', label: 'Empty' }, { value: 'filled', label: 'Filled' }, { value: 'error', label: 'Error' }, { value: 'success', label: 'Success' }] },
]
const VALUE: Record<string, string> = { empty: '', filled: '482913', error: '482913', success: '482913' }
const HINT = 'We sent a 6-digit code to ola@bistro.co'
const ERROR = 'Wrong or expired code. Send a new one.'
const SUCCESS = 'Code verified'

function code(v: Record<string, string>) {
  return `import * as React from 'react'
import { InputOTP } from '@satin/ui/input-otp'

export function Verify() {
  const [code, setCode] = React.useState('${VALUE[v.state]}')
  return (
    <InputOTP
      label="Verification code"
      value={code}
      onValueChange={setCode}
      onComplete={(code) => verify(code)}${v.state === 'error' ? `\n      error="${ERROR}"` : v.state === 'success' ? `\n      success="${SUCCESS}"` : `\n      hint="${HINT}"`}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.state, code: code(v) }))

/** Typing the sixth digit checks the code: "Checking…", then verified (any code but 000000). */
function Live({ state }: { state: string }) {
  const [value, setValue] = React.useState(VALUE[state])
  const [check, setCheck] = React.useState<'idle' | 'checking' | 'ok' | 'wrong'>(state === 'success' ? 'ok' : state === 'error' ? 'wrong' : 'idle')
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <InputOTP
      label="Verification code"
      value={value}
      onValueChange={(v) => {
        setValue(v)
        clearTimeout(timer.current)
        setCheck('idle')
      }}
      onComplete={(code) => {
        setCheck('checking')
        timer.current = setTimeout(() => setCheck(code === '000000' ? 'wrong' : 'ok'), 900)
      }}
      hint={check === 'checking' ? 'Checking…' : HINT}
      error={check === 'wrong' ? ERROR : undefined}
      success={check === 'ok' ? SUCCESS : undefined}
    />
  )
}

export default function InputOTPDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Input OTP" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Live key={v.state} state={v.state} />} />
}
