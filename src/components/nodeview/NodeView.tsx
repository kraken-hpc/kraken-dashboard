import { Node } from "../../kraken-interactions/node";
import React, { Component } from "react";
import {Square} from './Square'
import { NodeDetails } from "./NodeDetails";

interface NodeViewProps{
  disconnected: boolean
  cfgNode: Node | undefined
  dscNode: Node | undefined
}

export interface NodeViewState {
  graphOpen: boolean;
}

export class NodeView extends Component<NodeViewProps, NodeViewState> {
  constructor(props: NodeViewProps){
    console.log("Nodeview props:", props)
    super(props)

    this.state = {
      graphOpen: false
    }
  }

  render() {
    return (
      <React.Fragment>
        {this.props.disconnected &&
          <h2
            style={{ textAlign: 'center', fontFamily: 'Arial', color: 'maroon' }}
          >Disconnected From Kraken</h2>
        }
        {(this.props.cfgNode === undefined || this.props.dscNode === undefined)
          ? <h3
            style={{ fontFamily: 'Arial' }}
          >Loading...</h3>
          : <React.Fragment>
            <div className={`node-view`}>
              <Square dscNode={this.props.dscNode} cfgNode={this.props.cfgNode} />
              <NodeDetails dscNode={this.props.dscNode} cfgNode={this.props.cfgNode} />
              {/* <Actions dscNode={this.props.dscNode} cfgNode={this.props.cfgNode} dscUrl={this.props.dscUrl} cfgUrl={this.props.cfgUrl} graphToggle={this.graphToggle} /> */}
            </div>
            {/* {Object.keys(this.props.graph).length !== 0 && <NodeGraph graph={this.props.graph} graphOpen={this.state.graphOpen} graphToggle={this.graphToggle} />} */}
          </React.Fragment>
        }
      </React.Fragment>
    )
  }

}