import { useMemo } from 'react'
import { useI18n } from '../i18n/context.ts'
import { intro as introEn } from './00-intro.en.ts'
import { intro as introEs } from './00-intro.es.ts'
import { about as aboutEn } from './01-about.en.ts'
import { about as aboutEs } from './01-about.es.ts'
import { projects as projectsEn } from './02-projects.en.ts'
import { projects as projectsEs } from './02-projects.es.ts'
import { stack as stackEn } from './03-stack.en.ts'
import { stack as stackEs } from './03-stack.es.ts'
import { contact as contactEn } from './04-contact.en.ts'
import { contact as contactEs } from './04-contact.es.ts'
import { interests as interestsEn } from './06-interests.en.ts'
import { interests as interestsEs } from './06-interests.es.ts'
import { identity } from './identity.ts'

const stations = {
  es: {
    intro: introEs,
    about: aboutEs,
    interests: interestsEs,
    projects: projectsEs,
    stack: stackEs,
    contact: contactEs,

  },
  en: {
    intro: introEn,
    about: aboutEn,
    interests: interestsEn,
    projects: projectsEn,
    stack: stackEn,
    contact: contactEn,

  },
} as const

export function useContent() {
  const { locale } = useI18n()
  return useMemo(
    () => ({ identity, ...stations[locale] }),
    [locale],
  )
}
