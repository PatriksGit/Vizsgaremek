import type { ReactNode } from 'react'

import { Panel } from '@/components/app/Panel'
import { site } from '@/config/site'

type PagePlaceholderProps = {
  title: string
  children: ReactNode
}

/** A page that has its place in the menu but not its content yet. */
export function PagePlaceholder({ title, children }: PagePlaceholderProps) {
  return (
    <Panel as="section" className="card-rise mx-auto flex w-full max-w-2xl flex-col items-start gap-4 lg:mt-10">
      <title>{`${title} | ${site.name}`}</title>
      <h1 className="font-heading text-4xl text-foreground">{title}</h1>
      {children}
    </Panel>
  )
}
