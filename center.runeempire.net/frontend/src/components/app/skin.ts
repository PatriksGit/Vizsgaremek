/** GET /api/players/{name}/skin: the skin the player wears in game, as Minecraft's 64x64 PNG. */
export function skinUrl(name: string) {
  return `/api/players/${encodeURIComponent(name)}/skin`
}
