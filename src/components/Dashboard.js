/* Dashboard.js: The main dashboard screen
 *
 * Author: Kevin Pelzel <kpelzel@lanl.gov>
 *
 * This software is open source software available under the BSD-3 license.
 * Copyright (c) 2018, Triad National Security, LLC
 * See LICENSE file for details.
 */

import React, { Component } from 'react'
import * as Common from './Common'
import * as Classes from './Classes'
import {
  Link,
} from 'react-router-dom'

function Dashboard(props) {
  return (
    <React.Fragment>
      <Classes.Header refreshRate={props.refreshRate} changeRefresh={props.changeRefresh} />
      <div>
        <Legend />
        <div className='node_area'>
          <Cluster refreshRate={props.refreshRate} />
        </div>
      </div>
    </React.Fragment>
  )
}

class Cluster extends Component {
  constructor(props) {
    super(props)

    this.state = {
      dscUrl: `http://${Common.KRAKEN_IP}/dsc/nodes`,
      cfgUrl: `http://${Common.KRAKEN_IP}/cfg/nodes`,
      graphUrl: `http://${Common.KRAKEN_IP}/graph/json`,
      masterNode: {},
      nodes: [],
      cfgNodes: [],
      cfgMaster: {},
      dscNodes: [],
      dscMaster: {},
      liveUpdate: false,
      liveReconnect: false,
      counts: {
        unknownCount: 0,
        initCount: 0,
        syncCount: 0,
      },
      disconnected: false,
    }
    this.organizeNodes = this.organizeNodes.bind(this)
    this.cfgNodeFetch = this.cfgNodeFetch.bind(this)
    this.dscNodeFetch = this.dscNodeFetch.bind(this)
    this.liveFunction = Common.liveFunction.bind(this)
    this.stopLive = Common.stopLive.bind(this)
  }

  componentDidMount() {
    this.cfgNodeFetch(function () { this.dscNodeFetch(this.organizeNodes) })
  }

  componentWillUnmount() {
    this.stopLive()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.refreshRate !== this.props.refreshRate) {
      this.liveFunction(nextProps.refreshRate, "liveUpdate", function () { this.dscNodeFetch(this.organizeNodes) })
    }
  }

  dscNodeFetch(nextFunction) {
    Common.fetchNodeListFromUrl(this.state.dscUrl)
      .then((inputNodes) => {
        if (inputNodes === null) {
          this.setState({
            disconnected: true,
            // [nodesState]: [],
            // [masterState]: {},
          })
          nextFunction.call(this)
        } else {
          var nodes = []
          var masterNode = {}
          for (var i = 0; i < inputNodes.length; i++) {
            if (inputNodes[i].id === this.state.cfgMaster.id) {
              masterNode = inputNodes[i]
              inputNodes.splice(i, 1)
            }
          }
          nodes = inputNodes

          this.setState({
            disconnected: false,
            dscNodes: nodes,
            dscMaster: masterNode,
          })
          nextFunction.call(this)
        }
      })
  }

  cfgNodeFetch(nextFunction) {
    Common.fetchNodeListFromUrl(this.state.cfgUrl)
      .then((inputNodes) => {
        if (inputNodes === null) {
          this.setState({
            disconnected: true,
          })
          nextFunction.call(this)
        } else {
          var nodes = []
          var masterNode = {}
          for (var i = 0; i < inputNodes.length; i++) {
            if (inputNodes[i].parentId === null || typeof inputNodes[i].parentId === 'undefined') {
              masterNode = inputNodes[i]
              inputNodes.splice(i, 1)
            }
          }
          nodes = inputNodes

          this.setState({
            disconnected: false,
            cfgNodes: nodes,
            cfgMaster: masterNode,
          })
          nextFunction.call(this)
        }
      })
  }

  organizeNodes() {
    if (this.state.disconnected) {
      if (this.state.liveReconnect) {
        return
      } else {
        console.log("Disconnected from Kraken. Attempting reconnect")
        this.liveFunction(this.props.refreshRate, "liveReconnect", function () { this.cfgNodeFetch(this.organizeNodes) })
        return
      }
    } else if (!this.state.disconnected && this.state.liveReconnect) {
      console.log("Reconnection established")
      this.stopLive()
    }

    if (typeof this.state.cfgMaster.id === 'undefined') {
      console.log("Missing cfg master. Getting cfg nodes...")
      this.cfgNodeFetch(this.organizeNodes)
      return
    } else if (Object.entries(this.state.dscMaster).length === 0) {
      console.log("Missing dsc master. Getting dsc nodes...")
      this.dscNodeFetch(this.organizeNodes)
      return
    } else if (this.state.cfgNodes.length !== this.state.dscNodes.length) {
      this.stopLive()
      console.log("cfg nodes and dsc node lists are not equal. Getting cfg and dsc nodes...")
      this.cfgNodeFetch(function () { this.dscNodeFetch(this.organizeNodes); })
      return
    } else if (this.state.cfgNodes.length === this.state.dscNodes.length) {
      if (!this.state.liveUpdate) {
        console.log("cfg nodes and dsc nodes are equal. Starting live update and organizing...")
        this.liveFunction(this.props.refreshRate, "liveUpdate", function () { this.dscNodeFetch(this.organizeNodes) })
      }
    } else {
      console.log("I don't know what happened...")
      return
    }

    var finalNodes = this.state.cfgNodes
    finalNodes.sort(Common.nodeSort)
    var finalMaster = this.state.cfgMaster

    // Set dsc info for all nodes in finalNodes
    for (var i = 0; i < finalNodes.length; i++) {
      for (var j = 0; j < this.state.dscNodes.length; j++) {
        if (finalNodes[i].id === this.state.dscNodes[j].id) {
          finalNodes[i].physState = this.state.dscNodes[j].physState
          finalNodes[i].runState = this.state.dscNodes[j].runState
        }
      }
    }

    // Set master node discoverable information
    finalMaster.physState = this.state.dscMaster.physState
    finalMaster.runState = this.state.dscMaster.runState

    // Set counts
    var counts = this.stateCount(finalNodes)

    this.setState({
      counts: counts,
      masterNode: finalMaster,
      nodes: finalNodes,
    })
  }

  stateCount(nodes) {
    var unknownCount = 0
    var initCount = 0
    var syncCount = 0

    for (var i = 0; i < nodes.length; i++) {
      switch (nodes[i].runState) {
        case "UNKNOWN":
          unknownCount++
          break
        case "INIT":
          initCount++
          break
        case "SYNC":
          syncCount++
          break
        default:
          unknownCount++
          break
      }
    }
    return ({
      unknownCount: unknownCount,
      initCount: initCount,
      syncCount: syncCount,
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
        {(this.state.nodes.length === 0 && typeof this.state.masterNode.id === 'undefined')
          ? <h3
            style={{ fontFamily: 'Arial' }}
          >Loading...</h3>
          : <div className='cluster'>
            <MasterNode data={this.state.masterNode} />
            <div className='cluster_nodelist'>
              {this.state.nodes.map((node) => {
                return <Node data={node} key={node.id} />
              })}
            </div>
          </div>
        }
        <div className='counts_area'>
          <div className='counts'>Unknown: {this.state.counts.unknownCount}</div>
          <div className='counts'>Init: {this.state.counts.initCount}</div>
          <div className='counts'>Sync: {this.state.counts.syncCount}</div>
        </div>
      </React.Fragment>
    )
  }

}

function Node(props) {
  // console.log(props)
  if (typeof props.data.physState === 'undefined') {
    props.data.physState = 'UNKNOWN'
  }
  if (typeof props.data.runState === 'undefined') {
    props.data.runState = 'UNKNOWN'
  }

  // console.log(props.data)
  var name = props.data.nodename
  var physColor = Common.stateToColor(props.data.physState)
  var runColor = Common.stateToColor(props.data.runState)
  var uuid = Common.base64ToUuid(props.data.id)

  var popupData = `Name: ${name}\nUUID: ${uuid}\nPhysical State: ${props.data.physState}\nRun State: ${props.data.runState}`

  return (
    <Link
      data-popup={popupData}
      className={`square shadow animate`}
      style={{ borderTopColor: physColor, borderRightColor: runColor, borderBottomColor: runColor, borderLeftColor: physColor }}
      to={`node/${uuid}`}
    />
  )
}

function MasterNode(props) {
  var physColor = Common.stateToColor(props.data.physState)
  var uuid = Common.base64ToUuid(props.data.id)

  return (
    <Link
      className={`master_square shadow animate`}
      style={{ backgroundColor: physColor }}
      to={`node/${uuid}`}
    >Master</Link>
  )
}

function Legend() {
  return (
    <div className='legend'>
      <div className='legend_title'>Legend</div>
      <div className='row' id='first_row'>
        <div className='value' id='phys_text'>Phys</div>
        <div
          className={`square`}
          style={{ borderTopColor: Common.GLOBAL_COLORS.grey, borderRightColor: Common.GLOBAL_COLORS.black, borderBottomColor: Common.GLOBAL_COLORS.black, borderLeftColor: Common.GLOBAL_COLORS.grey }}
        ></div>
        <div className='value' id='run_text'>Run</div>
      </div>
      <div className='row'>
        <div
          className={`square`}
          style={{ borderColor: Common.GLOBAL_COLORS.yellow }}
        ></div>
        <div className='value'>State Unknown</div>
      </div>
      <div className='row'>
        <div
          className={`square`}
          style={{ borderColor: Common.GLOBAL_COLORS.grey }}
        ></div>
        <div className='value'>Power Off</div>
      </div>
      <div className='row'>
        <div
          className={`square`}
          style={{ borderColor: Common.GLOBAL_COLORS.blue }}
        ></div>
        <div className='value'>Initializing</div>
      </div>
      <div className='row'>
        <div
          className={`square`}
          style={{ borderColor: Common.GLOBAL_COLORS.green }}
        ></div>
        <div className='value'>Power On / Sync</div>
      </div>
      <div className='row'>
        <div
          className={`square`}
          style={{ borderColor: Common.GLOBAL_COLORS.purple }}
        ></div>
        <div className='value'>Hang</div>
      </div>
      <div className='row'>
        <div
          className={`square`}
          style={{ borderColor: Common.GLOBAL_COLORS.red }}
        ></div>
        <div className='value'>Error</div>
      </div>
    </div>
  )
}

export default Dashboard
