/**
 * Site-wide content: server info, footer links and the auth background.
 * Placeholder values until the backend serves them.
 */
export const site = {
  name: 'RuneEmpire',
  tagline: 'Magyar survival szerver, ahol a birodalmadat te építed fel.',
  serverAddress: 'play.runeempire.hu',
  minecraftVersion: '1.21.4',
  playersOnline: 147,

  logoUrl: '/RuneLogo.png',

  /** Shader image served by the backend; empty until it exists. */
  authBackgroundUrl: '',
  /** Artwork on the sliding panel of the login card; empty shows a plain glow. */
  authPanelImageUrl: '',

  footerLinks: [
    {
      title: 'Szerver',
      links: [
        { label: 'Ranglisták', href: '#' },
        { label: 'Webshop', href: '#' },
        { label: 'Szabályzat', href: '#' },
      ],
    },
    {
      title: 'Jogi',
      links: [
        { label: 'ÁSZF', href: '#' },
        { label: 'Adatkezelési tájékoztató', href: '#' },
        { label: 'Impresszum', href: '#' },
      ],
    },
    {
      title: 'Közösség',
      links: [
        { label: 'Discord', href: '#' },
        { label: 'YouTube', href: '#' },
        { label: 'TikTok', href: '#' },
      ],
    },
  ],
}
