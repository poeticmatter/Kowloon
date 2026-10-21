import { supabaseFromEnv, type GameConfig } from 'game-kit/turns'

/**
 * Identity of this game within the game lab. `npm run init-game` rewrites the id and title.
 *
 * `id` must be unique across every lab game: it names the Supabase table (`<id>_games`)
 * and seat-claim function (`<id>_claim_seat`, both in supabase/migrations/), and
 * prefixes PeerJS room ids and localStorage keys, so two games never collide.
 */
export const GAME_CONFIG: GameConfig = {
  id: 'kowloon',
  title: 'Kowloon',
  tagline: 'Build the walled city: stack polycube towers on a shared table, without blocking anyone’s windows.',
  supabase: supabaseFromEnv(import.meta.env),
}
