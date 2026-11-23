/** The full-width submit button of every auth form. */
export const submitButtonClass = 'h-11 w-full rounded-lg text-base font-semibold md:h-10'

/**
 * A quiet text link: "Elfelejtetted a jelszavad?", "Vissza a jelszóhoz", the panel's back link.
 * Phones: a 44 px tall tap target; -my-2 keeps the form's spacing (its neighbours are 8+ px away).
 */
export const quietLinkClass =
  'rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 max-md:-my-2 max-md:inline-flex max-md:min-h-11 max-md:items-center'

/**
 * A text link that is a button: the registration steps' "Új kódot kérek", "Javítsd ki", "Írd be", "Módosítás".
 * Phones: 44 px tall (padding), the negative margin keeps the line's height.
 */
export const linkButtonClass =
  'rounded-sm font-medium text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 max-md:-my-3 max-md:py-3'
