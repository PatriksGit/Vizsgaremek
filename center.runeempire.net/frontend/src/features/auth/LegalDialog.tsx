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
      <DialogContent className="gap-5 rounded-md p-6 sm:max-w-lg">
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
