/* Type test, never run: FunnelChart's props, its parts, refs, the stage's shape and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  FunnelChart,
  FunnelChartStage,
  FunnelTable,
  funnelChartLabels,
  funnelRows,
  type FunnelChartProps,
  type FunnelRow,
  type FunnelStage,
} from '../components/funnel-chart'

const stages: FunnelStage[] = [
  { label: 'Applied', value: 240 },
  { label: 'Hired', value: 3, tone: 'green' },
]
// @ts-expect-error: a tone is one of Badge's tones
const pink: FunnelStage = { label: 'x', value: 1, tone: 'pink' }
// @ts-expect-error: the value is a number
const text: FunnelStage = { label: 'x', value: '1' }

const ref = React.createRef<HTMLDivElement>()
const rows: FunnelRow[] = funnelRows(stages, 0.6)

export const props: FunnelChartProps = {
  title: 'Hiring',
  stages,
  range: 'Q3',
  format: (v) => `€${v}`,
  showConversion: 'previous',
  orientation: 'vertical',
  dropOffWarning: 0.7,
  showTable: true,
  error: <span>Offline</span>,
  onRetry: () => {},
  onStageSelect: (index: number, stage: FunnelStage) => void [index, stage],
}

export const charts = (
  <>
    <FunnelChart ref={ref} title="Hiring" stages={stages} periods={['7 days', '30 days']} total="3 hired" change="+1" />
    <FunnelChart title="Hiring" stages={stages} loading error empty="Nothing yet" reducedMotion highlight={1} />
    {/* @ts-expect-error: no such orientation */}
    <FunnelChart title="Hiring" stages={stages} orientation="diagonal" />
    {/* @ts-expect-error: no such conversion */}
    <FunnelChart title="Hiring" stages={stages} showConversion="last" />
    {/* @ts-expect-error: stages are required */}
    <FunnelChart title="Hiring" />
    <FunnelChartStage row={rows[1]} orientation="vertical" dimmed enter ref={ref} />
    <FunnelTable stages={stages} caption="Hiring" visible ref={React.createRef<HTMLTableElement>()} />
    <SatinLabels
      labels={{
        funnelOf: (percent, stage) => `${percent} z ${stage}`,
        funnelDropOff: (count) => `odpadło ${count}`,
        funnelBigDropOff: 'duży odpływ',
        funnelRetry: 'Ponów',
      }}
    >
      <FunnelChart title="Rekrutacja" stages={stages} />
    </SatinLabels>
  </>
)

export const words: string = funnelChartLabels.funnelStageName('Hired', '3', ['75% of Offer'])
