import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { seasonOver } from './dates'
import { BuyButton, NoLongerSold, RankBanner } from './RankParts'
import type { Rank } from './ranks'

type RankDetailsDialogProps = {
  /** The rank shown; null keeps the dialog shut. */
  rank: Rank | null
  owned: boolean
  now: Date
  onClose: () => void
  onBuy: () => void
}

/** "Mit kapsz?": the whole description and the perks, one tab per game server. */
export function RankDetailsDialog({ rank, owned, now, onClose, onBuy }: RankDetailsDialogProps) {
  return (
    <Dialog open={rank !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto rounded-2xl border border-line bg-card p-0 ring-0 sm:max-w-160">
        {rank && (
          <>
            <RankBanner rank={rank} className="px-16 py-4.5" />
            <div className="flex flex-col gap-5 p-6">
              <div className="flex flex-col gap-2">
                <DialogTitle className="font-heading text-[28px] leading-tight font-bold">{rank.name}</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{rank.description}</DialogDescription>
              </div>

              <Tabs defaultValue={0} className="flex flex-col gap-3">
                <span className="text-xs font-bold tracking-widest text-faint uppercase">Előnyök szerverenként</span>
                <TabsList aria-label="Szerverek" className="h-auto w-full flex-wrap gap-1.5 rounded-full border border-border bg-background p-1">
                  {rank.perks.map((server, index) => (
                    <TabsTrigger
                      key={server.server}
                      value={index}
                      className="h-9 flex-auto rounded-full px-3.5 text-[13px] font-bold text-muted-foreground data-active:bg-line data-active:text-foreground"
                    >
                      {server.server}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {rank.perks.map((server, index) => (
                  <TabsContent key={server.server} value={index}>
                    <ul className="flex flex-col gap-2.5">
                      {server.lines.map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-sm text-foreground">
                          <span aria-hidden="true" className="flex size-5.5 flex-none items-center justify-center rounded-md bg-ok/12">
                            <FontAwesomeIcon icon={faCheck} className="size-3 text-ok" />
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                ))}
              </Tabs>

              {seasonOver(rank, now) ? <NoLongerSold className="h-13" /> : <BuyButton owned={owned} onClick={onBuy} className="h-13 text-base" />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
