import * as React from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { FieldGroup } from '@uisatin/ui/field-group'
import { Form, FormActions } from '@uisatin/ui/form'
import { FormField } from '@uisatin/ui/form-field'
import { Input } from '@uisatin/ui/input'
import { Select } from '@uisatin/ui/select'
import { Showcase, type ShowcaseOption } from '../../components/Showcase'

/**
 * Recipe: a sign-up form validated with Zod through React Hook Form. RHF owns the values and the
 * validation; Satin's Form shows the messages by field name and moves focus to the first invalid
 * control. The "server" here is a timeout that turns down any address at example.com, so the
 * demo also shows an error that arrives after the submit.
 */

const roles = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
]

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name'),
  email: z.email('Enter an email address, e.g. name@company.com'),
  role: z.enum(['design', 'engineering', 'product'], 'Pick your role'),
  terms: z.boolean().refine((accepted) => accepted, 'Accept the terms to continue'),
})

type SignUp = z.infer<typeof schema>

/** RHF keeps an object per field; Satin's Form takes the message by field name. */
const messages = (errors: FieldErrors) => Object.fromEntries(Object.entries(errors).map(([name, error]) => [name, error?.message as string | undefined]))

/** Stands in for the API: any address at example.com is already taken. */
async function createAccount(values: SignUp): Promise<{ error?: string }> {
  await new Promise((r) => setTimeout(r, 700))
  return values.email.endsWith('@example.com') ? { error: 'This email already has an account. Sign in instead.' } : {}
}

export const code = `import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { FieldGroup } from '@uisatin/ui/field-group'
import { Form, FormActions } from '@uisatin/ui/form'
import { FormField } from '@uisatin/ui/form-field'
import { Input } from '@uisatin/ui/input'
import { Select } from '@uisatin/ui/select'

const roles = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
]

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name'),
  email: z.email('Enter an email address, e.g. name@company.com'),
  role: z.enum(['design', 'engineering', 'product'], 'Pick your role'),
  terms: z.boolean().refine((accepted) => accepted, 'Accept the terms to continue'),
})

type SignUp = z.infer<typeof schema>

// RHF keeps an object per field; Satin's Form takes the message by field name.
const messages = (errors: FieldErrors) =>
  Object.fromEntries(Object.entries(errors).map(([name, error]) => [name, error?.message as string | undefined]))

export function SignUpForm() {
  const { register, control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', terms: false },
    // Satin's Form moves focus to the first invalid control, server errors included.
    shouldFocusError: false,
  })

  async function onValid(values: SignUp) {
    const res = await fetch('/api/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.status === 409) setError('email', { message: 'This email already has an account. Sign in instead.' })
  }

  return (
    <Form errors={messages(formState.errors)} onSubmit={handleSubmit(onValid)}>
      <FormField name="name" label="Name" required>
        <Input placeholder="Ada Lovelace" autoComplete="name" {...register('name')} />
      </FormField>
      <FormField name="email" label="Work email" description="We send the sign-in link here." required>
        <Input type="email" placeholder="name@company.com" autoComplete="email" {...register('email')} />
      </FormField>
      <FormField name="role" label="Role" required>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select
              ref={field.ref}
              options={roles}
              placeholder="Pick one"
              value={field.value ?? ''}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </FormField>
      <FieldGroup name="terms" legend="Terms" variant="choices">
        <Controller
          name="terms"
          control={control}
          render={({ field, fieldState }) => (
            <Checkbox
              ref={field.ref}
              label="I accept the terms of service"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid || undefined}
            />
          )}
        />
      </FieldGroup>
      <FormActions>
        <Button type="submit" loading={formState.isSubmitting}>
          Create account
        </Button>
      </FormActions>
    </Form>
  )
}`

export const options: ShowcaseOption[] = [{ id: 'form', label: 'SignUpForm.tsx', code }]

function SignUpForm() {
  const [created, setCreated] = React.useState<string | null>(null)
  const { register, control, handleSubmit, setError, reset, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', terms: false },
    shouldFocusError: false,
  })

  async function onValid(values: SignUp) {
    const res = await createAccount(values)
    if (res.error) return setError('email', { message: res.error })
    setCreated(values.email)
  }

  if (created)
    return (
      <div className="flex w-[400px] max-w-full flex-col items-start gap-3" role="status">
        <p className="text-base text-text-default">Account created for {created}.</p>
        <Button
          variant="secondary"
          onClick={() => {
            reset()
            setCreated(null)
          }}
        >
          Start over
        </Button>
      </div>
    )

  return (
    <div className="w-[400px] max-w-full">
      <Form errors={messages(formState.errors)} onSubmit={handleSubmit(onValid)}>
        <FormField name="name" label="Name" required>
          <Input placeholder="Ada Lovelace" autoComplete="off" {...register('name')} />
        </FormField>
        <FormField name="email" label="Work email" description="Any address at example.com is already taken here." required>
          <Input type="email" placeholder="name@company.com" autoComplete="off" {...register('email')} />
        </FormField>
        <FormField name="role" label="Role" required>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                ref={field.ref}
                options={roles}
                placeholder="Pick one"
                value={field.value ?? ''}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormField>
        <FieldGroup name="terms" legend="Terms" variant="choices">
          <Controller
            name="terms"
            control={control}
            render={({ field, fieldState }) => (
              <Checkbox
                ref={field.ref}
                label="I accept the terms of service"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid || undefined}
              />
            )}
          />
        </FieldGroup>
        <FormActions>
          <Button type="submit" loading={formState.isSubmitting}>
            Create account
          </Button>
        </FormActions>
      </Form>
    </div>
  )
}

export default function ReactHookFormDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Sign-up form" options={options} codeHtml={codeHtml} render={() => <SignUpForm />} />
}
