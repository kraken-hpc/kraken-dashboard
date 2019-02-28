/* Common.js: Has general functions and variables that are used across the entire project
 *
 * Author: Kevin Pelzel <kpelzel@lanl.gov>
 *
 * This software is open source software available under the BSD-3 license.
 * Copyright (c) 2018, Triad National Security, LLC
 * See LICENSE file for details.
 */

export var GLOBAL_COLORS = {
  yellow: "#f2cf66",
  red: "#e74c3c",
  grey: "#a5a5a5",
  purple: "#6a51ba",
  green: "#89CA78",
  blue: "#509EE8",
  black: "#000000",
  title_red: "#FF6656",
}

export var KRAKEN_IP = '192.168.57.10:3141'
export var REFRESH = 0.4

// Takes in a kraken state and returns a color for it
export function stateToColor(state) {
  if (state === "PHYS_ERROR" | state === "ERROR" | state === "POWER_CYCLE") {
    return GLOBAL_COLORS.red
  } else if (state === "PHYS_HANG") {
    return GLOBAL_COLORS.purple
  } else if (state === "POWER_OFF") {
    return GLOBAL_COLORS.grey
  } else if (state === "PHYS_UNKNOWN" | state === "UNKNOWN") {
    return GLOBAL_COLORS.yellow
  } else if (state === "INIT") {
    return GLOBAL_COLORS.blue
  } else if (state === "SYNC" | state === "POWER_ON") {
    return GLOBAL_COLORS.green
  }
  else {
    return GLOBAL_COLORS.yellow
  }
}

// Takes in a base64 number and converts it to hex
export function base64toHEX(base64) {
  var raw = atob(base64)
  var HEX = ''
  for (var i = 0; i < raw.length; i++) {
    var _hex = raw.charCodeAt(i).toString(16)
    HEX += (_hex.length === 2 ? _hex : '0' + _hex)
  }
  return HEX.toUpperCase()
}

// Takes in a base64 number and converts it to an ip address string
export function base64ToIP(base64) {
  var raw = atob(base64)
  var DEC = ''
  for (var i = 0; i < raw.length; i++) {
    var _dec = raw.charCodeAt(i).toString(10)
    DEC += (i === 0 ? _dec : '.' + _dec)
  }
  return DEC
}

// Takes in a base64 string and converts it to a uuid string
export function base64ToUuid(str) {
  if (typeof str === 'undefined') {
    return ""
  } else {
    var result = base64toHEX(str)
    result = result.replace(/(.{8})(.{4})(.{4})(.{4})(.{10})/, "$1-$2-$3-$4-$5")
    return result
  }
}

// Takes in a base64 string and converts it to a mac address string
export function base64ToMac(str) {
  var result = base64toHEX(str)
  result = result.replace(/(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})/, "$1:$2:$3:$4:$5:$6")
  return result
}

// Takes in a key value pair and determines if it needs to be converted to a special formatted string. Used in RecursiveValues()
export function Base64Convert(key, value) {
  switch (true) {
    case key.includes("ip"):
      return base64ToIP(value)
    case key.includes("mac"):
      return base64ToMac(value)
    case key.includes("subnet"):
      return base64ToIP(value)
    default:
      return value
  }
}

// Strips the leading string of the protobuf urls
export function StripProtoUrl(url) {
  return url.replace('type.googleapis.com/proto.', '')
}

// Fetches a json list of nodes from a url
export function fetchNodeListFromUrl(url) {
  return fetch(url)
    .then((data) => data.json())
    .then((nodes) => nodes.nodes)
    .catch((error) => {
      // console.warn(error)
      return null
    })
}

// Fetches a json object from a url
export function fetchJsonFromUrl(url) {
  return fetch(url)
    .then((data) => data.json())
    .catch((error) => {
      // console.warn(error)
      return null
    })
}

// Fetches raw text from a url
export function fetchTextFromUrl(url) {
  return fetch(url)
    .then((data) => data.text())
    .catch((error) => {
      console.warn(error)
      return null
    })
}

// Sends a PUT command to set data for a node (Used for power off and power on)
export function putNode(url, data) {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
    body: JSON.stringify(data),
  }

  ).then(res => res.json())
    // .then(response => console.log('Success:', JSON.stringify(response)))
    .catch(error => console.error('Error:', error));
}

// Powers off a node
export function powerOffNode(dscNode, cfgNode, dscUrl, cfgUrl) {
  cfgNode.physState = "POWER_OFF"
  cfgNode.runState = "UNKNOWN"
  for (var i = 0; i < cfgNode.extensions.length; i++) {
    if (cfgNode.extensions[i]['@type'] === "type.googleapis.com/proto.PXE") {
      cfgNode.extensions[i]['state'] = "NONE"
    } else if (cfgNode.extensions[i]['@type'] === "type.googleapis.com/proto.RPi3") {
      cfgNode.extensions[i]['pxe'] = "NONE"
    }
  }

  dscNode.runState = "UNKNOWN"
  for (i = 0; i < dscNode.extensions.length; i++) {
    if (dscNode.extensions[i]['@type'] === "type.googleapis.com/proto.PXE") {
      dscNode.extensions[i]['state'] = "NONE"
    } else if (dscNode.extensions[i]['@type'] === "type.googleapis.com/proto.RPi3") {
      dscNode.extensions[i]['pxe'] = "NONE"
    }
  }

  console.log("dsc:", dscNode, "\ncfg:", cfgNode)

  putNode(dscUrl, dscNode)
  putNode(cfgUrl, cfgNode)
}

// Powers on a node
export function powerOnNode(dscNode, cfgNode, dscUrl, cfgUrl) {
  cfgNode.runState = "SYNC"
  cfgNode.physState = "POWER_ON"

  putNode(cfgUrl, cfgNode)
}

// nodeSort sorts nodes by nodename
export function nodeSort(a, b) {
  if (typeof a.nodename === 'undefined' && typeof b.nodename === 'undefined') {
    return 0
  }
  else if (typeof a.nodename === 'undefined') {
    return -1
  }
  else if (typeof b.nodename === 'undefined') {
    return 1
  }
  else {
    var aMatch = a.nodename.match(/(\d*)/g)
    var bMatch = b.nodename.match(/(\d*)/g)

    var aCluster = parseInt(aMatch[1])
    var aNode = parseInt(aMatch[3])
    var bCluster = parseInt(bMatch[1])
    var bNode = parseInt(bMatch[3])

    if (aCluster > bCluster) {
      return 1
    } else if (aCluster < bCluster) {
      return -1
    }

    if (aNode > bNode) {
      return 1
    } else if (aNode < bNode) {
      return -1
    }


    // console.log(parseInt(aMatch[1]))
    return a.nodename.localeCompare(b.nodename)
  }
}

// liveFunction sets and interval to run a function every so many seconds
export function liveFunction(refreshRate, stateName, intervalFunction) {
  if (refreshRate < 0.15) {
    refreshRate = 0.15
  }
  this.stopLive()
  this.interval = setInterval(() => {
    intervalFunction.call(this)
  }, refreshRate * 1000)
  this.setState({
    [stateName]: true,
  })
}

// stopLive clears any intervals set on a component
export function stopLive() {
  if (typeof this.interval !== 'undefined') {
    clearInterval(this.interval)
  }
  this.setState({
    liveUpdate: false,
    liveReconnect: false,
  })
}

