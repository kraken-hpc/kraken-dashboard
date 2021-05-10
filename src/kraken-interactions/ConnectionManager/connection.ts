export type LiveConnectionType = 'WEBSOCKET' | 'POLLING' | 'RECONNECT' | 'REFETCH'
export type ConnectionType = 'WEBSOCKET' | 'POLL'

export const getUrl = (ip: string, path: string): string => {
  return 'http://' + ip + path
}
