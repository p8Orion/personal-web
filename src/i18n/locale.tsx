import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { I18nContext, type Locale } from './context.ts'
import enRaw from './ui.txt.en?raw'
import esRaw from './ui.txt.es?raw'

export type { Locale } from './context.ts'

const STORAGE_KEY = 'orion.locale'
const BOOT_KEYS = ['boot.0', 'boot.1', 'boot.2', 'boot.3', 'boot.4', 'boot.5'] as const

type Catalog = Record<string, string>

function parseTxt(raw: string): Catalog {
  const out: Catalog = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1)
  }
  return out
}

const catalogs: Record<Locale, Catalog> = {
  es: parseTxt(esRaw),
  en: parseTxt(enRaw),
}

function fromBrowser(): Locale {
  const tag = (window.navigator.language ?? '').toLowerCase()
  return tag === 'es' || tag.startsWith('es-') ? 'es' : 'en'
}

function detectLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'es' || stored === 'en') return stored
  } catch {
    // private mode / blocked storage
  }
  return fromBrowser()
}

type I18nProviderProps = {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(detectLocale)

  const t = useCallback(
    (key: string) => catalogs[locale][key] ?? catalogs.en[key] ?? key,
    [locale],
  )

  const toggleLocale = useCallback(() => {
    setLocale((current) => {
      const next: Locale = current === 'es' ? 'en' : 'es'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const bootLines = useMemo(() => BOOT_KEYS.map((key) => t(key)), [t])

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t('document_title')
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', t('document_description'))
  }, [locale, t])

  const value = useMemo(
    () => ({ locale, t, toggleLocale, bootLines }),
    [locale, t, toggleLocale, bootLines],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
