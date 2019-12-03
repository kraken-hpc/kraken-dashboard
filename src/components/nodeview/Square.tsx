import React from 'react'
import { Node, getColorsForArea } from '../../kraken-interactions/node'
import { NodeColorInfo, NodeArea } from '../settings/NodeColor'

interface SquareProps {
  cfgNode: Node
  dscNode: Node
  colorInfo: NodeColorInfo
}

export const Square = (props: SquareProps) => {
  if (props.dscNode.physState === undefined) {
    props.dscNode.physState = 'PHYS_UNKNOWN'
  }
  if (props.dscNode.runState === undefined) {
    props.dscNode.runState = 'UNKNOWN'
  }

  const colorMap: Map<NodeArea, string> = getColorsForArea(props.cfgNode, props.dscNode, props.colorInfo)

  return (
    <div
      className={`large-square-border`}
      style={{
        backgroundColor: colorMap.get('BORDER'),
      }}>
      <div
        className={`large-square`}
        style={{
          borderTopColor: colorMap.get('TOP'),
          borderRightColor: colorMap.get('RIGHT'),
          borderBottomColor: colorMap.get('BOTTOM'),
          borderLeftColor: colorMap.get('LEFT'),
        }}
      />
    </div>
  )
}
