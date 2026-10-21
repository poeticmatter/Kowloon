import { FieldLabel, SegmentedControl, type SettingsFormProps } from 'game-kit/turns'
import type { PigSettings } from './types'

const TARGET_SCORE_OPTIONS = [20, 50, 100]

export function PigSettingsForm({ settings, onChange }: SettingsFormProps<PigSettings>) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>First to</FieldLabel>
      <SegmentedControl<number>
        options={TARGET_SCORE_OPTIONS}
        value={settings.targetScore}
        onChange={targetScore => onChange({ ...settings, targetScore })}
      />
    </div>
  )
}
