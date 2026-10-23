import { Fish, Flame, Package, Wrench, type LucideIcon } from 'lucide-react'
import type { Resource } from './resources'

export const RESOURCE_ICONS: Record<Resource, LucideIcon> = {
  fish: Fish,
  wrench: Wrench,
  flame: Flame,
  package: Package,
}

export const RESOURCE_NAMES: Record<Resource, string> = {
  fish: 'Fish',
  wrench: 'Wrench',
  flame: 'Flame',
  package: 'Package',
}

export function ResourceIcon({ resource, size = 16 }: { resource: Resource; size?: number }) {
  const Icon = RESOURCE_ICONS[resource]
  return <Icon size={size} aria-label={RESOURCE_NAMES[resource]} role="img" />
}
