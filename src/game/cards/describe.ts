import type { Ability, Effect, Trigger } from './catalog'

const TRIGGER_TEXT: Record<Trigger, string> = {
  build: 'You build',
  covered: 'Covered',
  take: 'You take',
  combine: 'You combine',
}

function effectText(effect: Effect): string {
  switch (effect.kind) {
    case 'points':
      return `+${effect.amount} point${effect.amount === 1 ? '' : 's'}`
    case 'take':
      return `ready a size ${effect.size}`
    case 'combine':
      return `combine into a size ${effect.size}`
  }
}

export function abilityText(ability: Ability): string {
  if (ability.kind === 'triggered') return `${TRIGGER_TEXT[ability.trigger]}: ${effectText(ability.effect)}`
  return ability.passive === 'shrink' ? 'Build it with a piece one size smaller' : 'Combine into one size bigger'
}
