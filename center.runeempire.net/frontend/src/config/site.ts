import { faDiscord, faTiktok, faYoutube } from '@fortawesome/free-brands-svg-icons'
import {
  faCartShopping,
  faCircleInfo,
  faComments,
  faCompass,
  faDesktop,
  faDownload,
  faFileContract,
  faScroll,
  faTrophy,
  faUserLock,
  faUsers,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons'

/**
 * Site-wide content: server info, footer links and the auth background.
 * Placeholder values until the backend serves them; links are '#' until
 * their pages exist.
 */
export const site = {
  name: 'RuneEmpire',
  tagline: 'Magyar survival szerver, ahol a birodalmadat te építed fel.',
  playersOnline: 147,

  /** A lasting invite to the Discord server, for when the widget (and its own invite) cannot be fetched. */
  discordInviteUrl: 'https://discord.com/invite/dJg46dtc',

  logoUrl: '/RuneLogo.webp',

  /** Shader screenshot from the server, behind the glass cards. */
  backgroundUrl: '/backgrounds/bg.webp',

  /** What the login card's left panel tells a visitor about the server and the Center. */
  centerIntro: [
    {
      icon: faUsers,
      title: 'Kik vagyunk?',
      text: 'Kis csapat vagyunk, 2024-ben kezdtük fejleszteni a szervert, és ha tehetjük, folyamatosan újítunk.',
    },
    {
      icon: faComments,
      title: 'Számít a véleményed',
      text: 'Odafigyelünk a játékosokra, és az újításokat a ti ötleteitek és visszajelzéseitek alapján tervezzük.',
    },
    {
      icon: faCompass,
      title: 'Mi az a Center?',
      text: 'A szerver weboldala, ahol parancsok helyett pár kattintással intézed a dolgaidat.',
    },
    {
      icon: faDesktop,
      title: 'Saját kliens',
      text: 'A szerverre a saját kliensünkkel lépsz fel, ugyanazzal a névvel és jelszóval, mint itt.',
    },
    {
      icon: faCartShopping,
      title: 'Webshop',
      text: 'Coint vehetsz, abból pedig rangot. A korábbi vásárlásaidat is itt találod.',
    },
    {
      icon: faUserShield,
      title: 'A fiókod',
      text: 'Itt cseréled a jelszavad, kapcsolod be a kétlépcsős azonosítást, és nézed a statisztikáidat.',
    },
  ],

  footerLinks: [
    {
      title: 'Szerver',
      links: [
        { label: 'Kliens letöltése', href: '#', icon: faDownload },
        { label: 'Ranglisták', href: '#', icon: faTrophy },
        { label: 'Webshop', href: '#', icon: faCartShopping },
        { label: 'Szabályzat', href: '#', icon: faScroll },
      ],
    },
    {
      title: 'Jogi',
      links: [
        { label: 'ÁSZF', href: '#', icon: faFileContract },
        { label: 'Adatkezelési tájékoztató', href: '#', icon: faUserLock },
        { label: 'Impresszum', href: '#', icon: faCircleInfo },
      ],
    },
  ],

  socialLinks: [
    { label: 'Discord', href: '#', icon: faDiscord },
    { label: 'YouTube', href: '#', icon: faYoutube },
    { label: 'TikTok', href: '#', icon: faTiktok },
  ],
}
