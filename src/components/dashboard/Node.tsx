import { Node as NodeInterface, base64ToUuid, getColorsForArea } from '../../kraken-interactions/node'
import { Link } from 'react-router-dom'
import React from 'react'
import { NodeColorInfo, NodeArea } from '../settings/NodeColor'

export interface NodeProps {
  cfg: NodeInterface
  dsc: NodeInterface
  colorInfo?: NodeColorInfo
}

export const Node = (props: NodeProps) => {
  if (props.dsc.physState === undefined) {
    props.dsc.physState = 'UNKNOWN'
  }
  if (props.dsc.runState === undefined) {
    props.dsc.runState = 'UNKNOWN'
  }

  const name = props.cfg.nodename
  const uuid = base64ToUuid(props.cfg.id)

  const colorMap: Map<NodeArea, string> = getColorsForArea(props.cfg, props.dsc, props.colorInfo)

  const popupData = `Name: ${name}\nUUID: ${uuid}\nPhysical State: ${props.dsc.physState}\nRun State: ${props.dsc.runState}`

  return (
    <Link
      data-popup={popupData}
      className={`square-border`}
      to={`node/${uuid}`}
      style={{ backgroundColor: colorMap.get('BORDER') }}>
      <div
        className={`square`}
        style={{
          borderTopColor: colorMap.get('TOP'),
          borderRightColor: colorMap.get('RIGHT'),
          borderBottomColor: colorMap.get('BOTTOM'),
          borderLeftColor: colorMap.get('LEFT'),
        }}
      />
    </Link>
  )
}
