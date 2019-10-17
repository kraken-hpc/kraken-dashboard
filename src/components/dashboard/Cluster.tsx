import React, { Component } from "react";
import { dscUrl, cfgUrl } from "../../config";
import { cfgNodeFetch, dscNodeFetch, nodeSort } from "../../kraken-interactions/node";
import { Node as NodeInterface } from "../../kraken-interactions/node";
import { LiveConnectionType } from "../../kraken-interactions/live";
import { MasterNode } from "./MasterNode";
import { Node } from "./Node";
import '../../styles/cluster.css'

interface ClusterProps {
  refreshRate: number;
  useWebSocket: boolean;
}

export interface ClusterState {
  masterNode: NodeInterface;
  nodes: Map<string, NodeInterface>;
  // cfgMaster: Node;
  // cfgNodes: Map<string, Node>;
  // dscMaster: Node;
  // dscNodes: Map<string, Node>;
  // disconnected: boolean;
  liveConnectionActive: LiveConnectionType;
}

export class Cluster extends Component<ClusterProps, ClusterState> {
  constructor(props: ClusterProps) {
    super(props);

    this.state = {
      masterNode: {},
      nodes: new Map(),
      // cfgNodes: new Map(),
      // cfgMaster: {},
      // dscNodes: new Map(),
      // dscMaster: {},
      liveConnectionActive: props.useWebSocket ? "WEBSOCKET" : "POLLING"
    };
    // this.organizeNodes = this.organizeNodes.bind(this);
    // this.cfgNodeFetch = this.cfgNodeFetch.bind(this);
    // this.dscNodeFetch = this.dscNodeFetch.bind(this);
    // this.liveFunction = Common.liveFunction.bind(this);
    // this.stopLive = Common.stopLive.bind(this);
    // this.webSocketNodeUpdate = Common.webSocketNodeUpdate.bind(this);
    // this.closeWebSocket = Common.closeWebSocket.bind(this);
    // this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
  }

  componentDidMount = () => {
    // Get cfg and dsc nodes
    cfgNodeFetch(cfgUrl).then(cfgNodes => {
      if (
        cfgNodes.masterNode !== null &&
        cfgNodes.computeNodes !== null &&
        cfgNodes.masterNode.id !== undefined
      ) {
        dscNodeFetch(dscUrl, cfgNodes.masterNode.id).then(dscNodes => {
          if (
            dscNodes.masterNode !== null &&
            dscNodes.computeNodes !== null &&
            cfgNodes.masterNode !== null &&
            cfgNodes.computeNodes !== null
          ) {
            this.setFinalNodes(cfgNodes.masterNode, cfgNodes.computeNodes, dscNodes.masterNode, dscNodes.computeNodes)
          } else {
            this.setState({
              liveConnectionActive: "RECONNECT"
            });
            return;
          }
        });
      } else {
        this.setState({
          liveConnectionActive: "RECONNECT"
        });
        return;
      }
    });

    switch (this.state.liveConnectionActive) {
      case "POLLING":
      // Setup polling connection
      break
      case "WEBSOCKET":
      // Setup websocket connection
      break
    }
  };

  componentDidUpdate = (prevProps: ClusterProps, prevState: ClusterState) => {
    if (this.props.useWebSocket !== prevProps.useWebSocket) {
      if (this.state.liveConnectionActive !== "RECONNECT") {
        this.setState({
          liveConnectionActive: this.props.useWebSocket
            ? "WEBSOCKET"
            : "POLLING"
        });
      }
    }
    if (prevState.liveConnectionActive !== this.state.liveConnectionActive) {
      this.updateLiveConnection();
    }
  };

  updateLiveConnection = () => { };

  setFinalNodes(cfgMaster: NodeInterface, cfgNodes: Map<string, NodeInterface>, dscMaster: NodeInterface, dscNodes: Map<string, NodeInterface>) {
    var finalNodes = new Map(cfgNodes)

    finalNodes.forEach((value, key, map) => {
      var dscNode = dscNodes.get(key)
      if (dscNode !== undefined) {
        value.physState = dscNode.physState
        value.runState = dscNode.runState
      }
    })

    // Sort the Map
    var finalNodesArray = Array.from(finalNodes.values()).sort(nodeSort)
    finalNodes = new Map()
    for (var i = 0; i < finalNodesArray.length; i++) {
      const id = finalNodesArray[i].id
      if (id !== undefined){
        finalNodes.set(id, finalNodesArray[i])
      }
    }

    // Set master node discoverable information
    var finalMaster = cfgMaster
    finalMaster.physState = dscMaster.physState
    finalMaster.runState = dscMaster.runState

    this.setState({
      masterNode: finalMaster,
      nodes: finalNodes,
    })
  }

  stateCount = (nodes: Map<string, NodeInterface>) => {
    var unknownCount = 0;
    var initCount = 0;
    var syncCount = 0;

    nodes.forEach(node => {
      switch (node.runState) {
        case "UNKNOWN":
          unknownCount++;
          break;
        case "INIT":
          initCount++;
          break;
        case "SYNC":
          syncCount++;
          break;
        default:
          unknownCount++;
          break;
      }
    });

    return {
      unknownCount: unknownCount,
      initCount: initCount,
      syncCount: syncCount
    };
  }

  render() {
    // console.log("render", Array.from(this.state.nodes.values()))
    var counts = this.stateCount(this.state.nodes);
    return (
      <React.Fragment>
        {this.state.liveConnectionActive === 'RECONNECT' && (
          <h2
            style={{
              textAlign: "center",
              fontFamily: "Arial",
              color: "maroon"
            }}
          >
            Disconnected From Kraken
          </h2>
        )}
        {this.state.nodes.size === 0 &&
          typeof this.state.masterNode.id === "undefined" ? (
            <h3 style={{ fontFamily: "Arial" }}>Loading...</h3>
          ) : (
            <div className="cluster">
              <MasterNode data={this.state.masterNode} />
              <div className="cluster-nodelist">
                {Array.from(this.state.nodes.values()).map(node => {
                  return <Node data={node} key={node.id} />;
                })}
              </div>
            </div>
          )}
        <div className="counts-area">
          <div className="counts">Unknown: {counts.unknownCount}</div>
          <div className="counts">Init: {counts.initCount}</div>
          <div className="counts">Sync: {counts.syncCount}</div>
        </div>
      </React.Fragment>
    );
  }
}
