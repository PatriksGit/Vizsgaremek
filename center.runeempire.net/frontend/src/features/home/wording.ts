/** The words that change between the player's own overview and another player's profile. */
export type DashboardWording = {
  /** The hero card's name for screen readers. */
  heroLabel: string
  /** The small line above the name. */
  greeting: string
  runes: string
  playtime: string
  rank: string
  punishment: string
  friends: string
  noFriends: string
  noPlaytime: string
  /** The streak boxes' screen-reader text for a day logged in, and for today before the login. */
  streak: { done: string; pending: string }
}

/** The overview speaks to the player; its greeting depends on the day they joined (HomePage). */
export const OWN_WORDING: Omit<DashboardWording, 'greeting'> = {
  heroLabel: 'Üdvözlés',
  runes: 'Rúnáid',
  playtime: 'Játékidőd',
  rank: 'Rangod',
  punishment: 'Büntetéseid',
  friends: 'Barátaid',
  noFriends: 'Még nincs barátod a szerveren.',
  noPlaytime: 'Még nincs játékidőd ezen a héten',
  streak: { done: 'beléptél', pending: 'még nem léptél be' },
}

/** Another player's profile speaks about the player. */
export const PROFILE_WORDING: DashboardWording = {
  heroLabel: 'Játékosprofil',
  greeting: 'Játékosprofil',
  runes: 'Rúnái',
  playtime: 'Játékideje',
  rank: 'Rangja',
  punishment: 'Büntetései',
  friends: 'Barátai',
  noFriends: 'Még nincs barátja a szerveren.',
  noPlaytime: 'Még nem játszott ezen a héten',
  streak: { done: 'belépett', pending: 'még nem lépett be' },
}
