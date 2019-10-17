export const KRAKEN_IP = '192.168.57.10:3141'
// export var KRAKEN_IP = '10.15.247.252:3141'
// export var KRAKEN_IP = '127.0.0.1:3141'
export const REFRESH = 0.4
export const WEBSOCKET = true


export const dscUrl:string = `http://${KRAKEN_IP}/dsc/nodes`
export const cfgUrl:string = `http://${KRAKEN_IP}/cfg/nodes`
export const graphUrl:string =  `http://${KRAKEN_IP}/graph/json`
export const webSocketUrl:string = `http://${KRAKEN_IP}/ws`


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
