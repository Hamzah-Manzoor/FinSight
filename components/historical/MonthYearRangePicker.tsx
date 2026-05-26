'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MONTHS = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' }, { value: '04', label: 'Apr' },
  { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' }, { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
]

interface Props {
  startDate: string   // "YYYY-MM-DD"
  endDate: string
  minDate: string
  maxDate: string
  onChange: (start: string, end: string) => void
}

export function MonthYearRangePicker({ startDate, endDate, minDate, maxDate, onChange }: Props) {
  const minYear = parseInt(minDate.substring(0, 4))
  const maxYear = parseInt(maxDate.substring(0, 4))
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i))

  const startYear = startDate.substring(0, 4)
  const startMonth = startDate.substring(5, 7)
  const endYear = endDate.substring(0, 4)
  const endMonth = endDate.substring(5, 7)

  function update(field: 'sy' | 'sm' | 'ey' | 'em', val: string | null) {
    if (!val) return
    const sy = field === 'sy' ? val : startYear
    const sm = field === 'sm' ? val : startMonth
    const ey = field === 'ey' ? val : endYear
    const em = field === 'em' ? val : endMonth
    onChange(`${sy}-${sm}-01`, `${ey}-${em}-01`)
  }

  const invalid = startDate >= endDate

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Date Range</span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <Select value={startMonth} onValueChange={v => update('sm', v)}>
            <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={startYear} onValueChange={v => update('sy', v)}>
            <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground text-sm">→</span>
        <div className="flex gap-1">
          <Select value={endMonth} onValueChange={v => update('em', v)}>
            <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={endYear} onValueChange={v => update('ey', v)}>
            <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {invalid && <p className="text-sm text-destructive">Start date must be before end date.</p>}
    </div>
  )
}
