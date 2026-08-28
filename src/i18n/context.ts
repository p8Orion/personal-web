import { createContext, useContext } from 'react'

export type Locale = 'es' | 'en'

export type I18nValue = {
  locale: Locale
  t: (key: string) => string
  toggleLocale: () => void
  bootLines: string[]
}

/** Isolated so Vite HMR of locale.tsx / ui.txt.* does not replace this object. */
export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}
