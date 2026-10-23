/** The goods that cards turn into one another and that tokens on the buildings stand for. */
export type Resource = 'fish' | 'wrench' | 'flame' | 'package'

export const RESOURCES: readonly Resource[] = ['fish', 'wrench', 'flame', 'package']

export function isResource(value: unknown): value is Resource {
  return RESOURCES.some(resource => resource === value)
}
