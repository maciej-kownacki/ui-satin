import * as React from 'react'
import { Direction } from 'radix-ui'
import { Plus, Search } from 'iconoir-react'
import { Breadcrumb } from '@uisatin/ui/breadcrumb'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { Dialog, DialogClose } from '@uisatin/ui/dialog'
import { Input } from '@uisatin/ui/input'
import { SatinLabels } from '@uisatin/ui/labels'
import { Pagination } from '@uisatin/ui/pagination'
import { SegmentedControl } from '@uisatin/ui/segmented-control'
import { Select } from '@uisatin/ui/select'
import { Switch } from '@uisatin/ui/switch'
import { Tabs } from '@uisatin/ui/tabs'
import { Toaster, toast } from '@uisatin/ui/toast'
import { Showcase, type ShowcaseControl, type ShowcaseOption } from '../../components/Showcase'

/**
 * Recipe: Satin right to left. The stage is a small Arabic settings screen inside dir="rtl" and
 * Radix's DirectionProvider, so the Radix parts (Tabs, Select, SegmentedControl's toggle group)
 * also turn their arrow keys around. The Direction control flips it back to LTR to compare.
 * Overlays portal into the stage, which stands in for an <html dir="rtl"> page.
 */

export const controls: ShowcaseControl[] = [
  { id: 'dir', label: 'Direction', items: [{ value: 'rtl', label: 'RTL' }, { value: 'ltr', label: 'LTR' }] },
]

const code = (dir: 'rtl' | 'ltr') => `// The page: <html lang="ar" dir="${dir}">
import { Direction } from 'radix-ui'
import { SatinLabels } from '@uisatin/ui/labels'

export function App({ children }: { children: React.ReactNode }) {
  // Radix reads the direction from context, not from the DOM: arrow keys in Tabs,
  // Select, menus and toggle groups follow it.
  // SatinLabels translates the words components say on their own (Close, Previous, Next…).
  return (
    <Direction.Provider dir="${dir}">
      <SatinLabels labels={{ close: 'إغلاق', previous: 'السابق', next: 'التالي' }}>{children}</SatinLabels>
    </Direction.Provider>
  )
}

// Then the components as usual:
<Breadcrumb items={[{ label: 'الرئيسية', href: '/' }, { label: 'المشاريع', href: '/projects' }, { label: 'التقرير' }]} />
<Tabs aria-label="المشروع" items={['نظرة عامة', 'النشاط', 'الإعدادات']} />
<Input label="بحث" leadingIcon={<Search />} placeholder="ابحث في المشاريع" />
<Select label="الدور" options={roles} placeholder="اختر" />
<Checkbox label="أوافق على الشروط" />
<Switch label="الإشعارات" defaultChecked />
<SegmentedControl aria-label="الفترة" items={periods} defaultValue="week" />
<Pagination pageCount={12} page={page} onPageChange={setPage} />
<Button><Plus /> مشروع جديد</Button>`

export const options: ShowcaseOption[] = (['rtl', 'ltr'] as const).map((dir) => ({ id: dir, label: 'App.tsx', code: code(dir) }))

const roles = [
  { value: 'design', label: 'تصميم' },
  { value: 'engineering', label: 'هندسة' },
  { value: 'product', label: 'منتج' },
]
/** The words components say on their own, in Arabic. */
const arabic = { close: 'إغلاق', previous: 'السابق', next: 'التالي', dismiss: 'تجاهل' }

const periods = [
  { value: 'day', label: 'يوم' },
  { value: 'week', label: 'أسبوع' },
  { value: 'month', label: 'شهر' },
]

function Screen({ dir }: { dir: 'rtl' | 'ltr' }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const [page, setPage] = React.useState(3)

  return (
    <Direction.Provider dir={dir}>
      <SatinLabels labels={arabic}>
        <div ref={setStage} dir={dir} lang="ar" className="relative flex w-[560px] max-w-full flex-col gap-5 pb-20">
          <Breadcrumb
            items={[
              { label: 'الرئيسية', onSelect: () => {} },
              { label: 'المشاريع', onSelect: () => {} },
              { label: 'التقرير' },
            ]}
          />
          <Tabs aria-label="المشروع" items={['نظرة عامة', 'النشاط', 'الإعدادات']} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="بحث" leadingIcon={<Search />} placeholder="ابحث في المشاريع" />
            <Select label="الدور" options={roles} placeholder="اختر" container={stage} />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Checkbox label="أوافق على الشروط" />
            <Switch label="الإشعارات" defaultChecked />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SegmentedControl aria-label="الفترة" items={periods} defaultValue="week" />
            <Pagination pageCount={12} page={page} onPageChange={setPage} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <Plus />
              مشروع جديد
            </Button>
            <Dialog
              container={stage}
              trigger={<Button variant="secondary">حذف المشروع</Button>}
              title="حذف المشروع؟"
              description="لا يمكن التراجع عن هذا الإجراء."
              footer={
                <>
                  <DialogClose asChild>
                    <Button variant="secondary">إلغاء</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="destructive">حذف</Button>
                  </DialogClose>
                </>
              }
            />
            <Button variant="tertiary" onClick={() => toast('تم حفظ التغييرات', { intent: 'success', icon: true, closeButton: true })}>
              إظهار إشعار
            </Button>
          </div>
          <Toaster className="absolute inset-x-0 bottom-0 w-full max-w-full" />
        </div>
      </SatinLabels>
    </Direction.Provider>
  )
}

export default function RtlDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Right-to-left"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => <Screen key={v.dir} dir={v.dir as 'rtl' | 'ltr'} />}
    />
  )
}
