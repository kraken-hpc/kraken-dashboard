import React, { Component, createRef, RefObject } from 'react'
import vis from 'vis-network'
import { Graph } from '../../kraken-interactions/graph'
import { COLORS } from '../../config'
import CSS from 'csstype'

interface NodeGraphProps {
  graphToggle: () => void
  graph: Graph
}

interface NodeGraphState {
  data: any
  options: any
}

export class NodeGraph extends Component<NodeGraphProps, NodeGraphState> {
  appRef: RefObject<any> | undefined = undefined

  constructor(props: NodeGraphProps) {
    super(props)

    this.appRef = createRef()

    const nodes = props.graph.nodes

    // Add highlight color to nodes
    for (let i = 0; i < nodes.length; i++) {
      const highlight = {
        border: nodes[i].color.border,
        background: nodes[i].color.background,
      }
      nodes[i].color.highlight = highlight
      nodes[i].borderWidth = 2
    }

    const data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(props.graph.edges),
    }

    const options = {
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
      data: data,
      options: options,
    }
  }

  componentDidMount() {
    if (this.appRef !== undefined) {
      const network = new vis.Network(this.appRef.current, this.state.data, this.state.options)
      network.fit(this.state.options)
    }
  }

  componentDidUpdate(prevProps: NodeGraphProps) {
    if (this.props.graph !== prevProps.graph) {
      const data = this.state.data
      const nodes = this.props.graph.nodes

      // Add highlight color to nodes
      for (let i = 0; i < nodes.length; i++) {
        const highlight = {
          border: nodes[i].color.border,
          background: nodes[i].color.background,
        }
        nodes[i].color.highlight = highlight
        nodes[i].borderWidth = 2
      }

      data.nodes.update(nodes)
      data.edges.update(this.props.graph.edges)
      this.forceUpdate()
    }
  }

  render() {
    return (
      <div className={`graph-area`}>
        <div
          className='close-button'
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
        <div className={`node-graph`} ref={this.appRef} />
        {/* <div
          ref={this.configRef} /> */}
      </div>
    )
  }
}
