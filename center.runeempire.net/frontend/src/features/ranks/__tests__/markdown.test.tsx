/**
 * The "Mit kapsz?" text is Markdown from the database (later edited in the
 * management section): headings, lists, paragraphs and bold, nothing else, and
 * never HTML.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Markdown } from '@/features/ranks/Markdown'

afterEach(cleanup)

describe('the rank details Markdown', () => {
  it('renders headings, lists, paragraphs and bold', () => {
    const { container } = render(
      <Markdown>{'Egy **erős** rang.\nMásodik sor.\n\n## Globális\n- Repülés\n- Napi **rúna**\n\n### Kingdoms\n* Extractor'}</Markdown>,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Globális' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: 'Kingdoms' })).toBeTruthy()
    const lists = screen.getAllByRole('list')
    expect(lists).toHaveLength(2)
    expect(lists[0].querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('p')?.textContent).toBe('Egy erős rang. Második sor.')
    expect(container.querySelector('p strong')?.textContent).toBe('erős')
    expect(container.querySelector('li strong')?.textContent).toBe('rúna')
  })

  it('a top-level # heading is still below the dialog title', () => {
    render(<Markdown>{'# Előnyök'}</Markdown>)

    expect(screen.getByRole('heading', { level: 3, name: 'Előnyök' })).toBeTruthy()
  })

  it('HTML stays text', () => {
    const { container } = render(<Markdown>{'<img src=x onerror=alert(1)> **<b>x</b>**'}</Markdown>)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('an unclosed ** is just text', () => {
    const { container } = render(<Markdown>{'5 **csillag'}</Markdown>)

    expect(container.querySelector('strong')).toBeNull()
    expect(container.textContent).toBe('5 **csillag')
  })
})
