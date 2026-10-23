import { Eraser } from 'lucide-react'
import type { ReactNode } from 'react'
import { RESOURCES } from './resources'
import { RESOURCE_NAMES, ResourceIcon } from './ResourceIcon'
import type { TokenTool } from './useTokenTool'

const ICON_SIZE = 22

interface TokenTrayProps {
  selectedTool: TokenTool | null
  onSelect: (tool: TokenTool | null) => void
}

function ToolButton({ title, isSelected, onClick, children }: { title: string; isSelected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={isSelected}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-lg border shadow-sm transition ${
        isSelected ? 'border-accent bg-slot ring-2 ring-accent' : 'border-rule bg-paper hover:bg-slot'
      }`}
    >
      {children}
    </button>
  )
}

/** The resource tokens, in endless supply, and an eraser to pick them back up. */
export function TokenTray({ selectedTool, onSelect }: TokenTrayProps) {
  const toggle = (tool: TokenTool) => onSelect(selectedTool === tool ? null : tool)
  return (
    <div className="flex shrink-0 flex-wrap content-start gap-1" role="group" aria-label="Tokens">
      {RESOURCES.map(resource => (
        <ToolButton key={resource} title={`${RESOURCE_NAMES[resource]} token`} isSelected={selectedTool === resource} onClick={() => toggle(resource)}>
          <ResourceIcon resource={resource} size={ICON_SIZE} />
        </ToolButton>
      ))}
      <ToolButton title="Pick up a token" isSelected={selectedTool === 'eraser'} onClick={() => toggle('eraser')}>
        <Eraser size={ICON_SIZE} aria-hidden />
      </ToolButton>
    </div>
  )
}
