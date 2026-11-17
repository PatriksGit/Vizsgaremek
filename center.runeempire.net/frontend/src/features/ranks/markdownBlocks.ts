export type MarkdownBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; text: string }

/** The few Markdown blocks the rank texts use: headings, lists and paragraphs (lines joined). */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  const endParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim()
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    const item = /^[-*]\s+(.+)$/.exec(line)

    if (heading) {
      endParagraph()
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] })
    } else if (item) {
      endParagraph()
      const last = blocks.at(-1)
      if (last?.kind === 'list') last.items.push(item[1])
      else blocks.push({ kind: 'list', items: [item[1]] })
    } else if (line === '') {
      endParagraph()
    } else {
      paragraph.push(line)
    }
  }
  endParagraph()
  return blocks
}

/**
 * The first list items of a rank's text, as plain text: the card's main perks,
 * so the owner writes them once, in "Mit kapsz?".
 */
export function highlights(source: string, count: number): string[] {
  return parseMarkdown(source)
    .flatMap((block) => (block.kind === 'list' ? block.items : []))
    .slice(0, count)
    .map((item) => item.replace(/\*\*([^*]+)\*\*/g, '$1'))
}
