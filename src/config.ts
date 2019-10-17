export const KRAKEN_IP = '192.168.57.10:3141'
// Polling and Reconnecting refresh rate (time in seconds between pulls)
export const REFRESH = 0.4
// Should websocket be turned on by default?
export const WEBSOCKET = false


export const dscUrl:string = `http://${KRAKEN_IP}/dsc/nodes`
export const cfgUrl:string = `http://${KRAKEN_IP}/cfg/nodes`
export const dscUrlSingle:string = `http://${KRAKEN_IP}/dsc/node`
export const cfgUrlSingle:string = `http://${KRAKEN_IP}/cfg/node`
export const graphUrl:string =  `http://${KRAKEN_IP}/graph/json`
export const webSocketUrl:string = `http://${KRAKEN_IP}/ws`

export const graphUrlSingle = (uuid: string): string => {
  return `http://${KRAKEN_IP}/graph/node/${uuid}/json`
}

export const COLORS = {
  red: window.getComputedStyle(document.documentElement).getPropertyValue("--red"),
  purple: window.getComputedStyle(document.documentElement).getPropertyValue("--purple"),
  grey: window.getComputedStyle(document.documentElement).getPropertyValue("--grey"),
  yellow: window.getComputedStyle(document.documentElement).getPropertyValue("--yellow"),
  blue: window.getComputedStyle(document.documentElement).getPropertyValue("--blue"),
  green: window.getComputedStyle(document.documentElement).getPropertyValue("--green"),
  black: window.getComputedStyle(document.documentElement).getPropertyValue("--black"),
  titleRed: window.getComputedStyle(document.documentElement).getPropertyValue("--title-red"),
}
