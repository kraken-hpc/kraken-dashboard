import { fetchNodeListFromUrl, fetchAllNodesFromUrls } from './fetch'
import { COLORS } from '../config'
import { cloneDeep, orderBy } from 'lodash'
import { NodeArea, NodeColorInfo, NodeColorInfoArea } from '../components/settings/NodeColor'

export type KrakenPhysState = 'PHYS_ERROR' | 'POWER_CYCLE' | 'PHYS_HANG' | 'POWER_OFF' | 'PHYS_UNKNOWN' | 'POWER_ON'

export type KrakenRunState = 'ERROR' | 'UNKNOWN' | 'INIT' | 'SYNC'

export type DSCorCFG = 'DSC' | 'CFG'

export interface Node {
  id?: string
  parentId?: string
  nodename?: string
  arch?: string
  platform?: string
  physState?: KrakenPhysState
  runState?: KrakenRunState
  extensions?: any[]
  services?: any[]
}

export interface WsMessage {
  nodeid: string
  url: string
  type: number
  value: string
  data: string
}

export interface AllNodes {
  cfgMasterNode: Node | null
  cfgComputeNodes: Map<string, Node> | null
  dscMasterNode: Node | null
  dscComputeNodes: Map<string, Node> | null
}

export const cfgNodeFetch = async (
  url: string
): Promise<{
  masterNode: Node | null
  computeNodes: Map<string, Node> | null
}> => {
  let nodes: Map<string, Node> = new Map()
  let masterNode: Node = {}

  const inputNodes = await fetchNodeListFromUrl(url)

  if (inputNodes === null) {
    return { masterNode: null, computeNodes: null }
  } else {
    // Remove master node from list of nodes
    for (let i = 0; i < inputNodes.length; i++) {
      if (inputNodes[i].parentId === null || inputNodes[i].parentId === undefined) {
        masterNode = inputNodes[i]
        sortNodeArrays(masterNode)
      } else {
        const id = inputNodes[i].id
        sortNodeArrays(inputNodes[i])
        if (id !== undefined) {
          nodes.set(id, inputNodes[i])
        }
      }
    }
  }

  return {
    masterNode: masterNode,
    computeNodes: nodes,
  }
}

export const dscNodeFetch = async (
  url: string,
  cfgMasterId: string
): Promise<{
  masterNode: Node | null
  computeNodes: Map<string, Node> | null
}> => {
  let nodes: Map<string, Node> = new Map()
  let masterNode: Node = {}

  const inputNodes = await fetchNodeListFromUrl(url)

  if (inputNodes === null) {
    return { masterNode: null, computeNodes: null }
  } else {
    for (let i = 0; i < inputNodes.length; i++) {
      if (inputNodes[i].id === cfgMasterId) {
        masterNode = inputNodes[i]
        sortNodeArrays(masterNode)
      } else {
        const id = inputNodes[i].id
        sortNodeArrays(inputNodes[i])
        if (id !== undefined) {
          nodes.set(id, inputNodes[i])
        }
      }
    }
  }

  return {
    masterNode: masterNode,
    computeNodes: nodes,
  }
}

export const allNodeFetch = async (cfgUrl: string, dscUrl: string): Promise<AllNodes> => {
  const allNodes = await fetchAllNodesFromUrls(cfgUrl, dscUrl)
  if (allNodes !== null) {
    const inputCfgNodes = allNodes[0]
    const inputDscNodes = allNodes[1]
    let cfgMasterNode: Node = {}
    let dscMasterNode: Node = {}

    let cfgNodes: Map<string, Node> = new Map()
    let dscNodes: Map<string, Node> = new Map()

    // CFG nodes first
    // Remove master node from list of nodes
    for (let i = 0; i < inputCfgNodes.length; i++) {
      if (inputCfgNodes[i].parentId === null || inputCfgNodes[i].parentId === undefined) {
        cfgMasterNode = inputCfgNodes[i]
        sortNodeArrays(cfgMasterNode)
      } else {
        const id = inputCfgNodes[i].id
        sortNodeArrays(inputCfgNodes[i])
        if (id !== undefined) {
          cfgNodes.set(id, inputCfgNodes[i])
        }
      }
    }

    // Now DSC nodes
    for (let i = 0; i < inputDscNodes.length; i++) {
      if (inputDscNodes[i].id === cfgMasterNode.id) {
        dscMasterNode = inputDscNodes[i]
        sortNodeArrays(dscMasterNode)
      } else {
        const id = inputDscNodes[i].id
        sortNodeArrays(inputDscNodes[i])
        if (id !== undefined) {
          dscNodes.set(id, inputDscNodes[i])
        }
      }
    }

    return {
      cfgMasterNode: cfgMasterNode,
      cfgComputeNodes: cfgNodes,
      dscMasterNode: dscMasterNode,
      dscComputeNodes: dscNodes,
    }
  } else {
    return { cfgMasterNode: null, cfgComputeNodes: null, dscMasterNode: null, dscComputeNodes: null }
  }
}

// nodeSort sorts nodes by nodename
export const nodeSort = (a: Node, b: Node): number => {
  if (a.nodename === undefined && b.nodename === undefined) {
    return 0
  } else if (a.nodename === undefined) {
    return -1
  } else if (b.nodename === undefined) {
    return 1
  } else {
    const aMatch = a.nodename.match(/(\d*)/g)
    const bMatch = b.nodename.match(/(\d*)/g)

    let aCluster: number | undefined = undefined
    let aNode: number | undefined = undefined
    let bCluster: number | undefined = undefined
    let bNode: number | undefined = undefined

    if (aMatch !== null) {
      aCluster = parseInt(aMatch[1])
      aNode = parseInt(aMatch[3])
    }
    if (bMatch !== null) {
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

    return a.nodename.localeCompare(b.nodename)
  }
}

// Takes in a kraken state and returns a color for it
export const stateToColor = (state: KrakenPhysState | KrakenRunState | undefined): string => {
  if (state === 'PHYS_ERROR' || state === 'ERROR' || state === 'POWER_CYCLE') {
    return COLORS.red
  } else if (state === 'PHYS_HANG') {
    return COLORS.purple
  } else if (state === 'POWER_OFF') {
    return COLORS.grey
  } else if (state === 'PHYS_UNKNOWN' || state === 'UNKNOWN') {
    return COLORS.yellow
  } else if (state === 'INIT') {
    return COLORS.blue
  } else if (state === 'SYNC' || state === 'POWER_ON') {
    return COLORS.green
  } else {
    return COLORS.yellow
  }
}

export const getColorsForArea = (cfg: Node, dsc: Node, colorInfo: NodeColorInfo | undefined): Map<NodeArea, string> => {
  const colorMap: Map<NodeArea, string> = new Map()

  colorMap.set('TOP', stateToColor(dsc.physState))
  colorMap.set('RIGHT', stateToColor(dsc.runState))
  colorMap.set('BOTTOM', stateToColor(dsc.runState))
  colorMap.set('LEFT', stateToColor(dsc.physState))
  colorMap.set('BORDER', stateToColor(dsc.physState))

  if (colorInfo !== undefined) {
    Object.entries(colorInfo).forEach(([nodeAreaName, info]) => {
      const newAreaName = nodeAreaName as NodeArea
      const newInfo = info as NodeColorInfoArea
      if (newInfo.category === 'PhysState') {
        newInfo.valuesToColor.forEach((valueToColor, valueToColorKey) => {
          if (newInfo.DSCorCFG === 'CFG') {
            if (valueToColorKey === cfg.physState) {
              colorMap.set(newAreaName, valueToColor.color)
            } else if (dsc.runState === undefined) {
              let color = COLORS.black
              newInfo.valuesToColor.forEach(value => {
                if (value.enum === 0) {
                  color = value.color
                }
              })
              colorMap.set(newAreaName, color)
            }
          } else {
            if (valueToColorKey === dsc.physState) {
              colorMap.set(newAreaName, valueToColor.color)
            } else if (dsc.runState === undefined) {
              let color = COLORS.black
              newInfo.valuesToColor.forEach(value => {
                if (value.enum === 0) {
                  color = value.color
                }
              })
              colorMap.set(newAreaName, color)
            }
          }
        })
      } else if (newInfo.category === 'RunState') {
        newInfo.valuesToColor.forEach((valueToColor, valueToColorKey) => {
          if (newInfo.DSCorCFG === 'CFG') {
            if (valueToColorKey === cfg.runState) {
              colorMap.set(newAreaName, valueToColor.color)
            } else if (dsc.runState === undefined) {
              let color = COLORS.black
              newInfo.valuesToColor.forEach(value => {
                if (value.enum === 0) {
                  color = value.color
                }
              })
              colorMap.set(newAreaName, color)
            }
          } else {
            if (valueToColorKey === dsc.runState) {
              colorMap.set(newAreaName, valueToColor.color)
            } else if (dsc.runState === undefined) {
              let color = COLORS.black
              newInfo.valuesToColor.forEach(value => {
                if (value.enum === 0) {
                  color = value.color
                }
              })
              colorMap.set(newAreaName, color)
            }
          }
        })
      } else {
        if (newInfo.DSCorCFG === 'CFG') {
          if (cfg.extensions !== undefined) {
            cfg.extensions.forEach(extension => {
              const urlLevels = getStateUrlLevels(stripProtoUrl(newInfo.category))
              if (stripProtoUrl(extension['@type']) === urlLevels[0]) {
                const value = getNestedValue(extension, 0, urlLevels)
                if (value !== undefined) {
                  newInfo.valuesToColor.forEach((valueToColor, valueToColorKey) => {
                    if (valueToColorKey === value) {
                      colorMap.set(newAreaName, valueToColor.color)
                    }
                  })
                } else {
                  let color = COLORS.black
                  newInfo.valuesToColor.forEach(value => {
                    if (value.enum === 0) {
                      color = value.color
                    }
                  })
                  colorMap.set(newAreaName, color)
                }
              }
            })
          }
        } else {
          if (dsc.extensions !== undefined) {
            dsc.extensions.forEach(extension => {
              const urlLevels = getStateUrlLevels(stripProtoUrl(newInfo.category))
              if (stripProtoUrl(extension['@type']) === urlLevels[0]) {
                const value = getNestedValue(extension, 0, urlLevels)
                if (value !== undefined) {
                  newInfo.valuesToColor.forEach((valueToColor, valueToColorKey) => {
                    if (valueToColorKey === value) {
                      colorMap.set(newAreaName, valueToColor.color)
                    }
                  })
                } else {
                  let color = COLORS.black
                  newInfo.valuesToColor.forEach(value => {
                    if (value.enum === 0) {
                      color = value.color
                    }
                  })
                  colorMap.set(newAreaName, color)
                }
              }
            })
          }
        }
      }
    })
  }

  return colorMap
}

export const updateFromWsMessage = (node: Node, jsonMessage: WsMessage): Node | undefined => {
  if (node.id !== undefined) {
    if (jsonMessage.nodeid !== node.id) {
      console.error('node id does not match', jsonMessage.nodeid.toUpperCase(), node.id.toUpperCase())
      return undefined
    }
  } else {
    console.error('node id is undefined')
    return undefined
  }

  return setValueFromUrl(jsonMessage.url, node, jsonMessage.value)
}

const getNestedValue = (dictionary: any, level: number, arrayOfKeys: string[]): string | undefined => {
  if (level === arrayOfKeys.length) {
    return undefined
  }
  const returnValue = dictionary[arrayOfKeys[level].toLowerCase()]
  if (returnValue === undefined) {
    return getNestedValue(dictionary, level + 1, arrayOfKeys)
  } else {
    return returnValue
  }
}

const setNestedValue = (dictionary: any, level: number, arrayOfKeys: string[], value: any): any => {
  if (level === arrayOfKeys.length) {
    return undefined
  }
  if (level === arrayOfKeys.length - 1) {
    dictionary[arrayOfKeys[level].toLowerCase()] = value
    return dictionary
  } else {
    const returnValue = dictionary[arrayOfKeys[level].toLowerCase()]
    if (returnValue === undefined) {
      return returnValue
    } else {
      return getNestedValue(returnValue, level + 1, arrayOfKeys)
    }
  }
}

const setValueFromUrl = (url: string, node: Node, value: any): Node | undefined => {
  let updatedNode = false
  let levels = getStateUrlLevels(url)
  if (levels[0].includes('type.googleapis.com')) {
    const extName = levels[0] + '/' + levels[1]
    levels = levels.slice(2, levels.length)
    if (node.extensions !== undefined) {
      node.extensions.forEach(extension => {
        if (extension['@type'] === extName) {
          const newExtension = setNestedValue(extension, 0, levels, value)
          if (newExtension !== undefined) {
            extension = newExtension
            updatedNode = true
            return node
          }
        }
      })
    }
  }
  if (updatedNode) {
    return node
  } else {
    return undefined
  }
}

// Takes in a base64 number and converts it to hex
// const base64toHEX = (base64: string): string => {
//   const raw = atob(base64)
//   let HEX = ''
//   for (let i = 0; i < raw.length; i++) {
//     const _hex = raw.charCodeAt(i).toString(16)
//     HEX += _hex.length === 2 ? _hex : '0' + _hex
//   }
//   return HEX.toUpperCase()
// }

// // Takes in a hex string and converts it to base64
// const HEXtoBase64 = (hex: string): string => {
//   const hexArray = hex.match(/.{1,2}/g)
//   let raw = ''
//   if (hexArray !== null) {
//     for (let i = 0; i < hexArray.length; i++) {
//       raw = raw + String.fromCharCode(parseInt(hexArray[i], 16))
//     }
//   }
//   return btoa(raw)
// }

// // Takes in a base64 number and converts it to an ip address string
// const base64ToIP = (base64: string): string => {
//   let raw = ''
//   try {
//     raw = atob(base64)
//   } catch (error) {
//     return base64
//   }
//   let DEC = ''
//   for (let i = 0; i < raw.length; i++) {
//     const _dec = raw.charCodeAt(i).toString(10)
//     DEC += i === 0 ? _dec : '.' + _dec
//   }
//   return DEC
// }

// // Takes in a base64 string and converts it to a uuid string
// export const base64ToUuid = (base64: string | undefined): string => {
//   if (base64 !== undefined) {
//     let result = base64toHEX(base64)
//     result = result.replace(/(.{8})(.{4})(.{4})(.{4})(.{10})/, '$1-$2-$3-$4-$5')
//     return result
//   } else {
//     return ''
//   }
// }

// // Takes in a uuid string and converts it to a base64 string
// export const uuidToBase64 = (uuid: string): string => {
//   const noDash = uuid.replace(/-/g, '')
//   return HEXtoBase64(noDash)
// }

// // Takes in a base64 string and converts it to a mac address string
// const base64ToMac = (base64: string): string => {
//   let result = base64toHEX(base64)
//   result = result.replace(/(.{2})(.{2})(.{2})(.{2})(.{2})(.{2})/, '$1:$2:$3:$4:$5:$6')
//   return result
// }

// // Takes in a key value pair and determines if it needs to be converted to a special formatted string. Used in RecursiveValues()
// export const base64Convert = (key: string, value: string) => {
//   switch (true) {
//     case key.includes('ip'):
//       return base64ToIP(value)
//     case key.includes('mac'):
//       return base64ToMac(value)
//     case key.includes('subnet'):
//       return base64ToIP(value)
//     default:
//       return value
//   }
// }

// Strips the leading string of the protobuf urls
export const stripProtoUrl = (url: string) => {
  const stripped = url.replace('type.googleapis.com/', '')
  return stripped.replace('proto.', '')
}

export const getStateUrlLevels = (url: string): string[] => {
  const split = url.split(/[/,_]+/)
  if (split.length > 1 && split[0] === '') {
    split.shift()
  }
  return split
}

// Sends a PUT command to set data for a node (Used for power off and power on)
export const putNode = (url: string, data: Node, callback?: () => void) => {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
    body: JSON.stringify(data),
  })
    .then(res => res.json())
    .then(callback)
    .catch(error => console.error('putNode error:', error))
}

// Powers on a node
export const powerOnNode = (cfgNode: Node, cfgUrl: string) => {
  cfgNode.runState = 'SYNC'
  cfgNode.physState = 'POWER_ON'

  putNode(cfgUrl, cfgNode)
}

// Powers off a node
export const powerOffNode = (cfgNode: Node, dscNode: Node, cfgUrl: string, dscUrl: string) => {
  cfgNode.physState = 'POWER_OFF'
  cfgNode.runState = 'UNKNOWN'
  if (cfgNode.extensions !== undefined) {
    for (let i = 0; i < cfgNode.extensions.length; i++) {
      if (cfgNode.extensions[i]['@type'] === 'type.googleapis.com/proto.PXE') {
        cfgNode.extensions[i]['state'] = 'NONE'
      } else if (cfgNode.extensions[i]['@type'] === 'type.googleapis.com/proto.RPi3') {
        cfgNode.extensions[i]['pxe'] = 'NONE'
      }
    }
  }

  dscNode.runState = 'UNKNOWN'
  if (dscNode.extensions !== undefined) {
    for (let i = 0; i < dscNode.extensions.length; i++) {
      if (dscNode.extensions[i]['@type'] === 'type.googleapis.com/proto.PXE') {
        dscNode.extensions[i]['state'] = 'NONE'
      } else if (dscNode.extensions[i]['@type'] === 'type.googleapis.com/proto.RPi3') {
        dscNode.extensions[i]['pxe'] = 'NONE'
      }
    }
  }

  putNode(dscUrl, dscNode, () => {
    putNode(cfgUrl, cfgNode)
  })
}

export const mergeDSCandCFG = (cfgNode: Node, dscNode: Node): Node => {
  const finalNode: Node = cloneDeep(cfgNode)

  const extensionsMap: Map<string, any> = new Map()
  const servicesMap: Map<string, any> = new Map()

  if (dscNode !== undefined) {
    if (finalNode.extensions !== undefined) {
      for (let i = 0; i < finalNode.extensions.length; i++) {
        extensionsMap.set(finalNode.extensions[i]['@type'], finalNode.extensions[i])
      }

      if (dscNode.extensions !== undefined) {
        for (let i = 0; i < dscNode.extensions.length; i++) {
          const obj = extensionsMap.get(dscNode.extensions[i]['@type'])
          if (obj !== undefined) {
            const merged = { ...obj, ...dscNode.extensions[i] }
            extensionsMap.set(obj['@type'], merged)
          } else {
            extensionsMap.set(dscNode.extensions[i]['@type'], dscNode.extensions[i])
          }
        }
      }
    }

    if (finalNode.services !== undefined) {
      for (let i = 0; i < finalNode.services.length; i++) {
        servicesMap.set(finalNode.services[i]['id'], finalNode.services[i])
      }

      if (dscNode.services !== undefined) {
        for (let i = 0; i < dscNode.services.length; i++) {
          const obj = servicesMap.get(dscNode.services[i]['id'])
          if (obj !== undefined) {
            const merged = { ...obj, ...dscNode.services[i] }
            servicesMap.set(obj['id'], merged)
          } else {
            servicesMap.set(dscNode.services[i]['id'], dscNode.services[i])
          }
        }
      }
    }
  }

  finalNode.physState = dscNode.physState
  finalNode.runState = dscNode.runState
  finalNode.extensions = Array.from(extensionsMap.values())
  finalNode.services = Array.from(servicesMap.values())

  return finalNode
}

export const sortNodeArrays = (node: Node) => {
  if (node.extensions) {
    node.extensions = orderBy(node.extensions, ['@type'], ['asc'])
  }
  if (node.services) {
    node.services.sort()
  }
}
