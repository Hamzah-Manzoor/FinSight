'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ASSET_LABELS, type AssetKey } from '@/types'

interface Props {
  value: AssetKey
  onChange: (v: AssetKey) => void
}

export function AssetPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">Asset</label>
      <Select value={value} onValueChange={v => onChange(v as AssetKey)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(ASSET_LABELS) as [AssetKey, string][]).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
