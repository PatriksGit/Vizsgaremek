import { site } from '@/config/site'

/**
 * The server screenshot behind a page, surfacing when the page loads. Its own
 * layer, so the reveal's zoom never moves the content; darkened at the edges
 * so the glass card's text stays legible.
 */
export function ServerBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className="backdrop-reveal absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${site.backgroundUrl})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.25),rgb(0_0_0/0.65))]" />
    </div>
  )
}
