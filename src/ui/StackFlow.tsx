import type { StackRun } from '../content/types.ts'
import { ICONS } from './techIcons.ts'

function TechMark({ id }: { id: string }) {
  const path = ICONS[id]
  if (!path) return null
  return (
    <svg aria-hidden className="stack-flow__icon" viewBox="0 0 24 24">
      <path d={path} />
    </svg>
  )
}

export function StackFlow({ flow }: { flow: StackRun[] }) {
  return (
    <p className="stack-flow">
      {flow.map((run, index) =>
        typeof run === 'string' ? (
          <span key={index}>{run}</span>
        ) : (
          <span className="stack-flow__tech" key={`${run.icon}-${index}`}>
            <TechMark id={run.icon} />
            {run.name}
          </span>
        ),
      )}
    </p>
  )
}
