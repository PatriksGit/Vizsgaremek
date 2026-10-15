import { Link } from 'react-router'

import { site } from '@/config/site'
import { cn } from '@/lib/utils'

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'inline-flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <img src={site.logoUrl} alt="" width={48} height={48} className="size-12 drop-shadow-[0_2px_8px_rgb(0_0_0/0.5)]" />
      <span className="flex flex-col gap-1">
        <span className="font-heading text-2xl leading-none tracking-wide text-foreground">{site.name}</span>
        {subtitle && <span className="text-xs leading-none text-muted-foreground">{subtitle}</span>}
      </span>
    </Link>
  )
}
