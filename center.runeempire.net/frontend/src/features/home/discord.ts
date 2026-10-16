import { useQuery } from '@tanstack/react-query'

import { http } from '@/lib/api'

/** GET /api/discord-widget: Discord's public widget, cut down by the backend. */
export type DiscordWidget = {
  presence_count: number
  instant_invite: string | null
  channels: { id: string; name: string }[]
  members: DiscordMember[]
}

export type DiscordMember = {
  username: string
  avatar_url: string | null
  status: string
  /** The voice channel the member sits in, if any. */
  channel_id: string | null
}

async function fetchDiscordWidget(): Promise<DiscordWidget> {
  const response = await http.get<{ data: DiscordWidget }>('/discord-widget')
  return response.data.data
}

/**
 * Who is on the Discord, refreshed every minute: as often as the backend asks
 * Discord. No retries, since the backend remembers a failure for that minute.
 */
export function useDiscordWidget() {
  return useQuery({
    queryKey: ['discord-widget'],
    queryFn: fetchDiscordWidget,
    refetchInterval: 60_000,
    retry: false,
  })
}
