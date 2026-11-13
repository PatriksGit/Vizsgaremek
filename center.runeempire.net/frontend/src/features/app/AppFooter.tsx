import { site } from '@/config/site'

/** The logged-in pages' footer: one quiet line of legal and social links, and the Mojang notice. */
export function AppFooter() {
  const links = [...(site.footerLinks.find((column) => column.title === 'Jogi')?.links ?? []), ...site.socialLinks]

  return (
    <footer className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-5 text-xs text-faint">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <li>© {new Date().getFullYear()} {site.name}</li>
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="max-w-105 text-balance">
        Nem hivatalos Minecraft termék. Nem a Mojang vagy a Microsoft által jóváhagyott, és nem kapcsolódik hozzájuk.
      </p>
    </footer>
  )
}
