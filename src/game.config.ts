import { supabaseFromEnv, type GameConfig } from 'game-kit/turns'

/**
 * Identity of this game within the game lab. `npm run init-game` rewrites the id and title.
 *
 * `id` must be unique across every lab game: it names the Supabase table (`<id>_games`)
 * and seat-claim function (`<id>_claim_seat`, both in supabase/migrations/), and
 * prefixes PeerJS room ids and localStorage keys, so two games never collide.
 */
export const GAME_CONFIG: GameConfig = {
  id: 'template_turns',
  title: 'Turn-Based Game Template',
  tagline: 'Pig, a push-your-luck dice game for 2–5 players: an example game. Replace src/game/ with your own.',
  supabase: supabaseFromEnv(import.meta.env),
}
