// import { Component, useState, useEffect, useRef, useCallback } from 'react'
import { cfgUrl, dscUrl, graphUrlSingle, stateOptionsUrl, webSocketUrl } from '../../config'
import { ConnectionType, getUrl, LiveConnectionType } from './connection'
import { allNodeFetch, cfgNodeFetch, Node, sortAllNodes } from '../node'
import { getStateData, NodeStateCategory } from '../nodeStateOptions'
import { Graph } from '../graph'
import { fetchJsonFromUrl } from '../fetch'
import { getGraph, pollingFunction } from './pollingFunctions'
import { handleWebSocketMessage, subscribe } from './websocketFunctions'
import { WorkerConfig } from '../../worker/worker'
import { SimpleStore } from './SimpleStore'

export interface ConnectionManagerProps extends WorkerConfig {
  setPreferredConnectionType: (connectionType: ConnectionType) => void
  newData: (data: ConnectionManagerState) => void
}

export interface ConnectionManagerState {
  cfgMaster: Node
  cfgNodes: Map<string, Node>
  dscMaster: Node
  dscNodes: Map<string, Node>
  liveConnectionActive: LiveConnectionType
  nodeStateOptions: NodeStateCategory[] | undefined
  graph: Graph | undefined
}

export class ConnectionManager {
  pollingTimeout: NodeJS.Timeout | undefined = undefined
  reconnectTimeout: NodeJS.Timeout | undefined = undefined
  websocket: WebSocket | undefined = undefined
  state: SimpleStore<ConnectionManagerState>
  props: SimpleStore<ConnectionManagerProps>

  constructor(props: SimpleStore<ConnectionManagerProps>) {
    this.props = props
    this.state = new SimpleStore<ConnectionManagerState>({
      cfgMaster: {},
      cfgNodes: new Map(),
      dscMaster: {},
      dscNodes: new Map(),
      liveConnectionActive: 'REFETCH',
      nodeStateOptions: undefined,
      graph: undefined,
    })

    this.subscribeToChanges()
    this.refetch()
    console.log('connection manager started')
  }

  subscribeToChanges = () => {
    // If any node info changes, send updates to the main thread
    this.state
      .selectMany([
        'cfgMaster',
        'cfgNodes',
        'dscMaster',
        'dscNodes',
        'graph',
        'liveConnectionActive',
        'nodeStateOptions',
      ])
      .subscribe(() => {
        // console.log('nodes changed, sending new data')
        const props = this.props.getStateSnapshot()
        props.newData(this.state.getStateSnapshot())
      })

    // If the websocket checkbox has changed
    this.props.select('preferredConnectionType').subscribe(pct => {
      const state = this.state.getStateSnapshot()
      if (state.liveConnectionActive !== 'RECONNECT') {
        switch (pct) {
          case 'WEBSOCKET':
            this.state.setState({ liveConnectionActive: 'WEBSOCKET' })
            break
          case 'POLL':
            this.state.setState({ liveConnectionActive: 'POLLING' })
            break
        }
      }
    })

    // If we just started updating the graph, get the graph
    this.props.select('updatingGraph').subscribe(ug => {
      // console.log('updating graph changed: ', ug)
      if (ug !== undefined) {
        this.getGraph()
      }
    })

    // If refresh rate has changed, restart the live connection
    this.props.select('refreshRate').subscribe(rr => {
      const state = this.state.getStateSnapshot()
      switch (state.liveConnectionActive) {
        case 'POLLING':
          this.stopPolling()
          this.startPolling()
          break
        case 'RECONNECT':
          this.stopReconnect()
          this.startReconnect()
          break
      }
    })

    // If ip has changed, delete everything and restart
    this.props.select('ip').subscribe(ip => {
      this.state.setState({
        cfgMaster: {},
        cfgNodes: new Map(),
        dscMaster: {},
        dscNodes: new Map(),
        liveConnectionActive: 'REFETCH',
        graph: undefined,
      })
    })

    this.state.select('liveConnectionActive').subscribe(lca => {
      // stop old connection
      this.stopPolling()
      if (lca !== 'REFETCH') {
        this.stopWebSocket()
      }
      this.stopReconnect()

      // Start new live connection
      switch (lca) {
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
    })
  }

  stopPolling = () => {
    if (this.pollingTimeout !== undefined) {
      clearInterval(this.pollingTimeout)
    }
    this.pollingTimeout = undefined
  }

  startPolling = () => {
    const props = this.props.getStateSnapshot()
    // Set hard minimum for refresh rate
    let finalRefreshRate = props.refreshRate
    if (finalRefreshRate < 0.15) {
      finalRefreshRate = 0.15
    }
    this.pollingTimeout = setInterval(() => {
      const state = this.state.getStateSnapshot()
      const props = this.props.getStateSnapshot()
      pollingFunction(
        props.ip,
        state.cfgMaster,
        state.cfgNodes,
        props.updatingGraph,
        liveConnectionType => {
          this.state.setState({ liveConnectionActive: liveConnectionType })
        },
        allNodes => {
          const sortedAllNodes = sortAllNodes(allNodes)
          if (
            sortedAllNodes.cfgMasterNode !== null &&
            sortedAllNodes.cfgComputeNodes !== null &&
            sortedAllNodes.dscMasterNode !== null &&
            sortedAllNodes.dscComputeNodes
          ) {
            this.state.setState({
              cfgMaster: sortedAllNodes.cfgMasterNode,
              cfgNodes: sortedAllNodes.cfgComputeNodes,
              dscMaster: sortedAllNodes.dscMasterNode,
              dscNodes: sortedAllNodes.dscComputeNodes,
            })
          }
        },
        graph => {
          this.state.setState({
            graph: graph,
          })
        }
      )
    }, finalRefreshRate * 1000)
  }

  stopReconnect = () => {
    if (this.reconnectTimeout !== undefined) {
      clearInterval(this.reconnectTimeout)
    }
    this.reconnectTimeout = undefined
  }

  startReconnect = () => {
    console.log('Starting Reconnect')
    const props = this.props.getStateSnapshot()
    // Set hard minimum for refresh rate
    let finalRefreshRate = props.refreshRate
    if (finalRefreshRate < 0.15) {
      finalRefreshRate = 0.15
    }
    this.reconnectTimeout = setInterval(this.reconnectFunction, finalRefreshRate * 1000)
  }

  // When reconnect is activated this function will be run every refresh rate.
  // It pulls the cfg node state
  // If it eventually gets the cfg nodes it will refetch and activate either the websocket or polling
  reconnectFunction = () => {
    cfgNodeFetch(this.getUrl(cfgUrl))
      .then(cfgNodes => {
        if (cfgNodes.masterNode !== null && cfgNodes.computeNodes !== null && cfgNodes.masterNode.id !== undefined) {
          this.state.setState({
            liveConnectionActive: 'REFETCH',
          })
        }
      })
      .catch(error => {
        // catch error but do nothing with it
      })
  }

  getGraph = () => {
    const props = this.props.getStateSnapshot()
    if (props.updatingGraph !== undefined) {
      getGraph(props.ip, props.updatingGraph).then(graph => {
        if (graph === null) {
          this.state.setState({ liveConnectionActive: 'RECONNECT' })
        } else {
          this.state.setState({ graph: graph })
        }
      })
    }
  }

  getUrl = (path: string): string => {
    const props = this.props.getStateSnapshot()
    return getUrl(props.ip, path)
  }

  refetch = () => {
    console.log('Refetching')
    const props = this.props.getStateSnapshot()
    // Get cfg and dsc nodes
    allNodeFetch(this.getUrl(cfgUrl), this.getUrl(dscUrl))
      .then(allNodes => {
        getGraph(props.ip, props.updatingGraph).then(graph => {
          const sortedAllNodes = sortAllNodes(allNodes)
          if (
            sortedAllNodes.cfgMasterNode !== null &&
            sortedAllNodes.cfgComputeNodes !== null &&
            sortedAllNodes.dscMasterNode !== null &&
            sortedAllNodes.dscComputeNodes !== null
          ) {
            this.state.setState({
              cfgMaster: sortedAllNodes.cfgMasterNode,
              cfgNodes: sortedAllNodes.cfgComputeNodes,
              dscMaster: sortedAllNodes.dscMasterNode,
              dscNodes: sortedAllNodes.dscComputeNodes,
              graph: graph === null ? undefined : graph,
            })
            switch (props.preferredConnectionType) {
              case 'WEBSOCKET':
                this.state.setState({
                  liveConnectionActive: 'WEBSOCKET',
                })
                break
              case 'POLL':
                this.state.setState({
                  liveConnectionActive: 'POLLING',
                })
                break
            }
          } else {
            this.state.setState({
              liveConnectionActive: 'RECONNECT',
            })
            return
          }
        })
      })
      .catch(error => {
        // failed to get nodes, starting reconnect
        this.state.setState({
          liveConnectionActive: 'RECONNECT',
        })
        return
      })
    // Get state enums
    getStateData(this.getUrl(stateOptionsUrl)).then(nodeStateOptions => {
      if (nodeStateOptions !== null) {
        this.state.setState({
          nodeStateOptions: nodeStateOptions,
        })
      }
    })
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
    const props = this.props.getStateSnapshot()

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
            subscribe(this.websocket, connectedCallBack)
          } else {
            console.warn('Websocket is somehow undefined')
            this.state.setState({
              liveConnectionActive: 'RECONNECT',
            })
          }
        }

        this.websocket.onmessage = message => {
          const jsonMessage = JSON.parse(message.data)
          // console.log('websocket received this message:', jsonMessage)
          if (jsonMessage !== null) {
            const state = this.state.getStateSnapshot()
            handleWebSocketMessage(
              jsonMessage,
              state.cfgNodes,
              state.dscNodes,
              props.updatingGraph,
              this.getGraph,
              liveConnectionType => {
                this.state.setState({ liveConnectionActive: liveConnectionType })
              },
              (cfgNodes, dscNodes) => {
                this.state.setState({ cfgNodes: cfgNodes, dscNodes: dscNodes })
              }
            )
          }
        }

        this.websocket.onclose = ev => {
          console.warn('Websocket closed unexpectedly', ev)
          this.state.setState({
            liveConnectionActive: 'RECONNECT',
          })
        }
      })
      .catch((reason: Error) => {
        if (reason.message === 'The operation is insecure.') {
          console.warn('Could not establish a websocket connection:', reason)
          this.state.setState({
            liveConnectionActive: 'RECONNECT',
          })
          return
        }
        console.warn('Could not establish a websocket connection. Falling back to polling mode. Error:', reason)
        props.setPreferredConnectionType('POLL')
      })
  }
}
