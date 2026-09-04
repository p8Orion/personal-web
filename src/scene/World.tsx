import { DEBUG_BUILDINGS } from '../content/debug.ts'
import { GridOrbs } from './GridOrbs.tsx'
import { GridStructures } from './GridStructures.tsx'
import { GridWorld } from './GridWorld.tsx'
import { Ground } from './Ground.tsx'

export function World({ skipFx }: { skipFx: boolean }) {
  return (
    <group>
      <Ground skipFx={skipFx} />
      <GridWorld>
        {DEBUG_BUILDINGS ? <GridStructures skipFx={skipFx} /> : null}
        <GridOrbs skipFx={skipFx} />
      </GridWorld>
    </group>
  )
}
