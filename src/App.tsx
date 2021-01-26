import './styles/index.css'
import './styles/square.css'
import './components/header/styles/header.css'
import './components/dashboard/styles/dashboard.css'
import './components/nodeview/styles/nodeview.css'
import './components/settings/styles/nodecolor.css'
import './components/settings/styles/dropdown.css'

import React, { Component } from 'react'
import {
  REFRESH,
  WEBSOCKET,
  defaultNodeColorInfo,
  KRAKEN_IP,
  dscUrl,
  cfgUrl,
  webSocketUrl,
  graphUrlSingle,
  cfgUrlSingle,
  dscUrlSingle,
  stateOptionsUrl,
} from './config'
import { HashRouter, Route } from 'react-router-dom'
import { Header } from './components/header/Header'
import { Dashboard } from './components/dashboard/Dashboard'
import {
  Node,
  dscNodeFetch,
  nodeSort,
  cfgNodeFetch,
  allNodeFetch,
  mergeDSCandCFG,
  updateFromWsMessage,
  WsMessage,
  KrakenPhysState,
  KrakenRunState,
} from './kraken-interactions/node'
import { LiveConnectionType } from './kraken-interactions/live'
import { fetchJsonFromUrl } from './kraken-interactions/fetch'
import { NodeView } from './components/nodeview/NodeView'
import { Graph } from './kraken-interactions/graph'
import { cloneDeep } from 'lodash'
import {
  NodeColor,
  NodeColorInfo,
  ColorInfoToJsonString,
  ValuesToColorFromJSON,
  NodeColorInfoArea,
} from './components/settings/NodeColor'
import { getStateData, NodeStateCategory } from './kraken-interactions/nodeStateOptions'
import GraphViewer from './components/graph-viewer/GraphViewer'
import AutoSizer from 'react-virtualized-auto-sizer'

interface AppProps {}

interface AppState {
  refreshRate: number
  useWebSocket: boolean
  krakenIP: string
  liveConnectionActive: LiveConnectionType
  masterNode: Node
  nodes: Map<string, Node>
  cfgMaster: Node
  cfgNodes: Map<string, Node>
  dscMaster: Node
  dscNodes: Map<string, Node>
  updatingGraph: string | undefined
  graph: Graph | undefined
  colorInfo: NodeColorInfo
  nodeStateOptions?: NodeStateCategory[]
}

class App extends Component<AppProps, AppState> {
  pollingTimeout: NodeJS.Timeout | undefined = undefined
  reconnectTimeout: NodeJS.Timeout | undefined = undefined
  websocket: WebSocket | undefined = undefined

  constructor(props: AppProps) {
    super(props)

    let ip = localStorage.getItem('kraken-ip')
    if (ip === null) {
      ip = KRAKEN_IP
    }

    this.state = {
      refreshRate: REFRESH,
      useWebSocket: WEBSOCKET,
      krakenIP: ip,
      masterNode: {},
      nodes: new Map(),
      cfgNodes: new Map(),
      cfgMaster: {},
      dscNodes: new Map(),
      dscMaster: {},
      liveConnectionActive: 'REFETCH',
      updatingGraph: undefined,
      graph: undefined,
      colorInfo: defaultNodeColorInfo,
    }
  }

  getUrl = (path: string): string => {
    return 'http://' + this.state.krakenIP + path
  }

  componentDidMount = () => {
    this.refetch()
  }

  componentDidUpdate = (prevProps: AppProps, prevState: AppState) => {
    // If the websocket checkbox has changed
    if (this.state.useWebSocket !== prevState.useWebSocket) {
      if (this.state.liveConnectionActive !== 'RECONNECT') {
        this.setState({
          liveConnectionActive: this.state.useWebSocket ? 'WEBSOCKET' : 'POLLING',
        })
      }
    }

    // If we just started updating the graph, get the graph
    if (this.state.updatingGraph !== prevState.updatingGraph && this.state.updatingGraph !== undefined) {
      this.getGraph(this.state.updatingGraph)
    }

    // If refresh rate has changed, restart the live connection
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

    // If ip has changed, delete everything and restart
    if (this.state.krakenIP !== prevState.krakenIP) {
      localStorage.setItem('kraken-ip', this.state.krakenIP)
      this.setState(
        {
          refreshRate: REFRESH,
          useWebSocket: WEBSOCKET,
          krakenIP: this.state.krakenIP,
          masterNode: {},
          nodes: new Map(),
          cfgNodes: new Map(),
          cfgMaster: {},
          dscNodes: new Map(),
          dscMaster: {},
          liveConnectionActive: 'REFETCH',
          updatingGraph: undefined,
          graph: undefined,
          colorInfo: defaultNodeColorInfo,
        },
        this.refetch
      )
      return
    }

    if (prevState.liveConnectionActive !== this.state.liveConnectionActive) {
      // Stop polling or close websocket
      switch (prevState.liveConnectionActive) {
        case 'POLLING':
          this.stopPolling()
          break
        case 'WEBSOCKET':
          if (this.state.liveConnectionActive !== 'REFETCH') {
            this.stopWebSocket()
          }
          break
        case 'RECONNECT':
          this.stopReconnect()
          break
      }

      // Start new live connection
      switch (this.state.liveConnectionActive) {
        case 'POLLING':
          this.startPolling()
          break
        case 'WEBSOCKET':
          this.startWebSocket(this.refetch)
          break
        case 'RECONNECT':
          this.startReconnect()
          break
        case 'REFETCH':
          this.refetch()
          break
      }
    }
  }

  handleRefreshChange = (refreshRate: number) => {
    this.setState({
      refreshRate: refreshRate,
    })
  }

  handleWebsocketChange = (useWebSocket: boolean) => {
    this.setState({
      useWebSocket: useWebSocket,
    })
  }

  handleIpChange = (ip: string) => {
    if (this.validateIPaddress(ip)) {
      this.setState({
        krakenIP: ip,
      })
    }
  }

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
      dscNodeFetch(this.getUrl(dscUrl), this.state.cfgMaster.id).then(dscNodes => {
        if (dscNodes.masterNode !== null && dscNodes.computeNodes !== null) {
          const valErr = this.validateNodes(
            this.state.cfgMaster,
            this.state.cfgNodes,
            dscNodes.masterNode,
            dscNodes.computeNodes
          )
          if (valErr === null) {
            let graphCallBack = undefined
            const graphNodeId = this.state.updatingGraph
            if (graphNodeId !== undefined) {
              graphCallBack = () => {
                this.getGraph(graphNodeId)
              }
            }
            this.setFinalNodes(
              this.state.cfgMaster,
              this.state.cfgNodes,
              dscNodes.masterNode,
              dscNodes.computeNodes,
              graphCallBack
            )
          } else {
            this.setState({
              liveConnectionActive: 'REFETCH',
            })
          }
        } else {
          this.setState({
            liveConnectionActive: 'RECONNECT',
          })
        }
      })
    } else {
      this.setState({
        liveConnectionActive: 'RECONNECT',
      })
    }
  }

  stopWebSocket = () => {
    if (this.websocket !== undefined) {
      this.websocket.onclose = () => {
        console.log('Closing WebSocket')
      }
      this.websocket.close(1000)
    }
    this.websocket = undefined
  }

  startWebSocket = (connectedCallBack: () => void) => {
    if (this.websocket !== undefined) {
      console.warn('Websocket already connected, refusing to create another')
      return
    }
    fetchJsonFromUrl(this.getUrl(webSocketUrl))
      .then(json => {
        const wsurl = `ws://${json.host}:${json.port}${json.url}`
        this.websocket = new WebSocket(wsurl)

        this.websocket.onopen = () => {
          console.log('WebSocket Connected')
          if (this.websocket !== undefined) {
            this.websocket.send(JSON.stringify({ command: 'SUBSCRIBE', type: 'STATE_CHANGE' }))
            this.websocket.send(JSON.stringify({ command: 'SUBSCRIBE', type: 'STATE_MUTATION' }))
            this.websocket.send(JSON.stringify({ command: 'SUBSCRIBE', type: 'DISCOVERY' }))
            connectedCallBack()
          } else {
            console.warn('Websocket is somehow undefined')
            this.setState({
              liveConnectionActive: 'RECONNECT',
            })
          }
        }

        this.websocket.onmessage = message => {
          const jsonMessage = JSON.parse(message.data)
          // console.log('websocket received this message:', jsonMessage)
          if (jsonMessage !== null) {
            this.handleWebSocketMessage(jsonMessage)
          }
        }

        this.websocket.onclose = ev => {
          console.warn('Websocket closed unexpectedly', ev)
          this.setState({
            liveConnectionActive: 'RECONNECT',
          })
        }
      })
      .catch((reason: Error) => {
        if (reason.message === 'The operation is insecure.') {
          console.warn('Could not establish a websocket connection:', reason)
          this.setState({
            liveConnectionActive: 'RECONNECT',
          })
          return
        }
        console.warn('Could not establish a websocket connection. Falling back to polling mode. Error:', reason)
        this.setState({
          useWebSocket: false,
        })
      })
  }

  handleWebSocketMessage = (jsonData: any) => {
    const newNodes = cloneDeep(this.state.nodes)
    const newDscNodes = cloneDeep(this.state.dscNodes)
    let dscUpdateHappened = false
    for (let i = 0; i < jsonData.length; i++) {
      if (jsonData[i].type === 1) {
        // If it's a creation message, stop the loop and pull cfgNodes and dscNodes
        if (jsonData[i].data.includes('(CREATE)') || jsonData[i].data.includes('(CFG_UPDATE')) {
          console.log('Creation or update found. Close websocket and pull dsc and cfg nodes')
          this.setState({
            liveConnectionActive: 'REFETCH',
          })
          break
        } else {
          const jsonMessage: WsMessage = jsonData[i]
          // This is a physstate or runstate update
          if (jsonMessage.url === '/PhysState' || jsonMessage.url === '/RunState') {
            const newNode = newNodes.get(jsonMessage.nodeid)
            const newDscNode = newDscNodes.get(jsonMessage.nodeid)
            if (newNode === undefined || newDscNode === undefined) {
              console.log("couldn't find node. Closing websocket and pulling dsc and cfg nodes")
              this.setState({
                liveConnectionActive: 'REFETCH',
              })
              break
            }
            switch (jsonMessage.url) {
              case '/PhysState':
                newNode.physState = jsonMessage.value as KrakenPhysState
                newDscNode.physState = jsonMessage.value as KrakenPhysState
                if (jsonMessage.value === 'POWER_OFF') {
                  newNode.runState = 'UNKNOWN'
                  newDscNode.runState = 'UNKNOWN'
                } else if (jsonMessage.value === 'PHYS_HANG') {
                  newNode.runState = 'UNKNOWN'
                  newDscNode.runState = 'UNKNOWN'
                }
                // newNodes.set(base64Id, newNode)
                break
              case '/RunState':
                if (
                  jsonMessage.value !== 'UNKNOWN' &&
                  (newNode.physState === 'PHYS_UNKNOWN' ||
                    newNode.physState === 'POWER_OFF' ||
                    newNode.physState === 'PHYS_HANG')
                ) {
                  console.log(
                    "Tried to change node's runstate while phystate is unknown. Closing websocket and pulling dsc and cfg nodes"
                  )
                  this.setState({
                    liveConnectionActive: 'REFETCH',
                  })
                  break
                } else {
                  newNode.runState = jsonMessage.value as KrakenRunState
                  newDscNode.runState = jsonMessage.value as KrakenRunState
                  // newNodes.set(base64Id, newNode)
                  break
                }
              default:
                break
            }
            dscUpdateHappened = true
          } else if (jsonMessage.url.includes('type.googleapis.com')) {
            // This is an extensions update
            let newNode = newNodes.get(jsonMessage.nodeid)
            let newDscNode = newDscNodes.get(jsonMessage.nodeid)
            if (newNode === undefined || newDscNode === undefined) {
              console.log("couldn't find node. Closing websocket and pulling dsc and cfg nodes")
              this.setState({
                liveConnectionActive: 'REFETCH',
              })
              break
            }
            const updatedNode = updateFromWsMessage(newNode, jsonMessage)
            if (updatedNode !== undefined) {
              newNode = updatedNode
              dscUpdateHappened = true
            }
            const updatedDscNode = updateFromWsMessage(newDscNode, jsonMessage)
            if (updatedDscNode !== undefined) {
              newDscNode = updatedDscNode
              dscUpdateHappened = true
            }
          }
        }
      } else if (
        this.state.updatingGraph !== undefined &&
        (jsonData[i].type === 2 || jsonData[i].type === 5) &&
        jsonData[i].nodeid === this.state.updatingGraph.toLowerCase()
      ) {
        this.getGraph(this.state.updatingGraph)
      }
    }
    if (dscUpdateHappened) {
      this.setState({
        nodes: newNodes,
        dscNodes: newDscNodes,
      })
    }
  }

  setFinalNodes = (
    cfgMaster: Node,
    cfgNodes: Map<string, Node>,
    dscMaster: Node,
    dscNodes: Map<string, Node>,
    callback?: () => void
  ) => {
    let newCfgNodes = cloneDeep(cfgNodes)
    let finalNodes: Map<string, Node> = new Map()

    // Set the dsc physstate and runstate to the final nodes value
    newCfgNodes.forEach((value, key, map) => {
      const dscNode = dscNodes.get(key)
      if (dscNode !== undefined) {
        const newValue = mergeDSCandCFG(value, dscNode)

        if (newValue.id !== undefined) {
          finalNodes.set(newValue.id, newValue)
        }
        // value.physState = dscNode.physState
        // value.runState = dscNode.runState
      }
    })

    const nodeOrder: Map<string, number> = new Map() // [nodeId]index

    const finalDscNodes: Map<string, Node> = new Map()
    const finalCfgNodes: Map<string, Node> = new Map()

    // Sort the Maps
    const finalNodesArray = Array.from(finalNodes.values()).sort(nodeSort)
    finalNodes = new Map()
    for (let i = 0; i < finalNodesArray.length; i++) {
      const id = finalNodesArray[i].id
      if (id !== undefined) {
        finalNodes.set(id, finalNodesArray[i])
        const dscNode = dscNodes.get(id)
        const cfgNode = cfgNodes.get(id)
        if (dscNode !== undefined) {
          finalDscNodes.set(id, dscNode)
        }
        if (cfgNode !== undefined) {
          finalCfgNodes.set(id, cfgNode)
        }
        nodeOrder.set(id, i)
      }
    }

    // Set master node discoverable information
    const finalMaster = cfgMaster
    finalMaster.physState = dscMaster.physState
    finalMaster.runState = dscMaster.runState

    this.setState(
      {
        masterNode: finalMaster,
        nodes: finalNodes,
        cfgMaster: cfgMaster,
        cfgNodes: finalCfgNodes,
        dscMaster: dscMaster,
        dscNodes: finalDscNodes,
      },
      callback
    )
  }

  // Checks if nodelists are the same lenth and that master nodes are defined
  validateNodes = (
    cfgMaster: Node,
    cfgNodes: Map<string, Node>,
    dscMaster: Node,
    dscNodes: Map<string, Node>
  ): Error | null => {
    if (cfgMaster.id === undefined) {
      return Error('Missing cfg master')
    }
    if (Object.entries(dscMaster).length === 0) {
      return Error('Missing dsc master')
    }
    if (cfgNodes.size !== dscNodes.size) {
      return Error('cfg and dsc node lists are different sizes')
    }
    cfgNodes.forEach(node => {
      if (node.id !== undefined) {
        const dscNode = dscNodes.get(node.id)
        if (dscNode === undefined) {
          return Error('Could not find a cfg node in dsc node list')
        }
      } else {
        return Error('A compute node id was undefined')
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
    console.log('Starting Reconnect')
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
    cfgNodeFetch(this.getUrl(cfgUrl)).then(cfgNodes => {
      if (cfgNodes.masterNode !== null && cfgNodes.computeNodes !== null && cfgNodes.masterNode.id !== undefined) {
        this.setState({
          liveConnectionActive: 'REFETCH',
        })
      }
    })
  }

  refetch = () => {
    console.log('Refetching')
    // Get cfg and dsc nodes
    allNodeFetch(this.getUrl(cfgUrl), this.getUrl(dscUrl)).then(allNodes => {
      if (
        allNodes.cfgMasterNode !== null &&
        allNodes.cfgComputeNodes !== null &&
        allNodes.dscMasterNode !== null &&
        allNodes.dscComputeNodes !== null
      ) {
        this.setFinalNodes(
          allNodes.cfgMasterNode,
          allNodes.cfgComputeNodes,
          allNodes.dscMasterNode,
          allNodes.dscComputeNodes,
          () => {
            if (this.state.useWebSocket) {
              this.setState({
                liveConnectionActive: 'WEBSOCKET',
              })
            } else {
              this.setState({
                liveConnectionActive: 'POLLING',
              })
            }
          }
        )
      } else {
        this.setState({
          liveConnectionActive: 'RECONNECT',
        })
        return
      }
    })
    // Get state enums
    getStateData(this.getUrl(stateOptionsUrl)).then(nodeStateOptions => {
      if (nodeStateOptions !== null) {
        this.setState(
          {
            nodeStateOptions: nodeStateOptions,
          },
          this.getStoredColorInfo
        )
      }
    })
  }

  getGraph = (uuid: string) => {
    fetchJsonFromUrl(this.getUrl(graphUrlSingle(uuid))).then(graph => {
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
      updatingGraph: uuid,
    })
  }

  stopUpdatingGraph = () => {
    this.setState({
      updatingGraph: undefined,
      graph: undefined,
    })
  }

  changeColorInfo = (newColorInfo: NodeColorInfo) => {
    this.setState({
      colorInfo: newColorInfo,
    })
    // Save new color config to disk
    localStorage.setItem('colorInfo', ColorInfoToJsonString(newColorInfo))
  }

  getStoredColorInfo = () => {
    // Get colorinfo from localstorage
    const colorInfoString = localStorage.getItem('colorInfo')
    if (colorInfoString !== null) {
      // Parse json string into correct format
      const colorInfoJson: NodeColorInfo = JSON.parse(colorInfoString)
      Object.entries(colorInfoJson).forEach(([key, value]: [string, NodeColorInfoArea]) => {
        value.valuesToColor = ValuesToColorFromJSON(value.valuesToColor)
      })

      // Check if the stored color information contains an unknown category
      if (this.state.nodeStateOptions !== undefined) {
        const availableCategories: string[] = []
        this.state.nodeStateOptions.forEach(value => {
          availableCategories.push(value.name)
        })
        let unknownFound = false
        Object.entries(colorInfoJson).forEach(([key, value]: [string, NodeColorInfoArea]) => {
          if (!availableCategories.includes(value.category)) {
            console.log("Stored color info contains a category that this kraken doesn't know about. Using defaults.")
            unknownFound = true
            // localStorage.removeItem('colorInfo')
          }
        })
        if (unknownFound) {
          return
        }
      } else {
        return
      }
      this.setState({
        colorInfo: colorInfoJson,
      })
    }
  }

  validateIPaddress = (ip: string): boolean => {
    if (
      /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):[0-9]+$/.test(
        ip
      )
    ) {
      return true
    }
    alert('You have entered an invalid IP address and port!')
    return false
  }

  render() {
    return (
      <HashRouter>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header
            refreshRate={this.state.refreshRate}
            handleRefreshChange={this.handleRefreshChange}
            useWebSocket={this.state.useWebSocket}
            handleWebsocketChange={this.handleWebsocketChange}
            krakenIP={this.state.krakenIP}
            handleIpChange={this.handleIpChange}
          />
          <div style={{ flexGrow: 1 }}>
            <AutoSizer>
              {({ height, width }) => (
                <div style={{ width: width, height: height }}>
                  <Route
                    onchange={() => {
                      console.log('route got clicked!')
                    }}
                    exact
                    path='/'
                    render={() => (
                      <Dashboard
                        disconnected={this.state.liveConnectionActive === 'RECONNECT' ? true : false}
                        cfgMasterNode={this.state.cfgMaster}
                        dscMasterNode={this.state.dscMaster}
                        cfgNodes={this.state.cfgNodes}
                        dscNodes={this.state.dscNodes}
                        opened={this.stopUpdatingGraph}
                        colorInfo={this.state.colorInfo}
                      />
                    )}
                  />
                  <Route
                    path='/node/:uuid'
                    render={props => (
                      <NodeView
                        disconnected={this.state.liveConnectionActive === 'RECONNECT' ? true : false}
                        cfgNode={
                          this.state.cfgMaster.id === props.match.params.uuid
                            ? this.state.cfgMaster
                            : this.state.cfgNodes.get(props.match.params.uuid)
                        }
                        dscNode={
                          this.state.dscMaster.id === props.match.params.uuid
                            ? this.state.dscMaster
                            : this.state.dscNodes.get(props.match.params.uuid)
                        }
                        cfgUrlSingle={this.getUrl(cfgUrlSingle)}
                        dscUrlSingle={this.getUrl(dscUrlSingle)}
                        opened={() => {
                          if (props.match.params.uuid !== this.state.masterNode.id) {
                            this.startUpdatingGraph(props.match.params.uuid)
                          }
                        }}
                        graph={this.state.graph}
                        colorInfo={this.state.colorInfo}
                      />
                    )}
                  />
                  <Route
                    exact
                    path='/settings'
                    render={() => (
                      <NodeColor
                        nodeStateOptions={this.state.nodeStateOptions}
                        currentColorConfig={this.state.colorInfo}
                        changeColorInfo={this.changeColorInfo}
                      />
                    )}
                  />
                  <Route exact path='/graph_viewer' render={() => <GraphViewer />} />
                </div>
              )}
            </AutoSizer>
          </div>
        </div>
      </HashRouter>
    )
  }
}

export default App
