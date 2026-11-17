import type { ReactNode } from 'react'

import { parseMarkdown } from './markdownBlocks'

/** **bold** spans; everything else, HTML included, stays plain text (React escapes it). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index} className="font-bold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

/**
 * A rank's "Mit kapsz?" text: Markdown from the database (the management
 * section will edit it). Only headings (#, ##, ###), lists (- or *),
 * paragraphs and **bold**; never renders HTML. Headings start at h3, under
 * the dialog's own title.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-soft">
      {parseMarkdown(children).map((block, index) => {
        if (block.kind === 'heading') {
          const Heading = block.level === 3 ? 'h4' : 'h3'
          return (
            <Heading key={index} className="mt-2 font-heading text-lg font-bold text-foreground first:mt-0">
              {inline(block.text)}
            </Heading>
          )
        }
        if (block.kind === 'list') {
          return (
            <ul key={index} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-primary">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item)}</li>
              ))}
            </ul>
          )
        }
        return <p key={index}>{inline(block.text)}</p>
      })}
    </div>
  )
}
