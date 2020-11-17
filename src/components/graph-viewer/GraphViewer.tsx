import React, { Component, createRef, RefObject } from 'react'
import { Network, Options, Data } from 'vis-network'
import _ from 'lodash'

interface GraphViewerProps {}
interface GraphViewerState {
  inputText: string
  data: Data
  options: Options
  settingsMenuOpen: boolean
}

export default class GraphViewer extends Component<GraphViewerProps, GraphViewerState> {
  graphRef: RefObject<any> = createRef()
  configRef: RefObject<any> = createRef()
  network: Network | undefined = undefined

  constructor(props: GraphViewerProps) {
    super(props)

    const data: Data = {
      nodes: [],
      edges: [],
    }

    const options: Options = {
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
      settingsMenuOpen: false,
      inputText: '',
    }
  }

  componentDidMount = () => {
    console.log(this.graphRef.current)

    const options = _.cloneDeep(this.state.options)

    options.configure = {
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

    this.setState(
      {
        options: options,
      },
      () => {
        this.network = new Network(this.graphRef.current, this.state.data, this.state.options)

        console.log(this.network)
      }
    )
  }

  componentDidUpdate = (prevProps: GraphViewerProps, prevState: GraphViewerState) => {
    if (prevState.inputText !== this.state.inputText) {
      this.updateGraph()
    }
    if (prevState.data !== this.state.data && this.network !== undefined) {
      this.network.setData(this.state.data)
    }
    if (prevState.options !== this.state.options && this.network !== undefined) {
      this.network.setOptions(this.state.options)
    }
  }

  updateGraph = () => {
    var json
    try {
      json = JSON.parse(this.state.inputText)
    } catch (error) {}
    console.log(json)
    if (json !== undefined && json.hasOwnProperty('nodes') && json.hasOwnProperty('edges')) {
      this.setState({
        data: {
          nodes: json.nodes,
          edges: json.edges,
        },
      })
    } else {
      this.setState({
        data: {
          nodes: [],
          edges: [],
        },
      })
    }
  }

  render = () => {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          // flexDirection: "column",
        }}>
        <textarea
          style={{
            flexGrow: 1,
            resize: 'horizontal',
            overflow: 'auto',
            whiteSpace: 'nowrap',
          }}
          placeholder={'Graph JSON Here'}
          value={this.state.inputText}
          onChange={e => {
            console.log('text changed!')
            let text = e.target.value
            try {
              const json = JSON.parse(text)
              text = JSON.stringify(json, undefined, 4)
            } catch (error) {}
            this.setState({
              inputText: text,
            })
          }}
        />
        <div
          ref={this.configRef}
          style={{
            flexGrow: 1,
            display: 'none',
          }}
        />
        <div
          style={{
            flexGrow: 3,
            flexBasis: 0,
            overflow: 'hidden',
            outline: 'none',
          }}
          ref={this.graphRef}
        />
      </div>
    )
  }
}
