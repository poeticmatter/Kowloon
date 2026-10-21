import type { GameModule } from 'game-kit/turns'
import { KowloonBoard } from './Board'
import { kowloonRules } from './rules'
import { SEAT_COLORS } from './seatColors'
import { KowloonSettingsForm } from './SettingsForm'
import type { KowloonMove, KowloonSettings, KowloonState } from './types'

export const game: GameModule<KowloonSettings, KowloonState, KowloonMove> = {
  rules: kowloonRules,
  minPlayers: 2,
  maxPlayers: SEAT_COLORS.length,
  defaultSettings: { tableSize: 10 },
  playerAppearance: index => SEAT_COLORS[index],
  SettingsForm: KowloonSettingsForm,
  Board: KowloonBoard,
}
