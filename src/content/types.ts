export type Socials = {
  github: string
  linkedin: string
  twitter: string
  email: string
}

export type Identity = {
  name: string
  socials: Socials
}

export type CardPicFit = 'horizontal' | 'vertical'

export type CardPic = {
  src: string
  fit: CardPicFit
}

export type CardCopy = {
  eyebrow: string
  title: string
  subtitle: string
  text: string
  /**
   * `horizontal` = 100% width, below the text.
   * `vertical` = column to the right of the text.
   * `src`: `new URL('./images/file.jpg', import.meta.url).href`
   */
  pics: CardPic[]
}

export type Project = {
  id: string
  title: string
  summary: string
  tags: string[]
  href: string
  year: string
}

export type ProjectsCopy = CardCopy & {
  items: Project[]
}

export type StackTech = {
  /** Key in `ICONS` (`src/ui/techIcons.ts`). */
  icon: string
  name: string
}

/** Plain copy, or a tech glyph+name. They wrap as one line. */
export type StackRun = string | StackTech

export type StackCopy = CardCopy & {
  flow: StackRun[]
}

export type Interest = {
  /** Emoji at the left. Empty leaves the slot blank, so rows stay aligned. */
  icon: string
  name: string
  /** Empty = plain row, no link. */
  href: string
}

export type InterestsCopy = CardCopy & {
  items: Interest[]
}

export type ContactItem = {
  /** Key in `ICONS` (`src/ui/techIcons.ts`). */
  icon: string
  name: string
  /** Field in `identity.socials`. */
  social: keyof Socials
}

export type ContactCopy = CardCopy & {
  items: ContactItem[]
}

export function filled(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0)
}
