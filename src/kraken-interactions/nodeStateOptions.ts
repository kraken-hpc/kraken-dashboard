import { fetchJsonFromUrl } from './fetch'
import { stateOptionsUrl } from '../config'

export interface NodeStateCategory {
  name: string
  options: string[]
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
  stateData.forEach((element: NodeStateCategory) => {
    element.options.sort()
    if (element.name === 'PhysState') {
      const index = element.options.indexOf('POWER_ON')
      if (index > -1) {
        element.options.splice(index, 1)
        element.options.unshift('POWER_ON')
      }
    }
    if (element.name === 'RunState') {
      const index = element.options.indexOf('SYNC')
      if (index > -1) {
        element.options.splice(index, 1)
        element.options.unshift('SYNC')
      }
    }
    nodeStateOptions.push(element)
  })
  return nodeStateOptions
}
