import React from 'react'
import { Legend } from './Legend'
import { Cluster } from './Cluster'
import { Node } from '../../kraken-interactions/node'
import { NodeColorInfo } from '../settings/NodeColor'

interface DashboardProps {
  disconnected: boolean
  masterNode: Node
  nodes: Map<string, Node>
  opened: () => void
  colorInfo: NodeColorInfo
}

export function Dashboard(props: DashboardProps) {
  return (
    <div className={`dashboard`}>
      <Legend colorInfo={props.colorInfo} />
      <div className='node-area'>
        <Cluster
          opened={props.opened}
          disconnected={props.disconnected}
          masterNode={props.masterNode}
          nodes={props.nodes}
          colorInfo={props.colorInfo}
        />
      </div>
      <div className={`buffer-area`} />
    </div>
  )
}
