/**
 * Transliterate Latin text into Old Hungarian (rovás) letters, following
 * Hungarian spelling: digraphs (cs, gy, sz...) are one rune, and letters
 * Hungarian lacks are spelled out (w -> v, x -> ksz). Digits, underscores
 * and anything else without a rune are dropped; the result is decorative.
 */
const RUNES: Record<string, string> = {
  a: '\u{10CC0}',
  á: '\u{10CC1}',
  b: '\u{10CC2}',
  c: '\u{10CC4}',
  cs: '\u{10CC6}',
  d: '\u{10CC7}',
  e: '\u{10CC9}',
  é: '\u{10CCB}',
  f: '\u{10CCC}',
  g: '\u{10CCD}',
  gy: '\u{10CCE}',
  h: '\u{10CCF}',
  i: '\u{10CD0}',
  í: '\u{10CD1}',
  j: '\u{10CD2}',
  k: '\u{10CD3}',
  l: '\u{10CD6}',
  ly: '\u{10CD7}',
  m: '\u{10CD8}',
  n: '\u{10CD9}',
  ny: '\u{10CDA}',
  o: '\u{10CDB}',
  ó: '\u{10CDC}',
  ö: '\u{10CDD}',
  ő: '\u{10CDF}',
  p: '\u{10CE0}',
  r: '\u{10CE2}',
  s: '\u{10CE4}',
  sz: '\u{10CE5}',
  t: '\u{10CE6}',
  ty: '\u{10CE8}',
  u: '\u{10CEA}',
  ú: '\u{10CEB}',
  ü: '\u{10CEC}',
  ű: '\u{10CEC}',
  v: '\u{10CEE}',
  z: '\u{10CEF}',
  zs: '\u{10CF0}',
}

const SPELLED_OUT: Record<string, string[]> = {
  q: ['k', 'v'],
  w: ['v'],
  x: ['k', 'sz'],
  y: ['i'],
}

/** One rune per array item, in reading order (rovás reads right to left). */
export function toRovas(text: string): string[] {
  const letters = text.toLowerCase()
  const runes: string[] = []

  for (let i = 0; i < letters.length; ) {
    const digraph = letters.slice(i, i + 2)

    if (digraph.length === 2 && RUNES[digraph]) {
      runes.push(RUNES[digraph])
      i += 2
      continue
    }

    for (const part of SPELLED_OUT[letters[i]] ?? [letters[i]]) {
      if (RUNES[part]) runes.push(RUNES[part])
    }
    i += 1
  }

  return runes
}
