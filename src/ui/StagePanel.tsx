import { DEBUG_STAGE_CUBE } from '../content/debug.ts'
import { useScrollProgress } from '../hooks/useScrollProgress.ts'
import { GRID_SPIN } from '../scene/gridTransform.ts'
import { MandelbrotField } from './MandelbrotField.tsx'
import { MatrixRain } from './MatrixRain.tsx'
import { OrionNebula } from './OrionNebula.tsx'

const SPIN_DEG = (GRID_SPIN * 180) / Math.PI

const FACES = [
  { name: '+Z', transform: 'translateZ(var(--cube-half))' },
  { name: '-Z', transform: 'rotateY(180deg) translateZ(var(--cube-half))' },
  { name: '+X', transform: 'rotateY(90deg) translateZ(var(--cube-half))' },
  { name: '-X', transform: 'rotateY(-90deg) translateZ(var(--cube-half))' },
  { name: '+Y', transform: 'rotateX(90deg) translateZ(var(--cube-half))' },
  { name: '-Y', transform: 'rotateX(-90deg) translateZ(var(--cube-half))' },
] as const

export function StagePanel() {
  const z = useScrollProgress()

  return (
    <aside
      aria-label="Stage"
      className="stage"
      style={{ ['--stage-z' as string]: String(z) }}
    >
      <div className="stage__slot">
        <MandelbrotField z={z} />
        <MatrixRain z={z} />
        <OrionNebula z={z} />
        {DEBUG_STAGE_CUBE ? (
          <>
            <div className="stage__viewport">
              <div
                className="stage-cube"
                style={{
                  transform: `rotateX(${z * 90}deg) rotateY(${z * SPIN_DEG}deg)`,
                }}
              >
                {FACES.map((face) => (
                  <span
                    aria-hidden
                    className="stage-cube__face"
                    key={face.name}
                    style={{ transform: face.transform }}
                  >
                    {face.name}
                  </span>
                ))}
              </div>
            </div>
            <p className="stage__readout">Z {z.toFixed(3)}</p>
          </>
        ) : null}
      </div>
    </aside>
  )
}
