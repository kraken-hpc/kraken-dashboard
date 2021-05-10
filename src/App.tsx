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
import { Node } from './kraken-interactions/node'
import { ConnectionType, LiveConnectionType } from './kraken-interactions/ConnectionManager/connection'
import { NodeView } from './components/nodeview/NodeView'
import { Graph } from './kraken-interactions/graph'
import {
  NodeColor,
  NodeColorInfo,
  ColorInfoToJsonString,
  ValuesToColorFromJSON,
  NodeColorInfoArea,
} from './components/settings/NodeColor'
import { NodeStateCategory } from './kraken-interactions/nodeStateOptions'
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
    this.worker.addEventListener('message', messageEvent => {
      this.handleWorkerMessages(messageEvent.data)
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
        // console.log('new data from worker')
        const data = message.data
        if (data) {
          this.setState({
            graph: data.graph,
            liveConnectionActive: data.liveConnectionActive,
            nodeStateOptions: data.nodeStateOptions,
          })
          this.setState({
            cfgMaster: data.cfgMaster,
            cfgNodes: data.cfgNodes,
            dscMaster: data.dscMaster,
            dscNodes: data.dscNodes,
          })
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
