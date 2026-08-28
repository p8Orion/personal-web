import { track } from '../analytics.ts'
import type { ContactItem, Socials } from '../content/types.ts'
import { filled } from '../content/types.ts'
import { ICONS } from './techIcons.ts'

function hrefOf(social: keyof Socials, value: string): string {
  if (!filled(value)) return ''
  return social === 'email' ? `mailto:${value}` : value
}

export function ContactList({
  items,
  socials,
}: {
  items: ContactItem[]
  socials: Socials
}) {
  return (
    <ul className="contact-list">
      {items.map((item) => {
        const href = hrefOf(item.social, socials[item.social])
        const external = item.social !== 'email'
        const path = ICONS[item.icon]
        const row = (
          <>
            {path ? (
              <svg aria-hidden className="contact-row__icon" viewBox="0 0 24 24">
                <path d={path} />
              </svg>
            ) : (
              <span className="contact-row__icon" />
            )}
            <span className="contact-row__name">
              {item.name}
              {filled(href) && external ? (
                <span aria-hidden className="interest-row__out">
                  ↗
                </span>
              ) : null}
            </span>
          </>
        )

        return (
          <li key={item.social}>
            {filled(href) ? (
              <a
                className="contact-row"
                href={href}
                onClick={() => track('contact', { target: item.social })}
                rel={external ? 'noreferrer' : undefined}
                target={external ? '_blank' : undefined}
              >
                {row}
              </a>
            ) : (
              <span className="contact-row">{row}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
