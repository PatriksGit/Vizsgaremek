import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'

import { site } from '@/config/site'
import { cn } from '@/lib/utils'

/** Copies the server address so players can paste it into Minecraft. */
export function CopyAddressButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(site.serverAddress)
      setCopied(true)
    } catch {
      // Clipboard can be blocked; the address stays visible to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex items-center gap-2 rounded-sm px-1 text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      {site.serverAddress}
      {copied ? (
        <FontAwesomeIcon icon={faCheck} className="size-3.5 text-xp" aria-hidden="true" />
      ) : (
        <FontAwesomeIcon icon={faCopy} className="size-3.5 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Szervercím vágólapra másolva' : 'Szervercím másolása'}
      </span>
    </button>
  )
}
