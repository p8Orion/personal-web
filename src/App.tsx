import { lazy, Suspense } from 'react'
import { applyDebugVars } from './content/debug.ts'
import { useBindUmami } from './analytics.ts'
import { useBindSc1Ui } from './hooks/useSc1Ui.ts'
import { useBindScrollProgress } from './hooks/useScrollProgress.ts'
import { useReducedMotion } from './hooks/useReducedMotion.ts'
import { SceneErrorBoundary } from './scene/SceneErrorBoundary.tsx'
import { I18nProvider } from './i18n/locale.tsx'
import { AppStateProvider } from './ui/AppState.tsx'
import { BootTerminal } from './ui/BootTerminal.tsx'
import { HUD } from './ui/HUD.tsx'
import { PaletteDebug } from './ui/PaletteDebug.tsx'
import { ProjectPanel } from './ui/ProjectPanel.tsx'
import { SectionCopy } from './ui/SectionCopy.tsx'
import { StagePanel } from './ui/StagePanel.tsx'

const Experience = lazy(async () => {
  const mod = await import('./scene/Experience.tsx')
  return { default: mod.Experience }
})

export default function App() {
  applyDebugVars()
  const reducedMotion = useReducedMotion()
  useBindScrollProgress()
  useBindUmami()
  useBindSc1Ui()

  return (
    <I18nProvider>
      <AppStateProvider startBooted={reducedMotion}>
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </SceneErrorBoundary>
        <div aria-hidden className="scanlines" />
        <div aria-hidden className="vignette" />
        <HUD />
        <PaletteDebug />
        <BootTerminal />
        <SectionCopy />
        <StagePanel />
        <ProjectPanel />
      </AppStateProvider>
    </I18nProvider>
  )
}
