import { Skeleton } from '@uisatin/ui/skeleton'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// What is loading, then whether it moves.
export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'card', label: 'Card' }, { value: 'list', label: 'List' }, { value: 'shapes', label: 'Shapes' }] },
  { id: 'animated', label: 'Animated', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const a = on(v, 'animated') ? ' animated' : ''
  const body = {
    card: `<div aria-busy="true" className="flex flex-col gap-3 rounded-xl border border-border-subtle p-4">
  <Skeleton shape="rect"${a} width="100%" />
  <Skeleton${a} width="60%" />
  <Skeleton${a} width="90%" />
</div>`,
    list: `<ul aria-busy="true" className="flex flex-col gap-4">
  {[0, 1, 2].map((i) => (
    <li key={i} className="flex items-center gap-3">
      <Skeleton shape="circle"${a} />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton${a} width="40%" />
        <Skeleton${a} width="80%" />
      </div>
    </li>
  ))}
</ul>`,
    shapes: `<Skeleton${a} />
<Skeleton shape="circle"${a} />
<Skeleton shape="rect"${a} />`,
  }[v.layout]
  return `import { Skeleton } from '@uisatin/ui/skeleton'\n\n${body}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [{ card: 'Card', list: 'List', shapes: 'Shapes' }[v.layout], on(v, 'animated') ? 'Animated' : 'Still'].join(' · '),
  code: code(v),
}))

export default function SkeletonDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Skeleton"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => {
        const a = on(v, 'animated')
        if (v.layout === 'card')
          return (
            <div aria-busy="true" className="flex w-72 max-w-full flex-col gap-3 rounded-xl border border-border-subtle bg-bg-card p-4">
              <Skeleton shape="rect" animated={a} width="100%" />
              <Skeleton animated={a} width="60%" />
              <Skeleton animated={a} width="90%" />
            </div>
          )
        if (v.layout === 'list')
          return (
            <ul aria-busy="true" className="flex w-80 max-w-full flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <Skeleton shape="circle" animated={a} />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton animated={a} width="40%" />
                    <Skeleton animated={a} width="80%" />
                  </div>
                </li>
              ))}
            </ul>
          )
        return (
          <div aria-busy="true" className="flex items-center gap-6">
            <Skeleton animated={a} />
            <Skeleton shape="circle" animated={a} />
            <Skeleton shape="rect" animated={a} />
          </div>
        )
      }}
    />
  )
}
