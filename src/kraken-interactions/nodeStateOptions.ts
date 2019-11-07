import stateData from '../states.json'

export interface NodeStateOptions {
  state_categories: Category[]
}

export interface Category {
  name: string
  options: string[]
  url: string
}

export const getStateData = (): NodeStateOptions => {
  return stateData
}
