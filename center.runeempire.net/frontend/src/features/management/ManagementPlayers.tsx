import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'

import { playerCardHover, playerGridColumns, playerHeadGrow } from '@/components/app/interactive'
import { panelLook } from '@/components/app/Panel'
import { PlayerHead } from '@/components/app/PlayerHead'
import { Skeleton } from '@/components/ui/skeleton'
import { formMessage } from '@/lib/api'
import { countFormat } from '@/lib/budapest'
import { enterAfter, staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { None } from './None'
import { normalizedQuery, searchableFor, useManagementPlayerSearch, type PlayerSummary, type SearchMode } from './playersApi'

/** How long the box waits after the last keystroke before it asks (like the Játékosok page). */
const DEBOUNCE_MS = 250

/** Above this, the "more" card says "999+": the backend stops counting at 1000. */
const MORE_SHOWN_UP_TO = 999

const CARD_STEP = 50

/** The three ways staff search (owner, 2026-11-26), each with its box's wording and the backend's length cap. */
const MODES: { mode: SearchMode; label: string; field: string; placeholder: string; maxLength: number }[] = [
  { mode: 'name', label: 'Név', field: 'Játékosnév', placeholder: 'Írj be egy játékosnevet', maxLength: 16 },
  { mode: 'ip', label: 'IP-cím', field: 'IP-cím', placeholder: 'Írj be egy IP-címet', maxLength: 45 },
  { mode: 'email', label: 'E-mail', field: 'E-mail cím', placeholder: 'Írj be egy e-mail címet', maxLength: 255 },
]

const cardClass = cn(panelLook, 'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left')

/**
 * The Játékosok tab: a Név / IP-cím / E-mail switch and one search box. A
 * card is a button: it opens the player's dialog (onOpen). Switching the mode
 * keeps the text and asks again in the new mode.
 */
export function ManagementPlayers({ onOpen }: { onOpen: (name: string) => void }) {
  const [mode, setMode] = useState<SearchMode>('name')
  const [text, setText] = useState('')
  const [asked, setAsked] = useState('')
  const current = MODES.find((option) => option.mode === mode) ?? MODES[0]

  useEffect(() => {
    const timer = setTimeout(() => setAsked(text), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text])

  const search = useManagementPlayerSearch(mode, asked)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <fieldset className="min-w-0 shrink-0">
          <legend className="sr-only">Keresés módja</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-sunken p-1">
            {MODES.map((option) => (
              <label
                key={option.mode}
                className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-extrabold text-soft transition-colors select-none hover:text-foreground has-checked:bg-primary has-checked:text-background has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary max-md:min-h-11"
              >
                <input
                  type="radio"
                  name="management-search-mode"
                  value={option.mode}
                  checked={option.mode === mode}
                  onChange={() => setMode(option.mode)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="relative min-w-0 flex-1">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={current.placeholder}
            aria-label={current.field}
            maxLength={current.maxLength}
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-line bg-sunken pr-4 pl-11 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <Results mode={mode} text={text} search={search} onOpen={onOpen} />
    </div>
  )
}

type ResultsProps = {
  mode: SearchMode
  /** What the box holds now. */
  text: string
  search: ReturnType<typeof useManagementPlayerSearch>
  onOpen: (name: string) => void
}

function Results({ mode, text, search, onOpen }: ResultsProps) {
  if (normalizedQuery(mode, text).length < 2) {
    return <p className="text-center text-sm text-muted-foreground">Írj be legalább 2 karaktert.</p>
  }

  // A character the mode cannot hold matches nobody: no need to ask.
  if (!searchableFor(mode, text)) {
    return (
      <p role="status" className="text-center text-muted-foreground">
        Nincs találat
      </p>
    )
  }

  const shown = resultsFor(search.data, mode, text)

  if (shown?.exact && shown.players.length === 0) {
    return (
      <p role="status" className="text-center text-muted-foreground">
        Nincs találat
      </p>
    )
  }

  if (search.error && !search.isFetching && !shown) {
    return (
      <p role="alert" className="text-center text-muted-foreground">
        {formMessage(search.error, 'A keresés most nem sikerült, próbáld újra.')}
      </p>
    )
  }

  if (!shown || shown.players.length === 0) {
    return (
      <div aria-busy="true">
        <span className="sr-only">Keresés…</span>
        <ul aria-hidden="true" className={cn(playerGridColumns, 'gap-3')}>
          {[28, 20, 32, 24].map((width, index) => (
            <li key={index} className={cardClass}>
              <Skeleton className="size-10 rounded-md" />
              <Skeleton className="h-4" style={{ width: width * 4 }} />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <ul aria-label="Találatok" className={cn(playerGridColumns, 'gap-3 transition-opacity', !shown.exact && 'opacity-70')}>
      {shown.players.map((player, index) => (
        <li key={player.name} className="content-in" style={enterAfter(staggerDelay(index, CARD_STEP))}>
          <button type="button" onClick={() => onOpen(player.name)} className={cn(cardClass, playerCardHover, 'cursor-pointer')}>
            <PlayerHead name={player.name} className={cn('size-10 shrink-0 rounded-md', playerHeadGrow)} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-bold text-foreground">{player.name}</span>
              <span className="truncate text-sm text-muted-foreground">
                <MatchedField mode={mode} player={player} />
              </span>
            </span>
          </button>
        </li>
      ))}
      {shown.more > 0 && (
        <li className={cn(cardClass, 'justify-center border-dashed text-center text-sm text-muted-foreground')}>
          Még {shown.more > MORE_SHOWN_UP_TO ? `${MORE_SHOWN_UP_TO}+` : countFormat.format(shown.more)} játékos – írj be
          többet
        </li>
      )}
    </ul>
  )
}

type Search = NonNullable<ReturnType<typeof useManagementPlayerSearch>['data']>

/** The field each mode searches, as the backend compares it (lowercased). */
function searchedField(mode: SearchMode, player: PlayerSummary) {
  return (mode === 'name' ? player.name : mode === 'ip' ? player.last_ip : player.email)?.toLowerCase() ?? ''
}

/**
 * What an answer may show for the box while the box's own answer is on its way -- the Játékosok page's rule
 * (players/api.ts resultsFor; owner, 2026-11-18): only an answer to the START of the query, in the same mode,
 * narrowed to the accounts that still match; an unrelated answer ("pa" while "be" loads) shows nothing. Compared
 * case-insensitively, like the backend and the query key -- why: "Zz" then "zz" share one cached answer.
 * `exact`: the box's own answer, so `more` and "no hit" can be trusted.
 */
function resultsFor(result: Search | undefined, mode: SearchMode, text: string) {
  const typed = normalizedQuery(mode, text).toLowerCase()
  if (!result || result.mode !== mode) return null
  const asked = result.query.toLowerCase()
  if (!typed.startsWith(asked)) return null
  const exact = asked === typed
  return {
    players: exact ? result.players : result.players.filter((player) => searchedField(mode, player).startsWith(typed)),
    more: exact ? result.more : 0,
    exact,
  }
}

/** Under the name: the last IP in IP mode (the field searched), the e-mail otherwise. */
function MatchedField({ mode, player }: { mode: SearchMode; player: PlayerSummary }) {
  const value = mode === 'ip' ? player.last_ip : player.email
  return value ?? <None />
}
