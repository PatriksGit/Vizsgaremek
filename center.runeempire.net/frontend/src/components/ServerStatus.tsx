import { CopyAddressButton } from '@/components/CopyAddressButton'
import { site } from '@/config/site'

export function ServerStatus() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span className="size-2 rounded-full bg-xp shadow-[0_0_8px_var(--xp)]" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-foreground">{site.playersOnline}</strong> online
        </span>
      </span>
      <span>
        Verzió <span className="text-foreground">{site.minecraftVersion}</span>
      </span>
      <CopyAddressButton />
    </div>
  )
}
