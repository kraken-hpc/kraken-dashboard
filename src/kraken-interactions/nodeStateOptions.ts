import { fetchJsonFromUrl } from './fetch'
import { stateOptionsUrl } from '../config'
import { getStateUrlLevels, stripProtoUrl } from './node'

export interface NodeStateCategory {
  name: string
  options: Map<number, string>
  url: string
}

export const getStateData = async (): Promise<NodeStateCategory[] | null> => {
  const stateData = await fetchJsonFromUrl(stateOptionsUrl).catch(error => {
    return null
  })
  if (stateData === null) {
    return null
  }
  const nodeStateOptions: NodeStateCategory[] = []
  stateData.forEach((element: any) => {
    const newCategory: NodeStateCategory = {
      name: element.name,
      url: element.url,
      options: new Map(),
    }
    const finalMap = new Map<number, string>()
    if (element.name === 'PhysState') {
      // Move power_on to top of map
      Object.entries(element.options).forEach(([key, val]) => {
        if (val === 'POWER_ON') {
          finalMap.set(parseInt(key), val)
        }
      })
      Object.entries(element.options).forEach(([key, val]) => {
        finalMap.set(parseInt(key), val as string)
      })
    } else if (element.name === 'RunState') {
      // Move sync to top of map
      Object.entries(element.options).forEach(([key, val]) => {
        if (val === 'SYNC') {
          finalMap.set(parseInt(key), val)
        }
      })
      Object.entries(element.options).forEach(([key, val]) => {
        finalMap.set(parseInt(key), val as string)
      })
    } else {
      const levels = getStateUrlLevels(newCategory.url)
      newCategory.name = stripProtoUrl(levels[levels.length - 2]) + '/' + element.name
      Object.entries(element.options).forEach(([key, val]) => {
        finalMap.set(parseInt(key), val as string)
      })
    }

    newCategory.options = finalMap
    nodeStateOptions.push(newCategory)
  })
  return nodeStateOptions
}
