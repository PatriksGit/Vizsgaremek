import { NavLink } from 'react-router'

import { cn } from '@/lib/utils'

import type { AuthMode } from './AuthShowcase'

const TABS = [
  { to: '/login', label: 'Belépés' },
  { to: '/register', label: 'Regisztráció' },
]

/** Segmented switch between the two forms; the highlight slides along with them. */
export function AuthTabs({ mode }: { mode: AuthMode }) {
  return (
    <nav aria-label="Fiók" className="relative grid grid-cols-2 rounded-xl border border-white/10 bg-black/40 p-1">
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]',
          'transition-[translate] duration-600 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none',
          mode === 'register' && 'translate-x-full',
        )}
      />
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'relative rounded-lg py-2 text-center font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
