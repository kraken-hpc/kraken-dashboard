import React from 'react'
import { stateToColor, Node } from '../../kraken-interactions/node'

interface SquareProps {
  cfgNode: Node
  dscNode: Node
}

export const Square = (props: SquareProps) => {
  const physColor = stateToColor(props.dscNode.physState)
  const runColor = stateToColor(props.dscNode.runState)
  return (
    <div
      className={`large-square`}
      style={{
        borderTopColor: physColor,
        borderRightColor: runColor,
        borderBottomColor: runColor,
        borderLeftColor: physColor,
      }}></div>
  )
}
