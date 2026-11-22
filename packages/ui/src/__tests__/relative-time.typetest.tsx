/**
 * Type-checked only, never run: RelativeTime's `at` in its three forms, `time` props with a
 * `ref`, and the clock hook and formatters.
 */
import * as React from 'react'
import { RelativeTime, dateTimeFormat, relativeTimeFormat, useRelativeClock, type RelativeTimeProps } from '../components/relative-time'

export const props: RelativeTimeProps = { at: new Date(), withDate: true, title: 'Created', className: 'ms-auto' }

export function RelativeTimeTypes() {
  const text: string = useRelativeClock((now: number) => relativeTimeFormat('en-US', { numeric: 'auto' }).format(Math.round((now - Date.now()) / 60_000), 'minute'))
  const day: string = dateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
  return (
    <>
      <RelativeTime at={new Date()} ref={React.createRef<HTMLTimeElement>()} />
      <RelativeTime at="2026-11-16T09:40:00Z" withDate data-testid="t" />
      <RelativeTime at={Date.now()} onClick={() => {}} aria-describedby="x" />
      <span>{text}{day}</span>
      {/* @ts-expect-error at is required */}
      <RelativeTime />
      {/* @ts-expect-error dateTime comes from at */}
      <RelativeTime at={Date.now()} dateTime="2026-11-16" />
      {/* @ts-expect-error it draws its own text */}
      <RelativeTime at={Date.now()}>Yesterday</RelativeTime>
    </>
  )
}
