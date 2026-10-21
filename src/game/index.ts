import type { GameModule } from 'game-kit/turns'
import { PigBoard } from './Board'
import { pigRules } from './rules'
import { SEAT_COLORS } from './seatColors'
import { PigSettingsForm } from './SettingsForm'
import type { PigMove, PigSettings, PigState } from './types'

/**
 * The game plugged into GameKit. To build a new game, replace everything in src/game/
 * and keep exporting a GameModule named `game`.
 */
export const game: GameModule<PigSettings, PigState, PigMove> = {
  rules: pigRules,
  minPlayers: 2,
  maxPlayers: SEAT_COLORS.length,
  defaultSettings: { targetScore: 50 },
  playerAppearance: index => SEAT_COLORS[index],
  SettingsForm: PigSettingsForm,
  Board: PigBoard,
}
