import { toRovas } from '@/lib/rovas'
import { cn } from '@/lib/utils'

const PLACEHOLDER = toRovas('runeempire')

/**
 * The player's name carved in rovás, glowing like the runes of the logo: each
 * new rune lights up as it is typed. Purely decorative, so screen readers skip it.
 */
export function RuneInscription({ name, className }: { name: string; className?: string }) {
  const runes = toRovas(name)
  const isEmpty = runes.length === 0

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/35 px-5 shadow-[inset_0_2px_10px_rgb(0_0_0/0.5)]',
        className,
      )}
    >
      <p
        dir="rtl"
        className={cn('font-rovas text-2xl tracking-[0.2em] whitespace-nowrap', isEmpty && 'text-rune/25')}
      >
        {(isEmpty ? PLACEHOLDER : runes).map((rune, index) => (
          <span key={`${index}-${rune}`} className={cn('inline-block', !isEmpty && 'rune-carved')}>
            {rune}
          </span>
        ))}
      </p>
    </div>
  )
}
