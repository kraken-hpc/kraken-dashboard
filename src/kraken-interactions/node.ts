import { fetchNodeListFromUrl } from "./fetch";
import { COLORS } from "../config";

export type KrakenState = 'PHYS_ERROR' | 'ERROR' | 'POWER_CYCLE' | 'PHYS_HANG' | 'POWER_OFF' | 'PHYS_UNKNOWN' | 'UNKNOWN' | 'INIT' | 'SYNC' | 'POWER_ON'

export interface Node {
  id?: string;
  parentId?: string;
  nodename?: string;
  arch?: string;
  platform?: string;
  physState?: KrakenState;
  runState?: KrakenState;
  extensions?: any[];
  services?: any[];
}

export const cfgNodeFetch = async (
  url: string
): Promise<{
  masterNode: Node | null;
  computeNodes: Map<string, Node> | null;
}> => {
  let nodes: Map<string, Node> = new Map();
  let masterNode: Node = {};

  const inputNodes = await fetchNodeListFromUrl(url);

  if (inputNodes === null) {
    return { masterNode: null, computeNodes: null };
  } else {
    // Remove master node from list of nodes
    for (var i = 0; i < inputNodes.length; i++) {
      if (
        inputNodes[i].parentId === null ||
        typeof inputNodes[i].parentId === "undefined"
      ) {
        masterNode = inputNodes[i];
      } else {
        const id = inputNodes[i].id;
        if (id !== undefined) {
          nodes.set(id, inputNodes[i]);
        }
      }
    }
  }

  return {
    masterNode: masterNode,
    computeNodes: nodes
  };
};

export const dscNodeFetch = async (
  url: string,
  cfgMasterId: string
): Promise<{
  masterNode: Node | null;
  computeNodes: Map<string, Node> | null;
}> => {
  let nodes: Map<string, Node> = new Map();
  let masterNode: Node = {};

  const inputNodes = await fetchNodeListFromUrl(url);

  if (inputNodes === null) {
    return { masterNode: null, computeNodes: null };
  } else {
    for (var i = 0; i < inputNodes.length; i++) {
      if (inputNodes[i].id === cfgMasterId) {
        masterNode = inputNodes[i];
      } else {
        const id = inputNodes[i].id;
        if (id !== undefined) {
          nodes.set(id, inputNodes[i]);
        }
      }
    }
  }

  return {
    masterNode: masterNode,
    computeNodes: nodes
  };
};

// nodeSort sorts nodes by nodename
export const nodeSort = (a:Node, b: Node): number => {
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

    let aCluster: number | undefined = undefined
    let aNode: number | undefined = undefined
    let bCluster: number | undefined = undefined
    let bNode: number | undefined = undefined

    if (aMatch !== null){
      aCluster = parseInt(aMatch[1])
      aNode = parseInt(aMatch[3])  
    }
    if (bMatch !== null){
      bCluster = parseInt(bMatch[1])
      bNode = parseInt(bMatch[3])  
    }

    if (aCluster !== undefined && bCluster !== undefined && aCluster > bCluster) {
      return 1
    } else if (aCluster !== undefined && bCluster !== undefined && aCluster < bCluster) {
      return -1
    }

    if (aNode !== undefined && bNode !== undefined && aNode > bNode) {
      return 1
    } else if (aNode !== undefined && bNode !== undefined && aNode < bNode) {
      return -1
    }

    // console.log(parseInt(aMatch[1]))
    return a.nodename.localeCompare(b.nodename)
  }
}


// Takes in a kraken state and returns a color for it
export const stateToColor = (state: KrakenState | undefined): string => {
  if (state === "PHYS_ERROR" || state === "ERROR" || state === "POWER_CYCLE") {
    return COLORS.red
  } else if (state === "PHYS_HANG") {
    return COLORS.purple
  } else if (state === "POWER_OFF") {
    return COLORS.grey
  } else if (state === "PHYS_UNKNOWN" || state === "UNKNOWN") {
    return COLORS.yellow
  } else if (state === "INIT") {
    return COLORS.blue
  } else if (state === "SYNC" || state === "POWER_ON") {
    return COLORS.green
  }
  else {
    return COLORS.yellow
  }
}


// Takes in a base64 number and converts it to hex
const base64toHEX = (base64: string): string => {
  var raw = atob(base64)
  var HEX = ''
  for (var i = 0; i < raw.length; i++) {
    var _hex = raw.charCodeAt(i).toString(16)
    HEX += (_hex.length === 2 ? _hex : '0' + _hex)
  }
  return HEX.toUpperCase()
}

// Takes in a hex string and converts it to base64
const HEXtoBase64 = (hex: string): string => {
  var hexArray = hex.match(/.{1,2}/g)
  var raw = ""
  if (hexArray !== null) {
    for (var i = 0; i < hexArray.length; i++) {
      raw = raw + String.fromCharCode(parseInt(hexArray[i], 16))
    }
  }
  return btoa(raw)
}

// Takes in a base64 number and converts it to an ip address string
const base64ToIP = (base64: string): string => {
  var raw = atob(base64)
  var DEC = ''
  for (var i = 0; i < raw.length; i++) {
    var _dec = raw.charCodeAt(i).toString(10)
    DEC += (i === 0 ? _dec : '.' + _dec)
  }
  return DEC
}

// Takes in a base64 string and converts it to a uuid string
export const base64ToUuid = (base64: string | undefined): string => {
  if (base64 !== undefined) {
    var result = base64toHEX(base64)
    result = result.replace(/(.{8})(.{4})(.{4})(.{4})(.{10})/, "$1-$2-$3-$4-$5")
    return result
  } else {
    return ''
  }
}

// Takes in a uuid string and converts it to a base64 string
export const uuidToBase64 = (uuid: string): string => {
  var noDash = uuid.replace(/-/g, '')
  return HEXtoBase64(noDash)
}


// Takes in a base64 string and converts it to a mac address string
const base64ToMac = (base64: string): string => {
  var result = base64toHEX(base64)
  result = result.replace(/(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})/, "$1:$2:$3:$4:$5:$6")
  return result
}

// Takes in a key value pair and determines if it needs to be converted to a special formatted string. Used in RecursiveValues()
const Base64Convert = (key: string, value: string) => {
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
const StripProtoUrl = (url: string) => {
  return url.replace('type.googleapis.com/proto.', '')
}
