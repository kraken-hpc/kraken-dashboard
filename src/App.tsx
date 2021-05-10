import './styles/index.css'
import './styles/square.css'
import './components/header/styles/header.css'
import './components/dashboard/styles/dashboard.css'
import './components/nodeview/styles/nodeview.css'
import './components/settings/styles/nodecolor.css'
import './components/settings/styles/dropdown.css'

import React, { Component } from 'react'
import { REFRESH, defaultNodeColorInfo, KRAKEN_IP, cfgUrlSingle, dscUrlSingle, CONNECTION } from './config'
import { HashRouter, Route } from 'react-router-dom'
import { Header } from './components/header/Header'
import { Dashboard } from './components/dashboard/Dashboard'
import { Node, nodeSort, mergeDSCandCFG } from './kraken-interactions/node'
import { ConnectionType, LiveConnectionType } from './kraken-interactions/ConnectionManager/connection'
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
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!./worker/worker'
import { WorkerConfig, WorkerMessage } from './worker/worker'

interface AppProps {}

interface AppState {
  preferredConnectionType: ConnectionType
  refreshRate: number
  krakenIP: string
  cfgMaster: Node
  cfgNodes: Map<string, Node>
  dscMaster: Node
  dscNodes: Map<string, Node>
  updatingGraph: string | undefined
  graph: Graph | undefined
  colorInfo: NodeColorInfo
  liveConnectionActive: LiveConnectionType
  nodeStateOptions?: NodeStateCategory[]
}

class App extends Component<AppProps, AppState> {
  pollingTimeout: NodeJS.Timeout | undefined = undefined
  reconnectTimeout: NodeJS.Timeout | undefined = undefined
  websocket: WebSocket | undefined = undefined
  worker = new Worker()

  constructor(props: AppProps) {
    super(props)

    let ip = localStorage.getItem('kraken-ip')
    if (ip === null) {
      ip = KRAKEN_IP
    }

    this.state = {
      preferredConnectionType: CONNECTION,
      refreshRate: REFRESH,
      krakenIP: ip,
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
    this.getStoredColorInfo()
    // this.refetch()
    this.worker.addEventListener('message', messageEvent => {
      this.handleWorkerMessages(messageEvent.data)
      // console.log('message from worker:', messageEvent.data)
    })

    const workerConfig: WorkerConfig = {
      preferredConnectionType: this.state.preferredConnectionType,
      ip: this.state.krakenIP,
      refreshRate: this.state.refreshRate,
      updatingGraph: this.state.updatingGraph,
    }
    const workerMessage: WorkerMessage = {
      type: 'START',
      config: workerConfig,
    }
    this.worker.postMessage(workerMessage)
  }

  handleWorkerMessages = (message: WorkerMessage) => {
    switch (message.type) {
      case 'DATA':
        console.log('new data from worker')
        const data = message.data
        if (data) {
          this.setState({
            graph: data.graph,
            liveConnectionActive: data.liveConnectionActive,
            nodeStateOptions: data.nodeStateOptions,
          })
          this.setFinalNodes(data.cfgMaster, data.cfgNodes, data.dscMaster, data.dscNodes)
        }
        break
      case 'ERROR':
        console.error('error from worker: ', message.error)
        break
    }
  }

  componentDidUpdate = (prevProps: AppProps, prevState: AppState) => {
    // If ip has changed, delete everything
    if (this.state.krakenIP !== prevState.krakenIP) {
      localStorage.setItem('kraken-ip', this.state.krakenIP)
      this.setState({
        refreshRate: REFRESH,
        preferredConnectionType: CONNECTION,
        krakenIP: this.state.krakenIP,
        cfgNodes: new Map(),
        cfgMaster: {},
        dscNodes: new Map(),
        dscMaster: {},
        updatingGraph: undefined,
        graph: undefined,
        colorInfo: defaultNodeColorInfo,
      })
      return
    }

    // If any config information has changed, tell the worker
    if (
      this.state.updatingGraph !== prevState.updatingGraph ||
      this.state.preferredConnectionType !== prevState.preferredConnectionType ||
      this.state.refreshRate !== prevState.refreshRate ||
      this.state.krakenIP !== prevState.krakenIP
    ) {
      const workerConfig: WorkerConfig = {
        preferredConnectionType: this.state.preferredConnectionType,
        ip: this.state.krakenIP,
        refreshRate: this.state.refreshRate,
        updatingGraph: this.state.updatingGraph,
      }
      const workerMessage: WorkerMessage = {
        type: 'CONFIG',
        config: workerConfig,
      }
      this.worker.postMessage(workerMessage)
    }
  }

  handleRefreshChange = (refreshRate: number) => {
    this.setState({
      refreshRate: refreshRate,
    })
  }

  handleWebsocketChange = (useWebSocket: boolean) => {
    let preferredConnectionType = this.state.preferredConnectionType
    if (useWebSocket) {
      preferredConnectionType = 'WEBSOCKET'
    } else {
      preferredConnectionType = 'POLL'
    }
    this.setState({
      preferredConnectionType: preferredConnectionType,
    })
  }

  handleIpChange = (ip: string) => {
    if (this.validateIPaddress(ip)) {
      this.setState({
        krakenIP: ip,
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
        // masterNode: finalMaster,
        // nodes: finalNodes,
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

  // stopReconnect = () => {
  //   if (this.reconnectTimeout !== undefined) {
  //     clearInterval(this.reconnectTimeout)
  //   }
  //   this.reconnectTimeout = undefined
  // }

  // startReconnect = () => {
  //   console.log('Starting Reconnect')
  //   // Set hard minimum for refresh rate
  //   let finalRefreshRate = this.state.refreshRate
  //   if (finalRefreshRate < 0.15) {
  //     finalRefreshRate = 0.15
  //   }
  //   this.reconnectTimeout = setInterval(this.reconnectFunction, finalRefreshRate * 1000)
  // }

  // // When reconnect is activated this function will be run every refresh rate.
  // // It pulls the cfg node state
  // // If it eventually gets the cfg nodes it will refetch and activate either the websocket or polling
  // reconnectFunction = () => {
  //   cfgNodeFetch(this.getUrl(cfgUrl)).then(cfgNodes => {
  //     if (cfgNodes.masterNode !== null && cfgNodes.computeNodes !== null && cfgNodes.masterNode.id !== undefined) {
  //       this.setState({
  //         liveConnectionActive: 'REFETCH',
  //       })
  //     }
  //   })
  // }

  // refetch = () => {
  //   console.log('Refetching')
  //   // Get cfg and dsc nodes
  //   allNodeFetch(this.getUrl(cfgUrl), this.getUrl(dscUrl)).then(allNodes => {
  //     if (
  //       allNodes.cfgMasterNode !== null &&
  //       allNodes.cfgComputeNodes !== null &&
  //       allNodes.dscMasterNode !== null &&
  //       allNodes.dscComputeNodes !== null
  //     ) {
  //       this.setFinalNodes(
  //         allNodes.cfgMasterNode,
  //         allNodes.cfgComputeNodes,
  //         allNodes.dscMasterNode,
  //         allNodes.dscComputeNodes,
  //         () => {
  //           // if (this.state.useWebSocket) {
  //           //   this.setState({
  //           //     liveConnectionActive: 'WEBSOCKET',
  //           //   })
  //           // } else {
  //           //   this.setState({
  //           //     liveConnectionActive: 'POLLING',
  //           //   })
  //           // }
  //         }
  //       )
  //     } else {
  //       this.setState({
  //         liveConnectionActive: 'RECONNECT',
  //       })
  //       return
  //     }
  //   })
  //   // Get state enums
  //   getStateData(this.getUrl(stateOptionsUrl)).then(nodeStateOptions => {
  //     if (nodeStateOptions !== null) {
  //       this.setState(
  //         {
  //           nodeStateOptions: nodeStateOptions,
  //         },
  //         this.getStoredColorInfo
  //       )
  //     }
  //   })
  // }

  // getGraph = (uuid: string) => {
  //   fetchJsonFromUrl(this.getUrl(graphUrlSingle(uuid))).then(graph => {
  //     if (graph === null) {
  //       this.setState({
  //         liveConnectionActive: 'RECONNECT',
  //       })
  //     } else {
  //       this.setState({
  //         graph: graph,
  //       })
  //     }
  //   })
  // }

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
            preferredConnectionType={this.state.preferredConnectionType}
            handleWebsocketChange={this.handleWebsocketChange}
            krakenIP={this.state.krakenIP}
            handleIpChange={this.handleIpChange}
          />
          <div style={{ flexGrow: 1 }}>
            <AutoSizer>
              {({ height, width }) => (
                <div style={{ width: width, height: height }}>
                  <Route
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
                          if (props.match.params.uuid !== this.state.cfgMaster.id) {
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
