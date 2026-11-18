import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { playerCardHover, playerHeadGrow } from '@/components/app/interactive'
import { panelLook } from '@/components/app/Panel'
import { PlayerHead } from '@/components/app/PlayerHead'
import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { ApiError } from '@/lib/api'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { searchable, SEARCH_MIN_LENGTH, usePlayerSearch } from './api'
import { profilePath } from './links'

/** How long the box waits after the last keystroke before it asks. */
const DEBOUNCE_MS = 250

/** Above this, the "more" card says "999+": the backend stops counting at 1000. */
const MORE_SHOWN_UP_TO = 999

const countFormat = new Intl.NumberFormat('hu-HU')

const cardClass = cn(panelLook, 'flex min-h-16 items-center gap-3 px-4 py-3')

/**
 * Page-load order like the other pages: the title, then the search box, then
 * what is under it. The results arrive one after another from the moment
 * they replace the skeletons, the stagger capped after six like the rank
 * shop; a card that stays while the player types on keeps its place without
 * arriving again (keyed by name).
 */
const TITLE_DELAY = 100
const SEARCH_DELAY = 200
const BELOW_DELAY = 300
const cardEnterDelay = (index: number) => Math.min(index, 6) * 50

/**
 * The Játékosok page: a search box at the top centre; typing lists the
 * players whose name starts with it, narrowing as the player types, each a
 * card that opens their profile. At most 30 cards, then one more that says
 * how many others match, so the page can never list every player. The
 * query lives in the address (?q=), so coming back from a profile shows the
 * same results.
 */
export function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const asked = params.get('q') ?? ''
  const [text, setText] = useState(asked)
  const query = text.trim()

  // Write the query to the address once typing pauses; the search follows the address.
  useEffect(() => {
    if (query === asked) return
    const timer = setTimeout(() => setParams(query ? { q: query } : {}, { replace: true }), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, asked, setParams])

  const search = usePlayerSearch(asked)
  const result = search.data

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 md:gap-6 lg:mt-6">
      <title>{`Játékosok | ${site.name}`}</title>
      <h1 className="content-in text-center font-heading text-4xl font-bold text-foreground md:text-5xl" style={enterAfter(TITLE_DELAY)}>
        Játékosok
      </h1>

      <div className="content-in relative mx-auto w-full max-w-xl" style={enterAfter(SEARCH_DELAY)}>
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Írj be egy játékosnevet"
          aria-label="Játékosnév"
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          autoFocus
          className="h-12 w-full rounded-xl border border-line bg-sunken pr-4 pl-11 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20"
        />
      </div>

      <Results query={query} asked={asked} search={search} result={result} />
    </div>
  )
}

type ResultsProps = {
  /** What the box holds now. */
  query: string
  /** What the search was last asked (the address). */
  asked: string
  search: ReturnType<typeof usePlayerSearch>
  result: ReturnType<typeof usePlayerSearch>['data']
}

function Results({ query, asked, search, result }: ResultsProps) {
  if (query.length < SEARCH_MIN_LENGTH) {
    return (
      <p className="content-in text-center text-sm text-muted-foreground" style={enterAfter(BELOW_DELAY)}>
        Írj be legalább {SEARCH_MIN_LENGTH} betűt a névből.
      </p>
    )
  }

  // A character no name has can match nobody: no need to ask. Otherwise "none" only from the answer to what the
  // box holds: the previous query's empty answer, kept while the next loads, says nothing about this one.
  const answered = result && !search.isPlaceholderData && asked === query
  if (!searchable(query) || (answered && result.players.length === 0)) {
    return (
      <p role="status" className="content-in text-center text-muted-foreground">
        Erre a névre nincs találat
      </p>
    )
  }

  if (search.error && !search.isFetching) {
    return (
      <p role="alert" className="content-in text-center text-muted-foreground">
        {search.error instanceof ApiError ? search.error.message : 'A keresés most nem sikerült, próbáld újra.'}
      </p>
    )
  }

  // Nothing to show yet: the first answer, or the next one after an empty answer.
  if (!result || result.players.length === 0) {
    return (
      <div aria-busy="true" className="content-in" style={enterAfter(BELOW_DELAY)}>
        <span className="sr-only">Keresés…</span>
        <ul aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[28, 20, 32, 24, 18, 26].map((width, index) => (
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
    <>
      <p role="status" className="sr-only">
        {countFormat.format(result.players.length + result.more)} találat
      </p>
      <ul
        aria-label="Találatok"
        className={cn('grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3', search.isPlaceholderData && 'opacity-70')}
      >
        {result.players.map((player, index) => (
          <li key={player.name} className="content-in" style={enterAfter(cardEnterDelay(index))}>
            <Link
              to={profilePath(player.name)}
              state={{ back: { to: `/jatekosok?q=${encodeURIComponent(asked)}`, label: 'Vissza a kereséshez' } }}
              className={cn(cardClass, playerCardHover)}
            >
              <PlayerHead name={player.name} className={cn('size-10 shrink-0 rounded-md', playerHeadGrow)} />
              <span className="min-w-0 truncate font-bold text-foreground">{player.name}</span>
            </Link>
          </li>
        ))}
        {result.more > 0 && (
          <li
            className={cn(cardClass, 'content-in justify-center border-dashed text-center text-sm text-muted-foreground')}
            style={enterAfter(cardEnterDelay(result.players.length))}
          >
            Még {result.more > MORE_SHOWN_UP_TO ? `${MORE_SHOWN_UP_TO}+` : countFormat.format(result.more)} játékos – írj be többet a
            névből
          </li>
        )}
      </ul>
    </>
  )
}
