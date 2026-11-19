import * as React from 'react'
import { InputOTP } from '@uisatin/ui/input-otp'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'state', label: 'State', items: [{ value: 'empty', label: 'Empty' }, { value: 'filled', label: 'Filled' }, { value: 'error', label: 'Error' }, { value: 'success', label: 'Success' }] },
  { id: 'resend', label: 'Resend', type: 'switch', default: 'on' },
  { id: 'sms', label: 'Code from Messages', type: 'switch', default: 'on' },
]
const VALUE: Record<string, string> = { empty: '', filled: '482913', error: '482913', success: '482913' }
const HINT_EMAIL = 'We sent a 6-digit code to ola@bistro.co'
const HINT_PHONE = 'We sent a 6-digit code to (•••) •••-4821'
const ERROR = 'Wrong or expired code. Send a new one.'
const SUCCESS = 'Code verified'
// The texts the page "receives", one per code sent.
const CODES = ['428193', '719204', '305862']

function code(v: Record<string, string>) {
  const sms = v.sms === 'on'
  const resend = v.resend === 'on'
  const message =
    v.state === 'error' ? `error="${ERROR}"` : v.state === 'success' ? `success="${SUCCESS}"` : `hint="${sms ? HINT_PHONE : HINT_EMAIL}"`
  return `import * as React from 'react'
import { InputOTP } from '@uisatin/ui/input-otp'

export function Verify() {
  const [code, setCode] = React.useState('${VALUE[v.state]}')${
    sms
      ? `
  // A code your app received for this sign-in, e.g. read with the WebOTP API.
  const smsCode = useReceivedCode()`
      : ''
  }
  return (
    <InputOTP
      label="Verification code"
      value={code}
      onValueChange={setCode}
      onComplete={(code) => verify(code)}
      ${message}${resend ? `\n      onResend={() => sendCode()}` : ''}${sms ? `\n      suggestion={smsCode}` : ''}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: v.state, code: code(v) }))

/**
 * Typing the sixth digit checks the code: "Checking…", then verified (any code but 000000).
 * With Code from Messages, a text "arrives" 1.5 s after each code is sent; Resend takes 0.7 s to
 * send, then clears the field for the new code.
 */
function Live({ state, resend, sms }: { state: string; resend: boolean; sms: boolean }) {
  const [value, setValue] = React.useState(VALUE[state])
  const [check, setCheck] = React.useState<'idle' | 'checking' | 'ok' | 'wrong'>(state === 'success' ? 'ok' : state === 'error' ? 'wrong' : 'idle')
  const [sent, setSent] = React.useState(0)
  const [arrived, setArrived] = React.useState<string>()
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  React.useEffect(() => {
    if (!sms) return
    setArrived(undefined)
    const id = setTimeout(() => setArrived(CODES[sent % CODES.length]), 1500)
    return () => clearTimeout(id)
  }, [sms, sent])

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
      hint={check === 'checking' ? 'Checking…' : sms ? HINT_PHONE : HINT_EMAIL}
      error={check === 'wrong' ? ERROR : undefined}
      success={check === 'ok' ? SUCCESS : undefined}
      onResend={
        resend
          ? () =>
              new Promise<void>((done) => setTimeout(done, 700)).then(() => {
                clearTimeout(timer.current)
                setValue('')
                setCheck('idle')
                setSent((n) => n + 1)
              })
          : undefined
      }
      suggestion={sms ? arrived : undefined}
    />
  )
}

export default function InputOTPDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Input OTP"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => <Live key={comboId(controls, v)} state={v.state} resend={v.resend === 'on'} sms={v.sms === 'on'} />}
    />
  )
}
