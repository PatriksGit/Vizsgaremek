import { site } from '@/config/site'

/**
 * The server screenshot behind a page, surfacing when the page loads. Its own
 * layer, so the reveal's zoom never moves the content; darkened at the edges
 * so the glass card's text stays legible.
 */
export function ServerBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      {site.authBackgroundUrl ? (
        <>
          <div
            className="backdrop-reveal absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${site.authBackgroundUrl})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.25),rgb(0_0_0/0.65))]" />
        </>
      ) : (
        // Stand-in for the screenshot, so the glass has light to blur.
        <div className="backdrop-reveal absolute inset-0 bg-[radial-gradient(45%_40%_at_20%_25%,rgb(242_181_68/0.18),transparent_70%),radial-gradient(40%_40%_at_85%_80%,rgb(92_200_255/0.14),transparent_70%)]" />
      )}
    </div>
  )
}
