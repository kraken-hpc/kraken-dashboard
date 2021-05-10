import React, { Component, createRef, CSSProperties, RefObject } from 'react'
import { Network, Options, Color, DataSetNodes, DataSetEdges, Node } from 'vis-network'
import { DataSet } from 'vis-data'
import { Graph } from '../../kraken-interactions/graph'
import { COLORS } from '../../config'
import { CloseButtonStyle, GraphAreaStyle, GraphSettingsStyle, NodeGraphStyle } from './styles/nodegraphstyles'
import { cloneDeep } from 'lodash'

interface NodeGraphProps {
  disconnected: boolean
  graphToggle: () => void
  graph: Graph
}

interface NodeGraphState {
  settingsMenu: boolean
}

interface Data {
  nodes: DataSetNodes
  edges: DataSetEdges
}

export class NodeGraph extends Component<NodeGraphProps, NodeGraphState> {
  graphRef: RefObject<any>
  configRef: RefObject<any>
  network: Network | undefined
  data: Data
  options: Options

  constructor(props: NodeGraphProps) {
    super(props)

    this.graphRef = createRef()
    this.configRef = createRef()
    this.network = undefined

    const nodes = props.graph.nodes

    // Add highlight color to nodes
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].color !== undefined) {
        const color = nodes[i].color as Color
        const highlight = {
          border: color.border,
          background: color.background,
        }
        color.highlight = highlight
        nodes[i].color = color
      }
      nodes[i].borderWidth = 2
    }

    this.data = {
      nodes: new DataSet(nodes),
      edges: new DataSet(this.props.graph.edges),
    }

    this.options = {
      edges: {
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 1.5,
          },
        },
        color: {
          inherit: false,
        },
        width: 4,
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -50000,
        },
      },
      height: '100%',
      width: '100%',
    }

    this.state = {
      settingsMenu: false,
    }
  }

  componentDidMount() {
    this.options.configure = {
      filter: (option: any, path: any) => {
        if (path.indexOf('physics') !== -1) {
          return true
        }
        if (path.indexOf('smooth') !== -1 || option === 'smooth') {
          return true
        }
        return false
      },
      container: this.configRef.current,
    }

    this.network = new Network(this.graphRef.current, this.data, this.options)
  }

  componentDidUpdate(prevProps: NodeGraphProps, prevState: NodeGraphState) {
    // if we reconnected, reset the graph so it doesn't make a duplicate
    // The graph freezes if you don't close out the graph viewer on restart. I have no idea why
    if (prevProps.disconnected === true && this.props.disconnected !== true && this.network) {
      const nodes = this.highlightNodes(cloneDeep(this.props.graph.nodes))

      const newData: Data = {
        nodes: new DataSet(nodes),
        edges: new DataSet(this.props.graph.edges),
      }

      this.network.setData(newData)
      this.props.graphToggle()
      return
    }

    if (this.props.graph !== prevProps.graph) {
      const nodes = this.highlightNodes(cloneDeep(this.props.graph.nodes))

      this.data.nodes.update(nodes)
      this.data.edges.update(this.props.graph.edges)
    }
  }

  // Add highlight color to nodes
  highlightNodes = (nodes: Node[]): Node[] => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].color !== undefined) {
        const color = nodes[i].color as Color
        const highlight = {
          border: color.border,
          background: color.background,
        }
        color.highlight = highlight
        nodes[i].color = color
      }
      nodes[i].borderWidth = 2
    }
    return nodes
  }

  toggleSettings = () => {
    this.setState({
      settingsMenu: !this.state.settingsMenu,
    })
  }

  render() {
    const settingsStyle: CSSProperties = {
      width: this.state.settingsMenu ? '20%' : '0px',
      visibility: this.state.settingsMenu ? 'visible' : 'hidden',
    }
    return (
      <div style={GraphAreaStyle}>
        <div
          style={CloseButtonStyle}
          onClick={() => {
            this.props.graphToggle()
          }}>
          <svg xmlns='http://www.w3.org/2000/svg' width='25' height='25' viewBox='0 0 24 24'>
            <path fill='None' d='M0 0h24v24H0V0z' />
            <path
              fill={COLORS.grey}
              d='M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z'
            />
          </svg>
        </div>
        <button style={{ position: 'absolute', top: 5, zIndex: 10, left: 25 }} onClick={this.toggleSettings}>
          settings
        </button>
        <div style={{ ...GraphSettingsStyle, ...settingsStyle }} ref={this.configRef} />
        <div style={NodeGraphStyle} ref={this.graphRef} />
      </div>
    )
  }
}
