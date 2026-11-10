import type { ChartDatum } from '@satin/ui/chart'

/** Covers per period for the bar chart's docs demo and its motion playground. */

export type Dataset = { range: string; data: ChartDatum[] }

// A small seeded noise, so the numbers stay the same between builds.
function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function months(year: number, from: number, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const m = (from + i) % 12
    const y = year + Math.floor((from + i) / 12)
    // Busier in summer and December.
    const season = 1 + 0.25 * Math.sin(((m - 3) / 12) * Math.PI * 2) + (m === 11 ? 0.2 : 0)
    return {
      label: MONTHS[m][0],
      value: Math.round(8200 * season * (0.85 + 0.3 * noise(seed + i))),
      tooltipLabel: `${MONTHS[m]} ${y}`,
    }
  })
}

function weeks(start: Date, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i * 7)
    const label = `${MONTHS[d.getMonth()]} ${d.getDate()}`
    return { label, value: Math.round(2100 * (0.8 + 0.4 * noise(seed + i))), tooltipLabel: `Week of ${label}` }
  })
}

function days(start: Date, count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const weekend = d.getDay() === 0 || d.getDay() >= 5
    return {
      label: count > 7 ? String(d.getDate()) : DAYS[d.getDay()],
      value: Math.round((weekend ? 440 : 230) * (0.8 + 0.4 * noise(seed + i))),
      tooltipLabel: `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`,
    }
  })
}

export const DATA: Record<string, Dataset> = {
  '7 days': {
    range: 'Oct 26 – Nov 1, 2026',
    data: [
      { label: 'Sun', value: 412, tooltipLabel: 'Sun, Oct 26' },
      { label: 'Mon', value: 186, tooltipLabel: 'Mon, Oct 27' },
      { label: 'Tue', value: 212, tooltipLabel: 'Tue, Oct 28' },
      { label: 'Wed', value: 236, tooltipLabel: 'Wed, Oct 29' },
      { label: 'Thu', value: 296, tooltipLabel: 'Thu, Oct 30' },
      { label: 'Fri', value: 468, tooltipLabel: 'Fri, Oct 31' },
      { label: 'Sat', value: 525, tooltipLabel: 'Sat, Nov 1' },
    ],
  },
  '30 days': { range: 'Oct 5 – Nov 8, 2026', data: weeks(new Date(2026, 9, 5), 5, 30) },
  '90 days': { range: 'Aug – Oct 2026', data: months(2026, 7, 3, 90).map((d) => ({ ...d, label: d.tooltipLabel.slice(0, 3) })) },
  '365 days': { range: 'Nov 2025 – Oct 2026', data: months(2025, 10, 12, 365) },
  Sep: { range: 'Sep 2026', data: weeks(new Date(2026, 7, 31), 5, 9) },
  Oct: { range: 'Oct 2026', data: weeks(new Date(2026, 8, 28), 5, 10) },
  Nov: { range: 'Nov 1 – 8, 2026', data: days(new Date(2026, 10, 1), 8, 11) },
  '2025': { range: 'Jan – Dec 2025', data: months(2025, 0, 12, 2025) },
  '2026': { range: 'Jan – Nov 2026', data: months(2026, 0, 11, 2026) },
}

export const PERIODS = [
  ['7 days', '30 days', '90 days', '365 days'],
  ['Sep', 'Oct', 'Nov'],
  ['2025', '2026'],
]

export const format = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : n.toLocaleString('en-US'))
