/* Type test, never run: StatCard's props, its parts, refs, the change's shapes and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  StatCard,
  StatCardChange,
  StatCardSparkline,
  statCardLabels,
  type StatCardChangeProps,
  type StatCardProps,
  type StatCardSparklineProps,
  type StatChange,
} from '../components/stat-card'

const up: StatChange = { value: 12, period: 'vs last week', direction: 'up' }
const cac: StatChange = { value: 4, period: 'vs last week', direction: 'down', good: 'down', format: (v) => `${v} pp` }
const flat: StatChange = { value: 0, period: 'vs last week', direction: 'flat' }

// @ts-expect-error: no such direction
const sideways: StatChange = { value: 1, period: 'vs last week', direction: 'sideways' }
// @ts-expect-error: the period is required on a card's change
const noPeriod: StatChange = { value: 1, direction: 'up' }
// @ts-expect-error: good is a direction, not a boolean
const goodBool: StatChange = { value: 1, period: 'x', direction: 'up', good: true }

const cardRef = React.createRef<HTMLDivElement>()
const sparkRef = React.createRef<HTMLDivElement>()
const changeRef = React.createRef<HTMLSpanElement>()

export const props: StatCardProps = {
  label: 'Signups',
  value: 1284,
  change: up,
  sparkline: [1, 2, 3],
  sparklineLabels: ['W1', 'W2', 'W3'],
  href: '/signups',
  countUp: false,
}

export const cards = (
  <>
    <StatCard ref={cardRef} label="Signups" value={1284} change={up} sparkline={[980, 1100, 1284]} />
    <StatCard label={<b>CAC</b>} value={38} format={(v) => `${v} €`} change={cac} sparkline={[40, 39, 38]} href="/cac" />
    <StatCard label="Conversion" value="3.1%" change={flat} />
    <StatCard label="Revenue" value={null} change={null} />
    <StatCard label="Revenue" value={null} loading sparkline={[]} aria-describedby="hint" />
    <StatCard label="Revenue" value={0} error onRetry={() => {}} />
    <StatCard label="Revenue" value={0} error={<>Timed out</>} disabled />
  </>
)

// @ts-expect-error: value is required (null for none)
export const noValue = <StatCard label="Signups" />
// @ts-expect-error: a value is a number, a string or null
export const dateValue = <StatCard label="Signups" value={new Date()} />
// @ts-expect-error: sparkline is numbers only
export const labelledPoints = <StatCard label="Signups" value={1} sparkline={[{ label: 'a', value: 1 }]} />

const changeProps: StatCardChangeProps = { value: 12, direction: 'up' }
const sparkProps: StatCardSparklineProps = { data: [1, 2], highlight: 1, interactive: false, title: 'Signups' }

export const parts = (
  <>
    <StatCardChange ref={changeRef} {...changeProps} period="vs last week" good="down" />
    <StatCardSparkline ref={sparkRef} {...sparkProps} labels={['a', 'b']} format={(v) => `${v}`} summaryId="s" />
  </>
)

// Its words join SatinLabels.
export const translated = (
  <SatinLabels
    labels={{
      statUp: (value, period) => `wzrost o ${value} ${period}`,
      statRetry: 'Ponów',
      statTrend: (trend, count) => `${trend} ${count}`,
    }}
  >
    <StatCard label="Rejestracje" value={1} />
  </SatinLabels>
)
export const defaults: string = statCardLabels.statNoValue

void sideways
void noPeriod
void goodBool
