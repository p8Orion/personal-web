import { DEBUG_BUILDINGS } from '../content/debug.ts'
import { GridStructures } from './GridStructures.tsx'
import { GridWorld } from './GridWorld.tsx'
import { Ground } from './Ground.tsx'

export function World({ skipFx }: { skipFx: boolean }) {
  return (
    <group>
      <Ground skipFx={skipFx} />
      {DEBUG_BUILDINGS ? (
        <GridWorld>
          <GridStructures skipFx={skipFx} />
        </GridWorld>
      ) : null}
    </group>
  )
}
