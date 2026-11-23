/** How much a line `natural` px wide must shrink to fit `available` px; never grows it (1 when it fits or is unmeasured). */
export function fitScale(natural: number, available: number): number {
  if (natural <= 0 || available <= 0) return 1
  return Math.min(1, available / natural)
}
