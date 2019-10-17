import './styles/index.css'
import './styles/square.css'
import './components/header/styles/header.css'
import './components/dashboard/styles/dashboard.css'
import './components/nodeview/styles/nodeview.css'

import React, { Component } from "react";
import { REFRESH, WEBSOCKET, dscUrl, webSocketUrl, cfgUrl, graphUrlSingle } from "./config";
import { HashRouter, Route } from "react-router-dom";
import { Header } from "./components/header/Header";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Node, dscNodeFetch, uuidToBase64, nodeSort, cfgNodeFetch, base64ToUuid } from "./kraken-interactions/node"
import { LiveConnectionType } from "./kraken-interactions/live";
import { fetchJsonFromUrl } from './kraken-interactions/fetch'
import { NodeView } from './components/nodeview/NodeView'
import { Graph } from './kraken-interactions/graph'

interface AppProps { }

interface AppState {
  refreshRate: number;
  useWebSocket: boolean;
  liveConnectionActive: LiveConnectionType;
  masterNode: Node;
  nodes: Map<string, Node>;
  cfgMaster: Node;
  cfgNodes: Map<string, Node>;
  dscMaster: Node;
  dscNodes: Map<string, Node>;
  updatingGraph: string | undefined;
  graph: Graph | undefined;
}

class App extends Component<AppProps, AppState> {
  pollingTimeout: NodeJS.Timeout | undefined = undefined
  reconnectTimeout: NodeJS.Timeout | undefined = undefined
  websocket: WebSocket | undefined = undefined

  constructor(props: AppProps) {
    super(props);
    this.state = {
      refreshRate: REFRESH,
      useWebSocket: WEBSOCKET,
      masterNode: {},
      nodes: new Map(),
      cfgNodes: new Map(),
      cfgMaster: {},
      dscNodes: new Map(),
      dscMaster: {},
      liveConnectionActive: 'REFETCH',
      updatingGraph: undefined,
      graph: undefined,
    };
  }

  componentDidMount = () => {
    this.refetch()
  };

  componentDidUpdate = (prevProps: AppProps, prevState: AppState) => {
    if (this.state.useWebSocket !== prevState.useWebSocket) {
      if (this.state.liveConnectionActive !== "RECONNECT") {
        this.setState({
          liveConnectionActive: this.state.useWebSocket
            ? "WEBSOCKET"
            : "POLLING"
        });
      }
    }

    if (this.state.updatingGraph !== prevState.updatingGraph && this.state.updatingGraph !== undefined) {
      this.getGraph(this.state.updatingGraph)
    }

    if (this.state.refreshRate !== prevState.refreshRate) {
      switch (this.state.liveConnectionActive) {
        case 'POLLING':
          this.stopPolling()
          this.startPolling()
          break
        case 'RECONNECT':
          this.stopReconnect()
          this.startReconnect()
          break
      }
    }

    if (prevState.liveConnectionActive !== this.state.liveConnectionActive) {
      // Stop polling or close websocket
      switch (prevState.liveConnectionActive) {
        case 'POLLING':
          this.stopPolling()
          break;
        case 'WEBSOCKET':
          this.stopWebSocket()
          break;
        case 'RECONNECT':
          this.stopReconnect()
          break;
      }

      // Start new live connection
      switch (this.state.liveConnectionActive) {
        case 'POLLING':
          this.startPolling()
          break
        case 'WEBSOCKET':
          this.startWebSocket()
          break
        case 'RECONNECT':
          this.startReconnect()
          break
        case 'REFETCH':
          this.refetch()
          break
      }
    }
  };

  handleRefreshChange = (refreshRate: number) => {
    this.setState({
      refreshRate: refreshRate
    });
  };

  handleWebsocketChange = (useWebSocket: boolean) => {
    this.setState({
      useWebSocket: useWebSocket
    });
  };


  stopPolling = () => {
    if (this.pollingTimeout !== undefined) {
      clearInterval(this.pollingTimeout)
    }
    this.pollingTimeout = undefined
  }

  startPolling = () => {
    // Set hard minimum for refresh rate
    let finalRefreshRate = this.state.refreshRate
    if (finalRefreshRate < 0.15) {
      finalRefreshRate = 0.15
    }
    this.pollingTimeout = setInterval(this.pollingFunction, finalRefreshRate * 1000)
  }

  // When polling is activated this function will be run every refresh rate. 
  // It pulls the dsc node state and sets that to the final nodes
  // If any error happens, liveconnection gets changed to reconnect or refetch
  pollingFunction = () => {
    if (this.state.cfgMaster.id !== undefined) {
      dscNodeFetch(dscUrl, this.state.cfgMaster.id).then(dscNodes => {
        if (
          dscNodes.masterNode !== null &&
          dscNodes.computeNodes !== null
        ) {
          const valErr = this.validateNodes(this.state.cfgMaster, this.state.cfgNodes, dscNodes.masterNode, dscNodes.computeNodes)
          if (valErr === null) {
            this.setFinalNodes(this.state.cfgMaster, this.state.cfgNodes, dscNodes.masterNode, dscNodes.computeNodes)
          } else {
            this.setState({
              liveConnectionActive: 'REFETCH'
            })
          }
        } else {
          this.setState({
            liveConnectionActive: "RECONNECT"
          });
        }
      })
    } else {
      this.setState({
        liveConnectionActive: 'RECONNECT'
      })
    }
  }

  stopWebSocket = () => {
    if (this.websocket !== undefined) {
      this.websocket.onclose = () => {
        console.log("Closing WebSocket")
      }
      this.websocket.close(1000)
    }
    this.websocket = undefined
  }

  startWebSocket = () => {
    if (this.websocket !== undefined) {
      console.warn("Websocket already connected, refusing to create another")
      return
    }
    fetchJsonFromUrl(webSocketUrl).then((json) => {
      const wsurl = `ws://${json.websocket.host}:${json.websocket.port}${json.websocket.url}`
      this.websocket = new WebSocket(wsurl)

      this.websocket.onopen = () => {
        console.log('WebSocket Connected');
        if (this.websocket !== undefined) {
          this.websocket.send(JSON.stringify({ command: "SUBSCRIBE", type: 1 })) // Subscribe to state_change events
          this.websocket.send(JSON.stringify({ command: "SUBSCRIBE", type: 2 })) // Subscribe to mututation events
          this.websocket.send(JSON.stringify({ command: "SUBSCRIBE", type: 5 })) // Subscribe to discovery events  
        } else {
          console.warn("Websocket is somehow undefined")
          this.setState({
            liveConnectionActive: 'RECONNECT'
          })
        }
      }

      this.websocket.onmessage = (message) => {
        const jsonMessage = JSON.parse(message.data)
        console.log("websocket received this message:", jsonMessage)
        if (jsonMessage !== null) {
          this.handleWebSocketMessage(jsonMessage)
        }
      }

      this.websocket.onclose = () => {
        console.warn("Websocket closed unexpectedly")
        this.setState({
          liveConnectionActive: 'RECONNECT'
        })
      }
    })
  }

  handleWebSocketMessage = (jsonData: any) => {
    const newNodes = new Map(this.state.nodes)
    const newDscNodes = new Map(this.state.dscNodes)
    let dscUpdateHappened = false
    for (let i = 0; i < jsonData.length; i++) {
      if (jsonData[i].type === 1) {
        // If it's a creation message, stop the loop and pull cfgNodes and dscNodes
        if (jsonData[i].data.includes("(CREATE)") || jsonData[i].data.includes("(CFG_UPDATE")) {
          console.log("Creation or update found. Close websocket and pull dsc and cfg nodes")
          this.setState({
            liveConnectionActive: 'REFETCH'
          })
          break
        } else {
          const jsonMessage = jsonData[i]
          // This is a physstate or runstate update
          if (jsonMessage.url === "/PhysState" || jsonMessage.url === "/RunState") {
            const base64Id = uuidToBase64(jsonMessage.nodeid)
            const newNode = newNodes.get(base64Id)
            const newDscNode = newDscNodes.get(base64Id)
            if (newNode === undefined || newDscNode === undefined) {
              console.log("couldn't find node. Closing websocket and pulling dsc and cfg nodes")
              this.setState({
                liveConnectionActive: 'REFETCH'
              })
              break
            }
            switch (jsonMessage.url) {
              case "/PhysState":
                newNode.physState = jsonMessage.value
                newDscNode.physState = jsonMessage.value
                if (jsonMessage.value === "POWER_OFF") {
                  newNode.runState = "UNKNOWN"
                  newDscNode.runState = "UNKNOWN"
                } else if (jsonMessage.value === "PHYS_HANG") {
                  newNode.runState = "UNKNOWN"
                  newDscNode.runState = "UNKNOWN"
                }
                // newNodes.set(base64Id, newNode)
                break
              case "/RunState":
                newNode.runState = jsonMessage.value
                newDscNode.runState = jsonMessage.value
                // newNodes.set(base64Id, newNode)
                break
              default:
                break
            }
            dscUpdateHappened = true
          }
        }
      }
      else if (this.state.updatingGraph !== undefined && (jsonData[i].type === 2 || jsonData[i].type === 5) && jsonData[i].nodeid === base64ToUuid(this.state.updatingGraph).toLowerCase()) {
        this.getGraph(this.state.updatingGraph)
      }
    }
    if (dscUpdateHappened) {
      this.setState({
        nodes: newNodes,
        dscNodes: newDscNodes
      })
    }
  }

  setFinalNodes = (cfgMaster: Node, cfgNodes: Map<string, Node>, dscMaster: Node, dscNodes: Map<string, Node>, callback?: () => void) => {
    let finalNodes = new Map(cfgNodes)

    // Set the dsc physstate and runstate to the final nodes value
    finalNodes.forEach((value, key, map) => {
      const dscNode = dscNodes.get(key)
      if (dscNode !== undefined) {
        value.physState = dscNode.physState
        value.runState = dscNode.runState
      }
    })

    // Sort the Map
    const finalNodesArray = Array.from(finalNodes.values()).sort(nodeSort)
    finalNodes = new Map()
    for (let i = 0; i < finalNodesArray.length; i++) {
      const id = finalNodesArray[i].id
      if (id !== undefined) {
        finalNodes.set(id, finalNodesArray[i])
      }
    }

    // Set master node discoverable information
    const finalMaster = cfgMaster
    finalMaster.physState = dscMaster.physState
    finalMaster.runState = dscMaster.runState

    this.setState({
      masterNode: finalMaster,
      nodes: finalNodes,
      cfgMaster: cfgMaster,
      cfgNodes: cfgNodes,
      dscMaster: dscMaster,
      dscNodes: dscNodes,
    }, callback)
  }

  // Checks if nodelists are the same lenth and that master nodes are defined
  validateNodes = (cfgMaster: Node, cfgNodes: Map<string, Node>, dscMaster: Node, dscNodes: Map<string, Node>): Error | null => {
    if (cfgMaster.id === undefined) {
      return Error("Missing cfg master")
    }
    if (Object.entries(dscMaster).length === 0) {
      return Error("Missing dsc master")
    }
    if (cfgNodes.size !== dscNodes.size) {
      return Error("cfg and dsc node lists are different sizes")
    }
    cfgNodes.forEach((node) => {
      if (node.id !== undefined) {
        const dscNode = dscNodes.get(node.id)
        if (dscNode === undefined) {
          return Error("Could not find a cfg node in dsc node list")
        }
      } else {
        return Error("A compute node id was undefined")
      }
    })
    return null
  }


  stopReconnect = () => {
    if (this.reconnectTimeout !== undefined) {
      clearInterval(this.reconnectTimeout)
    }
    this.reconnectTimeout = undefined
  }

  startReconnect = () => {
    console.log("Starting Reconnect")
    // Set hard minimum for refresh rate
    let finalRefreshRate = this.state.refreshRate
    if (finalRefreshRate < 0.15) {
      finalRefreshRate = 0.15
    }
    this.reconnectTimeout = setInterval(this.reconnectFunction, finalRefreshRate * 1000)
  }

  // When reconnect is activated this function will be run every refresh rate. 
  // It pulls the cfg node state
  // If it eventually gets the cfg nodes it will refetch and activate either the websocket or polling
  reconnectFunction = () => {
    cfgNodeFetch(cfgUrl).then(cfgNodes => {
      if (
        cfgNodes.masterNode !== null &&
        cfgNodes.computeNodes !== null &&
        cfgNodes.masterNode.id !== undefined
      ) {
        this.setState({
          liveConnectionActive: 'REFETCH'
        })
      }
    })
  }

  refetch = () => {
    console.log("Refetching")
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
            this.setFinalNodes(cfgNodes.masterNode, cfgNodes.computeNodes, dscNodes.masterNode, dscNodes.computeNodes, () => {
              if (this.state.useWebSocket) {
                this.setState({
                  liveConnectionActive: 'WEBSOCKET'
                })
              } else {
                this.setState({
                  liveConnectionActive: 'POLLING'
                })
              }
            })
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
  }

  getGraph = (uuid: string) => {
    fetchJsonFromUrl(graphUrlSingle(base64ToUuid(uuid)))
      .then((graph) => {
        if (graph === null) {
          this.setState({
            liveConnectionActive: 'RECONNECT',
          })
        } else {
          this.setState({
            graph: graph,
          })
        }
      })
  }

  startUpdatingGraph = (uuid: string) => {
    this.setState({
      updatingGraph: uuid
    })
  }

  stopUpdatingGraph = () => {
    this.setState({
      updatingGraph: undefined,
      graph: undefined,
    })
  }

  render() {
    return (
      <HashRouter>
        <Header
          refreshRate={this.state.refreshRate}
          handleRefreshChange={this.handleRefreshChange}
          useWebSocket={this.state.useWebSocket}
          handleWebsocketChange={this.handleWebsocketChange}
        />
        <React.Fragment>
          <Route
            onchange={() => { console.log("route got clicked!") }}
            exact
            path="/"
            render={() => (
              <Dashboard
                disconnected={this.state.liveConnectionActive === 'RECONNECT' ? true : false}
                masterNode={this.state.masterNode}
                nodes={this.state.nodes}
                opened={this.stopUpdatingGraph}
              />
            )}
          />
          <Route
            path="/node/:uuid"
            render={(props) => (
              <NodeView
                disconnected={this.state.liveConnectionActive === 'RECONNECT' ? true : false}
                cfgNode={this.state.cfgMaster.id === uuidToBase64(props.match.params.uuid) ? this.state.cfgMaster : this.state.cfgNodes.get(uuidToBase64(props.match.params.uuid))}
                dscNode={this.state.dscMaster.id === uuidToBase64(props.match.params.uuid) ? this.state.dscMaster : this.state.dscNodes.get(uuidToBase64(props.match.params.uuid))}
                opened={() => { this.startUpdatingGraph(uuidToBase64(props.match.params.uuid)) }}
                graph={this.state.graph}
              />
            )}
          />
        </React.Fragment>
      </HashRouter>
    );
  }
}

export default App;
