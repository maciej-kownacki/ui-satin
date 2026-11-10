import * as React from 'react'
import { InputOTP } from '@satin/ui/input-otp'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'state', label: 'State', items: [{ value: 'empty', label: 'Empty' }, { value: 'filled', label: 'Filled' }, { value: 'error', label: 'Error' }] },
]
const VALUE: Record<string, string> = { empty: '', filled: '482913', error: '482913' }

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
      onComplete={(code) => verify(code)}${v.state === 'error' ? `\n      error="That code is wrong or has expired. Send a new one."` : `\n      hint="We sent a 6-digit code to ola@bistro.co"`}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.state, code: code(v) }))

function Live({ state }: { state: string }) {
  const [value, setValue] = React.useState(VALUE[state])
  return (
    <InputOTP
      label="Verification code"
      value={value}
      onValueChange={setValue}
      hint={state === 'error' ? undefined : value.length === 6 ? 'Checking…' : 'We sent a 6-digit code to ola@bistro.co'}
      error={state === 'error' ? 'That code is wrong or has expired. Send a new one.' : undefined}
    />
  )
}

export default function InputOTPDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Input OTP" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Live key={v.state} state={v.state} />} />
}
