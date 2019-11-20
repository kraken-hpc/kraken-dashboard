import { NodeProps } from './Node'
import { stateToColor, base64ToUuid } from '../../kraken-interactions/node'
import { Link } from 'react-router-dom'
import React from 'react'

export const MasterNode = (props: NodeProps) => {
  const physColor = stateToColor(props.dsc.physState)
  const uuid = base64ToUuid(props.dsc.id)

  return (
    <Link
      className={`master-square-border`}
      style={{ backgroundColor: shadeColor(physColor, -30) }}
      to={`node/${uuid}`}>
      <div className={`master-square`} style={{ backgroundColor: physColor }}>
        Master
      </div>
    </Link>
  )
}

const shadeColor = (color: string, percent: number): string => {
  var R = parseInt(color.substring(2, 4), 16)
  var G = parseInt(color.substring(4, 6), 16)
  var B = parseInt(color.substring(6, 8), 16)

  R = Math.round((R * (100 + percent)) / 100)
  G = Math.round((G * (100 + percent)) / 100)
  B = Math.round((B * (100 + percent)) / 100)

  R = R < 255 ? R : 255
  G = G < 255 ? G : 255
  B = B < 255 ? B : 255

  var RR = R.toString(16).length === 1 ? '0' + R.toString(16) : R.toString(16)
  var GG = G.toString(16).length === 1 ? '0' + G.toString(16) : G.toString(16)
  var BB = B.toString(16).length === 1 ? '0' + B.toString(16) : B.toString(16)

  return '#' + RR + GG + BB
}
