import { Node as NodeInterface, base64ToUuid, getColorsForArea } from '../../kraken-interactions/node'
import { Link } from 'react-router-dom'
import React from 'react'
import { NodeColorInfo, NodeArea } from '../settings/NodeColor'

export interface NodeProps {
  data: NodeInterface
  colorInfo?: NodeColorInfo
}

export const Node = (props: NodeProps) => {
  if (props.data.physState === undefined) {
    props.data.physState = 'UNKNOWN'
  }
  if (props.data.runState === undefined) {
    props.data.runState = 'UNKNOWN'
  }

  const name = props.data.nodename
  const uuid = base64ToUuid(props.data.id)

  const colorMap: Map<NodeArea, string> = getColorsForArea(props.data, props.colorInfo)

  const popupData = `Name: ${name}\nUUID: ${uuid}\nPhysical State: ${props.data.physState}\nRun State: ${props.data.runState}`

  return (
    <Link
      data-popup={popupData}
      className={`square`}
      style={{
        borderTopColor: colorMap.get('TOP'),
        borderRightColor: colorMap.get('RIGHT'),
        borderBottomColor: colorMap.get('BOTTOM'),
        borderLeftColor: colorMap.get('LEFT'),
      }}
      to={`node/${uuid}`}
    />
  )
}
