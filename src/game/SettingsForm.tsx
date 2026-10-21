import { FieldLabel, SegmentedControl, type SettingsFormProps } from 'game-kit/turns'
import type { KowloonSettings } from './types'

const TABLE_SIZE_OPTIONS = [8, 10, 12]

export function KowloonSettingsForm({ settings, onChange }: SettingsFormProps<KowloonSettings>) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>Table size</FieldLabel>
      <SegmentedControl<number>
        options={TABLE_SIZE_OPTIONS}
        value={settings.tableSize}
        labelOf={size => `${size} × ${size}`}
        onChange={tableSize => onChange({ ...settings, tableSize })}
      />
    </div>
  )
}
