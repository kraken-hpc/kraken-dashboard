import { ConnectionType } from '../kraken-interactions/ConnectionManager/connection'
import {
  ConnectionManager,
  ConnectionManagerProps,
  ConnectionManagerState,
} from '../kraken-interactions/ConnectionManager/ConnectionManager'
import { SimpleStore } from '../kraken-interactions/ConnectionManager/SimpleStore'

export type WorkerMessageType = 'ERROR' | 'CONFIG' | 'DATA' | 'CONNECTION' | 'START'

export interface WorkerConfig {
  preferredConnectionType: ConnectionType
  ip: string
  refreshRate: number
  updatingGraph: string | undefined
}

export interface WorkerMessage {
  type: WorkerMessageType
  error?: string
  config?: WorkerConfig
  data?: ConnectionManagerState
  connectionType?: ConnectionType
}

// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any

let connectionManager: ConnectionManager | null = null
let connectionManagerProps: SimpleStore<ConnectionManagerProps> | null = null

const receivedNewData = (data: ConnectionManagerState) => {
  const message: WorkerMessage = { type: 'DATA', data: data }
  ctx.postMessage(message)
}

const setPreferredConnectionType = (connectionType: ConnectionType) => {
  const message: WorkerMessage = { type: 'CONNECTION', connectionType: connectionType }
  ctx.postMessage(message)
}

console.log('web worker has started')

ctx.addEventListener('message', messageEvent => {
  // console.log('in webworker', messageEvent.data)
  const message = messageEvent.data as WorkerMessage
  switch (message.type) {
    case 'ERROR':
      break
    case 'CONFIG':
      if (message.config) {
        if (connectionManagerProps) {
          connectionManagerProps.setState(message.config)
        } else {
          const responseMessage: WorkerMessage = { type: 'ERROR', error: 'connection manager props is undefined' }
          ctx.postMessage(responseMessage)
        }
      } else {
        const responseMessage: WorkerMessage = { type: 'ERROR', error: 'message config was undefined' }
        ctx.postMessage(responseMessage)
      }
      break
    case 'DATA':
      break
    case 'START':
      if (message.config !== undefined) {
        const newConnectionManagerProps: ConnectionManagerProps = {
          ...message.config,
          ...{ newData: receivedNewData, setPreferredConnectionType: setPreferredConnectionType },
        }
        connectionManagerProps = new SimpleStore<ConnectionManagerProps>(newConnectionManagerProps)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        connectionManager = new ConnectionManager(connectionManagerProps)
      } else {
        const responseMessage: WorkerMessage = { type: 'ERROR', error: 'start message config was undefined' }
        ctx.postMessage(responseMessage)
      }
      break
  }
})
