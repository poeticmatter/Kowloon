import { FieldLabel, SegmentedControl, type SettingsFormProps } from 'game-kit/turns'
import { RESOURCE_COUNTS, type ResourceCount } from './resources'
import type { KowloonSettings } from './types'

const TABLE_SIZE_OPTIONS = [4, 5, 6]

export function KowloonSettingsForm({ settings, onChange }: SettingsFormProps<KowloonSettings>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Table size</FieldLabel>
        <SegmentedControl<number>
          options={TABLE_SIZE_OPTIONS}
          value={settings.tableSize}
          labelOf={size => `${size} × ${size}`}
          onChange={tableSize => onChange({ ...settings, tableSize })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Kinds of token</FieldLabel>
        <SegmentedControl<ResourceCount>
          options={RESOURCE_COUNTS}
          value={settings.resourceCount}
          labelOf={count => `${count} kinds`}
          onChange={resourceCount => onChange({ ...settings, resourceCount })}
        />
      </div>
    </div>
  )
}
