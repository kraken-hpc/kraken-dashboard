import { dscUrl, graphUrlSingle } from '../../config'
import { fetchJsonFromUrl } from '../fetch'
import { Graph } from '../graph'
import { Node, AllNodes, dscNodeFetch } from '../node'
import { LiveConnectionType, getUrl } from './connection'

// When polling is activated this function will be run every refresh rate.
// It pulls the dsc node state and sets that to the final nodes
// If any error happens, liveconnection gets changed to reconnect or refetch
export const pollingFunction = (
  ip: string,
  cfgMaster: Node,
  cfgNodes: Map<string, Node>,
  graphNodeId: string | undefined,
  setLiveConnection: (liveConnectionType: LiveConnectionType) => void,
  setNodes: (allNodes: AllNodes) => void,
  setGraph: (graph: Graph) => void
) => {
  if (cfgMaster.id !== undefined) {
    dscNodeFetch(getUrl(ip, dscUrl), cfgMaster.id).then(dscNodes => {
      if (dscNodes.masterNode !== null && dscNodes.computeNodes !== null) {
        const valErr = validateNodes(cfgMaster, cfgNodes, dscNodes.masterNode, dscNodes.computeNodes)
        if (valErr === null) {
          let graphCallBack = undefined
          if (graphNodeId !== undefined) {
            graphCallBack = () => {
              getGraph(ip, graphNodeId).then(graph => {
                if (graph === null) {
                  setLiveConnection('RECONNECT')
                } else if (graph !== undefined) {
                  setGraph(graph)
                }
              })
            }
          }
          setNodes({
            cfgMasterNode: cfgMaster,
            cfgComputeNodes: cfgNodes,
            dscMasterNode: dscNodes.masterNode,
            dscComputeNodes: dscNodes.computeNodes,
          })
        } else {
          setLiveConnection('REFETCH')
        }
      } else {
        setLiveConnection('RECONNECT')
      }
    })
  } else {
    setLiveConnection('RECONNECT')
  }
}

// Checks if nodelists are the same lenth and that master nodes are defined
export const validateNodes = (
  cfgMaster: Node,
  cfgNodes: Map<string, Node>,
  dscMaster: Node,
  dscNodes: Map<string, Node>
): Error | null => {
  if (cfgMaster.id === undefined) {
    return Error('Missing cfg master')
  }
  if (Object.entries(dscMaster).length === 0) {
    return Error('Missing dsc master')
  }
  if (cfgNodes.size !== dscNodes.size) {
    return Error('cfg and dsc node lists are different sizes')
  }
  cfgNodes.forEach(node => {
    if (node.id !== undefined) {
      const dscNode = dscNodes.get(node.id)
      if (dscNode === undefined) {
        return Error('Could not find a cfg node in dsc node list')
      }
    } else {
      return Error('A compute node id was undefined')
    }
  })
  return null
}

export const getGraph = async (ip: string, uuid: string | undefined): Promise<Graph | null | undefined> => {
  if (uuid) {
    return await fetchJsonFromUrl(getUrl(ip, graphUrlSingle(uuid)))
  } else {
    return null
  }
}
