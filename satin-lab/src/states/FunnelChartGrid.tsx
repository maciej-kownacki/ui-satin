import { FunnelChart, type FunnelChartProps, type FunnelStage } from '@uisatin/pro/funnel-chart'

/**
 * Every state of Satin Pro's FunnelChart, each card 440px wide on the page's bg/card, rows as
 * rows of three and columns below, so heights can be compared across a row: loading, empty and
 * error have to stand exactly as tall as a loaded five-stage funnel. No entrance
 * (`reducedMotion`), so screenshots are stable.
 */

const hiring: FunnelStage[] = [
  { label: 'Applied', value: 240 },
  { label: 'Screening', value: 60 },
  { label: 'Interview', value: 18 },
  { label: 'Offer', value: 4 },
  { label: 'Hired', value: 3 },
]
const checkout: FunnelStage[] = [
  { label: 'Cart', value: 50 },
  { label: 'Payment', value: 0 },
  { label: 'Paid', value: 0 },
]
const range = 'Jul 1 – Sep 30, 2026'

type State = { name: string; props: Omit<FunnelChartProps, 'title'> & { title?: string } }

const horizontal: State[] = [
  { name: 'default', props: { stages: hiring } },
  { name: 'highlight={2}', props: { stages: hiring, highlight: 2 } },
  { name: 'loading', props: { stages: [], loading: true } },
  { name: 'empty="No applicants yet"', props: { stages: [], empty: 'No applicants yet' } },
  { name: 'error with Retry', props: { stages: hiring, error: true, onRetry: () => {} } },
  { name: 'error, its reason', props: { stages: hiring, error: 'The ATS timed out.', onRetry: () => {} } },
  { name: 'single stage', props: { stages: [{ label: 'Applied', value: 240 }] } },
  { name: 'a zero stage (Cart 50 → Payment 0 → Paid 0)', props: { title: 'Checkout', stages: checkout } },
  { name: 'showConversion="previous", onStageSelect', props: { stages: hiring, showConversion: 'previous', onStageSelect: () => {} } },
  { name: 'showTable', props: { stages: hiring, showTable: true } },
  { name: 'tone on one stage', props: { stages: hiring.map((s, i): FunnelStage => (i === 3 ? { ...s, tone: 'green' } : s)) } },
  { name: 'dropOffWarning={0.8}', props: { stages: hiring, dropOffWarning: 0.8 } },
]

const vertical: State[] = [
  { name: 'vertical', props: { stages: hiring } },
  { name: 'vertical, highlight={2}', props: { stages: hiring, highlight: 2 } },
  { name: 'vertical, loading', props: { stages: [], loading: true } },
  { name: 'vertical, empty', props: { stages: [], empty: 'No applicants yet' } },
  { name: 'vertical, error with Retry', props: { stages: hiring, error: true, onRetry: () => {} } },
  { name: 'vertical, a zero stage', props: { title: 'Checkout', stages: checkout } },
]

function Grid({ states, orientation }: { states: State[]; orientation: 'horizontal' | 'vertical' }) {
  return (
    <div className="grid grid-cols-[repeat(3,440px)] items-start gap-x-3 gap-y-10">
      {states.map((state) => (
        <div key={state.name} className="flex flex-col gap-3">
          <span>{state.name}</span>
          <FunnelChart title="Hiring" range={range} orientation={orientation} reducedMotion {...state.props} />
        </div>
      ))}
    </div>
  )
}

export function FunnelChartGrid() {
  return (
    <div className="flex flex-col gap-10 p-8 text-xs text-text-muted">
      <Grid states={horizontal} orientation="horizontal" />
      <Grid states={vertical} orientation="vertical" />
    </div>
  )
}
