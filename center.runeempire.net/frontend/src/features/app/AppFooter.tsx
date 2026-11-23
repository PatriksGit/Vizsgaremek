import { focusRing } from '@/components/app/interactive'
import { site } from '@/config/site'
import { cn } from '@/lib/utils'

/** The logged-in pages' footer: one quiet line of legal and social links, and the Mojang notice. */
export function AppFooter() {
  const links = [...site.legalLinks, ...site.socialLinks]

  return (
    <footer className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-5 text-xs text-faint">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <li>© {new Date().getFullYear()} {site.name}</li>
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className={cn('rounded-sm text-muted-foreground transition-colors hover:text-foreground', focusRing)}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="max-w-105 text-balance">
        Nem hivatalos Minecraft termék. Nem a Mojang vagy a Microsoft hagyta jóvá, és nem áll kapcsolatban velük.
      </p>
    </footer>
  )
}
