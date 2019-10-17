export interface Graph {
  nodes: Node[]
  edges: Edge[]
}

interface Node {
  id: string
  label: string
  borderWidth: number
  color: NodeColor
}

interface NodeColor extends Highlight{
  highlight: Highlight
}

interface Highlight{
  background: string
  border: string
}

interface Edge{
  id: string
  to: string
  from: string
  color: EdgeColor
}

interface EdgeColor{
  color: string
  highlight: string
}