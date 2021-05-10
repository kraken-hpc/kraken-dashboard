import { LiveConnectionType } from './connection'
import { cloneDeep } from 'lodash'
import { KrakenPhysState, KrakenRunState, updateFromWsMessage, WsMessage } from '../node'
import { Node } from '../node'

export const subscribe = (websocket: WebSocket, connectedCallBack: () => void) => {
  websocket.send(JSON.stringify({ command: 'SUBSCRIBE', type: 'STATE_CHANGE' }))
  websocket.send(JSON.stringify({ command: 'SUBSCRIBE', type: 'STATE_MUTATION' }))
  websocket.send(JSON.stringify({ command: 'SUBSCRIBE', type: 'DISCOVERY' }))
  connectedCallBack()
}

export const handleWebSocketMessage = (
  jsonData: any,
  cfgNodes: Map<string, Node>,
  dscNodes: Map<string, Node>,
  updatingGraph: string | undefined,
  getGraph: (uuid: string) => void,
  setLiveConnection: (liveConnectionType: LiveConnectionType) => void,
  setNodes: (cfgNodes: Map<string, Node>, dscNodes: Map<string, Node>) => void
) => {
  const newCfgNodes = cloneDeep(cfgNodes)
  const newDscNodes = cloneDeep(dscNodes)
  let dscUpdateHappened = false
  if (jsonData.type === 1) {
    // If it's a creation message, stop the loop and pull cfgNodes and dscNodes
    if (jsonData.data.includes('(CREATE)') || jsonData.data.includes('(CFG_UPDATE')) {
      console.log('Creation or update found. Close websocket and pull dsc and cfg nodes')
      setLiveConnection('REFETCH')
    } else {
      const jsonMessage: WsMessage = jsonData
      // This is a physstate or runstate update
      if (jsonMessage.url === '/PhysState' || jsonMessage.url === '/RunState') {
        const newCfgNode = newCfgNodes.get(jsonMessage.nodeid)
        const newDscNode = newDscNodes.get(jsonMessage.nodeid)
        if (newCfgNode === undefined || newDscNode === undefined) {
          console.log("couldn't find node. Closing websocket and pulling dsc and cfg nodes")
          setLiveConnection('REFETCH')
        } else {
          switch (jsonMessage.url) {
            case '/PhysState':
              newCfgNode.physState = jsonMessage.value as KrakenPhysState
              newDscNode.physState = jsonMessage.value as KrakenPhysState
              if (jsonMessage.value === 'POWER_OFF') {
                newCfgNode.runState = 'UNKNOWN'
                newDscNode.runState = 'UNKNOWN'
              } else if (jsonMessage.value === 'PHYS_HANG') {
                newCfgNode.runState = 'UNKNOWN'
                newDscNode.runState = 'UNKNOWN'
              }
              dscUpdateHappened = true
              break
            case '/RunState':
              if (
                jsonMessage.value !== 'UNKNOWN' &&
                (newCfgNode.physState === 'PHYS_UNKNOWN' ||
                  newCfgNode.physState === 'POWER_OFF' ||
                  newCfgNode.physState === 'PHYS_HANG')
              ) {
                console.log(
                  "Tried to change node's runstate while phystate is unknown. Closing websocket and pulling dsc and cfg nodes"
                )
                setLiveConnection('REFETCH')
                break
              } else {
                newCfgNode.runState = jsonMessage.value as KrakenRunState
                newDscNode.runState = jsonMessage.value as KrakenRunState
                dscUpdateHappened = true
                break
              }
            default:
              break
          }
          dscUpdateHappened = true
        }
      } else if (jsonMessage.url.includes('type.googleapis.com')) {
        // This is an extensions update
        let newCfgNode = newCfgNodes.get(jsonMessage.nodeid)
        let newDscNode = newDscNodes.get(jsonMessage.nodeid)
        if (newCfgNode === undefined || newDscNode === undefined) {
          console.log("couldn't find node. Closing websocket and pulling dsc and cfg nodes")
          setLiveConnection('REFETCH')
        } else {
          const updatedCfgNode = updateFromWsMessage(newCfgNode, jsonMessage)
          if (updatedCfgNode !== undefined) {
            newCfgNode = updatedCfgNode
            dscUpdateHappened = true
          }
          const updatedDscNode = updateFromWsMessage(newDscNode, jsonMessage)
          if (updatedDscNode !== undefined) {
            newDscNode = updatedDscNode
            dscUpdateHappened = true
          }
        }
      }
    }
  } else if (
    updatingGraph !== undefined &&
    (jsonData.type === 2 || jsonData.type === 5) &&
    jsonData.nodeid === updatingGraph.toLowerCase()
  ) {
    getGraph(updatingGraph)
  }
  if (dscUpdateHappened) {
    // console.log('dsc update happened!')
    setNodes(newCfgNodes, newDscNodes)
  }
}
