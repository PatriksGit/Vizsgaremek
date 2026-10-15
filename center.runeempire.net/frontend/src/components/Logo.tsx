import { site } from '@/config/site'

/**
 * Not a link: the site has one page per state, and on the auth page a link
 * home would bounce back to the login and lose what was typed in the forms.
 */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-3">
      <img src={site.logoUrl} alt="" width={48} height={48} className="size-12 drop-shadow-[0_2px_8px_rgb(0_0_0/0.5)]" />
      <span className="font-heading text-2xl leading-none tracking-wide text-foreground">{site.name}</span>
    </span>
  )
}
