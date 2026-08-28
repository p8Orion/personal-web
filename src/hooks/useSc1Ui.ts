import { useLayoutEffect } from 'react'
import { applySc1Ui, paletteHues } from '../scene/materials.ts'
import { useScrollProgress } from './useScrollProgress.ts'

/** Paints HUD + copy-panel CSS tokens from SC_2 as Z moves. */
export function useBindSc1Ui(): void {
  const z = useScrollProgress()
  useLayoutEffect(() => {
    applySc1Ui(paletteHues(z).SC_2, document.documentElement.style)
  }, [z])
}
