import { Node } from '../../kraken-interactions/node'
import React, { Component } from 'react'
import { Square } from './Square'
import { NodeDetails } from './NodeDetails'
import { Actions } from './Actions'
import { Graph } from '../../kraken-interactions/graph'
import { NodeGraph } from './NodeGraph'

interface NodeViewProps {
  disconnected: boolean
  cfgNode: Node | undefined
  dscNode: Node | undefined
  opened: () => void
  graph: Graph | undefined
}

export interface NodeViewState {
  graphOpen: boolean
}

export class NodeView extends Component<NodeViewProps, NodeViewState> {
  constructor(props: NodeViewProps) {
    super(props)

    this.state = {
      graphOpen: false,
    }
  }

  componentDidMount = () => {
    this.props.opened()
  }

  graphToggle = () => {
    this.setState({
      graphOpen: !this.state.graphOpen,
    })
  }

  render() {
    return (
      <React.Fragment>
        {this.props.disconnected && (
          <h2 style={{ textAlign: 'center', fontFamily: 'Arial', color: 'maroon' }}>Disconnected From Kraken</h2>
        )}
        {this.props.cfgNode === undefined || this.props.dscNode === undefined ? (
          <h3 style={{ fontFamily: 'Arial' }}>Node Does Not Exist</h3>
        ) : (
          <React.Fragment>
            <div className={`node-view`}>
              <Square dscNode={this.props.dscNode} cfgNode={this.props.cfgNode} />
              <NodeDetails dscNode={this.props.dscNode} cfgNode={this.props.cfgNode} />
              <Actions dscNode={this.props.dscNode} cfgNode={this.props.cfgNode} graphToggle={this.graphToggle} />
            </div>
            {this.props.graph !== undefined && Object.keys(this.props.graph).length !== 0 && (
              <NodeGraph graph={this.props.graph} graphOpen={this.state.graphOpen} graphToggle={this.graphToggle} />
            )}
          </React.Fragment>
        )}
      </React.Fragment>
    )
  }
}
