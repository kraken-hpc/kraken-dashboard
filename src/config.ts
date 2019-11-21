import { NodeColorInfo } from './components/settings/NodeColor'

export const KRAKEN_IP = '192.168.57.10:3141'
// Polling and Reconnecting refresh rate (time in seconds between pulls)
export const REFRESH = 0.4
// Should websocket be turned on by default?
export const WEBSOCKET = true

export const dscUrl: string = `http://${KRAKEN_IP}/dsc/nodes`
export const cfgUrl: string = `http://${KRAKEN_IP}/cfg/nodes`
export const dscUrlSingle: string = `http://${KRAKEN_IP}/dsc/node`
export const cfgUrlSingle: string = `http://${KRAKEN_IP}/cfg/node`
export const graphUrl: string = `http://${KRAKEN_IP}/graph/json`
export const webSocketUrl: string = `http://${KRAKEN_IP}/ws`
export const stateOptionsUrl: string = `http://${KRAKEN_IP}/enumerables`

export const graphUrlSingle = (uuid: string): string => {
  return `http://${KRAKEN_IP}/graph/node/${uuid}/json`
}

export const COLORS = {
  red: window.getComputedStyle(document.documentElement).getPropertyValue('--red'),
  purple: window.getComputedStyle(document.documentElement).getPropertyValue('--purple'),
  grey: window.getComputedStyle(document.documentElement).getPropertyValue('--grey'),
  yellow: window.getComputedStyle(document.documentElement).getPropertyValue('--yellow'),
  blue: window.getComputedStyle(document.documentElement).getPropertyValue('--blue'),
  green: window.getComputedStyle(document.documentElement).getPropertyValue('--green'),
  black: window.getComputedStyle(document.documentElement).getPropertyValue('--black'),
  titleRed: window.getComputedStyle(document.documentElement).getPropertyValue('--title-red'),
  borderGrey: window.getComputedStyle(document.documentElement).getPropertyValue('--border-grey'),
  lightGrey: window.getComputedStyle(document.documentElement).getPropertyValue('--light-grey'),
}

// First value in values to color will be shown in config page
export const defaultNodeColorInfo: NodeColorInfo = {
  TOP: {
    category: 'PhysState',
    DSCorCFG: 'DSC',
    valuesToColor: [
      { value: 'POWER_ON', color: COLORS.green },
      { value: 'PHYS_UNKNOWN', color: COLORS.yellow },
      { value: 'POWER_OFF', color: COLORS.grey },
      { value: 'POWER_CYCLE', color: COLORS.purple },
      { value: 'PHYS_HANG', color: COLORS.purple },
      { value: 'PHYS_ERROR', color: COLORS.red },
    ],
  },
  RIGHT: {
    category: 'RunState',
    DSCorCFG: 'DSC',
    valuesToColor: [
      { value: 'INIT', color: COLORS.blue },
      { value: 'UNKNOWN', color: COLORS.yellow },
      { value: 'SYNC', color: COLORS.green },
      { value: 'ERROR', color: COLORS.red },
    ],
  },
  LEFT: {
    category: 'PhysState',
    DSCorCFG: 'DSC',
    valuesToColor: [
      { value: 'POWER_ON', color: COLORS.green },
      { value: 'PHYS_UNKNOWN', color: COLORS.yellow },
      { value: 'POWER_OFF', color: COLORS.grey },
      { value: 'POWER_CYCLE', color: COLORS.purple },
      { value: 'PHYS_HANG', color: COLORS.purple },
      { value: 'PHYS_ERROR', color: COLORS.red },
    ],
  },
  BOTTOM: {
    category: 'RunState',
    DSCorCFG: 'DSC',
    valuesToColor: [
      { value: 'INIT', color: COLORS.blue },
      { value: 'UNKNOWN', color: COLORS.yellow },
      { value: 'SYNC', color: COLORS.green },
      { value: 'ERROR', color: COLORS.red },
    ],
  },
  BORDER: {
    category: 'PhysState',
    DSCorCFG: 'DSC',
    valuesToColor: [
      { value: 'POWER_ON', color: COLORS.green },
      { value: 'PHYS_UNKNOWN', color: COLORS.yellow },
      { value: 'POWER_OFF', color: COLORS.grey },
      { value: 'POWER_CYCLE', color: COLORS.purple },
      { value: 'PHYS_HANG', color: COLORS.purple },
      { value: 'PHYS_ERROR', color: COLORS.red },
    ],
  },
}
