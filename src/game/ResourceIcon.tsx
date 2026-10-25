import { Cog, Fish, Users, Wifi, type LucideIcon } from 'lucide-react'
import { RESOURCE_NAMES, type Resource } from './resources'

export const RESOURCE_ICONS: Record<Resource, LucideIcon> = {
  fish: Fish,
  cog: Cog,
  wifi: Wifi,
  users: Users,
}

/** Chosen to read apart at a glance, on both the paper cards and the white tokens. */
export const RESOURCE_COLORS: Record<Resource, string> = {
  fish: '#1f78d1',
  cog: '#7c4dc4',
  wifi: '#12998a',
  users: '#e4572e',
}

export function ResourceIcon({ resource, size = 16 }: { resource: Resource; size?: number }) {
  const Icon = RESOURCE_ICONS[resource]
  return <Icon size={size} color={RESOURCE_COLORS[resource]} aria-label={RESOURCE_NAMES[resource]} role="img" />
}
