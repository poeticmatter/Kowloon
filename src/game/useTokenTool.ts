import { useState } from 'react'
import { vecKey } from './geometry'
import { footprintOf, isSameAim, type AimTarget } from './placement'
import type { Resource } from './resources'
import { RESOURCE_NAMES } from './ResourceIcon'
import { squareUnder, tokenAt, tokenPlacementProblem } from './tokens'
import type { KowloonMove, KowloonState } from './types'

/** A token to lay, or the eraser that picks tokens back up. */
export type TokenTool = Resource | 'eraser'

type TokenAction = { move: KowloonMove } | { problem: string }

function tokenActionAt(state: KowloonState, tool: TokenTool, target: AimTarget): TokenAction {
  const square = squareUnder(target)
  if (!square) return { problem: 'Aim at the top of a building.' }
  if (tool === 'eraser') return tokenAt(state.tokens, square) ? { move: { kind: 'remove_token', square } } : { problem: 'There’s no token there.' }

  const builtCells = new Set(state.pieces.flatMap(piece => footprintOf(piece).cells.map(vecKey)))
  const problem = tokenPlacementProblem(builtCells, state.tokens, square)
  return problem ? { problem } : { move: { kind: 'place_token', resource: tool, square } }
}

function toolHint(tool: TokenTool): string {
  if (tool === 'eraser') return 'Click a token to pick it up.'
  return `Click the top of a building to lay a ${RESOURCE_NAMES[tool]} token.`
}

export interface TokenToolState {
  tool: TokenTool | null
  select: (tool: TokenTool | null) => void
  aim: (target: AimTarget | null) => void
  /** What to tell the player about the tool and where it's aimed; null with no tool picked. */
  status: { message: string; isProblem: boolean } | null
  /** The move a click on `target` makes, or null if it does nothing. */
  moveAt: (target: AimTarget) => KowloonMove | null
}

/** The token or eraser the active player is holding, and where they're pointing it. */
export function useTokenTool(state: KowloonState): TokenToolState {
  const [tool, setTool] = useState<TokenTool | null>(null)
  const [aimed, setAimed] = useState<AimTarget | null>(null)

  const hovered = tool && aimed ? tokenActionAt(state, tool, aimed) : null
  const status = tool && {
    message: hovered && 'problem' in hovered ? hovered.problem : toolHint(tool),
    isProblem: hovered !== null && 'problem' in hovered,
  }

  return {
    tool,
    select: setTool,
    // Hovering fires on every mouse move; keep the same aim while the aimed face is unchanged.
    aim: target => setAimed(current => (current && target && isSameAim(current, target) ? current : target)),
    status,
    moveAt: target => {
      if (!tool) return null
      const action = tokenActionAt(state, tool, target)
      return 'move' in action ? action.move : null
    },
  }
}
