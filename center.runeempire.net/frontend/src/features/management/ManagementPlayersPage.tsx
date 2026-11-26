import { useState } from 'react'

import { ManagementPlayers } from './ManagementPlayers'
import { PlayerDialog } from './PlayerDialog'
import { ToolPage } from './ToolPage'

/** /management/jatekosok: the staff search, and a player's dialog from a card. */
export function ManagementPlayersPage() {
  // The dialog keeps its player until the exit animation ends (like the rank shop's dialogs), so it never fades out empty.
  const [opened, setOpened] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const openPlayer = (name: string) => {
    setOpened(name)
    setDialogOpen(true)
  }

  return (
    <ToolPage title="Játékosok">
      <ManagementPlayers onOpen={openPlayer} />
      {opened && <PlayerDialog name={opened} open={dialogOpen} onClose={() => setDialogOpen(false)} onClosed={() => setOpened(null)} />}
    </ToolPage>
  )
}
