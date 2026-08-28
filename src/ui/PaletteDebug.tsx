import { DEBUG_PALETTE } from '../content/debug.ts'
import { useScrollProgress } from '../hooks/useScrollProgress.ts'
import { DEBUG_SWATCHES, hueToCss, paletteHues } from '../scene/materials.ts'

export function PaletteDebug() {
  const scroll = useScrollProgress()
  if (!DEBUG_PALETTE) return null

  const hues = paletteHues(scroll)

  return (
    <aside aria-label="Debug paleta" className="palette-debug">
      {DEBUG_SWATCHES.map((name) => (
        <span className="palette-debug__item" key={name}>
          <span className="palette-debug__label">{name}</span>
          <span
            className="palette-debug__dot"
            style={{ background: hueToCss(hues[name]) }}
          />
        </span>
      ))}
    </aside>
  )
}
