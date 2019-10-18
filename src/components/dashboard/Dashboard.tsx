import React from 'react'
import { Legend } from './Legend'
import { Cluster } from './Cluster'
import { Node } from '../../kraken-interactions/node'

interface DashboardProps {
  disconnected: boolean
  masterNode: Node
  nodes: Map<string, Node>
  opened: () => void
}

export function Dashboard(props: DashboardProps) {
  return (
    <div style={{ textAlign: `center`, display: `inline-block` }}>
      <Legend />
      <div className='node-area'>
        <Cluster
          opened={props.opened}
          disconnected={props.disconnected}
          masterNode={props.masterNode}
          nodes={props.nodes}
        />
      </div>
    </div>
  )
}
