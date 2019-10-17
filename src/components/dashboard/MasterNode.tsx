import { NodeProps } from "./Node"
import { stateToColor, base64ToUuid } from "../../kraken-interactions/node"
import { Link } from "react-router-dom"
import React from 'react'
import "../../styles/square.css"

export const MasterNode = (props: NodeProps) => {
  var physColor = stateToColor(props.data.physState)
  var uuid = base64ToUuid(props.data.id)

  return (
    <Link
      className={`master-square shadow animate`}
      style={{ backgroundColor: physColor }}
      to={`node/${uuid}`}
    >Master</Link>
  )
}
