import { Node as NodeInterface, stateToColor, base64ToUuid } from '../../kraken-interactions/node'
import { Link } from 'react-router-dom'
import React from 'react'

export interface NodeProps {
  data: NodeInterface
}

export const Node = (props: NodeProps) => {
  if (props.data.physState === undefined) {
    props.data.physState = 'UNKNOWN'
  }
  if (props.data.runState === undefined) {
    props.data.runState = 'UNKNOWN'
  }

  const name = props.data.nodename
  const physColor = stateToColor(props.data.physState)
  const runColor = stateToColor(props.data.runState)
  const uuid = base64ToUuid(props.data.id)

  const popupData = `Name: ${name}\nUUID: ${uuid}\nPhysical State: ${props.data.physState}\nRun State: ${props.data.runState}`

  return (
    <Link
      data-popup={popupData}
      className={`square`}
      style={{
        borderTopColor: physColor,
        borderRightColor: runColor,
        borderBottomColor: runColor,
        borderLeftColor: physColor,
      }}
      to={`node/${uuid}`}
    />
  )
}
