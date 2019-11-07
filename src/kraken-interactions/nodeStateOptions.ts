import stateData from '../states.json'

export interface NodeStateOptions {
  state_categories: NodeStateCategory[]
}

export interface NodeStateCategory {
  name: string
  options: string[]
  url: string
}

export const getStateData = (): NodeStateOptions => {
  return stateData
}
