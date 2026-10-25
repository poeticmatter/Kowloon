/** The goods that cards turn into one another and that tokens on the buildings stand for. */
export type Resource = 'fish' | 'cog' | 'wifi' | 'users'

export const RESOURCES: readonly Resource[] = ['fish', 'cog', 'wifi', 'users']

/** What each resource stands for, as the cards name them. */
export const RESOURCE_NAMES: Record<Resource, string> = {
  fish: 'Food',
  cog: 'Parts',
  wifi: 'Data',
  users: 'Workers',
}

/** A match plays with the first three or all four resources. */
export type ResourceCount = 3 | 4

export const RESOURCE_COUNTS: readonly ResourceCount[] = [3, 4]

export function resourcesFor(count: ResourceCount): readonly Resource[] {
  return RESOURCES.slice(0, count)
}

export function isResource(value: unknown): value is Resource {
  return RESOURCES.some(resource => resource === value)
}

/** What is left of `needed` after taking `available` away, counting duplicates. */
export function missingResources(needed: readonly Resource[], available: readonly Resource[]): Resource[] {
  const remaining = [...available]
  return needed.filter(resource => {
    const index = remaining.indexOf(resource)
    if (index === -1) return true
    remaining.splice(index, 1)
    return false
  })
}
