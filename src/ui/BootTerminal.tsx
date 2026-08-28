import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'
import { useI18n } from '../i18n/context.ts'
import { useAppState } from './AppState.tsx'

export function BootTerminal() {
  const { booted, setBooted } = useAppState()
  const { t, bootLines } = useI18n()
  const reducedMotion = useReducedMotion()
  const [visibleLines, setVisibleLines] = useState(reducedMotion ? bootLines.length : 0)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(booted)
  const leaveTimer = useRef<number>(0)

  useEffect(() => {
    if (reducedMotion) {
      setBooted(true)
      setGone(true)
    }
  }, [reducedMotion, setBooted])

  useEffect(() => {
    if (booted || reducedMotion) return
    if (visibleLines >= bootLines.length) return

    const delay = visibleLines === 0 ? 180 : 220
    const timer = window.setTimeout(() => {
      setVisibleLines((count) => count + 1)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [booted, bootLines.length, reducedMotion, visibleLines])

  useEffect(() => {
    if (booted || reducedMotion) return
    if (visibleLines < bootLines.length) return
    const timer = window.setTimeout(() => setBooted(true), 520)
    return () => window.clearTimeout(timer)
  }, [booted, bootLines.length, reducedMotion, setBooted, visibleLines])

  useEffect(() => {
    if (!booted || gone) return
    setLeaving(true)
    leaveTimer.current = window.setTimeout(() => setGone(true), 480)
    return () => window.clearTimeout(leaveTimer.current)
  }, [booted, gone])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        setBooted(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setBooted])

  useEffect(() => {
    document.body.style.overflow = booted ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [booted])

  if (gone) return null

  return (
    <div className={leaving ? 'boot is-leaving' : 'boot'} role="dialog" aria-label={t('boot.aria')}>
      <p className="boot__kicker">{t('boot.kicker')}</p>
      <ul className="boot__log">
        {bootLines.slice(0, visibleLines).map((line, index) => (
          <li key={index}>
            <span className="boot__prompt">&gt;</span> {line}
          </li>
        ))}
        {visibleLines < bootLines.length ? (
          <li className="boot__cursor" aria-hidden>
            <span className="boot__prompt">&gt;</span> _
          </li>
        ) : null}
      </ul>
      <button className="boot__skip" onClick={() => setBooted(true)} type="button">
        {t('boot.skip')}
      </button>
    </div>
  )
}
