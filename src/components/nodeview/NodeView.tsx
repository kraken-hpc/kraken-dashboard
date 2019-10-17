
export interface NodeViewState {
  disconnected: boolean;
  liveConnectionActive: boolean;
  liveReconnect: boolean;
  liveTimeout?: NodeJS.Timeout;
}