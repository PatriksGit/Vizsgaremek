import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/**
 * Opens a legal document over the form instead of navigating away, so a
 * half-filled registration is not lost.
 */
export function LegalDialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger className="rounded-sm font-medium text-primary underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        {children}
      </DialogTrigger>
      {/* One "Bezárás" for a screen reader: the bottom button, no corner X (review 2026-11-23 ui K4). */}
      {/* Its own surface (the popover colour with a ring), as before the shared card surface of review 2026-11-24 UX-K1: the
          login page is final; it keeps only the new max height and scroll. */}
      <DialogContent
        showCloseButton={false}
        className="gap-5 rounded-md border-0 bg-popover p-6 ring-1 ring-foreground/10 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">{title}</DialogTitle>
          <DialogDescription>A dokumentum szövege hamarosan felkerül ide.</DialogDescription>
        </DialogHeader>
        <DialogClose render={<Button variant="secondary" className="h-10 justify-self-end px-4" />}>
          Bezárás
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
