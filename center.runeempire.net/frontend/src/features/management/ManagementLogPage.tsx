import { ManagementLog } from './ManagementLog'
import { ToolPage } from './ToolPage'

/** /management/naplo: every staff action. */
export function ManagementLogPage() {
  return (
    <ToolPage title="Napló">
      <ManagementLog />
    </ToolPage>
  )
}
