import React, { Component } from 'react'
import { Node as NodeInterface, uuidToBase64 } from '../../kraken-interactions/node'
import { MasterNode } from './MasterNode'
import { Node } from './Node'
import { NodeColorInfo } from '../settings/NodeColor'

interface ClusterProps {
  disconnected: boolean
  cfgMasterNode: NodeInterface
  dscMasterNode: NodeInterface
  cfgNodes: Map<string, NodeInterface>
  dscNodes: Map<string, NodeInterface>
  opened: () => void
  colorInfo: NodeColorInfo
}

export class Cluster extends Component<ClusterProps> {
  stateCount = (nodes: Map<string, NodeInterface>) => {
    let unknownCount = 0
    let initCount = 0
    let syncCount = 0

    nodes.forEach(node => {
      switch (node.runState) {
        case 'UNKNOWN':
          unknownCount++
          break
        case 'INIT':
          initCount++
          break
        case 'SYNC':
          syncCount++
          break
        default:
          unknownCount++
          break
      }
    })

    return {
      unknownCount: unknownCount,
      initCount: initCount,
      syncCount: syncCount,
    }
  }

  componentDidMount = () => {
    this.props.opened()
  }

  render = () => {
    const counts = this.stateCount(this.props.dscNodes)
    return (
      <React.Fragment>
        {this.props.disconnected && (
          <h2
            style={{
              textAlign: 'center',
              fontFamily: 'Arial',
              color: 'maroon',
            }}>
            Disconnected From Kraken
          </h2>
        )}
        {this.props.dscNodes.size === 0 && this.props.cfgMasterNode.id === undefined ? (
          <h3 style={{ fontFamily: 'Arial' }}>Loading...</h3>
        ) : (
          <div className='cluster'>
            <MasterNode dsc={this.props.dscMasterNode} cfg={this.props.cfgMasterNode} />
            <div className='cluster-nodelist'>
              {Array.from(this.props.dscNodes.values()).map(dscNode => {
                if (dscNode.id !== undefined) {
                  const cfgNode = this.props.cfgNodes.get(dscNode.id)
                  if (cfgNode !== undefined) {
                    return <Node cfg={cfgNode} dsc={dscNode} key={dscNode.id} colorInfo={this.props.colorInfo} />
                  }
                }
              })}
            </div>
          </div>
        )}
        <div className='counts-area'>
          <div className='counts'>Unknown: {counts.unknownCount}</div>
          <div className='counts'>Init: {counts.initCount}</div>
          <div className='counts'>Sync: {counts.syncCount}</div>
        </div>
      </React.Fragment>
    )
  }
}
