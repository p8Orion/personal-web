import { useEffect, useState } from 'react'
import { useContent } from '../content/catalog.ts'
import { filled } from '../content/types.ts'
import {
  cardAtZ,
  NAV_Z,
  navActiveId,
  scrollToZ,
  sectionFromHash,
} from '../content/zMap.ts'
import { useScrollProgress } from '../hooks/useScrollProgress.ts'
import { useI18n } from '../i18n/context.ts'
import { SECTIONS, type SectionId } from '../scene/stations.ts'
import { useAppState } from './AppState.tsx'

function padCoord(value: number): string {
  return value.toFixed(3)
}

function FlagAR() {
  return (
    <svg aria-hidden viewBox="0 0 9 6">
      <rect width="9" height="6" fill="#74acdf" />
      <rect height="2" width="9" y="2" fill="#f4f7f5" />
      <circle cx="4.5" cy="3" fill="#f6b40e" r="0.62" />
    </svg>
  )
}

function FlagUS() {
  return (
    <svg aria-hidden viewBox="0 0 9 6">
      <rect width="9" height="6" fill="#b22234" />
      <rect height="0.46" width="9" y="0.46" fill="#f4f7f5" />
      <rect height="0.46" width="9" y="1.38" fill="#f4f7f5" />
      <rect height="0.46" width="9" y="2.3" fill="#f4f7f5" />
      <rect height="0.46" width="9" y="3.22" fill="#f4f7f5" />
      <rect height="0.46" width="9" y="4.14" fill="#f4f7f5" />
      <rect height="0.46" width="9" y="5.06" fill="#f4f7f5" />
      <rect height="3.22" width="3.6" fill="#3c3b6e" />
      <circle cx="0.7" cy="0.7" fill="#f4f7f5" r="0.18" />
      <circle cx="1.5" cy="0.7" fill="#f4f7f5" r="0.18" />
      <circle cx="2.3" cy="0.7" fill="#f4f7f5" r="0.18" />
      <circle cx="3.1" cy="0.7" fill="#f4f7f5" r="0.18" />
      <circle cx="1.1" cy="1.3" fill="#f4f7f5" r="0.18" />
      <circle cx="1.9" cy="1.3" fill="#f4f7f5" r="0.18" />
      <circle cx="2.7" cy="1.3" fill="#f4f7f5" r="0.18" />
      <circle cx="0.7" cy="1.9" fill="#f4f7f5" r="0.18" />
      <circle cx="1.5" cy="1.9" fill="#f4f7f5" r="0.18" />
      <circle cx="2.3" cy="1.9" fill="#f4f7f5" r="0.18" />
      <circle cx="3.1" cy="1.9" fill="#f4f7f5" r="0.18" />
      <circle cx="1.1" cy="2.5" fill="#f4f7f5" r="0.18" />
      <circle cx="1.9" cy="2.5" fill="#f4f7f5" r="0.18" />
      <circle cx="2.7" cy="2.5" fill="#f4f7f5" r="0.18" />
    </svg>
  )
}

function jumpTo(id: SectionId, behavior: ScrollBehavior = 'smooth'): void {
  const z = NAV_Z[id]
  if (z === undefined) return
  scrollToZ(z, behavior)
  history.replaceState(null, '', `#${id}`)
}

export function HUD() {
  const progress = useScrollProgress()
  const { booted } = useAppState()
  const { locale, t, toggleLocale } = useI18n()
  const { identity } = useContent()
  const [now, setNow] = useState(() => new Date())
  const activeNav = navActiveId(progress)
  const onStage = cardAtZ(progress)
  const sec = SECTIONS.find((section) => section.id === (onStage ?? activeNav)) ?? SECTIONS[0]
  const operator = filled(identity.name) ? identity.name : t('guest')
  const clockLocale = locale === 'es' ? 'es-AR' : 'en-US'
  const langLabel = locale === 'es' ? t('lang.to_en') : t('lang.to_es')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const applyHash = (behavior: ScrollBehavior) => {
      const id = sectionFromHash(window.location.hash)
      if (id) jumpTo(id, behavior)
    }
    applyHash('auto')
    const onHash = () => applyHash('smooth')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const clock = now.toLocaleTimeString(clockLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const skipTo =
    SECTIONS.find((section) => section.id !== 'intro' && NAV_Z[section.id] !== undefined)
      ?.id ?? 'intro'

  return (
    <header className={booted ? 'hud' : 'hud hud--muted'}>
      <div className="hud-frame" aria-hidden>
        <span className="hud-frame__tr" />
        <span className="hud-frame__bl" />
      </div>
      <a
        className="skip-link"
        href={`#${skipTo}`}
        onClick={(event) => {
          event.preventDefault()
          jumpTo(skipTo)
        }}
      >
        {t('skip_content')}
      </a>

      <div className="hud__top">
        <div className="hud__brand">
          <button
            aria-label={langLabel}
            className="hud__lang"
            onClick={toggleLocale}
            title={langLabel}
            type="button"
          >
            {locale === 'es' ? <FlagAR /> : <FlagUS />}
          </button>
          <span>{t('brand')}</span>
          <span className="hud__dim">// {operator}</span>
        </div>
        <p className="hud__clock">{clock}</p>
      </div>

      <nav aria-label={t('nav_aria')} className="hud__nav">
        {SECTIONS.filter((section) => NAV_Z[section.id] !== undefined).map((section) => (
          <a
            className={section.id === activeNav ? 'is-active' : undefined}
            href={`#${section.id}`}
            key={section.id}
            onClick={(event) => {
              event.preventDefault()
              jumpTo(section.id)
            }}
          >
            <span>{section.index}</span>
            {t(`nav.${section.id}`)}
          </a>
        ))}
      </nav>

      <div className="hud__bottom">
        <p>
          {t('sec')} {sec.index} {t(`nav.${sec.id}`)}
        </p>
        <p>Z {padCoord(progress)}</p>
      </div>
    </header>
  )
}
