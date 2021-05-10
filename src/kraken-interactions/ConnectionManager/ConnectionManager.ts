// import { Component, useState, useEffect, useRef, useCallback } from 'react'
import { cfgUrl, dscUrl, graphUrlSingle, stateOptionsUrl, webSocketUrl } from '../../config'
import { ConnectionType, getUrl, LiveConnectionType } from './connection'
import { allNodeFetch, cfgNodeFetch, Node } from '../node'
import { getStateData, NodeStateCategory } from '../nodeStateOptions'
import { Graph } from '../graph'
import { fetchJsonFromUrl } from '../fetch'
import { getGraph, pollingFunction } from './pollingFunctions'
import { handleWebSocketMessage, subscribe } from './websocketFunctions'
import { WorkerConfig } from '../../worker/worker'
import { isEqual, cloneDeep } from 'lodash'
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
  // setState: React.Dispatch<React.SetStateAction<ConnectionManagerState>>
  // props:
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
        console.log('nodes changed, sending new data')
        const props = this.props.getStateSnapshot()
        props.newData(this.state.getStateSnapshot())
      })
    // if (
    //   this.state.cfgMaster !== prevState.cfgMaster ||
    //   this.state.cfgNodes !== prevState.cfgNodes ||
    //   this.state.dscMaster !== prevState.dscMaster ||
    //   this.state.dscNodes !== prevState.dscNodes
    // ) {
    //   this.props.newData
    // }

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

    // If the websocket checkbox has changed
    // if (this.props.preferredConnectionType !== prevProps.preferredConnectionType) {
    //   if (this.state.liveConnectionActive !== 'RECONNECT') {
    //     switch (this.props.preferredConnectionType) {
    //       case 'WEBSOCKET':
    //         this.setState({ liveConnectionActive: 'WEBSOCKET' })
    //         break
    //       case 'POLL':
    //         this.setState({ liveConnectionActive: 'POLLING' })
    //         break
    //     }
    //   }
    // }

    this.props.select('updatingGraph').subscribe(ug => {
      console.log('updating graph changed: ', ug)
      if (ug !== undefined) {
        this.getGraph()
      }
    })

    // // If we just started updating the graph, get the graph
    // if (this.props.updatingGraph !== prevProps.updatingGraph && this.props.updatingGraph !== undefined) {
    //   this.getGraph()
    // }

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

    // // If refresh rate has changed, restart the live connection
    // if (this.props.refreshRate !== prevProps.refreshRate) {
    //   switch (this.state.liveConnectionActive) {
    //     case 'POLLING':
    //       this.stopPolling()
    //       this.startPolling()
    //       break
    //     case 'RECONNECT':
    //       this.stopReconnect()
    //       this.startReconnect()
    //       break
    //   }
    // }

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

    // If ip has changed, delete everything and restart
    // if (this.props.ip !== prevProps.ip) {
    //   this.setState({
    //     cfgMaster: {},
    //     cfgNodes: new Map(),
    //     dscMaster: {},
    //     dscNodes: new Map(),
    //     liveConnectionActive: 'REFETCH',
    //     graph: undefined,
    //   })
    //   return
    // }

    this.state.select('liveConnectionActive').subscribe(lca => {
      const state = this.state.getStateSnapshot()
      // stop old connection
      this.stopPolling()
      if (state.liveConnectionActive !== 'REFETCH') {
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

    // if (prevState.liveConnectionActive !== this.state.liveConnectionActive) {
    //   // Stop polling or close websocket
    //   switch (prevState.liveConnectionActive) {
    //     case 'POLLING':
    //       this.stopPolling()
    //       break
    //     case 'WEBSOCKET':
    //       if (this.state.liveConnectionActive !== 'REFETCH') {
    //         this.stopWebSocket()
    //       }
    //       break
    //     case 'RECONNECT':
    //       this.stopReconnect()
    //       break
    //   }

    //   // Start new live connection
    //   switch (this.state.liveConnectionActive) {
    //     case 'POLLING':
    //       this.startPolling()
    //       break
    //     case 'WEBSOCKET':
    //       this.startWebSocket(this.refetch)
    //       break
    //     case 'RECONNECT':
    //       this.startReconnect()
    //       break
    //     case 'REFETCH':
    //       this.refetch()
    //       break
    //   }
    // }
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
          if (
            allNodes.cfgMasterNode !== null &&
            allNodes.cfgComputeNodes !== null &&
            allNodes.dscMasterNode !== null &&
            allNodes.dscComputeNodes
          ) {
            this.state.setState({
              cfgMaster: allNodes.cfgMasterNode,
              cfgNodes: allNodes.cfgComputeNodes,
              dscMaster: allNodes.dscMasterNode,
              dscNodes: allNodes.dscComputeNodes,
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
    cfgNodeFetch(this.getUrl(cfgUrl)).then(cfgNodes => {
      if (cfgNodes.masterNode !== null && cfgNodes.computeNodes !== null && cfgNodes.masterNode.id !== undefined) {
        this.state.setState({
          liveConnectionActive: 'REFETCH',
        })
      }
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
    allNodeFetch(this.getUrl(cfgUrl), this.getUrl(dscUrl)).then(allNodes => {
      getGraph(props.ip, props.updatingGraph).then(graph => {
        if (
          allNodes.cfgMasterNode !== null &&
          allNodes.cfgComputeNodes !== null &&
          allNodes.dscMasterNode !== null &&
          allNodes.dscComputeNodes !== null
        ) {
          this.state.setState({
            cfgMaster: allNodes.cfgMasterNode,
            cfgNodes: allNodes.cfgComputeNodes,
            dscMaster: allNodes.dscMasterNode,
            dscNodes: allNodes.dscComputeNodes,
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
