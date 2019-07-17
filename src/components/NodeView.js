/* NodeView.js: Node details screen that appears when clicking on a node from the dashboard
 *
 * Author: Kevin Pelzel <kpelzel@lanl.gov>
 *
 * This software is open source software available under the BSD-3 license.
 * Copyright (c) 2018, Triad National Security, LLC
 * See LICENSE file for details.
 */

import React, { Component, createRef } from 'react'
import vis from 'vis'
import * as Common from './Common'
import * as Classes from './Classes'

function NodeView(props) {
  return (
    <React.Fragment>
      <Classes.Header refreshRate={props.refreshRate} changeRefresh={props.changeRefresh} />
      <NodeInfo refreshRate={props.refreshRate} match={props.match} />
    </React.Fragment>
  )
}

class NodeInfo extends Component {
  constructor(props) {
    super(props)

    this.state = {
      dscUrl: `http://${Common.KRAKEN_IP}/dsc/node/${props.match.params.uuid}`,
      cfgUrl: `http://${Common.KRAKEN_IP}/cfg/node/${props.match.params.uuid}`,
      graphUrl: `http://${Common.KRAKEN_IP}/graph/node/${props.match.params.uuid}/json`,
      dscNode: {},
      cfgNode: {},
      graph: {},
      disconnected: false,
      liveUpdate: false,
      liveReconnect: false,
      graphOpen: false,
    }

    this.organizeInfo = this.organizeInfo.bind(this)
    this.graphToggle = this.graphToggle.bind(this)
    this.nodeFetch = this.nodeFetch.bind(this)
    this.liveFunction = Common.liveFunction.bind(this)
    this.stopLive = Common.stopLive.bind(this)
  }

  componentDidMount() {
    this.nodeFetch(this.state.cfgUrl, 'cfgNode', function () {
      this.nodeFetch(this.state.dscUrl, 'dscNode', function () {
        this.graphFetch(this.organizeInfo)
      })
    })
  }

  componentWillUnmount() {
    this.stopLive()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.refreshRate !== this.props.refreshRate) {
      this.liveFunction(nextProps.refreshRate, "liveUpdate", function () {
        this.nodeFetch(this.state.dscUrl, 'dscNode', function () {
          this.graphFetch(this.organizeInfo)
        })
      })
    }
  }

  nodeFetch(url, state, nextFunction) {
    Common.fetchJsonFromUrl(url)
      .then((node) => {
        if (node === null) {
          this.setState({
            disconnected: true,
          })
          if (typeof nextFunction !== 'undefined') {
            nextFunction.call(this)
          }
        } else {
          this.setState({
            [state]: node,
            disconnected: false,
          })
          if (typeof nextFunction !== 'undefined') {
            nextFunction.call(this)
          }
        }
      })

  }

  graphFetch(nextFunction) {
    if (typeof this.state.cfgNode.parentId === 'undefined') {
      if (typeof nextFunction !== 'undefined') {
        nextFunction.call(this)
      }
      return
    }
    Common.fetchJsonFromUrl(this.state.graphUrl)
      .then((graph) => {
        if (graph === null) {
          this.setState({
            disconnected: true,
          })
          if (typeof nextFunction !== 'undefined') {
            nextFunction.call(this)
            return
          }
        } else {
          this.setState({
            graph: graph,
          })
          if (typeof nextFunction !== 'undefined') {
            nextFunction.call(this)
            return
          }
        }
      })
  }

  organizeInfo() {
    if (this.state.disconnected) {
      if (this.state.liveReconnect) {
        return
      } else {
        console.log("Disconnected from Kraken. Attempting reconnect")
        this.liveFunction(this.props.refreshRate, "liveReconnect", function () { this.nodeFetch(this.state.cfgUrl, 'cfgNode', this.organizeInfo) })
        return
      }
    } else if (!this.state.disconnected && this.state.liveReconnect) {
      console.log("Reconnection established")
      this.stopLive()
    }

    if (typeof this.state.cfgNode.id === 'undefined') {
      console.log("Missing cfg node. Getting cfg node...")
      this.nodeFetch(this.state.cfgUrl, 'cfgNode', this.organizeInfo)
      return
    } else if (Object.entries(this.state.dscNode).length === 0) {
      console.log("Missing dsc node. Getting dsc node and graph...")
      this.nodeFetch(this.state.dscUrl, 'dscNode', function () { this.graphFetch(this.organizeInfo) })
      return
    } else {
      if (!this.state.liveUpdate) {
        console.log("Starting live update and organizing...")
        this.liveFunction(this.props.refreshRate, "liveUpdate", function () { this.nodeFetch(this.state.dscUrl, 'dscNode', function () { this.graphFetch(this.organizeInfo) }) })
      }
    }
  }

  graphToggle() {
    this.setState({
      graphOpen: !this.state.graphOpen
    })
  }

  render() {
    return (
      <React.Fragment>
        {this.state.disconnected &&
          <h2
            style={{ textAlign: 'center', fontFamily: 'Arial', color: 'maroon' }}
          >Disconnected From Kraken</h2>
        }
        {(typeof this.state.cfgNode.id === 'undefined' || typeof this.state.dscNode.id === 'undefined')
          ? <h3
            style={{ fontFamily: 'Arial' }}
          >Loading...</h3>
          : <React.Fragment>
            <div>
              <Square dscNode={this.state.dscNode} cfgNode={this.state.cfgNode} />
              <NodeDetails dscNode={this.state.dscNode} cfgNode={this.state.cfgNode} />
              <Actions dscNode={this.state.dscNode} cfgNode={this.state.cfgNode} dscUrl={this.state.dscUrl} cfgUrl={this.state.cfgUrl} graphToggle={this.graphToggle}/>
            </div>
            {Object.keys(this.state.graph).length !== 0 && <NodeGraph graph={this.state.graph} graphOpen={this.state.graphOpen} graphToggle={this.graphToggle}/>}
          </React.Fragment>
        }
      </React.Fragment>
    )
  }
}


function Square(props) {
  var physColor = Common.stateToColor(props.dscNode.physState)
  var runColor = Common.stateToColor(props.dscNode.runState)
  return (
    <div
      className={`large_square`}
      style={{ borderTopColor: physColor, borderRightColor: runColor, borderBottomColor: runColor, borderLeftColor: physColor }}
    ></div>
  )
}


function NodeDetails(props) {
  var dscRunState = (typeof props.dscNode.runState !== 'undefined') ? props.dscNode.runState : ""
  var cfgRunState = (typeof props.cfgNode.runState !== 'undefined') ? props.cfgNode.runState : ""

  var dscPhysState = (typeof props.dscNode.physState !== 'undefined') ? props.dscNode.physState : ""
  var cfgPhysState = (typeof props.cfgNode.physState !== 'undefined') ? props.cfgNode.physState : ""

  var uuid = Common.base64ToUuid(props.cfgNode.id)

  var parentUuid = ""

  if (props.cfgNode.parentId !== null && typeof props.cfgNode.parentId !== 'undefined') {
    parentUuid = Common.base64ToUuid(props.cfgNode.parentId)
  } else {
    props.cfgNode.nodename = "Master"
  }

  var arch = (typeof props.cfgNode.arch !== 'undefined') ? props.cfgNode.arch : ""
  var platform = (typeof props.cfgNode.platform !== 'undefined') ? props.cfgNode.platform : ""

  var nodeIdRow = NodeViewRow("Node ID", 0, uuid)
  var parentIdRow = (parentUuid !== "") ? NodeViewRow("Parent ID", 0, parentUuid) : <React.Fragment />
  var physStateRow = NodeViewRow("Physical State", 0, `${dscPhysState} / ${cfgPhysState}`)
  var runStateRow = NodeViewRow("Run State", 0, `${dscRunState} / ${cfgRunState}`)
  var archRow = (arch !== "") ? NodeViewRow("Architecture", 0, arch) : <React.Fragment />
  var platformRow = (platform !== "") ? NodeViewRow("Platform", 0, platform) : <React.Fragment />

  // This is just for sorting the node extensions
  var extensions = []
  var jsxExtensions = []
  for (var i = 0; i < props.cfgNode.extensions.length; i++) {
    extensions.push(props.cfgNode.extensions[i])
  }
  // Sorting the extensions by name
  extensions.sort(function (a, b) {
    if (Common.StripProtoUrl(a['@type']) < Common.StripProtoUrl(b['@type'])) { return -1; }
    if (Common.StripProtoUrl(a['@type']) > Common.StripProtoUrl(b['@type'])) { return 1; }
    return 0;
  })
  // Getting jsx versions of the extensions
  for (i = 0; i < extensions.length; i++) {
    if (Object.keys(extensions[i]).length > 1) {
      jsxExtensions.push(<GenericExtension extension={extensions[i]} key={i} />)
    }
  }

  // This is just for sorting the node services
  var services = []
  var jsxServices = []
  for (i = 0; i < props.dscNode.services.length; i++) {
    services.push(props.dscNode.services[i])
  }
  // Sorting the services by name
  services.sort(function (a, b) {
    if (Common.StripProtoUrl(a['id']) < Common.StripProtoUrl(b['id'])) { return -1; }
    if (Common.StripProtoUrl(a['id']) > Common.StripProtoUrl(b['id'])) { return 1; }
    return 0;
  })
  // Getting jsx versions of the services
  for (i = 0; i < services.length; i++) {
    if (Object.keys(services[i]).length > 1) {
      jsxServices.push(<GenericService service={services[i]} key={i} />)
    }
  }

  return (
    <div className={`node_detail`}>
      <h1 className={`node_title`}>{props.cfgNode.nodename}</h1>
      <div className={`non_bordered_detail`}>
        {nodeIdRow}
        {parentIdRow}
        {physStateRow}
        {runStateRow}
        {archRow}
        {platformRow}
      </div>
      {(jsxExtensions.length > 0)
        ?
        <h2>Extensions:</h2>
        : <React.Fragment />}
      {jsxExtensions}
      {(jsxServices.length > 0)
        ? <h2>Services:</h2>
        : <React.Fragment />}
      {jsxServices}
    </div>
  )
}

function GenericExtension(props) {
  var extensionName = Common.StripProtoUrl(props.extension['@type'])
  var rows = [];


  for (const key of Object.keys(props.extension)) {
    if (key === "@type") {
      continue
    } else {
      rows.push(RecursiveValues(props.extension[key], key, 0))
    }
  }

  return (
    <div className={`bordered_detail`}>
      <div className={`info_title`}>{extensionName}</div>
      {rows}
    </div>
  )
}

function GenericService(props) {
  var serviceName = Common.StripProtoUrl(props.service['id'])
  var rows = [];


  for (const key of Object.keys(props.service)) {
    if (key === "id") {
      continue
    } else {
      rows.push(RecursiveValues(props.service[key], key, 0))
    }
  }

  return (
    <div className={`bordered_detail`}>
      <div className={`info_title`}>{serviceName}</div>
      {rows}
    </div>
  )
}

function RecursiveValues(object, key, depth) {
  depth++
  var returnVal = []
  if (Array.isArray(object)) {
    returnVal.push(NodeViewRow(key, depth))
    for (var i = 0; i < object.length; i++) {
      returnVal.push(RecursiveValues(object[i], i, depth))
    }
    // console.log(object.length)
  } else if (typeof object === "object") {
    returnVal.push(NodeViewRow(key, depth))
    for (const key of Object.keys(object)) {
      returnVal.push(RecursiveValues(object[key], key, depth))
    }
  } else if (typeof object === "boolean") {
    returnVal.push(NodeViewRow(key, depth, object.toString()))
  } else {
    returnVal.push(NodeViewRow(key, depth, Common.Base64Convert(key, object)))
    // console.log("recursion:", object, "=", typeof object)
  }

  return returnVal
}

function NodeViewRow(key, depth, value) {
  var padding = ((depth - 1) * 15).toString() + 'px'

  return (<div style={{ paddingLeft: padding }} className={`node_view_row`} key={key}>
    <span className={`node_view_key`}>{key}:</span>
    <span className={`node_view_value`}>{value}</span>
  </div>)
}

function Actions(props) {  
  return (
    <div className={`actions_area ${typeof props.cfgNode.parentId === 'undefined' ? 'hidden' : ''}`}>
      <div
        className={`button green`}
        onClick={() => { Common.powerOnNode(props.dscNode, props.cfgNode, props.dscUrl, props.cfgUrl) }}
      >Power On</div>
      <div
        className={`button red`}
        onClick={() => { Common.powerOffNode(props.dscNode, props.cfgNode, props.dscUrl, props.cfgUrl) }}
      >Power Off</div>
      <div
        className={`button purple`}
        id={`graph_button`}
        onClick={() => { props.graphToggle() }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="100" height="38" viewBox="0 0 24 20"><path fill="None" d="M0 0h24v24H0V0z"/><path fill="white" d="M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.51-.07l-3.56 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07l-4.55 4.56c.05.16.07.33.07.51 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.51.07l4.56-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56C19.02 8.35 19 8.18 19 8c0-1.1.9-2 2-2s2 .9 2 2z"/></svg>
      </div>
    </div>
  )
}

class NodeGraph extends React.Component {
  constructor(props) {
    super(props)

    this.appRef = createRef()

    var nodes = props.graph.nodes

    // Add highlight color to nodes
    for (var i = 0; i < nodes.length; i++) {
      var highlight = {
        border: nodes[i].color.border,
        background: nodes[i].color.background,
      }
      nodes[i].color.highlight = highlight
      nodes[i].borderWidth = 2
    }

    var data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(props.graph.edges),
    }

    var options = {
      edges: {
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 1.5,
          }
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
      height: "100%",
      width: "100%",
    }
    

    this.state = {
      data: data,
      options: options,
      style: {
        opacity: (this.props.graphOpen) ? 100 : 0,
        visibility: (this.props.graphOpen) ? "visible" : "hidden",
      },
    }
  }

  componentDidMount() {
    var network = new vis.Network(this.appRef.current, this.state.data, this.state.options)
    network.fit(this.state.options)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.graphOpen !== this.props.graphOpen) {
      this.setState({
        style: {
          opacity: (nextProps.graphOpen) ? 100 : 0,
          visibility: (nextProps.graphOpen) ? "visible" : "hidden",
        }
      })
    }
    
    if (nextProps.graph !== this.props.graph) {
      var data = this.state.data
      var nodes = nextProps.graph.nodes

      // Add highlight color to nodes
      for (var i = 0; i < nodes.length; i++) {
        var highlight = {
          border: nodes[i].color.border,
          background: nodes[i].color.background,
        }
        nodes[i].color.highlight = highlight
        nodes[i].borderWidth = 2
      }

      data.nodes.update(nodes)
      data.edges.update(nextProps.graph.edges)
      this.forceUpdate()
    }

  }

  render() {
    return (
      <div
        style={this.state.style}
        className={`graph_area`}>
        <div 
        className="close_button"
        onClick={() => { this.props.graphToggle() }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><path fill="None" d="M0 0h24v24H0V0z"/><path fill={Common.GLOBAL_COLORS.grey} d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/></svg>
        </div>
        <div
          className={`node_graph`}
          ref={this.appRef} 
        />
        <div
          ref={this.configRef}/>
      </div>
    )
  }
}

export default NodeView