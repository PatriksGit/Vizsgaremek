import { CopyAddressButton } from '@/components/CopyAddressButton'
import { Logo } from '@/components/Logo'
import { site } from '@/config/site'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bedrock text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="col-span-2 flex max-w-xs flex-col gap-4 md:col-span-1">
          <Logo />
          <p className="leading-relaxed">{site.tagline}</p>
          <CopyAddressButton className="-mx-1 self-start" />
        </div>

        {site.footerLinks.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-3 font-medium text-foreground">{column.title}</h2>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs sm:px-6 md:flex-row md:justify-between md:gap-8 lg:px-8">
          <p>© {new Date().getFullYear()} {site.name}</p>
          <p className="max-w-xl text-balance md:text-right">
            Nem hivatalos Minecraft termék. Nem a Mojang vagy a Microsoft által jóváhagyott, és nem
            kapcsolódik hozzájuk.
          </p>
        </div>
      </div>
    </footer>
  )
}
