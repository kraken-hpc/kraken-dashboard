import { ClusterState, Cluster } from "../components/dashboard/Cluster"
import { NodeViewState } from "../components/nodeview/NodeView"
import { fetchJsonFromUrl } from "./fetch"
import { webSocketUrl } from "../config"
import { Component } from "react"

export type LiveConnectionType = 'WEBSOCKET' | 'POLLING' | 'RECONNECT'

// export const liveReconnect = (refreshRate: number, reconnectFunction: () => void): { liveTimeout: NodeJS.Timeout, liveReconnect: boolean } => {
//   if (refreshRate < 0.15) {
//     refreshRate = 0.15
//   }
//   const timeout = setInterval(() => {
//     reconnectFunction()
//   }, refreshRate * 1000)
//   return {
//     liveTimeout: timeout,
//     liveReconnect: true,
//   }
// }

// export const stopLiveReconnect = (state: ClusterState | NodeViewState) => {
//   if (typeof state.liveTimeout !== 'undefined') {
//     clearInterval(state.liveTimeout)
//   }
//   return {
//     liveReconnect: false,
//   }
// }

// export const stopLiveConnection = (state: ClusterState | NodeViewState) => {
//   if (typeof state.liveTimeout !== 'undefined') {
//     clearInterval(state.liveTimeout)
//   }
//   return {
//     liveConnectionActive: false,
//   }
// }


// export const startLiveConnection = (state: ClusterState | NodeViewState, liveConnectionType: LiveConnectionType, handleMessageFunction?: () => void, onCloseFunction?: () => {}): { disconnected: boolean, liveConnectionActive: boolean, liveReconnect: boolean, liveTimeout?: NodeJS.Timeout, webSocketManager?: WebSocketManager } => {
//   if (state.liveConnectionActive) {
//     console.warn("Live connection is already active. Refusing to create another.")
//     return {
//       disconnected: state.disconnected,
//       liveConnectionActive: state.liveConnectionActive,
//       liveReconnect: state.liveReconnect,
//       liveTimeout: state.liveTimeout,
//     }
//   }
//   if (liveConnectionType === 'WEBSOCKET') {
//     fetchJsonFromUrl(webSocketUrl).then( (json) =>{
//       const wsurl = `ws://${json.websocket.host}:${json.websocket.port}${json.websocket.url}`
//       const wsm = new WebSocketManager(webSocketUrl, handleMessageFunction, onCloseFunction)
//     })

//     const wsm = startWebsocket()
//   } else if (liveConnectionType === 'POLLING'){
//     return startPolling(state)
//   }
// }

// const startPolling = (state: ClusterState | NodeViewState) => {

// }

// const startWebsocket = (webSocketUrl:string, handleMessageFunction: () => void, onCloseFunction: () => void): WebSocketManager => {
//     return new WebSocketManager(webSocketUrl, handleMessageFunction, onCloseFunction)
// }

// export class WebSocketManager {
//   ws: WebSocket;
//   constructor(webSocketUrl: string, handleMessageFunction: (jsonMessage: any) => void, onCloseFunction: () => void) {
//     this.ws = new WebSocket(webSocketUrl)
//     this.ws.onopen = () => {
//       console.log('WebSocket Connected');
//       this.ws.send(JSON.stringify({command: "SUBSCRIBE", type: 1})) // Subscribe to state_change events
//       this.ws.send(JSON.stringify({command: "SUBSCRIBE", type: 2})) // Subscribe to mututation events
//       this.ws.send(JSON.stringify({command: "SUBSCRIBE", type: 5})) // Subscribe to discovery events
//     }
//     this.ws.onmessage = (message) => {
//       var jsonMessage = JSON.parse(message.data)
//       console.log("received this message:", jsonMessage)
//       if (jsonMessage !== null){
//         handleMessageFunction(jsonMessage)
//         // handleMessageFunction.call(this, jsonMessage)
//       }
//     }
//     this.ws.onclose = onCloseFunction
//   }
// }